#!/bin/bash

# This script is used to cancel the update of all applications

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

# Clear rpm and part files
rm -f /tmp/regataos-update/*.rpm /tmp/regataos-update/*.part

# Stop the download in progress
killall aria2c 2>/dev/null
killall wget 2>/dev/null
pkill -f "zypper.*--download-only" 2>/dev/null
get_pid=$(cat /tmp/regataos-update/get-pid.txt 2>/dev/null)
if [ -n "$get_pid" ]; then
    pid=$(ps -C "$get_pid" 2>/dev/null | awk '{print $1}' | tail -1)
    kill -KILL $pid 2>/dev/null
fi

# Return to the initial state of the front end
echo "" >"/tmp/regataos-update/downloadable-application.txt"
echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
echo "" >"/tmp/regataos-update/list-apps-queue.txt"
rm -f "/tmp/regataos-update/other-updates-in-progress.txt"
rm -f "/tmp/regataos-update/system-updates-download-complete.txt"

killall check-update.py
killall install-update.py
kill -KILL $(ps -C "python install-update.py" | awk '{print $1}' | tail -1) 2>/dev/null
