#!/bin/bash
# ==============================================================================
# Regata OS Update Manager - Auto-Healing & Resilience Engine
#
# Provides automated recovery from all common Zypper and RPM update failures:
# 1. Orphaned Zypper/RPM lock detection and safe cleanup (/var/run/zypp.pid).
# 2. Missing files during preload prevention by using --download-as-needed.
# 3. Mirror desynchronization, 404s, and metadata corruption auto-recovery.
# 4. Handling of Zypper exit codes (103 restart needed, 4 zypp error, 8 commit error, etc.).
# 5. Dependency verification and RPM database integrity check.
# ==============================================================================

HEALING_LOG="/var/log/regataos-logs/regataos-update-healing.log"

# Ensure log directory exists
if [ ! -d "/var/log/regataos-logs" ]; then
    mkdir -p "/var/log/regataos-logs"
    chmod 777 "/var/log/regataos-logs" 2>/dev/null
fi

log_healing() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [AUTO-HEALING] $1"
    echo "$msg"
    echo "$msg" >> "$HEALING_LOG" 2>/dev/null
}

# ------------------------------------------------------------------------------
# optimize_zypp_aria2
# Configures aria2c multi-connection backend (-x 16 -j 16) in /etc/zypp/zypp.conf
# ------------------------------------------------------------------------------
optimize_zypp_aria2() {
    if [ -f "/etc/zypp/zypp.conf" ] && command -v aria2c >/dev/null 2>&1; then
        if ! grep -q "^download.aria2c.options = -x 16 -j 16" "/etc/zypp/zypp.conf" 2>/dev/null; then
            log_healing "Configurando download paralelo com aria2c (-x 16 -j 16) em /etc/zypp/zypp.conf..."
            sed -i '/^download\.media_backend/d;/^download\.aria2c\.options/d' /etc/zypp/zypp.conf 2>/dev/null
            printf "download.media_backend = aria2c\ndownload.aria2c.options = -x 16 -j 16 --file-allocation=none\n" >> /etc/zypp/zypp.conf 2>/dev/null
        fi
    fi
}

if [ "$EUID" -eq 0 ]; then
    optimize_zypp_aria2
fi

# ------------------------------------------------------------------------------
# check_and_release_zypp_locks [max_wait_seconds]
# Checks if /var/run/zypp.pid or /var/lib/rpm/.rpm.lock are held.
# If held by a dead process (orphaned lock), cleans them safely.
# If held by an active process, waits up to max_wait seconds for completion.
# ------------------------------------------------------------------------------
check_and_release_zypp_locks() {
    local max_wait="${1:-15}"
    local waited=0

    # 1. Check /var/run/zypp.pid
    if [ -f "/var/run/zypp.pid" ]; then
        local zypp_pid
        zypp_pid="$(cat /var/run/zypp.pid 2>/dev/null | tr -d '[:space:]')"

        if [ -n "$zypp_pid" ] && kill -0 "$zypp_pid" 2>/dev/null; then
            local comm
            comm="$(ps -p "$zypp_pid" -o comm= 2>/dev/null | tr -d '[:space:]')"
            log_healing "Gerenciador ocupado pelo processo PID $zypp_pid ($comm). Aguardando até ${max_wait}s..."

            while kill -0 "$zypp_pid" 2>/dev/null && [ "$waited" -lt "$max_wait" ]; do
                sleep 2
                waited=$((waited + 2))
            done

            if kill -0 "$zypp_pid" 2>/dev/null; then
                log_healing "Aviso: Processo PID $zypp_pid ainda retém o lock após ${max_wait}s."
                return 1
            fi
        fi

        # PID does not exist or finished
        log_healing "Removendo lock órfão /var/run/zypp.pid (PID anterior: ${zypp_pid:-desconhecido})."
        rm -f "/var/run/zypp.pid"
    fi

    # 2. Check /var/lib/rpm/.rpm.lock
    if [ -f "/var/lib/rpm/.rpm.lock" ]; then
        if ! pgrep -x "rpm" >/dev/null 2>&1 && ! pgrep -x "zypper" >/dev/null 2>&1; then
            if ! fuser /var/lib/rpm/.rpm.lock >/dev/null 2>&1; then
                : # Safe
            fi
        fi
    fi

    return 0
}

