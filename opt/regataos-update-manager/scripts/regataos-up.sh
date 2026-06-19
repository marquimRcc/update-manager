#!/bin/bash

# Prevent multiple simultaneous instances
LOCKFILE="/tmp/regataos-up.lock"
exec 9>"$LOCKFILE"
if ! flock -n 9; then
    echo "regataos-up.sh is already running. Exiting."
    exit 0
fi

# This script is used by the "Regata OS Update" application to update the
# local cache of software repositories, list available package updates and
# install new software versions.

# Create and configure permissions on the "/var/log/regataos-logs/" directory
if test ! -e "/var/log/regataos-logs"; then
    mkdir -p "/var/log/regataos-logs"
    chmod 777 "/var/log/regataos-logs"
else
    chmod 777 "/var/log/regataos-logs"
fi

# Update the local cache of the repositories and list the available updates.
function search_update() {
    # Clear cache
    rm -f "/var/log/regataos-logs/regataos-other-updates.log"

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
        if test ! -e "/tmp/regataos-update/already_updated.txt"; then
            if test ! -e "/tmp/regataos-update/update-in-progress.txt"; then
                if test ! -e "/tmp/regataos-update/other-updates-in-progress.txt"; then
                    if test ! -e "/tmp/regataos-update/update-specific-in-progress.txt"; then
                        if test ! -e "/tmp/regataos-update"; then
                            mkdir -p "/tmp/regataos-update"
                            chmod 777 "/tmp/regataos-update"
                        else
                            rm -f "/tmp/regataos-update/apps-list.txt"
                            rm -f "/tmp/regataos-update/number-apps.txt"
                            rm -f "/tmp/regataos-update/number-packages.txt"
                            rm -f "/tmp/regataos-update/package-list-html.txt"
                            rm -f "/tmp/regataos-update/package-list.txt"
                            rm -f "/tmp/regataos-update/updated-apps.txt"
                            rm -f /tmp/regataos-update/*.rpm

                            chmod 777 "/tmp/regataos-update"
                        fi

                        # Create file with current status
                        auto_up_config=$(grep -r "autoupdate=" /tmp/regataos-update/config/regataos-update.conf | cut -d"=" -f 2-)
                        if [[ $(echo "$auto_up_config") == *"3"* ]]; then
                            echo "never-updates" >"/tmp/regataos-update/status.txt"
                            exit 0
                        else
                            check_status=$(cat "/tmp/regataos-update/status.txt")
                            if [[ $(echo "$check_status") == *"show-updates"* ]]; then
                                exit 0
                            elif [[ $(echo "$check_status") == *"check-updates"* ]]; then
                                exit 0
                            else
                                echo "check-updates" >"/tmp/regataos-update/status.txt"
                            fi
                        fi

                        {
                            export LC_ALL="en_US.UTF-8"
                            export LANG="en_US.UTF-8"
                            export LANGUAGE="en_US"
                            retry -r 5 -- zypper --non-interactive --no-gpg-checks refresh
                        } 2>&1 | tee "/var/log/regataos-logs/regataos-refresh-repo.log"

                        {
                            export LC_ALL="en_US.UTF-8"
                            export LANG="en_US.UTF-8"
                            export LANGUAGE="en_US"
                            sudo zypper --non-interactive list-updates
                        } 2>&1 | tee "/var/log/regataos-logs/regataos-list-updates.log"

                        sed -i 's/ - x86_64//' "/var/log/regataos-logs/regataos-list-updates.log"
                        get_line=$(grep -n "Reading installed packages" "/var/log/regataos-logs/regataos-list-updates.log" | cut -f1 -d:)
                        package_list=$(cat /var/log/regataos-logs/regataos-list-updates.log | awk '{print $5}' | sed -n "$(($get_line + 3))",'$p')
                        echo "$package_list" >"/tmp/regataos-update/package-list.txt"

                        for i in /opt/regataos-store/apps-list/*.json; do
                            package_name="$(grep -R '"package":' $i | awk '{print $2}' | sed 's/"\|,//g')"
                            package="$(grep -r "$package_name" /tmp/regataos-update/package-list.txt)"

                            if [ -z $(echo $package | awk '{print $1}' | sed "s/$package_name//") ]; then
                                if [[ $package == *"$package_name"* ]]; then
                                    desktop_file=$(rpm -ql $package_name | grep "\.desktop" | head -1 | tail -1)

                                    if [ ! -z $desktop_file ]; then
                                        echo "$package_name" >>"/tmp/regataos-update/apps-list.txt"

                                        # Check if the JSON defines a specific icon path.
                                        json_icon=$(grep -m1 '"icon":' "$i" | awk -F'"' '{print $4}')

                                        if [ ! -z "$json_icon" ] && [ -f "$json_icon" ]; then
                                            # Use the icon path from the JSON directly.
                                            search_icon_directory="$json_icon"
                                        else
                                            # Fall back to searching by the name in the .desktop file.
                                            icon_name=$(grep -m1 -R "Icon=" "$desktop_file" | cut -d"=" -f 2-)

                                            search_icon_directory_svg=$(find /opt/ /usr/share/pixmaps/ /usr/share/icons/breeze/apps/ /usr/share/icons/breeze-dark/apps/ /usr/share/icons/hicolor/ /usr/share/icons/gnome/ -type f -iname $icon_name* | egrep "svg" | sed '/symbolic/d' | head -1 | tail -1)
                                            search_icon_directory_png1=$(find /opt/ /usr/share/pixmaps/ /usr/share/icons/breeze/apps/ /usr/share/icons/breeze-dark/apps/ /usr/share/icons/hicolor/ /usr/share/icons/gnome/ -type f -iname $icon_name* | grep "png" | sed '/symbolic/d' | head -1 | tail -1)
                                            search_icon_directory_png2=$(find /opt/ /usr/share/pixmaps/ /usr/share/icons/breeze/apps/ /usr/share/icons/breeze-dark/apps/ /usr/share/icons/hicolor/ /usr/share/icons/gnome/ -type f -iname $icon_name* | grep "png" | sed '/symbolic/d' | tail -1 | head -1)

                                            if [ -z $search_icon_directory_svg ]; then
                                                size_icon_png1=$(identify -verbose $search_icon_directory_png1 | grep Geometry | awk '{print $2}' | cut -d"x" -f -1)
                                                size_icon_png2=$(identify -verbose $search_icon_directory_png2 | grep Geometry | awk '{print $2}' | cut -d"x" -f -1)

                                                if [ $(echo $size_icon_png1) -gt $(echo $size_icon_png2) ]; then
                                                    search_icon_directory=$(echo $search_icon_directory_png1)

                                                elif [ $(echo $size_icon_png2) -gt $(echo $size_icon_png1) ]; then
                                                    search_icon_directory=$(echo $search_icon_directory_png2)

                                                elif [ $(echo $size_icon_png1) -ge $(echo $size_icon_png2) ]; then
                                                    search_icon_directory=$(echo $search_icon_directory_png2)

                                                elif [ $(echo $size_icon_png2) -ge $(echo $size_icon_png1) ]; then
                                                    search_icon_directory=$(echo $search_icon_directory_png2)

                                                else
                                                    search_icon_directory="/usr/share/icons/breeze-dark/apps/48/ktip.svg"
                                                fi

                                            else
                                                search_icon_directory=$(echo $search_icon_directory_svg)
                                            fi
                                        fi

                                        echo "file://$search_icon_directory" >"/tmp/regataos-update/$package_name-icon.txt"
                                        sed -i "/$package_name/{ s/$package_name//;:a;n;ba }" "/tmp/regataos-update/package-list.txt"
                                    fi
                                fi
                            fi
                        done

                        if test -e "/tmp/regataos-update/package-list.txt"; then
                            sed -i '/^$/d' "/tmp/regataos-update/package-list.txt"

                            number_packages=$(wc -l /tmp/regataos-update/package-list.txt | awk '{print $1}')
                            if [ $(echo $number_packages) -ge 1 ]; then
                                echo "There are $number_packages apps to update"
                                echo "($number_packages)" >"/tmp/regataos-update/number-packages.txt"
                                echo "" >"/tmp/regataos-update/already_updated.txt"
                                if [[ $(echo "$auto_up_config") == *"2"* ]]; then
                                    echo "show-updates" >"/tmp/regataos-update/status.txt"
                                fi
                            fi

                            {
                                echo -e "<div id='system-update-list'>\n"
                                while IFS= read -r file_line || [[ -n "$file_line" ]]; do
                                    echo -e "  <div class='system-update-list-item'>\n    <img src='' alt=''/>\n    <div class='otherup-app-title otherup-app-$file_line'>$file_line</div>\n    <div class='otherup-app-status-waiting otherup-app-status-waiting-$file_line otherup-app-status-desc'>Waiting for installation...</div>\n    <div class='otherup-app-status-download otherup-app-status-download-$file_line otherup-app-status-desc'>Downloading...</div>\n    <div class='otherup-app-status-install otherup-app-status-install-$file_line otherup-app-status-desc'>Installing...</div>\n    <div class='otherup-app-status-concluded otherup-app-status-concluded-$file_line otherup-app-status-desc'>Concluded!</div>\n  </div>\n"
                                done <"/tmp/regataos-update/package-list.txt"
                                echo -e "</div>\n"
                            } 2>&1 | tee "/tmp/regataos-update/package-list-html.txt"

                            if test -e "/var/log/regataos-logs/updated-apps.txt"; then
                                sed -i "s/other-updates//" "/var/log/regataos-logs/updated-apps.txt"
                                sed -i '/^$/d' "/var/log/regataos-logs/updated-apps.txt"
                            fi
                        fi

                        if test -e "/tmp/regataos-update/apps-list.txt"; then
                            sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt"
                            number_apps=$(wc -l /tmp/regataos-update/apps-list.txt | awk '{print $1}')
                            if [ $(echo $number_apps) -ge 1 ]; then
                                if test -e "/tmp/regataos-update/number-packages.txt"; then
                                    echo "There are $(($number_apps + 1)) apps to update"
                                    echo "($(($number_apps + 1)))" >"/tmp/regataos-update/number-apps.txt"
                                    echo "" >"/tmp/regataos-update/already_updated.txt"
                                    if [[ $(echo "$auto_up_config") == *"2"* ]]; then
                                        echo "show-updates" >"/tmp/regataos-update/status.txt"
                                    fi

                                else
                                    echo "There are $number_apps apps to update"
                                    echo "($number_apps)" >"/tmp/regataos-update/number-apps.txt"
                                    echo "" >"/tmp/regataos-update/already_updated.txt"
                                    if [[ $(echo "$auto_up_config") == *"2"* ]]; then
                                        echo "show-updates" >"/tmp/regataos-update/status.txt"
                                    fi
                                fi
                            fi
                        fi

                        if test ! -e "/tmp/regataos-update/number-apps.txt"; then
                            if test ! -e "/tmp/regataos-update/number-packages.txt"; then
                                echo "no-updates" >"/tmp/regataos-update/status.txt"
                                killall alert-update.py
                                killall install-update.py
                                killall check-update.py

                            else
                                ps -C alert-update.py >/dev/null
                                if [ $? = 1 ]; then
                                    cd /opt/regataos-update-manager/tray-icon/
                                    ./alert-update.py
                                fi
                            fi
                        else
                            ps -C alert-update.py >/dev/null
                            if [ $? = 1 ]; then
                                cd /opt/regataos-update-manager/tray-icon/
                                ./alert-update.py
                            fi
                        fi

                        chmod 777 /tmp/regataos-update/*
                        exit
                    fi
                fi
            fi
        fi
    fi
}

# Update packages
function update_packages() {
    # Fix YaST2 installation
    sudo zypper --non-interactive rm ruby2.5 ruby2.5-rubygem-abstract_method ruby2.5-rubygem-cfa ruby2.5-rubygem-cfa_grub2 ruby2.5-rubygem-cheetah ruby2.5-rubygem-fast_gettext ruby2.5-rubygem-gem2rpm ruby2.5-rubygem-mini_portile2 ruby2.5-rubygem-nokogiri ruby2.5-rubygem-ruby-augeas ruby2.5-rubygem-ruby-dbus ruby2.5-rubygem-simpleidn ruby2.5-stdlib yast2-snapper

    {
        export LC_ALL="en_US.UTF-8"
        export LANG="en_US.UTF-8"
        export LANGUAGE="en_US"
        retry -r 20 -- zypper --non-interactive up --allow-downgrade --replacefiles regataos-base plasma6-desktop plasma6-workspace plasma6-session plasma6-session-x11
    } 2>&1 | tee "/var/log/regataos-logs/regataos-update-packages.log"

    {
        export LC_ALL="en_US.UTF-8"
        export LANG="en_US.UTF-8"
        export LANGUAGE="en_US"
        retry -r 20 -- zypper --non-interactive --no-gpg-checks update --allow-downgrade --replacefiles --auto-agree-with-licenses
    } 2>&1 | tee "/var/log/regataos-logs/regataos-update-packages.log"

    # Run additional application settings
    if test -e "/tmp/regataos-prime/config/regataos-prime.conf"; then
        if [[ $(grep -r "amf=" "/tmp/regataos-prime/config/regataos-prime.conf") == *"amf=on"* ]]; then
            sudo /opt/regataos-prime/scripts/enable-amd-amf -amf-on
        fi
    fi

    sudo /opt/regataos-prime/scripts/apps-hybrid-graphics

    exit
}

# Check update settings
function check_up_config() {
    auto_up_config=$(grep -r "autoupdate=" /tmp/regataos-update/config/regataos-update.conf | cut -d"=" -f 2-)
    if [[ $(echo "$auto_up_config") == *"3"* ]]; then
        if test ! -e "/tmp/regataos-update"; then
            mkdir -p "/tmp/regataos-update"
            chmod 777 "/tmp/regataos-update"
            chmod 777 /tmp/regataos-update/*
        else
            chmod 777 "/tmp/regataos-update"
            chmod 777 /tmp/regataos-update/*
        fi

        echo "never-updates" >"/tmp/regataos-update/status.txt"
        exit 0

    else
        search_update
    fi
}

# Stop update
function stop_update() {
    echo "never-updates" >"/tmp/regataos-update/status.txt"
    rm -f "/tmp/regataos-update/all-auto-update.txt"
    rm -f "/tmp/regataos-update/install-updates.txt"
    echo "" >"/tmp/regataos-update/stop-all-update.txt"
    sudo /opt/regataos-update-manager/scripts/regataos-up-cancel-all.sh

    ps -C rpm >/dev/null
    if [ $? = 1 ]; then
        killall regataos-up.sh
        killall retry
        killall zypper
        echo "never-updates" >"/tmp/regataos-update/status.txt"
        exit 0
    fi
}

# Run options
case $1 in
"-check-up-config")
    check_up_config
    ;;
"-install-up")
    update_packages
    ;;
"-stop-up")
    stop_update
    ;;
*)
    echo "Invalid option!"
    exit 1
    ;;
esac
