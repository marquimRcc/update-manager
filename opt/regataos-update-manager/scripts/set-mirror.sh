#!/bin/bash
# Set repository mirror for Regata OS Update Manager

MIRROR="$1"
if test -z "$MIRROR"; then
    MIRROR="default"
fi

# Detect actual user home if run via sudo
ACTUAL_USER="${SUDO_USER:-$USER}"
USER_HOME=$(getent passwd "$ACTUAL_USER" | cut -d: -f6)
if test -z "$USER_HOME"; then
    USER_HOME="$HOME"
fi

CONFIG_DIR="$USER_HOME/.config/regataos-update"
mkdir -p "$CONFIG_DIR"
echo "mirror=$MIRROR" > "$CONFIG_DIR/mirror.conf"
chmod 666 "$CONFIG_DIR/mirror.conf" 2>/dev/null

if test -d "/tmp/regataos-update/config"; then
    echo "mirror=$MIRROR" > "/tmp/regataos-update/config/mirror.conf" 2>/dev/null
    chmod 666 "/tmp/regataos-update/config/mirror.conf" 2>/dev/null
fi

# Define base URLs
case "$MIRROR" in
    "c3sl" | "ufpr")
        OSS_URL="http://opensuse.c3sl.ufpr.br/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="http://opensuse.c3sl.ufpr.br/distribution/leap/16.0/repo/non-oss/"
        ;;
    "mirror-br")
        OSS_URL="http://mirror-br.opensuse.org/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="http://mirror-br.opensuse.org/distribution/leap/16.0/repo/non-oss/"
        ;;
    "uwaterloo")
        OSS_URL="https://mirror.csclub.uwaterloo.ca/opensuse/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="https://mirror.csclub.uwaterloo.ca/opensuse/distribution/leap/16.0/repo/non-oss/"
        ;;
    "dotsrc")
        OSS_URL="https://mirrors.dotsrc.org/opensuse/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="https://mirrors.dotsrc.org/opensuse/distribution/leap/16.0/repo/non-oss/"
        ;;
    "gwdg")
        OSS_URL="https://ftp.gwdg.de/pub/opensuse/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="https://ftp.gwdg.de/pub/opensuse/distribution/leap/16.0/repo/non-oss/"
        ;;
    "rit")
        OSS_URL="https://mirrors.rit.edu/opensuse/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="https://mirrors.rit.edu/opensuse/distribution/leap/16.0/repo/non-oss/"
        ;;
    "fau")
        OSS_URL="https://ftp.fau.de/opensuse/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="https://ftp.fau.de/opensuse/distribution/leap/16.0/repo/non-oss/"
        ;;
    "leaseweb")
        OSS_URL="https://mirror.leaseweb.com/opensuse/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="https://mirror.leaseweb.com/opensuse/distribution/leap/16.0/repo/non-oss/"
        ;;
    *)
        MIRROR="default"
        OSS_URL="https://download.opensuse.org/distribution/leap/16.0/repo/oss/"
        NON_OSS_URL="https://download.opensuse.org/distribution/leap/16.0/repo/non-oss/"
        ;;
esac

# If running as root (or via sudo), update zypper repo files
if [ "$(id -u)" -eq 0 ]; then
    # Backup original files if not yet done
    if test -f /etc/zypp/repos.d/leap_16.0.repo && test ! -f /etc/zypp/repos.d/leap_16.0.repo.orig; then
        cp /etc/zypp/repos.d/leap_16.0.repo /etc/zypp/repos.d/leap_16.0.repo.orig
    fi
    if test -f /etc/zypp/repos.d/non-oss.repo && test ! -f /etc/zypp/repos.d/non-oss.repo.orig; then
        cp /etc/zypp/repos.d/non-oss.repo /etc/zypp/repos.d/non-oss.repo.orig
    fi

    # Update leap_16.0.repo
    if test -f /etc/zypp/repos.d/leap_16.0.repo; then
        sed -i "s|^baseurl=.*|baseurl=$OSS_URL|" /etc/zypp/repos.d/leap_16.0.repo
    fi

    # Update non-oss.repo
    if test -f /etc/zypp/repos.d/non-oss.repo; then
        sed -i "s|^baseurl=.*|baseurl=$NON_OSS_URL|" /etc/zypp/repos.d/non-oss.repo
    fi

    # Optimize zypp concurrent downloads
    if test -f /etc/zypp/zypp.conf; then
        if grep -q "download.max_concurrent_connections" /etc/zypp/zypp.conf; then
            sed -i 's/^# *download.max_concurrent_connections *=.*/download.max_concurrent_connections = 10/' /etc/zypp/zypp.conf
            sed -i 's/^download.max_concurrent_connections *=.*/download.max_concurrent_connections = 10/' /etc/zypp/zypp.conf
        else
            echo "download.max_concurrent_connections = 10" >> /etc/zypp/zypp.conf
        fi
    fi

    echo "Mirror configured: $MIRROR -> $OSS_URL"
else
    # Not root: call sudo regataos-up.sh -set-mirror
    sudo /opt/regataos-update-manager/scripts/regataos-up.sh -set-mirror "$MIRROR"
fi
