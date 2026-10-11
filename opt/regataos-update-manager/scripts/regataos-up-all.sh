#!/bin/bash
# ==============================================================================
# Regata OS Update Manager - Atualização Paralela Otimizada com Pipeline
#
# Executa downloads em paralelo (aria2c com 16 conexões) enquanto o pacote anterior
# está sendo instalado sequencialmente via Zypper/RPM resiliente.
# ==============================================================================

source "/opt/regataos-update-manager/scripts/regataos-update-healing.sh"

check_and_release_zypp_locks 15
optimize_zypp_aria2

if test ! -e "/tmp/regataos-update"; then
    mkdir -p "/tmp/regataos-update"
    chmod 777 "/tmp/regataos-update"
    chmod 777 /tmp/regataos-update/* 2>/dev/null
else
    chmod 777 "/tmp/regataos-update"
    chmod 777 /tmp/regataos-update/* 2>/dev/null
fi

rm -f "/tmp/regataos-update/stop-all-update.txt"
rm -f "/tmp/regataos-update/installation-in-progress.txt"
echo "" > "/tmp/regataos-update/update-in-progress.txt"

echo "" > "/tmp/regataos-update/downloadable-application-other-updates.txt"
echo "" > "/tmp/regataos-update/installing-application-other-updates.txt"
echo "" > "/tmp/regataos-update/system-update-installed.txt"
echo "" > "/tmp/regataos-update/waiting-for-installation.txt"
echo "" > "/tmp/regataos-update/installing-system-update.txt"
echo "" > "/tmp/regataos-update/downloading-system-update.txt"

# 1. Identifica todos os pacotes em apps-list.txt para preparar links de download
declare -a QUEUED_NICKNAMES=()
declare -a QUEUED_PACKAGES=()
declare -a QUEUED_FILENAMES=()
declare -a QUEUED_URLS=()

for i in /opt/regataos-store/apps-list/*.json; do
    [ -f "$i" ] || continue
    app_pkg="$(grep -R '"package":' "$i" | awk '{print $2}' | sed 's/"\|,//g')"

    if [ -n "$app_pkg" ] && grep -Fq "$app_pkg" "/tmp/regataos-update/apps-list.txt" 2>/dev/null; then
        app_nick="$(grep -R '"nickname":' "$i" | awk '{print $2}' | sed 's/"\|,//g')"
        arch="$(grep -R '"architecture":' "$i" | awk '{print $2}' | sed 's/"\|,//g')"
        dl_link="$(grep -R '"download_link":' "$i" | awk '{print $2}' | sed 's/"\|,//g')"

        # Identifica nome do repositório
        repo_name="$(grep -R '"repository_name":' "$i" | awk '{print $2}' | sed 's/"\|,//g')"
        if [ -z "$repo_name" ] && [ -f "/var/log/regataos-logs/regataos-list-updates.log" ]; then
            repo_name="$(grep -E "\s+$app_pkg\s+" /var/log/regataos-logs/regataos-list-updates.log | awk -F'|' '{print $2}' | tr -d ' ' | head -1)"
        fi

        # Busca baseurl real nos repositórios ativos do Zypper
        actual_baseurl=""
        if [ -n "$repo_name" ]; then
            if [ -f "/etc/zypp/repos.d/${repo_name}.repo" ]; then
                actual_baseurl="$(grep -m1 "^baseurl=" "/etc/zypp/repos.d/${repo_name}.repo" 2>/dev/null | cut -d'=' -f 2-)"
            elif [ -f "/etc/zypp/repos.d/${repo_name}.local.repo" ]; then
                actual_baseurl="$(grep -m1 "^baseurl=" "/etc/zypp/repos.d/${repo_name}.local.repo" 2>/dev/null | cut -d'=' -f 2-)"
            fi
        fi

        if [ -n "$actual_baseurl" ]; then
            repo_url="$actual_baseurl"
        else
            repo_url="$(grep -R '"repository_url":' "$i" | awk '{print $2}' | sed 's/"\|,//g')"
            if [[ $repo_url == *"[mainRepositoryUrl]"* ]]; then
                repo_url="$(grep -r mainRepositoryUrl= /usr/share/regataos/regataos-base-version.txt | cut -d'=' -f 2-)"
            elif [[ $repo_url == *"[basedOnVersion]"* ]]; then
                basedOnVersion="$(grep -r basedOnVersion= /usr/share/regataos/regataos-base-version.txt | cut -d'=' -f 2-)"
                repo_url=$(echo "$repo_url" | sed "s,\[basedOnVersion\],$basedOnVersion,")
            elif [[ $repo_url == *"[basedOn]"* ]]; then
                basedOn="$(grep -r basedOn= /usr/share/regataos/regataos-base-version.txt | cut -d'=' -f 2-)"
                repo_url=$(echo "$repo_url" | sed "s,\[basedOn\],$basedOn,")
            fi
        fi

        # Captura versão disponível rapidamente
        ver=""
        if [ -f "/var/log/regataos-logs/regataos-list-updates.log" ]; then
            ver="$(grep -E "\s+$app_pkg\s+" /var/log/regataos-logs/regataos-list-updates.log | awk -F'|' '{print $5}' | tr -d ' ' | head -1)"
        fi
        if [ -z "$ver" ]; then
            ver="$(zypper --non-interactive info "$app_pkg" 2>/dev/null | grep Ver | awk '{print $3}' | tail -1 | sed "s/-0//")"
        fi

        dl_filename="$app_pkg-$ver.$arch.rpm"
        repo_url="${repo_url%/}"

        if [ -n "$dl_link" ] && [[ "$dl_link" != *"undefined"* ]]; then
            final_url="$(echo "$dl_link" | sed "s/\[version\]/$ver/")"
        elif [[ "$repo_url" == *"/$arch" ]]; then
            final_url="$repo_url/$dl_filename"
        else
            final_url="$repo_url/$arch/$dl_filename"
        fi

        QUEUED_NICKNAMES+=("$app_nick")
        QUEUED_PACKAGES+=("$app_pkg")
        QUEUED_FILENAMES+=("$dl_filename")
        QUEUED_URLS+=("$final_url")
    fi
done

# Inicia prefetch paralelo para as atualizações do sistema se houver pacotes
number_packages=$(wc -l /tmp/regataos-update/package-list.txt 2>/dev/null | awk '{print $1}')
SYSTEM_DOWNLOAD_PID=""
if [ "${number_packages:-0}" -ge 1 ]; then
    # Remove da fila de espera e marca como baixando imediatamente na interface
    sed -i "s/other-updates//" "/tmp/regataos-update/list-apps-queue.txt" 2>/dev/null
    sed -i '/^$/d' "/tmp/regataos-update/list-apps-queue.txt" 2>/dev/null

    echo "other-updates" > "/tmp/regataos-update/downloadable-application-other-updates.txt"
    echo "other-updates" > "/tmp/regataos-update/other-updates-in-progress.txt"
    echo "" > "/tmp/regataos-update/downloading-system-update.txt"

    # Dispara prefetch em segundo plano com aria2c (16 conexões) via Zypper
    (
        export LC_ALL="en_US.UTF-8"
        export LANG="en_US.UTF-8"
        export LANGUAGE="en_US"
        check_and_release_zypp_locks 10
        zypper --non-interactive --no-gpg-checks update --download-only -y > /var/log/regataos-logs/regataos-other-updates.log 2>&1
        echo "download-complete" > "/tmp/regataos-update/system-updates-download-complete.txt"
    ) &
    SYSTEM_DOWNLOAD_PID=$!
fi

# Função interna para baixar pacote em paralelo com aria2c (16 conexões) ou wget
download_package_parallel() {
    local nick="$1"
    local file_name="$2"
    local url="$3"
    local target="/tmp/regataos-update/$file_name"
    local log_file="/tmp/regataos-update/$nick-download-percentage.log"

    # Verifica se o arquivo já existe e é válido
    if [ -s "$target" ]; then
        if [[ "$file_name" == *.rpm ]]; then
            if python3 -c "import sys; sys.exit(0 if open('$target', 'rb').read(4) == b'\xed\xab\xee\xdb' else 1)" 2>/dev/null; then
                echo "100" > "$log_file"
                return 0
            fi
        else
            echo "100" > "$log_file"
            return 0
        fi
    fi

    echo "downloading $nick" > "/tmp/regataos-update/get-pid-$nick.txt"

    if command -v aria2c >/dev/null 2>&1; then
        aria2c --follow-metalink=mem --metalink-preferred-protocol=https \
            -x 16 -s 16 -j 16 -k 1M --file-allocation=none --check-certificate=false \
            --allow-overwrite=true --auto-file-renaming=false \
            -d "/tmp/regataos-update" -o "$file_name" "$url" 2>&1 | \
            (pv -n > "$log_file" 2>/dev/null || cat > "$log_file")
    fi

    # Validação rigorosa: se falhou, está vazio ou é XML/metalink em vez de RPM, fallback para wget
    local is_valid=0
    if [ -s "$target" ]; then
        if [[ "$file_name" == *.rpm ]]; then
            if python3 -c "import sys; sys.exit(0 if open('$target', 'rb').read(4) == b'\xed\xab\xee\xdb' else 1)" 2>/dev/null; then
                is_valid=1
            fi
        else
            is_valid=1
        fi
    fi

    if [ "$is_valid" -ne 1 ]; then
        rm -f "$target"
        wget --no-check-certificate -O "$target" "$url" 2>&1 | \
            (pv -n > "$log_file" 2>/dev/null || cat > "$log_file")
    fi

    if [ -s "$target" ]; then
        echo "100" > "$log_file"
    fi
    rm -f "/tmp/regataos-update/get-pid-$nick.txt"
}

# 2. Inicia downloads em segundo plano para todos os apps pendentes ao mesmo tempo
for ((idx=0; idx<${#QUEUED_NICKNAMES[@]}; idx++)); do
    nick="${QUEUED_NICKNAMES[$idx]}"
    file="${QUEUED_FILENAMES[$idx]}"
    url="${QUEUED_URLS[$idx]}"

    # Remove da fila de pendentes e adiciona na lista de download ativo para o front-end
    sed -i "s/$nick//" "/tmp/regataos-update/list-apps-queue.txt" 2>/dev/null
    sed -i '/^$/d' "/tmp/regataos-update/list-apps-queue.txt" 2>/dev/null

    echo "$nick" >> "/tmp/regataos-update/downloadable-application.txt"
    sed -i '/^$/d' "/tmp/regataos-update/downloadable-application.txt"

    # Dispara download em segundo plano com aria2c (16 conexões)
    download_package_parallel "$nick" "$file" "$url" &
done

# 3. Pipeline de Instalação: enquanto um instala no Zypper/RPM, os próximos continuam baixando em paralelo!
for ((idx=0; idx<${#QUEUED_NICKNAMES[@]}; idx++)); do
    nick="${QUEUED_NICKNAMES[$idx]}"
    pkg="${QUEUED_PACKAGES[$idx]}"
    file="${QUEUED_FILENAMES[$idx]}"
    target="/tmp/regataos-update/$file"

    if [ -f "/tmp/regataos-update/stop-all-update.txt" ]; then
        rm -f "/tmp/regataos-update/stop-all-update.txt"
        killall aria2c 2>/dev/null
        killall wget 2>/dev/null
        exit 0
    fi

    # Se este aplicativo específico foi cancelado pelo usuário
    if [ -f "/tmp/regataos-update/cancel-up-$nick.txt" ]; then
        sed -i "s/$nick//" "/tmp/regataos-update/downloadable-application.txt" 2>/dev/null
        sed -i '/^$/d' "/tmp/regataos-update/downloadable-application.txt" 2>/dev/null
        continue
    fi

    # Aguarda o download deste aplicativo terminar (enquanto os outros continuam baixando em paralelo)
    wait_time=0
    while [ ! -s "$target" ] && [ "$wait_time" -lt 300 ]; do
        if [ -f "/tmp/regataos-update/stop-all-update.txt" ]; then
            rm -f "/tmp/regataos-update/stop-all-update.txt"
            killall aria2c 2>/dev/null
            killall wget 2>/dev/null
            exit 0
        fi
        sleep 1
        wait_time=$((wait_time + 1))
    done

    # Transiciona estado no front-end: sai de 'Baixando' e entra em 'Instalando'
    sed -i "s/$nick//" "/tmp/regataos-update/downloadable-application.txt" 2>/dev/null
    sed -i '/^$/d' "/tmp/regataos-update/downloadable-application.txt" 2>/dev/null

    echo "$nick" > "/tmp/regataos-update/installing-application.txt"
    echo "" > "/tmp/regataos-update/installation-in-progress.txt"

    cd /tmp/regataos-update/
    export HEALING_PIPE_LOG="/var/log/regataos-logs/regataos-update-$pkg.log"

    installed_ok=0
    # Se o prefetch de atualizações do sistema ainda estiver ativo em background,
    # instala o RPM do aplicativo diretamente via rpm para não travar no lock do Zypper
    if [ -n "$SYSTEM_DOWNLOAD_PID" ] && kill -0 "$SYSTEM_DOWNLOAD_PID" 2>/dev/null; then
        rpm -Uvh --replacefiles --replacepkgs "$file" > "$HEALING_PIPE_LOG" 2>&1
        if [ $? -eq 0 ]; then
            installed_ok=1
        fi
    fi

    # Se não estava em background ou se o rpm direto não resolveu dependências, usa run_zypper_resilient
    if [ "$installed_ok" -ne 1 ]; then
        if [ -n "$SYSTEM_DOWNLOAD_PID" ] && kill -0 "$SYSTEM_DOWNLOAD_PID" 2>/dev/null; then
            wait "$SYSTEM_DOWNLOAD_PID" 2>/dev/null
        fi
        run_zypper_resilient install --allow-downgrade --replacefiles --auto-agree-with-licenses "$file"
    fi

    # Configurações pós-instalação de GPU / Prime
    if [ -f "/tmp/regataos-prime/config/regataos-prime.conf" ]; then
        if grep -q "amf=on" "/tmp/regataos-prime/config/regataos-prime.conf" 2>/dev/null; then
            /opt/regataos-prime/scripts/enable-amd-amf -amf-on 2>/dev/null
        fi
    fi
    if [ -x "/opt/regataos-prime/scripts/apps-hybrid-graphics" ]; then
        /opt/regataos-prime/scripts/apps-hybrid-graphics 2>/dev/null
    fi

    # Atualiza lista de concluídos e limpa estado deste app
    echo "" > "/tmp/regataos-update/installing-application.txt"
    sed -i "s/$pkg//" "/tmp/regataos-update/apps-list.txt" 2>/dev/null
    sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt" 2>/dev/null

    if ! grep -q "$nick" "/var/log/regataos-logs/updated-apps.txt" 2>/dev/null; then
        echo "$nick" >> "/var/log/regataos-logs/updated-apps.txt"
        sed -i '/^$/d' "/var/log/regataos-logs/updated-apps.txt"
    fi

    echo "$nick" >> "/tmp/regataos-update/updated-apps.txt"
    sed -i '/^$/d' "/tmp/regataos-update/updated-apps.txt"

    rm -f "/tmp/regataos-update/installation-in-progress.txt"
    rm -f "/tmp/regataos-update/$file"
    rm -f "/tmp/regataos-update/$nick-download-percentage.log"
done

# 4. Finalização dos aplicativos e prosseguimento para atualizações do sistema
rm -f "/tmp/regataos-update/downloadable-application.txt"
rm -f "/tmp/regataos-update/installing-application.txt"
rm -f "/tmp/regataos-update/update-in-progress.txt"

if [ -f "/usr/share/regataos/first-update.txt" ]; then
    rm -f "/usr/share/regataos/first-update.txt"
fi

# Aguarda conclusão do download das atualizações do sistema caso ainda esteja em andamento
if [ -n "$SYSTEM_DOWNLOAD_PID" ] && kill -0 "$SYSTEM_DOWNLOAD_PID" 2>/dev/null; then
    wait "$SYSTEM_DOWNLOAD_PID" 2>/dev/null
fi

# Inicia as atualizações do sistema (com backend aria2c 16 conexões ativo no Zypper!)
sudo /opt/regataos-update-manager/scripts/regataos-other-up.sh start
