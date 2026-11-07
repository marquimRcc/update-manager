#!/bin/bash

# Clear cache
rm -f "/tmp/regataos-update/status.txt"
rm -f "/tmp/regataos-update/already_updated.txt"
rm -f "/tmp/regataos-configs/config/kdeglobals"
rm -f /tmp/regataos-update/*.txt
rm -f /tmp/regataos-update/*.rpm

# Detect system language
user=$(users | awk '{print $1}')
if [ -z "$HOME" ]; then
    HOME="/home/$user"
fi
if test -e "/home/$user/.config/plasma-localerc"; then
    language=$(grep -r LANGUAGE= "/home/$user/.config/plasma-localerc" | cut -d"=" -f 2- | cut -d":" -f -1 | tr [A-Z] [a-z] | sed 's/_/-/')
    if [ -z $language ]; then
        language=$(grep -r LANG= "/home/$user/.config/plasma-localerc" | cut -d"=" -f 2- | cut -d"." -f -1 | tr [A-Z] [a-z] | sed 's/_/-/')
    fi
elif test -e "/home/$user/.config/user-dirs.locale"; then
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

# Functions that display notifications in the system tray icon
#Checking for updates
function check_updates() {
    killall install-update.py
    killall alert-update.py
    ps -C check-update.py >/dev/null
    if [ $? = 1 ]; then
        cd /opt/regataos-update-manager/tray-icon/
        ./check-update.py &
        /bin/bash $scriptNotify -check-up
    fi
}

#Installing updates
function install_updates() {
    killall check-update.py
    killall alert-update.py
    ps -C install-update.py >/dev/null
    if [ $? = 1 ]; then
        cd /opt/regataos-update-manager/tray-icon/
        ./install-update.py &
        /bin/bash $scriptNotify -up-system
    fi
}

#Alert about updates
function alert_updates() {
    killall check-update.py
    killall install-update.py
    ps -C alert-update.py >/dev/null
    if [ $? = 1 ]; then
        cd /opt/regataos-update-manager/tray-icon/
        ./alert-update.py &
        /bin/bash $scriptNotify -show-up
    fi
}

#There are no updates
function no_updates() {
    /bin/bash $scriptNotify -no-up
    sleep 5
    killall check-update.py
    killall install-update.py
    killall alert-update.py
}

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

# By default just check for update (autoupdate=2).
if test ! -e "$HOME/.config/regataos-update/regataos-update.conf"; then
    mkdir -p "$HOME/.config/regataos-update"
    echo "autoupdate=2" >"$HOME/.config/regataos-update/regataos-update.conf"
fi

# If the Calamares Installer is installed, just exit
if test -e "/usr/bin/calamares"; then
    echo "The Calamares Installer was detected, leaving..."
    echo "no-updates" >"/tmp/regataos-update/status.txt"
    echo "" >"/tmp/regataos-update/already_updated.txt"
    killall alert-update.py
    killall install-update.py
    killall check-update.py
    exit 0
else
    # Checking internet connection
    if ! ping -c 1 www.google.com.br; then
        # Start the Regata OS Update Manager's service
        echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
        echo "" >"/tmp/regataos-update/installing-application-other-updates.txt"
        echo "" >"/tmp/regataos-update/system-update-installed.txt"
        echo "" >"/tmp/regataos-update/waiting-for-installation.txt"
        echo "" >"/tmp/regataos-update/installing-system-update.txt"
        echo "" >"/tmp/regataos-update/downloading-system-update.txt"
        sleep 3600
        /bin/bash /opt/regataos-update-manager/scripts/regataos-up-service.sh
    else
        # Create cache and configuration directory
        if test ! -e "/tmp/regataos-update"; then
            mkdir -p "/tmp/regataos-update/"
            chmod 777 "/tmp/regataos-update"
            chmod 777 /tmp/regataos-update/*
        else
            chmod 777 "/tmp/regataos-update"
            chmod 777 /tmp/regataos-update/*
        fi

        if test ! -e "/var/log/regataos-logs"; then
            mkdir -p "/var/log/regataos-logs/"
            chmod 777 "/var/log/regataos-logs"
            chmod 777 /var/log/regataos-logs/*
        else
            chmod 777 "/var/log/regataos-logs"
            chmod 777 /var/log/regataos-logs/*
        fi

        # Check update manager configuration
        auto_up_config=$(grep -r "autoupdate=" $HOME/.config/regataos-update/regataos-update.conf | cut -d"=" -f 2-)

        # Create file with current status
        if [[ $(echo "$auto_up_config") == *"3"* ]]; then
            echo "never-updates" >"/tmp/regataos-update/status.txt"
        fi

        if test ! -e "/tmp/regataos-update/config"; then
            ln -sf "$HOME/.config/regataos-update" "/tmp/regataos-update/config"
        fi

        echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
        echo "" >"/tmp/regataos-update/installing-application-other-updates.txt"
        echo "" >"/tmp/regataos-update/system-update-installed.txt"
        echo "" >"/tmp/regataos-update/waiting-for-installation.txt"
        echo "" >"/tmp/regataos-update/installing-system-update.txt"
        echo "" >"/tmp/regataos-update/downloading-system-update.txt"
        rm -f "/var/log/regataos-logs/updated-apps.txt"

        # Check for updates
        run_check=1
        if [[ $(echo "$auto_up_config") == *"1"* ]]; then
            if ! should_run_auto_update; then
                echo "Skipping automatic check: update frequency interval not elapsed yet."
                run_check=0
            fi
        elif [[ $(echo "$auto_up_config") == *"3"* ]]; then
            run_check=0
        fi

        if [ $run_check -eq 1 ]; then
            sudo /opt/regataos-update-manager/scripts/regataos-up.sh -check-up-config
            if [[ $(echo "$auto_up_config") == *"1"* ]]; then
                date +%s >"$HOME/.config/regataos-update/last-autoupdate-timestamp"
            fi

            # Verify that the first update check is complete
            if test -e "/tmp/regataos-update/package-list.txt"; then
                sed -i '/^$/d' "/tmp/regataos-update/package-list.txt"
                number_packages=$(wc -l /tmp/regataos-update/package-list.txt | awk '{print $1}')
                if [ $(echo $number_packages) -ge 1 ]; then
                    echo "" >"/tmp/regataos-update/already_updated.txt"
                fi
            elif test -e "/tmp/regataos-update/apps-list.txt"; then
                sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt"
                number_apps=$(wc -l /tmp/regataos-update/apps-list.txt | awk '{print $1}')
                if [ $(echo $number_apps) -ge 1 ]; then
                    echo "" >"/tmp/regataos-update/already_updated.txt"
                fi
            else
                echo "No updates found!"
            fi

            # Show number of updates and activate the icon in the system tray
            if test -e "/tmp/regataos-update/already_updated.txt"; then
                # Check update manager configuration
                auto_up_config=$(grep -r "autoupdate=" $HOME/.config/regataos-update/regataos-update.conf | cut -d"=" -f 2-)
                # Make sure the first automatic system update is enabled by default
                # to update the system automatically on the first system boot.
                if test -e "/usr/share/regataos/first-update.txt"; then
                    if [[ $(echo "$auto_up_config") == *"2"* ]]; then
                        sed -i "s/autoupdate=2/autoupdate=1/" "$HOME/.config/regataos-update/regataos-update.conf"
                    fi
                fi

                if [[ $(echo "$auto_up_config") == *"1"* ]]; then
                    if test -e "/tmp/regataos-update/apps-list.txt"; then
                        if test ! -e "/tmp/regataos-update/updated-apps.txt"; then
                            echo "" >"/tmp/regataos-update/updated-apps.txt"
                        fi

                        for i in /opt/regataos-store/apps-list/*.json; do
                            # Capture information about the package that will be downloaded and installed
                            app_nickname="$(grep -R '"nickname":' $i | awk '{print $2}' | sed 's/"\|,//g')"
                            package_name="$(grep -R '"package":' $i | awk '{print $2}' | sed 's/"\|,//g')"

                            if [[ $(grep -r "$package_name" "/tmp/regataos-update/apps-list.txt") == *"$package_name"* ]]; then
                                echo "$app_nickname" >>"/tmp/regataos-update/list-apps-queue.txt"
                            fi
                        done

                        sed -i '/^$/d' "/tmp/regataos-update/list-apps-queue.txt"
                        echo "installing-updates" >"/tmp/regataos-update/status.txt"

                        rm -f "/tmp/regataos-update/all-auto-update.txt"
                        rm -f "/tmp/regataos-update/install-updates.txt"
                        rm -f "/tmp/regataos-update/stop-all-update.txt"

                        install_updates &
                        sudo /opt/regataos-update-manager/scripts/regataos-up-all.sh

                        if test ! -e "/tmp/regataos-update/stop-all-update.txt"; then
                            /bin/bash $scriptNotify -upd-system
                        fi
                    else
                        if test ! -e "/tmp/regataos-update/updated-apps.txt"; then
                            echo "" >"/tmp/regataos-update/updated-apps.txt"
                        fi

                        echo "installing-updates" >"/tmp/regataos-update/status.txt"
                        echo "other-updates" >"/tmp/regataos-update/list-apps-queue.txt"
                        rm -f "/tmp/regataos-update/all-auto-update.txt"
                        rm -f "/tmp/regataos-update/install-updates.txt"
                        rm -f "/tmp/regataos-update/stop-all-update.txt"

                        install_updates &
                        sudo /opt/regataos-update-manager/scripts/regataos-up-other-up.sh

                        if test ! -e "/tmp/regataos-update/stop-all-update.txt"; then
                            /bin/bash $scriptNotify -upd-system
                        fi
                    fi
                elif [[ $(echo "$auto_up_config") == *"2"* ]]; then
                    echo "show-updates" >"/tmp/regataos-update/status.txt"
                    alert_updates
                elif [[ $(echo "$auto_up_config") == *"3"* ]]; then
                    echo "Nothing to do..."
                else
                    echo "Nothing to do..."
                fi
            else
                if [[ $(echo "$auto_up_config") == *"1"* ]]; then
                    no_updates
                elif [[ $(echo "$auto_up_config") == *"2"* ]]; then
                    no_updates
                elif [[ $(echo "$auto_up_config") == *"3"* ]]; then
                    echo "Nothing to do..."
                else
                    echo "Nothing to do..."
                fi
            fi
        else
            # Check was skipped: frequency interval has not elapsed yet (or autoupdate=3)
            killall check-update.py 2>/dev/null
            if [[ $(echo "$auto_up_config") == *"1"* ]]; then
                echo "updated" >"/tmp/regataos-update/status.txt"
                chmod 777 "/tmp/regataos-update/status.txt" 2>/dev/null
            elif [[ $(echo "$auto_up_config") == *"3"* ]]; then
                echo "never-updates" >"/tmp/regataos-update/status.txt"
                chmod 777 "/tmp/regataos-update/status.txt" 2>/dev/null
            fi
        fi

        # Start the Regata OS Update Manager's service
        sleep 3600
        /bin/bash /opt/regataos-update-manager/scripts/regataos-up-service.sh
    fi
fi
