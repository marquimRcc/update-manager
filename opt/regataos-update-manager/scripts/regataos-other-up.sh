#!/bin/bash

# This script is used by the "Regata OS Update" application to update other updates.

source "/opt/regataos-update-manager/scripts/regataos-update-healing.sh"

if test -e "/tmp/regataos-update/stop-all-update.txt"; then
    rm -f "/tmp/regataos-update/stop-all-update.txt"
    exit
fi

# Ensure locks are clear before starting
check_and_release_zypp_locks 15

if [[ $(grep -r "other-updates" "/tmp/regataos-update/updated-apps.txt") != *"other-updates"* ]]; then
    if [[ $(grep -r "other-updates" "/tmp/regataos-update/list-apps-queue.txt") == *"other-updates"* ]] || \
       [[ $(grep -r "other-updates" "/tmp/regataos-update/downloadable-application-other-updates.txt") == *"other-updates"* ]] || \
       [[ "$1" == "start" ]]; then
        echo "" >"/tmp/regataos-update/list-apps-queue.txt"
        echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
        echo "other-updates" >"/tmp/regataos-update/installing-application-other-updates.txt"
        echo "other-updates" >"/tmp/regataos-update/installing-system-update.txt"

        sed -i '/other-updates/d' "/tmp/regataos-update/updated-apps.txt" 2>/dev/null
        echo "" >"/tmp/regataos-update/other-updates-in-progress.txt"

        export HEALING_PIPE_LOG="/var/log/regataos-logs/regataos-other-updates.log"

        # Fix YaST2 installation
        sudo zypper --non-interactive rm ruby2.5 ruby2.5-rubygem-abstract_method ruby2.5-rubygem-cfa ruby2.5-rubygem-cfa_grub2 ruby2.5-rubygem-cheetah ruby2.5-rubygem-fast_gettext ruby2.5-rubygem-gem2rpm ruby2.5-rubygem-mini_portile2 ruby2.5-rubygem-nokogiri ruby2.5-rubygem-ruby-augeas ruby2.5-rubygem-ruby-dbus ruby2.5-rubygem-simpleidn ruby2.5-stdlib yast2-snapper 2>/dev/null

        run_zypper_resilient in --allow-downgrade --replacefiles ruby ruby3.4 ruby3.4-rubygem-abstract_method ruby3.4-rubygem-cfa ruby3.4-rubygem-cheetah ruby3.4-rubygem-fast_gettext ruby3.4-rubygem-gem2rpm ruby3.4-rubygem-nokogiri ruby3.4-rubygem-ruby-augeas ruby3.4-rubygem-ruby-dbus ruby3.4-rubygem-simpleidn ruby-common yast2 yast2-country-data yast2-hardware-detection yast2-packager yast2-ruby-bindings yast2-storage-ng yast2-transfer

        run_zypper_resilient up --allow-downgrade --replacefiles regataos-base plasma6-desktop plasma6-workspace plasma6-session plasma6-session-x11

        run_zypper_resilient update --allow-downgrade --replacefiles --auto-agree-with-licenses

        echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
        echo "" >"/tmp/regataos-update/installing-application-other-updates.txt"
        echo "" >"/tmp/regataos-update/system-update-installed.txt"
        echo "" >"/tmp/regataos-update/waiting-for-installation.txt"
        echo "" >"/tmp/regataos-update/installing-system-update.txt"
        echo "" >"/tmp/regataos-update/downloading-system-update.txt"

        echo "other-updates" >>"/tmp/regataos-update/updated-apps.txt"
        sed -i '/^$/d' "/tmp/regataos-update/updated-apps.txt"

        sed -i "s/other-updates//" "/tmp/regataos-update/apps-list.txt"
        sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt"

        rm -f "/tmp/regataos-update/other-updates-in-progress.txt"
    fi
fi

number_packages=$(wc -l /tmp/regataos-update/package-list.txt | awk '{print $1}')
if [ $(echo $number_packages) -ge 1 ]; then
    if [[ $(grep -r "other-updates" "/tmp/regataos-update/updated-apps.txt") == *"other-updates"* ]]; then
        if test -e "/tmp/regataos-update/apps-list.txt"; then
            number_apps=$(wc -l /tmp/regataos-update/apps-list.txt | awk '{print $1}')
            if [ $(echo $number_apps) -eq 0 ]; then
                echo "updated" >"/tmp/regataos-update/status.txt"
                rm -f /tmp/regataos-update/already_updated.txt
                rm -f /tmp/regataos-update/*.rpm
                killall install-update.py
                killall alert-update.py
            fi

        else
            echo "updated" >"/tmp/regataos-update/status.txt"
            rm -f /tmp/regataos-update/already_updated.txt
            rm -f /tmp/regataos-update/*.rpm
            killall install-update.py
            killall alert-update.py
        fi
    fi

else
    echo "updated" >"/tmp/regataos-update/status.txt"
    rm -f /tmp/regataos-update/already_updated.txt
    rm -f /tmp/regataos-update/*.rpm
    killall install-update.py
    killall alert-update.py
fi

if test -e "/usr/share/regataos/first-update.txt"; then
    rm -f "/usr/share/regataos/first-update.txt"
fi

# Run additional application settings
if test -e "/tmp/regataos-prime/config/regataos-prime.conf"; then
    if [[ $(grep -r "amf=" "/tmp/regataos-prime/config/regataos-prime.conf") == *"amf=on"* ]]; then
        sudo /opt/regataos-prime/scripts/enable-amd-amf -amf-on
    fi
fi

sudo /opt/regataos-prime/scripts/apps-hybrid-graphics
