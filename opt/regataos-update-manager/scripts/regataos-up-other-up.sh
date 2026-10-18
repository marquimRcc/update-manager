#!/bin/bash

# This script is used by the "Regata OS Update" application to update other updates.

source "/opt/regataos-update-manager/scripts/regataos-update-healing.sh"

if test -e "/tmp/regataos-update/stop-all-update.txt"; then
    rm -f "/tmp/regataos-update/stop-all-update.txt"
    exit
fi

# Ensure locks are clear before starting
check_and_release_zypp_locks 15

if [[ $(grep -r "other-updates" "/tmp/regataos-update/list-apps-queue.txt") == *"other-updates"* ]]; then
    echo "installing-updates" >"/tmp/regataos-update/status.txt"
    echo "" >"/tmp/regataos-update/list-apps-queue.txt"
    echo "other-updates" >"/tmp/regataos-update/downloadable-application-other-updates.txt"

    echo "" >"/tmp/regataos-update/update-in-progress.txt"
    echo "other-updates" >"/tmp/regataos-update/other-updates-in-progress.txt"

    echo "" >"/tmp/regataos-update/installing-application-other-updates.txt"

    rm -f "/var/log/regataos-logs/regataos-other-updates.log"
    touch "/var/log/regataos-logs/regataos-other-updates.log"
    chmod 777 "/var/log/regataos-logs/regataos-other-updates.log"

    export HEALING_PIPE_LOG="/var/log/regataos-logs/regataos-other-updates.log"

    # Fix YaST2 installation
    sudo zypper --non-interactive rm ruby2.5 ruby2.5-rubygem-abstract_method ruby2.5-rubygem-cfa ruby2.5-rubygem-cfa_grub2 ruby2.5-rubygem-cheetah ruby2.5-rubygem-fast_gettext ruby2.5-rubygem-gem2rpm ruby2.5-rubygem-mini_portile2 ruby2.5-rubygem-nokogiri ruby2.5-rubygem-ruby-augeas ruby2.5-rubygem-ruby-dbus ruby2.5-rubygem-simpleidn ruby2.5-stdlib yast2-snapper 2>/dev/null

    run_zypper_resilient in --allow-downgrade --replacefiles ruby ruby3.4 ruby3.4-rubygem-abstract_method ruby3.4-rubygem-cfa ruby3.4-rubygem-cheetah ruby3.4-rubygem-fast_gettext ruby3.4-rubygem-gem2rpm ruby3.4-rubygem-nokogiri ruby3.4-rubygem-ruby-augeas ruby3.4-rubygem-ruby-dbus ruby3.4-rubygem-simpleidn ruby-common yast2 yast2-country-data yast2-hardware-detection yast2-packager yast2-ruby-bindings yast2-storage-ng yast2-transfer

    run_zypper_resilient up --allow-downgrade --replacefiles regataos-base plasma6-desktop plasma6-workspace plasma6-session plasma6-session-x11

    # Perform package update with resilient auto-healing and --download-as-needed
    update_exit_code=0
    if [ -s "/tmp/regataos-update/package-list.txt" ]; then
        run_zypper_resilient update --allow-downgrade --replacefiles --auto-agree-with-licenses $(cat /tmp/regataos-update/package-list.txt | tr '\n' ' ')
        update_exit_code=$?
    else
        run_zypper_resilient update --allow-downgrade --replacefiles --auto-agree-with-licenses
        update_exit_code=$?
    fi

    # Run additional application settings
    if test -e "/tmp/regataos-prime/config/regataos-prime.conf"; then
        if [[ $(grep -r "amf=" "/tmp/regataos-prime/config/regataos-prime.conf") == *"amf=on"* ]]; then
            sudo /opt/regataos-prime/scripts/enable-amd-amf -amf-on
        fi
    fi

    sudo /opt/regataos-prime/scripts/apps-hybrid-graphics

    echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
    echo "" >"/tmp/regataos-update/installing-application-other-updates.txt"
    echo "" >"/tmp/regataos-update/system-update-installed.txt"
    echo "" >"/tmp/regataos-update/waiting-for-installation.txt"
    echo "" >"/tmp/regataos-update/installing-system-update.txt"
    echo "" >"/tmp/regataos-update/downloading-system-update.txt"
    rm -f "/tmp/regataos-update/update-in-progress.txt"
    rm -f "/tmp/regataos-update/other-updates-in-progress.txt"

    if is_zypper_success "$update_exit_code"; then
        echo "other-updates" >>"/tmp/regataos-update/updated-apps.txt"
        sed -i '/^$/d' "/tmp/regataos-update/updated-apps.txt"

        sed -i "s/other-updates//" "/tmp/regataos-update/apps-list.txt"
        sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt"

        echo "All packages have been updated" >>"/var/log/regataos-logs/regataos-other-updates.log"
    else
        echo "Aviso: Atualização do sistema finalizou com erro (código $update_exit_code)." >> "$HEALING_PIPE_LOG"
        echo "error" > "/tmp/regataos-update/system-update-error.txt"
        echo "update-error" > "/tmp/regataos-update/status.txt"
    fi
fi

if [ ! -f "/tmp/regataos-update/system-update-error.txt" ]; then
    if test -e "/tmp/regataos-update/apps-list.txt"; then
        number_packages=$(wc -l /tmp/regataos-update/apps-list.txt 2>/dev/null | awk '{print $1}')
        if [ "${number_packages:-0}" -lt 1 ]; then
            echo "updated" >"/tmp/regataos-update/status.txt"
            rm -f "/tmp/regataos-update/already_updated.txt"
            pkill -f "alert-update.py" 2>/dev/null
            pkill -f "install-update.py" 2>/dev/null
        fi
    else
        echo "updated" >"/tmp/regataos-update/status.txt"
        rm -f "/tmp/regataos-update/already_updated.txt"
        pkill -f "alert-update.py" 2>/dev/null
        pkill -f "install-update.py" 2>/dev/null
    fi
fi

if test -e "/usr/share/regataos/first-update.txt"; then
    rm -f "/usr/share/regataos/first-update.txt"
fi

rm -f "/tmp/regataos-update/all-auto-update.txt"
rm -f "/tmp/regataos-update/install-updates.txt"
