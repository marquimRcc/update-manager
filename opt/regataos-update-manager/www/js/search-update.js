// Check if the frequency interval has elapsed for automatic updates
function shouldRunAutoUpdate() {
    const fs = require('fs');
    const path = require('path');
    const home = process.env.HOME || "";
    let confPath = "/tmp/regataos-update/config/regataos-update.conf";
    const userHomeConf = path.join(home, ".config/regataos-update/regataos-update.conf");
    if (!fs.existsSync(confPath) && fs.existsSync(userHomeConf)) {
        confPath = userHomeConf;
    }
    const timestampPath = path.join(home, ".config/regataos-update/last-autoupdate-timestamp");

    let freq = "daily";
    if (fs.existsSync(confPath)) {
        const content = fs.readFileSync(confPath, "utf8");
        const match = content.match(/^frequency=([a-zA-Z0-9_-]+)/m);
        if (match && match[1]) {
            freq = match[1].trim();
        }
    }

    let minInterval = 82800; // ~23h
    if (freq === "weekly") {
        minInterval = 604800; // 7 days
    } else if (freq === "monthly") {
        minInterval = 2592000; // 30 days
    } else if (freq === "sixmonths") {
        minInterval = 15552000; // 180 days
    }

    let last = 0;
    if (fs.existsSync(timestampPath)) {
        try {
            last = parseInt(fs.readFileSync(timestampPath, "utf8").trim(), 10) || 0;
        } catch (e) {
            last = 0;
        }
    }

    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - last;
    return elapsed >= minInterval;
}

// Check for updates when opening the application
function checkUpdates() {
    const exec = require('child_process').exec;
    const fs = require('fs');
    const path = require('path');

    const status = "/tmp/regataos-update/status.txt";
    const alreadyUpdated = "/tmp/regataos-update/already_updated.txt";
    let regataosUpdateConf = "/tmp/regataos-update/config/regataos-update.conf";
    const home = process.env.HOME || "";
    const userHomeConf = path.join(home, ".config/regataos-update/regataos-update.conf");
    if (!fs.existsSync(regataosUpdateConf) && fs.existsSync(userHomeConf)) {
        regataosUpdateConf = userHomeConf;
    }

    // If an update or check is already running or ready, do not re-trigger
    if (fs.existsSync(status)) {
        const checkStatus = fs.readFileSync(status, "utf8");
        if (checkStatus.includes("check-updates") || checkStatus.includes("installing-updates") || checkStatus.includes("show-updates")) {
            return;
        }
        if (checkStatus.includes("never-updates")) {
            return;
        }
    }

    if (fs.existsSync(alreadyUpdated)) {
        return;
    }

    let autoUpConfig = "2";
    if (fs.existsSync(regataosUpdateConf)) {
        const updateConfig = fs.readFileSync(regataosUpdateConf, "utf8");
        const match = updateConfig.match(/^autoupdate=(\d+)/m);
        if (match) {
            autoUpConfig = match[1];
        } else if (updateConfig.includes("1")) {
            autoUpConfig = "1";
        } else if (updateConfig.includes("2")) {
            autoUpConfig = "2";
        } else if (updateConfig.includes("3")) {
            autoUpConfig = "3";
        }
    }

    if (autoUpConfig === "3") {
        try { fs.writeFileSync(status, "never-updates\n", "utf8"); } catch (e) { }
        return;
    }

    // When autoupdate=1: respect the configured frequency
    if (autoUpConfig === "1") {
        if (!shouldRunAutoUpdate()) {
            // Frequency interval not reached yet: preserve resting state without re-checking
            if (!fs.existsSync(status) || fs.readFileSync(status, "utf8").trim() === "") {
                try { fs.writeFileSync(status, "updated\n", "utf8"); } catch (e) { }
            }
            return;
        }

        // Interval reached -> run check and record timestamp
        const command = "sudo /opt/regataos-update-manager/scripts/regataos-up.sh -check-up-config";
        exec(command, function (error, call, errlog) { });
        const timestampPath = path.join(home, ".config/regataos-update/last-autoupdate-timestamp");
        try { fs.writeFileSync(timestampPath, Math.floor(Date.now() / 1000).toString(), "utf8"); } catch (e) { }
        return;
    }

    // When autoupdate=2: if already resting (updated or no-updates), do not force check automatically on open
    if (fs.existsSync(status)) {
        const checkStatus = fs.readFileSync(status, "utf8");
        if (checkStatus.includes("updated") || checkStatus.includes("no-updates")) {
            return;
        }
    }

    // Initial check if no status exists at all
    const command = "sudo /opt/regataos-update-manager/scripts/regataos-up.sh -check-up-config";
    exec(command, function (error, call, errlog) { });
}
checkUpdates();