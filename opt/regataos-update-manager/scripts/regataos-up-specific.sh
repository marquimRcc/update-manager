#!/bin/bash

cd /

source "/opt/regataos-update-manager/scripts/regataos-update-healing.sh"

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
    repo_name="$(grep -R '"repository_name":' "$json_filename_dir" 2>/dev/null | awk '{print $2}' | sed 's/"\|,//g')"
    if [ -z "$repo_name" ] && [ -f "/var/log/regataos-logs/regataos-list-updates.log" ]; then
        repo_name="$(grep -E "\s+$package_name\s+" /var/log/regataos-logs/regataos-list-updates.log | awk -F'|' '{print $2}' | tr -d ' ' | head -1)"
    fi

    actual_baseurl=""
    if [ -n "$repo_name" ]; then
        if [ -f "/etc/zypp/repos.d/${repo_name}.repo" ]; then
            actual_baseurl="$(grep -m1 "^baseurl=" "/etc/zypp/repos.d/${repo_name}.repo" 2>/dev/null | cut -d'=' -f 2-)"
        elif [ -f "/etc/zypp/repos.d/${repo_name}.local.repo" ]; then
            actual_baseurl="$(grep -m1 "^baseurl=" "/etc/zypp/repos.d/${repo_name}.local.repo" 2>/dev/null | cut -d'=' -f 2-)"
        fi
    fi

    if [ -n "$actual_baseurl" ]; then
        repo_link="$actual_baseurl"
    else
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
    fi
    repo_link="${repo_link%/}"

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
    echo "downloading $app_nickname" > "/tmp/regataos-update/get-pid-$app_nickname.txt"
    local target_file="/tmp/regataos-update/$app_download_file_name"
    local part_file="/tmp/regataos-update/$app_download_file_name.part"
    local log_file="/tmp/regataos-update/$app_nickname-download-percentage.log"
    rm -f "$part_file"

    if command -v aria2c >/dev/null 2>&1; then
        aria2c --follow-metalink=mem --metalink-preferred-protocol=https \
            -x 16 -s 16 -j 16 -k 1M --file-allocation=none --check-certificate=false \
            --allow-overwrite=true --auto-file-renaming=false \
            --summary-interval=1 \
            -d "/tmp/regataos-update" -o "$app_download_file_name.part" "$app_download_link" > "$log_file" 2>&1
    fi

    # Validação rigorosa do arquivo temporário (.part): se falhou, está vazio ou é corrompido, fallback para wget
    local is_valid=0
    if [ -s "$part_file" ]; then
        if [[ "$app_download_file_name" == *.rpm ]]; then
            if python3 -c "import sys; sys.exit(0 if open('$part_file', 'rb').read(4) == b'\xed\xab\xee\xdb' else 1)" 2>/dev/null; then
                is_valid=1
            fi
        else
            is_valid=1
        fi
    fi

    if [ "$is_valid" -ne 1 ]; then
        rm -f "$part_file"
        wget --no-check-certificate --progress=dot:mega -O "$part_file" "$app_download_link" > "$log_file" 2>&1
        if [ -s "$part_file" ]; then
            if [[ "$app_download_file_name" == *.rpm ]]; then
                if python3 -c "import sys; sys.exit(0 if open('$part_file', 'rb').read(4) == b'\xed\xab\xee\xdb' else 1)" 2>/dev/null; then
                    is_valid=1
                fi
            else
                is_valid=1
            fi
        fi
    fi

    if [ "$is_valid" -eq 1 ]; then
        mv -f "$part_file" "$target_file"
        echo "100" > "$log_file"
    else
        rm -f "$part_file"
        echo "Falha no download ou integridade do pacote $app_download_file_name" >> "/var/log/regataos-logs/regataos-update-$package_name.log"
        rm -f "/tmp/regataos-update/get-pid-$app_nickname.txt"
        echo "" > "/tmp/regataos-update/downloadable-application.txt"
        return 1
    fi

    # Install package
    if test ! -e "/tmp/regataos-update/cancel-up-$app_nickname.txt"; then
        # Tell the app which app is being installed
        rm -f "/tmp/regataos-update/get-pid-$app_nickname.txt"
        rm -f "/tmp/regataos-update/$app_nickname-download-percentage.log"
        echo "$(cat /tmp/regataos-update/downloadable-application.txt)" > "/tmp/regataos-update/installing-application.txt"
        echo "" > "/tmp/regataos-update/downloadable-application.txt"

        echo "" > "/tmp/regataos-update/installation-in-progress.txt"
        cd /tmp/regataos-update/
        export HEALING_PIPE_LOG="/var/log/regataos-logs/regataos-update-$package_name.log"
        run_zypper_resilient install --allow-downgrade --replacefiles --auto-agree-with-licenses $app_download_file_name

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
