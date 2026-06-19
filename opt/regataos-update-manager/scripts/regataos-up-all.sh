#!/bin/bash

# This script is used by the "Regata OS Update" application to update all package.

if test ! -e "/tmp/regataos-update"; then
    mkdir -p "/tmp/regataos-update"
    chmod 777 "/tmp/regataos-update"
    chmod 777 /tmp/regataos-update/*
else
    chmod 777 "/tmp/regataos-update"
    chmod 777 /tmp/regataos-update/*
fi

rm -f "/tmp/regataos-update/stop-all-update.txt"

function update_all_apps() {
    echo "" >"/tmp/regataos-update/downloadable-application.txt"
    echo "" >"/tmp/regataos-update/installing-application.txt"

    echo "" >"/tmp/regataos-update/downloadable-application-other-updates.txt"
    echo "" >"/tmp/regataos-update/installing-application-other-updates.txt"
    echo "" >"/tmp/regataos-update/system-update-installed.txt"
    echo "" >"/tmp/regataos-update/waiting-for-installation.txt"
    echo "" >"/tmp/regataos-update/installing-system-update.txt"
    echo "" >"/tmp/regataos-update/downloading-system-update.txt"

    echo "" >"/tmp/regataos-update/update-in-progress.txt"

    # Prepare package download link
    repoUrl="$repo_link"
    if [[ $repoUrl == *"[mainRepositoryUrl]"* ]]; then
        repo_link="$(grep -r mainRepositoryUrl= /usr/share/regataos/regataos-base-version.txt | cut -d'=' -f 2-)"

    elif [[ $repoUrl == *"[basedOnVersion]"* ]]; then
        basedOnVersion="$(grep -r basedOnVersion= /usr/share/regataos/regataos-base-version.txt | cut -d'=' -f 2-)"
        repo_link=$(echo $repoUrl | sed "s,\[basedOnVersion\],$basedOnVersion,")

    elif [[ $repoUrl == *"[basedOn]"* ]]; then
        basedOn="$(grep -r basedOn= /usr/share/regataos/regataos-base-version.txt | cut -d'=' -f 2-)"
        repo_link=$(echo $repoUrl | sed "s,\[basedOn\],$basedOn,")

    else
        repo_link="$repoUrl"
    fi

    if [ -z $download_link ]; then
        version=$(zypper --non-interactive info $package_name | grep Ver | awk '{print $3}' | tail -1)
        app_download_file_name="$package_name-$version.$architecture.rpm"
        app_download_link="$repo_link/$architecture/$app_download_file_name"

    elif [[ $download_link == *"undefined"* ]]; then
        version=$(zypper --non-interactive info $package_name | grep Ver | awk '{print $3}' | tail -1)
        app_download_file_name="$package_name-$version.$architecture.rpm"
        app_download_link="$repo_link/$app_download_file_name"

    else
        version=$(zypper --non-interactive info $package_name | grep Ver | awk '{print $3}' | tail -1 | sed "s/-0//")
        app_download_file_name="$package_name-$version.$architecture.rpm"
        app_download_link=$(echo $download_link | sed "s/\[version\]/$version/")
    fi

    # Tell the app which app is being downloaded
    number_packages=$(wc -l /tmp/regataos-update/package-list.txt | awk '{print $1}')
    if [ $(echo $number_packages) -ge 1 ]; then
        if [[ $(grep -r "other-updates" "/tmp/regataos-update/list-apps-queue.txt") != *"other-updates"* ]]; then
            if [[ $(grep -r "other-updates" "/tmp/regataos-update/updated-apps.txt") != *"other-updates"* ]]; then
                echo "other-updates" >>"/tmp/regataos-update/list-apps-queue.txt"
            fi
        fi
    fi

    first_list_item=$(cat /tmp/regataos-update/list-apps-queue.txt | head -1 | tail -1)
    sed -i "s/$first_list_item//" "/tmp/regataos-update/list-apps-queue.txt"
    sed -i '/^$/d' "/tmp/regataos-update/list-apps-queue.txt"
    echo "$first_list_item" >"/tmp/regataos-update/downloadable-application.txt"

    # Download app
    echo "wget --no-check-certificate -O /tmp/regataos-update/$app_download_file_name $app_download_link" >"/tmp/regataos-update/get-pid.txt"
    wget --no-check-certificate -O /tmp/regataos-update/$app_download_file_name $app_download_link 2>&1 | (pv -n >/tmp/regataos-update/$app_nickname-download-percentage.log)

    # Install package
    if test ! -e "/tmp/regataos-update/cancel-up-$app_nickname.txt"; then
        # Tell the app which app is being installed
        rm -f "/tmp/regataos-update/get-pid.txt"
        rm -f "/tmp/regataos-update/$app_nickname-download-percentage.log"
        echo "$(cat /tmp/regataos-update/downloadable-application.txt)" >"/tmp/regataos-update/installing-application.txt"
        echo "" >"/tmp/regataos-update/downloadable-application.txt"

        echo "" >"/tmp/regataos-update/installation-in-progress.txt"
        cd /tmp/regataos-update/
        {
            sudo zypper --non-interactive --no-gpg-checks install --allow-downgrade --replacefiles --auto-agree-with-licenses $app_download_file_name
        } 2>&1 | tee -a "/var/log/regataos-logs/regataos-update-$package_name.log"

        # Run additional application settings
        if test -e "/tmp/regataos-prime/config/regataos-prime.conf"; then
            if [[ $(grep -r "amf=" "/tmp/regataos-prime/config/regataos-prime.conf") == *"amf=on"* ]]; then
                sudo /opt/regataos-prime/scripts/enable-amd-amf -amf-on
            fi
        fi

        sudo /opt/regataos-prime/scripts/apps-hybrid-graphics

        echo "" >"/tmp/regataos-update/installing-application.txt"
        sed -i '/^$/d' "/tmp/regataos-update/installing-application.txt"

        sed -i "s/$package_name//" "/tmp/regataos-update/apps-list.txt"
        sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt"

        if [[ $(grep -r "$app_nickname" "/var/log/regataos-logs/updated-apps.txt") != *"$app_nickname"* ]]; then
            echo "$app_nickname" >>"/var/log/regataos-logs/updated-apps.txt"
            sed -i '/^$/d' "/var/log/regataos-logs/updated-apps.txt"
        fi

        echo "$app_nickname" >>"/tmp/regataos-update/updated-apps.txt"
        sed -i '/^$/d' "/tmp/regataos-update/updated-apps.txt"

        rm -f "/tmp/regataos-update/installation-in-progress.txt"
        rm -f "/tmp/regataos-update/update-in-progress.txt"

        if test -e "/tmp/regataos-update/stop-all-update.txt"; then
            rm -f "/tmp/regataos-update/stop-all-update.txt"
            exit 0
        fi

    else
        sed -i "s/$app_nickname//" "/tmp/regataos-update/updated-apps.txt"
        sed -i '/^$/d' "/tmp/regataos-update/updated-apps.txt"

        sed -i "s/$app_nickname//" "/var/log/regataos-logs/updated-apps.txt"
        sed -i '/^$/d' "/var/log/regataos-logs/updated-apps.txt"
    fi
}

# Update packages, one at a time
for i in /opt/regataos-store/apps-list/*.json; do

    # Capture information about the package that will be downloaded and installed
    app_nickname="$(grep -R '"nickname":' $i | awk '{print $2}' | sed 's/"\|,//g')"
    package_name="$(grep -R '"package":' $i | awk '{print $2}' | sed 's/"\|,//g')"
    architecture="$(grep -R '"architecture":' $i | awk '{print $2}' | sed 's/"\|,//g')"
    download_link="$(grep -R '"download_link":' $i | awk '{print $2}' | sed 's/"\|,//g')"
    repo_link="$(grep -R '"repository_url":' $i | awk '{print $2}' | sed 's/"\|,//g')"

    if [[ $(grep -r "$package_name" "/tmp/regataos-update/apps-list.txt") == *"$package_name"* ]]; then
        if [[ $(grep -r "$app_nickname" "/tmp/regataos-update/installing-application.txt") != *"$app_nickname"* ]]; then
            if [[ $(grep -r "$app_nickname" "/tmp/regataos-update/updated-apps.txt") == *"$app_nickname"* ]]; then
                sed -i "s/$package_name//" "/tmp/regataos-update/apps-list.txt"
                sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt"
            else
                update_all_apps
            fi
        fi
    fi

done

if test -e "/usr/share/regataos/first-update.txt"; then
    rm -f "/usr/share/regataos/first-update.txt"
fi

sudo /opt/regataos-update-manager/scripts/regataos-other-up.sh start
