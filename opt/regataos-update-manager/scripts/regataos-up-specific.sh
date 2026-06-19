#!/bin/bash

cd /

while :
do

# This script is used by the "Regata OS Update" application to update all package.
if test ! -e "/tmp/regataos-update"; then
	mkdir -p "/tmp/regataos-update"
	chmod 777 "/tmp/regataos-update"
	chmod 777 /tmp/regataos-update/*
else
	chmod 777 "/tmp/regataos-update"
	chmod 777 /tmp/regataos-update/*
fi

if test ! -e "/tmp/regataos-update/downloadable-application.txt"; then
    echo "" > "/tmp/regataos-update/downloadable-application.txt"
fi
if test ! -e "/tmp/regataos-update/installing-application.txt"; then
    echo "" > "/tmp/regataos-update/installing-application.txt"
fi
if test ! -e "/tmp/regataos-update/downloadable-application-other-updates.txt"; then
    echo "" > "/tmp/regataos-update/downloadable-application-other-updates.txt"
fi
if test ! -e "/tmp/regataos-update/installing-application-other-updates.txt"; then
    echo "" > "/tmp/regataos-update/installing-application-other-updates.txt"
fi

# Name of the application's JSON file
export json_filename="$NICKNAME"
export json_filename_dir="/opt/regataos-store/apps-list/$json_filename.json"

function update_all_apps() {
    echo "" > "/tmp/regataos-update/update-specific-in-progress.txt"

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

    first_list_item=$(cat /tmp/regataos-update/list-apps-queue.txt | head -1 | tail -1)
    sed -i "s/$first_list_item//" "/tmp/regataos-update/list-apps-queue.txt"
    sed -i '/^$/d' "/tmp/regataos-update/list-apps-queue.txt"
    echo "$first_list_item" > "/tmp/regataos-update/downloadable-application.txt"

    # Download app
    echo "wget --no-check-certificate -O /tmp/regataos-update/$app_download_file_name $app_download_link" > "/tmp/regataos-update/get-pid-$app_nickname.txt"
    wget --no-check-certificate -O /tmp/regataos-update/$app_download_file_name $app_download_link 2>&1 | (pv -n > /tmp/regataos-update/$app_nickname-download-percentage.log)

    # Install package
    if test ! -e "/tmp/regataos-update/cancel-up-$app_nickname.txt"; then
        # Tell the app which app is being installed
        rm -f "/tmp/regataos-update/get-pid-$app_nickname.txt"
        rm -f "/tmp/regataos-update/$app_nickname-download-percentage.log"
        echo "$(cat /tmp/regataos-update/downloadable-application.txt)" > "/tmp/regataos-update/installing-application.txt"
        echo "" > "/tmp/regataos-update/downloadable-application.txt"

        echo "" > "/tmp/regataos-update/installation-in-progress.txt"
        cd /tmp/regataos-update/
        {
        retry -r 20 -- zypper --non-interactive --no-gpg-checks install --allow-downgrade --replacefiles --auto-agree-with-licenses $app_download_file_name
        } 2>&1 | tee -a "/var/log/regataos-logs/regataos-update-$package_name.log"

        # Run additional application settings
        if test -e "/tmp/regataos-prime/config/regataos-prime.conf"; then
            if [[ $(grep -r "amf=" "/tmp/regataos-prime/config/regataos-prime.conf") == *"amf=on"* ]]; then
                sudo /opt/regataos-prime/scripts/enable-amd-amf -amf-on
            fi
        fi

        sudo /opt/regataos-prime/scripts/apps-hybrid-graphics

        echo "" > "/tmp/regataos-update/installing-application.txt"
        sed -i '/^$/d' "/tmp/regataos-update/installing-application.txt"

        sed -i "s/$package_name//" "/tmp/regataos-update/apps-list.txt"
        sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt"

        number_apps=$(wc -l /tmp/regataos-update/apps-list.txt | awk '{print $1}')
        if [ $(echo $number_apps) -eq 0 ]; then
            echo "updated" > "/tmp/regataos-update/status.txt"
            rm -f "/tmp/regataos-update/already_updated.txt"
            killall alert-update.py
            killall install-update.py
            kill -KILL $(ps -C "python install-update.py" | awk '{print $1}'| tail -1)
        fi

        if [[ $(grep -r "$app_nickname" "/var/log/regataos-logs/updated-apps.txt") != *"$app_nickname"* ]]; then
            echo "$app_nickname" >> "/var/log/regataos-logs/updated-apps.txt"
            sed -i '/^$/d' "/var/log/regataos-logs/updated-apps.txt"
        fi

        echo "$app_nickname" >> "/tmp/regataos-update/updated-apps.txt"
        sed -i '/^$/d' "/tmp/regataos-update/updated-apps.txt"

        rm -f "/tmp/regataos-update/installation-in-progress.txt"

        sed -i '/^$/d' "/tmp/regataos-update/downloadable-application.txt"
        sed -i '/^$/d' "/tmp/regataos-update/installing-application.txt"
        sed -i '/^$/d' "/tmp/regataos-update/list-apps-queue.txt"

        download=$(wc -l /tmp/regataos-update/downloadable-application.txt | awk '{print $1}')
        installation=$(wc -l /tmp/regataos-update/installing-application.txt | awk '{print $1}')
        queue=$(wc -l /tmp/regataos-update/list-apps-queue.txt | awk '{print $1}')

        if [ $(echo $(($download+$installation+$queue))) -eq 0 ]; then
            rm -f "/tmp/regataos-update/update-specific-in-progress.txt"
        fi

        if test -e "/tmp/regataos-update/stop-all-update.txt"; then
            rm -f "/tmp/regataos-update/stop-all-update.txt"
            break
        else
            break
        fi

    else
        sed -i "s/$app_nickname//" "/tmp/regataos-update/updated-apps.txt"
        sed -i '/^$/d' "/tmp/regataos-update/updated-apps.txt"

        sed -i "s/$app_nickname//" "/var/log/regataos-logs/updated-apps.txt"
        sed -i '/^$/d' "/var/log/regataos-logs/updated-apps.txt"

        sed -i '/^$/d' "/tmp/regataos-update/downloadable-application.txt"
        sed -i '/^$/d' "/tmp/regataos-update/installing-application.txt"
        sed -i '/^$/d' "/tmp/regataos-update/list-apps-queue.txt"

        download=$(wc -l /tmp/regataos-update/downloadable-application.txt | awk '{print $1}')
        installation=$(wc -l /tmp/regataos-update/installing-application.txt | awk '{print $1}')
        queue=$(wc -l /tmp/regataos-update/list-apps-queue.txt | awk '{print $1}')

        if [ $(echo $(($download+$installation+$queue))) -eq 0 ]; then
            rm -f "/tmp/regataos-update/update-specific-in-progress.txt"
        fi

        rm -f "/tmp/regataos-update/cancel-up-$app_nickname.txt"
        break
    fi
}

# Update packages, one at a time
if test -e "$json_filename_dir"; then
    # Capture information about the package that will be downloaded and installed
    app_nickname="$(grep -R '"nickname":' $json_filename_dir | awk '{print $2}' | sed 's/"\|,//g')"
	package_name="$(grep -R '"package":' $json_filename_dir | awk '{print $2}' | sed 's/"\|,//g')"
    architecture="$(grep -R '"architecture":' $json_filename_dir | awk '{print $2}' | sed 's/"\|,//g')"
    download_link="$(grep -R '"download_link":' $json_filename_dir | awk '{print $2}' | sed 's/"\|,//g')"
    repo_link="$(grep -R '"repository_url":' $json_filename_dir | awk '{print $2}' | sed 's/"\|,//g')"

    if [[ $(grep -r "$package_name" "/tmp/regataos-update/apps-list.txt") == *"$package_name"* ]]; then
        if [[ $(grep -r "$app_nickname" "/tmp/regataos-update/installing-application.txt") != *"$app_nickname"* ]]; then
            if [[ $(grep -r "$app_nickname" "/tmp/regataos-update/updated-apps.txt") == *"$app_nickname"* ]]; then
                sed -i "s/$package_name//" "/tmp/regataos-update/apps-list.txt"
                sed -i '/^$/d' "/tmp/regataos-update/apps-list.txt"
            else
                sed -i '/^$/d' "/tmp/regataos-update/downloadable-application.txt"
                sed -i '/^$/d' "/tmp/regataos-update/installing-application.txt"
                download=$(wc -l /tmp/regataos-update/downloadable-application.txt | awk '{print $1}')
                installation=$(wc -l /tmp/regataos-update/installing-application.txt | awk '{print $1}')

                if [ $(echo $(($download+$installation))) -gt 0 ]; then
                    echo "Waiting..."
                else
                    if [[ $(cat /tmp/regataos-update/list-apps-queue.txt | head -1 | tail -1) == *"$app_nickname"* ]]; then
                        if test ! -e "/tmp/regataos-update/cancel-up-$app_nickname.txt"; then
                            update_all_apps
                        else
                            if [ $(echo $(($download+$installation+$queue))) -eq 0 ]; then
                                rm -f "/tmp/regataos-update/update-specific-in-progress.txt"
                            fi

                            rm -f "/tmp/regataos-update/cancel-up-$app_nickname.txt"
                            break
                        fi
                    else
                        if test -e "/tmp/regataos-update/cancel-up-$app_nickname.txt"; then
                            if [ $(echo $(($download+$installation+$queue))) -eq 0 ]; then
                                rm -f "/tmp/regataos-update/update-specific-in-progress.txt"
                            fi

                            rm -f "/tmp/regataos-update/cancel-up-$app_nickname.txt"
                            break
                        fi
                    fi
                fi
            fi
        fi
    else
        break
    fi
else
    echo "Nothing to do..."
fi

   sleep 1
done
