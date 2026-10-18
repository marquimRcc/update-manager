#!/bin/bash

# This script is used to cancel the update of all applications or check updates

# Handle check-updates cancellation specifically (runs with root permissions via sudoers)
if [ "$1" == "-cancel-checking" ] || [ "$1" == "--check" ]; then
    echo "Cancelando processo de verificação de atualizações..."

    # Interrompe processos de verificação e zypper que estejam rodando como root
    pkill -TERM -f "regataos-check-up.sh" 2>/dev/null
    pkill -TERM -f "regataos-up.sh" 2>/dev/null
    pkill -TERM -f "zypper" 2>/dev/null
    pkill -TERM -f "check-update.py" 2>/dev/null
    pkill -TERM -f "alert-update.py" 2>/dev/null
    sleep 0.2
    pkill -9 -f "regataos-check-up.sh" 2>/dev/null
    pkill -9 -f "regataos-up.sh" 2>/dev/null
    pkill -9 -f "zypper" 2>/dev/null

    # Limpa locks apenas se zypper não estiver mais ativo
    if ! pgrep -f "zypper" >/dev/null 2>&1; then
        rm -f /var/run/zypp.pid /var/run/zypper.pid /tmp/regataos-up.lock 2>/dev/null
    fi

    rm -f "/tmp/regataos-update/cancel-checking.txt"
    rm -f "/tmp/regataos-update/all-auto-update.txt"
    rm -f "/tmp/regataos-update/install-updates.txt"
    rm -f "/tmp/regataos-update/update-in-progress.txt"
    rm -f "/tmp/regataos-update/other-updates-in-progress.txt"
    rm -f "/tmp/regataos-update/update-specific-in-progress.txt"
    echo "" >"/tmp/regataos-update/downloading-system-update.txt"
    echo "" >"/tmp/regataos-update/installing-system-update.txt"
    echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
    echo "" >"/tmp/regataos-update/installing-application-other-updates.txt"

    # Determina o status de repouso correto com base na configuração do usuário
    restingStatus="no-updates"
    if [ -f "/tmp/regataos-update/config/regataos-update.conf" ]; then
        if grep -q "autoupdate=3" "/tmp/regataos-update/config/regataos-update.conf" 2>/dev/null; then
            restingStatus="never-updates"
        fi
    fi

    if [ -s "/tmp/regataos-update/package-list.txt" ] || [ -s "/tmp/regataos-update/apps-list.txt" ]; then
        echo "show-updates" > "/tmp/regataos-update/status.txt"
    else
        echo "$restingStatus" > "/tmp/regataos-update/status.txt"
    fi
    echo "1" > "/tmp/regataos-update/already_updated.txt"
    local_user=$(who | awk '{print $1}' | head -1)
    [ -z "$local_user" ] && local_user=$(users | awk '{print $1}')
    [ -n "$local_user" ] && chown -R "$local_user":"$local_user" /tmp/regataos-update 2>/dev/null
    chmod -R 777 /tmp/regataos-update 2>/dev/null
    exit 0
fi

# Cancel updating all apps
if test -e "/tmp/regataos-update/all-auto-update.txt"; then
    rm -f "/tmp/regataos-update/all-auto-update.txt"
fi

if test -e "/tmp/regataos-update/install-updates.txt"; then
    rm -f "/tmp/regataos-update/install-updates.txt"
fi

if test -e "/tmp/regataos-update/update-in-progress.txt"; then
    rm -f "/tmp/regataos-update/update-in-progress.txt"
fi

# If there is no app installation, close the main script
if test ! -e "/tmp/regataos-update/installation-in-progress.txt"; then
    killall regataos-up-all.sh
fi

if test -e "/tmp/regataos-update/update-specific-in-progress.txt"; then
    downloading=$(wc -l /tmp/regataos-update/downloadable-application.txt | awk '{print $1}')
    if [ $(echo $downloading) -eq 1 ]; then
        downloading=$(cat /tmp/regataos-update/downloadable-application.txt)
        echo "" >"/tmp/regataos-update/cancel-up-$app_nickname.txt"

        # Stop the download in progress
        get_pid=$(cat /tmp/regataos-update/get-pid-$app_nickname.txt)
        pid=$(ps -C "$get_pid" | awk '{print $1}' | tail -1)
        kill -STOP $pid
        kill -KILL $pid
    fi

    installing=$(wc -l /tmp/regataos-update/installing-application.txt | awk '{print $1}')
    if [ $(echo $installing) -eq 0 ]; then
        killall regataos-up-specific.sh
        rm -f "/tmp/regataos-update/update-specific-in-progress.txt"
    fi
fi

# Função para validar se o PID pertence de fato a um processo legítimo de download/update
is_safe_update_process() {
    local pid="$1"
    [ -n "$pid" ] || return 1
    [[ "$pid" =~ ^[0-9]+$ ]] || return 1
    [ "$pid" -gt 100 ] || return 1
    [ -d "/proc/$pid" ] || return 1

    local cmdline
    cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null)
    [ -n "$cmdline" ] || return 1

    if [[ "$cmdline" == *"regataos-update"* || \
          "$cmdline" == *"aria2c"* || \
          "$cmdline" == *"wget"* || \
          "$cmdline" == *"regataos-up"* ]]; then
        return 0
    fi
    return 1
}