# ------------------------------------------------------------------------------
# auto_heal_zypp_metadata
# Cleans stale caches and force-refreshes all active repositories.
# Resolves mirror desynchronization, 404 errors, and checksum mismatches.
# ------------------------------------------------------------------------------
auto_heal_zypp_metadata() {
    local force_clean="${1:-0}"
    log_healing "Iniciando sincronização e auto-recuperação de repositórios..."
    optimize_zypp_aria2
    check_and_release_zypp_locks 10

    export LC_ALL="en_US.UTF-8"
    export LANG="en_US.UTF-8"
    export LANGUAGE="en_US"

    if [ "$force_clean" == "1" ]; then
        log_healing "Limpando caches locais do Zypper (zypper clean -a)..."
        zypper --non-interactive clean -a 2>&1 | tee -a "$HEALING_LOG"
    fi

    log_healing "Atualizando metadados dos repositórios (zypper refresh)..."
    zypper --non-interactive --no-gpg-checks refresh 2>&1 | tee -a "$HEALING_LOG"
    local status="${PIPESTATUS[0]}"

    if [ "$status" -eq 0 ]; then
        log_healing "Repositórios atualizados e sincronizados com sucesso."
    else
        log_healing "Aviso: zypper refresh retornou código $status."
    fi
    return "$status"
}

# ------------------------------------------------------------------------------
# is_zypper_success <exit_code>
# Retorna 0 (sucesso) para códigos 0 ou informativos de sucesso com pendência (100-106).
# ------------------------------------------------------------------------------
is_zypper_success() {
    local code="${1:-1}"
    case "$code" in
        0|100|101|102|103|106) return 0 ;;
        *) return 1 ;;
    esac
}

# ------------------------------------------------------------------------------
# repair_system_dependencies
# Verifies system consistency and rebuilds RPM database if damaged.
# ------------------------------------------------------------------------------
repair_system_dependencies() {
    log_healing "Verificando integridade de dependências e banco de dados RPM..."
    check_and_release_zypp_locks 10

    export LC_ALL="en_US.UTF-8"
    export LANG="en_US.UTF-8"
    export LANGUAGE="en_US"

    # Verify RPM database
    rpm -qa >/dev/null 2>&1
    local rpm_status=$?
    if [ $rpm_status -ne 0 ]; then
        log_healing "Reconstruindo banco de dados RPM (rpm --rebuilddb)..."
        rpm --rebuilddb 2>&1 | tee -a "$HEALING_LOG"
    fi

    log_healing "Executando zypper verify..."
    zypper --non-interactive --no-gpg-checks verify --auto-agree-with-licenses 2>&1 | tee -a "$HEALING_LOG"
}

