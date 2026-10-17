// Show app only when the UI is ready
const gui = require('nw.gui');
const win = nw.Window.get();

onload = function () {
    win.show();
};

// Move window to top left of screen then to center
win.moveTo(0, 0);
win.setPosition('center');

// Disable main hover effect after few seconds
setTimeout(function () {
    const loadscreen = document.getElementById("loadscreen");
    if (loadscreen) loadscreen.style.display = "none";
}, 1000);

// --- Window Minimize to Tray on Close Management ---
let isWindowHidden = false;

function showMainWindow() {
    win.setShowInTaskbar(true);
    win.show();
    win.restore();
    win.setAlwaysOnTop(true);
    win.focus();
    setTimeout(() => {
        try { win.setAlwaysOnTop(false); } catch (e) { }
    }, 150);
    isWindowHidden = false;
}

function hideMainWindow() {
    win.hide();
    isWindowHidden = true;
}

// Check if Regata OS Update is actively checking or installing updates
function isUpdateOrCheckInProgress() {
    const fs = require('fs');
    const { execSync } = require('child_process');

    // 1. Check status.txt
    const statusFile = "/tmp/regataos-update/status.txt";
    if (fs.existsSync(statusFile)) {
        try {
            const status = fs.readFileSync(statusFile, "utf8").trim();
            if (status.includes("check-updates") || status.includes("installing-updates")) {
                return true;
            }
        } catch (e) { }
    }

    // 2. Check active updater progress/flag files (must have non-empty content)
    const progressFiles = [
        "/tmp/regataos-update/other-updates-in-progress.txt",
        "/tmp/regataos-update/update-specific-in-progress.txt",
        "/tmp/regataos-update/downloading-system-update.txt",
        "/tmp/regataos-update/installing-system-update.txt"
    ];
    for (const file of progressFiles) {
        if (fs.existsSync(file)) {
            try {
                if (fs.readFileSync(file, "utf8").trim().length > 0) {
                    return true;
                }
            } catch (e) { }
        }
    }

    // 3. Check active update processes (zypper or actual updaters)
    try {
        const procCheck = execSync("pgrep -x 'zypper' 2>/dev/null || pgrep -f 'regataos-up\\.sh|regataos-up-all\\.sh|regataos-up-specific\\.sh|regataos-other-up\\.sh' 2>/dev/null", { encoding: "utf8" }).trim();
        if (procCheck.length > 0) {
            return true;
        }
    } catch (e) { }

    return false;
}

// Ensure the system tray icon is running while hidden
function ensureTrayIconRunning() {
    const fs = require('fs');
    const { exec } = require('child_process');

    const statusFile = "/tmp/regataos-update/status.txt";
    let isChecking = false;
    if (fs.existsSync(statusFile)) {
        try {
            const status = fs.readFileSync(statusFile, "utf8");
            if (status.includes("check-updates")) {
                isChecking = true;
            }
        } catch (e) { }
    }

    const trayScript = isChecking ? "check-update.py" : "install-update.py";
    const checkCommand = `ps -C "${trayScript}" >/dev/null || (cd /opt/regataos-update-manager/tray-icon/ && ./${trayScript} &)`;
    exec(checkCommand, function () { });
}

// Send system notification that the application is running in the background
function notifyBackgroundRunning() {
    const { exec } = require('child_process');
    const fs = require('fs');

    let lang = "pt-br";
    const user = process.env.USER || "marcos";
    const localeFile = `/home/${user}/.config/user-dirs.locale`;
    const plasmaLocale = `/home/${user}/.config/plasma-localerc`;
    if (fs.existsSync(plasmaLocale)) {
        try {
            const content = fs.readFileSync(plasmaLocale, "utf8");
            const m = content.match(/LANGUAGE=([^\n]+)/) || content.match(/LANG=([^\n]+)/);
            if (m) lang = m[1].toLowerCase().replace(/_/g, '-').split('.')[0].split(':')[0];
        } catch (e) { }
    } else if (fs.existsSync(localeFile)) {
        try {
            lang = fs.readFileSync(localeFile, "utf8").trim().toLowerCase().replace(/_/g, '-');
        } catch (e) { }
    }

    const notifyScript = `/opt/regataos-update-manager/scripts/notifications/${lang}`;
    const fallbackScript = "/opt/regataos-update-manager/scripts/notifications/en-us";
    const scriptToRun = fs.existsSync(notifyScript) ? notifyScript : fallbackScript;

    exec(`/bin/bash "${scriptToRun}" -bg-running 2>/dev/null || notify-send -i regataos-up-mg-none-notify -u normal -a 'Regata OS Update' 'Regata OS Update' 'A aplicação continua em execução em segundo plano.'`);
}

// Handle close ('X') button click
win.on('close', function () {
    if (isUpdateOrCheckInProgress()) {
        hideMainWindow();
        ensureTrayIconRunning();
        notifyBackgroundRunning();
    } else {
        // Normal close when idle or finished
        this.close(true);
    }
});

// Watch signals from system tray icon actions (restore/toggle/force-quit)
setInterval(function () {
    const fs = require('fs');
    const showSignal = "/tmp/regataos-update/show-window.txt";
    const toggleSignal = "/tmp/regataos-update/toggle-window.txt";
    const forceQuitSignal = "/tmp/regataos-update/force-quit.txt";

    if (fs.existsSync(forceQuitSignal)) {
        try { fs.unlinkSync(forceQuitSignal); } catch (e) { }
        win.close(true);
        return;
    }

    if (fs.existsSync(showSignal)) {
        try { fs.unlinkSync(showSignal); } catch (e) { }
        showMainWindow();
    }

    if (fs.existsSync(toggleSignal)) {
        try { fs.unlinkSync(toggleSignal); } catch (e) { }
        showMainWindow();
    }
}, 150);

// Also restore window if launched again while running
if (nw.App) {
    nw.App.on('open', function () {
        showMainWindow();
    });
}
