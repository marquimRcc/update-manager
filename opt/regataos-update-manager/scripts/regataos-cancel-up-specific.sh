#!/bin/bash

# This script cancels the automatic update of any app in the queue or in the process of downloading.
app_nickname="${NICKNAME:-$1}"
app_name="$1"
echo "Ending the $app_name app update"

sleep 1

# Sinaliza cancelamento para os loops dos scripts de atualização
echo "" > "/tmp/regataos-update/cancel-up-$app_nickname.txt"

# Encerra o processo de download específico deste app e seus filhos
if test -f "/tmp/regataos-update/dl-pid-$app_nickname.txt"; then
    real_pid=$(cat "/tmp/regataos-update/dl-pid-$app_nickname.txt" 2>/dev/null)
    if [ -n "$real_pid" ]; then
        pkill -TERM -P "$real_pid" 2>/dev/null
        kill -TERM "$real_pid" 2>/dev/null
        sleep 0.2
        pkill -9 -P "$real_pid" 2>/dev/null
        kill -9 "$real_pid" 2>/dev/null
    fi
    rm -f "/tmp/regataos-update/dl-pid-$app_nickname.txt"
fi

# Fallback por get-pid caso exista
if test -f "/tmp/regataos-update/get-pid-$app_nickname.txt"; then
    get_pid=$(cat "/tmp/regataos-update/get-pid-$app_nickname.txt" 2>/dev/null)
    pid=$(ps -C "$get_pid" 2>/dev/null | awk '{print $1}' | tail -1)
    if [ -n "$pid" ]; then
        kill -TERM "$pid" 2>/dev/null
        kill -KILL "$pid" 2>/dev/null
    fi
    rm -f "/tmp/regataos-update/get-pid-$app_nickname.txt"
fi

# Limpa logs e marcadores de status do app cancelado
rm -f "/tmp/regataos-update/$app_nickname-download-percentage.log"
rm -f "/tmp/regataos-update/download-complete-$app_nickname.done"
rm -f "/tmp/regataos-update/download-failed-$app_nickname.txt"

# Remove o app de todas as listas de controle
for file in "/tmp/regataos-update/list-apps-queue.txt" \
            "/tmp/regataos-update/downloadable-application.txt" \
            "/tmp/regataos-update/installing-application.txt" \
            "/tmp/regataos-update/updated-apps.txt" \
            "/var/log/regataos-logs/updated-apps.txt"; do
    if [ -f "$file" ]; then
        sed -i "s/$app_nickname//" "$file" 2>/dev/null
        sed -i '/^$/d' "$file" 2>/dev/null
    fi
done

download=$(wc -l /tmp/regataos-update/downloadable-application.txt 2>/dev/null | awk '{print $1}')
installation=$(wc -l /tmp/regataos-update/installing-application.txt 2>/dev/null | awk '{print $1}')
queue=$(wc -l /tmp/regataos-update/list-apps-queue.txt 2>/dev/null | awk '{print $1}')

if [ $(( ${download:-0} + ${installation:-0} + ${queue:-0} )) -eq 0 ]; then
    rm -f "/tmp/regataos-update/update-specific-in-progress.txt"
fi