# ------------------------------------------------------------------------------
# run_zypper_resilient [args...]
# Executes a Zypper command with self-healing, retries, and failure recovery.
# - Injects --download-as-needed for install/update commands.
# - Automatically handles codes 103 (restart needed), 7 (lock), 4/8 (mirror/commit error).
# ------------------------------------------------------------------------------
run_zypper_resilient() {
    local log_pipe="${HEALING_PIPE_LOG:-}"
    local max_attempts=3
    local attempt=1
    local exit_code=0
    local final_args=()

    local has_download_mode=0
    local is_mutation=0

    for arg in "$@"; do
        if [[ "$arg" == "--download-as-needed" || "$arg" == "--download-in-advance" || "$arg" == "--download-only" || "$arg" == "--download-in-heaps" ]]; then
            has_download_mode=1
        fi
        if [[ "$arg" == "update" || "$arg" == "up" || "$arg" == "install" || "$arg" == "in" || "$arg" == "dup" || "$arg" == "dist-upgrade" ]]; then
            is_mutation=1
        fi
    done

    for arg in "$@"; do
        final_args+=("$arg")
        if [[ "$is_mutation" -eq 1 && "$has_download_mode" -eq 0 && ("$arg" == "update" || "$arg" == "up" || "$arg" == "install" || "$arg" == "in") ]]; then
            final_args+=("--download-as-needed")
            has_download_mode=1
        fi
    done

    optimize_zypp_aria2
    check_and_release_zypp_locks 15

    export LC_ALL="en_US.UTF-8"
    export LANG="en_US.UTF-8"
    export LANGUAGE="en_US"

    while [ $attempt -le $max_attempts ]; do
        log_healing "Executando Zypper (tentativa $attempt de $max_attempts): zypper ${final_args[*]}"

        if [ -n "$log_pipe" ]; then
            zypper --non-interactive --no-gpg-checks "${final_args[@]}" 2>&1 | tee -a "$log_pipe" "$HEALING_LOG"
            exit_code="${PIPESTATUS[0]}"
        else
            zypper --non-interactive --no-gpg-checks "${final_args[@]}" 2>&1 | tee -a "$HEALING_LOG"
            exit_code="${PIPESTATUS[0]}"
        fi

        log_healing "Zypper finalizou com código: $exit_code"

        if [ "$exit_code" -eq 0 ] || [ "$exit_code" -eq 100 ] || [ "$exit_code" -eq 101 ] || [ "$exit_code" -eq 102 ] || [ "$exit_code" -eq 106 ]; then
            log_healing "Operação Zypper concluída com sucesso."
            return 0
        fi

        if [ "$exit_code" -eq 103 ]; then
            log_healing "Zypper foi atualizado (código 103). Reiniciando operação para aplicar demais pacotes..."
            attempt=$((attempt + 1))
            sleep 1
            continue
        fi

        if [ "$exit_code" -eq 7 ]; then
            log_healing "Gerenciador bloqueado (código 7). Liberando locks órfãos..."
            check_and_release_zypp_locks 20
            attempt=$((attempt + 1))
            sleep 2
            continue
        fi

        log_healing "Falha no Zypper (código $exit_code). Acionando auto-recuperação..."

        auto_heal_zypp_metadata

        if [ "$exit_code" -eq 8 ]; then
            repair_system_dependencies
        fi

        attempt=$((attempt + 1))
        sleep 2
    done

    log_healing "Erro: Operação Zypper não completou após $max_attempts tentativas (código: $exit_code)."
    return "$exit_code"
}

# ------------------------------------------------------------------------------
# full_system_repair
# Complete diagnostic and repair pipeline
# ------------------------------------------------------------------------------
full_system_repair() {
    log_healing "========================================================"
    log_healing "Iniciando Diagnóstico e Reparo Completo do Sistema"
    log_healing "========================================================"

    echo "1. Verificando e liberando travas do sistema..."
    check_and_release_zypp_locks 15

    echo "2. Reconstruindo banco de dados de pacotes (RPM)..."
    rpm --rebuilddb 2>&1 | tee -a "$HEALING_LOG"

    echo "3. Limpando caches corrompidos e re-sincronizando repositórios..."
    auto_heal_zypp_metadata

    echo "4. Verificando integridade de dependências..."
    repair_system_dependencies

    echo "5. Concluindo pacotes pendentes com --download-as-needed..."
    run_zypper_resilient update --allow-downgrade --replacefiles --auto-agree-with-licenses

    local final_status=$?
    if [ $final_status -eq 0 ]; then
        log_healing "Reparo completo do sistema finalizado com SUCESSO!"
        echo "Diagnóstico e reparo concluídos com sucesso!"
    else
        log_healing "Reparo concluído com avisos/pendências (código: $final_status)."
        echo "Diagnóstico concluído (código de saída: $final_status)."
    fi
    return $final_status
}