# Clear rpm and part files
rm -f /tmp/regataos-update/*.rpm /tmp/regataos-update/*.part /tmp/regataos-update/*.done /tmp/regataos-update/download-failed-*.txt

# Stop all download processes tracked by PID gracefully first (apenas se validados)
for pid_file in /tmp/regataos-update/dl-pid-*.txt; do
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file" 2>/dev/null)
        if is_safe_update_process "$pid"; then
            pkill -TERM -P "$pid" 2>/dev/null
            kill -TERM "$pid" 2>/dev/null
        fi
    fi
done

# Terminate aria2c, wget, zypper, and update scripts
pkill -TERM -f "aria2c.*regataos-update" 2>/dev/null
pkill -TERM -f "wget.*regataos-update" 2>/dev/null
pkill -TERM -f "zypper" 2>/dev/null
pkill -TERM -f "regataos-up" 2>/dev/null
pkill -TERM -f "regataos-other-up" 2>/dev/null

get_pid=$(cat /tmp/regataos-update/get-pid.txt 2>/dev/null)
if [ -n "$get_pid" ]; then
    pid=$(ps -C "$get_pid" 2>/dev/null | awk '{print $1}' | tail -1)
    if is_safe_update_process "$pid"; then
        kill -TERM "$pid" 2>/dev/null
    fi
fi

sleep 0.3

# Force kill any stubborn update-manager processes if still running
for pid_file in /tmp/regataos-update/dl-pid-*.txt; do
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file" 2>/dev/null)
        if is_safe_update_process "$pid"; then
            pkill -9 -P "$pid" 2>/dev/null
            kill -9 "$pid" 2>/dev/null
        fi
        rm -f "$pid_file"
    fi
done

pkill -9 -f "aria2c.*regataos-update" 2>/dev/null
pkill -9 -f "wget.*regataos-update" 2>/dev/null
pkill -9 -f "zypper" 2>/dev/null
pkill -9 -f "regataos-up" 2>/dev/null
pkill -9 -f "regataos-other-up" 2>/dev/null
if [ -n "$get_pid" ]; then
    pid=$(ps -C "$get_pid" 2>/dev/null | awk '{print $1}' | tail -1)
    if is_safe_update_process "$pid"; then
        kill -KILL "$pid" 2>/dev/null
    fi
fi

# Clean up zypp locks only if no Zypper process is actively running
if ! pgrep -f "zypper" >/dev/null 2>&1; then
    rm -f /var/run/zypp.pid /var/run/zypper.pid /tmp/regataos-up.lock 2>/dev/null
fi

# Return to the initial state of the front end
echo "" >"/tmp/regataos-update/downloadable-application.txt"
echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
echo "" >"/tmp/regataos-update/list-apps-queue.txt"
echo "" >"/tmp/regataos-update/downloading-system-update.txt"
echo "" >"/tmp/regataos-update/installing-system-update.txt"
echo "" >"/tmp/regataos-update/installing-application-other-updates.txt"
rm -f "/tmp/regataos-update/other-updates-in-progress.txt"
rm -f "/tmp/regataos-update/update-in-progress.txt"
rm -f "/tmp/regataos-update/update-specific-in-progress.txt"
rm -f "/tmp/regataos-update/all-auto-update.txt"
rm -f "/tmp/regataos-update/install-updates.txt"
rm -f "/tmp/regataos-update/system-updates-download-complete.txt"
rm -f "/tmp/regataos-update/stop-all-update.txt"

killall check-update.py 2>/dev/null
killall install-update.py 2>/dev/null
kill -KILL $(ps -C "python install-update.py" | awk '{print $1}' | tail -1) 2>/dev/null

# Determina o status correto para o front-end
if [ -s "/tmp/regataos-update/package-list.txt" ] || [ -s "/tmp/regataos-update/apps-list.txt" ]; then
    echo "show-updates" > "/tmp/regataos-update/status.txt"
else
    restingStatus="no-updates"
    if [ -f "/tmp/regataos-update/config/regataos-update.conf" ]; then
        if grep -q "autoupdate=3" "/tmp/regataos-update/config/regataos-update.conf" 2>/dev/null; then
            restingStatus="never-updates"
        fi
    fi
    echo "$restingStatus" > "/tmp/regataos-update/status.txt"
fi

echo "1" > "/tmp/regataos-update/already_updated.txt"
local_user=$(who | awk '{print $1}' | head -1)
[ -z "$local_user" ] && local_user=$(users | awk '{print $1}')
[ -n "$local_user" ] && chown -R "$local_user":"$local_user" /tmp/regataos-update 2>/dev/null
chmod -R 777 /tmp/regataos-update 2>/dev/null
