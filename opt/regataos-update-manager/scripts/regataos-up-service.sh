#!/bin/bash

cd /

while :; do
    # Detect system language
    user=$(users | awk '{print $1}')
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

    function update_service() {
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

            local elapsed=$(( now - last ))
            if [ $elapsed -ge $min_interval ]; then
                return 0
            else
                return 1
            fi
        }

        # Check update manager configuration
        auto_up_config=$(grep -r "autoupdate=" $HOME/.config/regataos-update/regataos-update.conf | cut -d"=" -f 2-)

        # Create file with current status
        if [[ $(echo "$auto_up_config") == *"3"* ]]; then
            echo "never-updates" >"/tmp/regataos-update/status.txt"
        fi

        ps -C "regataos-up-all.sh | regataos-up-specific.sh | regataos-other-up.sh | regataos-up-other-up.sh | regataos-cancel-up-specific.sh | regataos-up-cancel-all.sh | regataosgcs | regataosupdate | zypper | magma | steam | UbisoftConnect.exe | Launcher.exe | Origin.exe | GalaxyClient.exe | EpicGamesLauncher.exe | Battle.net.exe" >/dev/null
        if [ $? = 1 ]; then
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
            fi

            # First update check completed
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
                    echo "Nothing to do ..."
                else
                    echo "Nothing to do ..."
                fi
            else
                echo "Nothing to do ..."
            fi
        fi
    }

    # Checking internet connection
    if ! ping -c 1 www.google.com.br; then
        echo "Offline!"
    else
        ps -C "regataos-up-all.sh | regataos-up-specific.sh | regataos-other-up.sh | regataos-up-other-up.sh | regataos-cancel-up-specific.sh | regataos-up-cancel-all.sh | regataosgcs | zypper | magma | steam | regataos-store | regataos-gcs | rungame | rungame-epicstore | rungame-gog | rungame-steam | runlauncher | runlauncher_exe | UbisoftConnect.exe | Launcher.exe | Origin.exe | GalaxyClient.exe | EpicGamesLauncher.exe | Battle.net.exe | heroic | steamwebhelper | minigalaxy | lutris" >/dev/null
        if [ $? = 1 ]; then
            update_service
        fi
    fi

    sleep 10800
done
