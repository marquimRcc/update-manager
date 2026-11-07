#!/bin/bash

# Detect system language
user=$(users | awk '{print $1}')
if [ -z "$HOME" ]; then
    HOME="/home/$user"
fi

if test -e "/home/$user/.config/plasma-localerc" ; then
	language=$(grep -r LANGUAGE= "/home/$user/.config/plasma-localerc" | cut -d"=" -f 2- | cut -d":" -f -1 | tr [A-Z] [a-z] | sed 's/_/-/')

	if [ -z $language ]; then
    	language=$(grep -r LANG= "/home/$user/.config/plasma-localerc" | cut -d"=" -f 2- | cut -d"." -f -1 | tr [A-Z] [a-z] | sed 's/_/-/')
	fi

elif test -e "/home/$user/.config/user-dirs.locale" ; then
    language=$(cat "/home/$user/.config/user-dirs.locale" | tr [A-Z] [a-z] | sed 's/_/-/')

else
    language=$(echo $LANG | tr [A-Z] [a-z] | sed 's/_/-/' | cut -d"." -f -1)
fi

# Configure application language
if test -e "/opt/regataos-update-manager/scripts/notifications/$language"; then
	scriptNotify="/opt/regataos-update-manager/scripts/notifications/$language"
else
	scriptNotify="/opt/regataos-update-manager/scripts/notifications/en-us"
fi

# Check if frequency interval has elapsed for automatic updates
function should_run_auto_update() {
    local conf_file="$HOME/.config/regataos-update/regataos-update.conf"
    local timestamp_file="$HOME/.config/regataos-update/last-autoupdate-timestamp"

    local freq="daily"
    if test -e "$conf_file"; then
        local read_freq=$(grep "^frequency=" "$conf_file" 2>/dev/null | cut -d"=" -f2- | tr -d '[:space:]')
        if [ -n "$read_freq" ]; then
            freq="$read_freq"
        fi
    fi

    # Daily: 82800s (23h)
    # Weekly: 604800s (7 days)
    # Monthly: 2592000s (30 days)
    # Six months: 15552000s (180 days)
    local min_interval=82800
    case "$freq" in
        "daily")
            min_interval=82800
            ;;
        "weekly")
            min_interval=604800
            ;;
        "monthly")
            min_interval=2592000
            ;;
        "sixmonths")
            min_interval=15552000
            ;;
    esac

    local now=$(date +%s)
    local last=0
    if test -e "$timestamp_file"; then
        last=$(cat "$timestamp_file" 2>/dev/null || echo 0)
    fi

    if ! [[ "$last" =~ ^[0-9]+$ ]]; then
        last=0
    fi

    local elapsed=$(( now - last ))
    if [ $elapsed -ge $min_interval ]; then
        return 0
    else
        return 1
    fi
}

if test ! -e "/usr/bin/calamares"; then
    if ping -c 1 www.google.com.br ; then
        auto_up_config=$(grep -r "autoupdate=" "$HOME/.config/regataos-update/regataos-update.conf" 2>/dev/null | cut -d"=" -f 2-)
        if [[ $(echo "$auto_up_config") == *"1"* ]]; then
            if should_run_auto_update; then
                cd "/opt/regataos-update-manager/tray-icon/"
                ./check-update.py & /bin/bash "$scriptNotify" -check-up
            fi
        elif [[ $(echo "$auto_up_config") == *"2"* ]]; then
            cd "/opt/regataos-update-manager/tray-icon/"
            ./check-update.py & /bin/bash "$scriptNotify" -check-up
        fi
    fi
fi
