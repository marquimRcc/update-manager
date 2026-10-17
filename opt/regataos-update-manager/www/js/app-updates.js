// Show the number of application updates
function showNumberUpdates() {
    const fs = require('fs');
    const numberApps = "/tmp/regataos-update/number-apps.txt";
    const upAppNumber = document.querySelector(".updates-app-number");

    if (fs.existsSync(numberApps)) {
        const number = fs.readFileSync(numberApps, "utf8");
        upAppNumber.innerHTML = number;
        upAppNumber.style.display = "block";
    } else {
        upAppNumber.style.display = "none";
    }
}
showNumberUpdates();

// Check if automatic update is enabled
function autoUpdate() {
    const fs = require('fs');
    const regataosUpConfig = "/tmp/regataos-update/config/regataos-update.conf";
    const startAutoUpdate = "/tmp/regataos-update/install-updates.txt";
    const statusFile = "/tmp/regataos-update/status.txt";
    const checkAutoUpdate = fs.readFileSync(regataosUpConfig, "utf8");
    const noAutoUp = document.querySelector(".not-up-auto");
    const withAutoUp = document.querySelector(".yes-update-auto");

    if (checkAutoUpdate.includes("autoupdate=1")) {
        noAutoUp.style.display = "none";
        withAutoUp.style.display = "block";
        const checkStatus = fs.readFileSync(statusFile, "utf8");
        if ((!checkStatus.includes("installing-updates")) && (checkStatus.includes("show-updates"))) {
            fs.writeFileSync(startAutoUpdate, "start automatic update");
        }
    } else {
        noAutoUp.style.display = "block";
        withAutoUp.style.display = "none";
    }
}
autoUpdate();

let wasInstalling = false;
let isTransitioningToUpdated = false;
let previousStatus = "";

function saveLastCheckTimestamp() {
    const fs = require('fs');
    const nowIso = new Date().toISOString();
    try {
        fs.writeFileSync("/tmp/regataos-update/last-check.txt", nowIso, 'utf8');
    } catch(e) {}
    try {
        const confDir = "/home/marcos/.config/regataos-update";
        if (fs.existsSync(confDir)) {
            fs.writeFileSync(`${confDir}/last-check.txt`, nowIso, 'utf8');
        }
    } catch(e) {}
}

function updateLastCheckTimeDisplay() {
    const fs = require('fs');
    const lastCheckFile = "/tmp/regataos-update/last-check.txt";
    const userLastCheckFile = "/home/marcos/.config/regataos-update/last-check.txt";
    const refreshLog = "/var/log/regataos-logs/regataos-refresh-repo.log";

    let lastCheckDate = null;

    if (fs.existsSync(userLastCheckFile)) {
        try {
            const raw = fs.readFileSync(userLastCheckFile, 'utf8').trim();
            const parsed = new Date(raw);
            if (!isNaN(parsed.getTime())) lastCheckDate = parsed;
        } catch(e) {}
    }

    if (!lastCheckDate && fs.existsSync(lastCheckFile)) {
        try {
            const raw = fs.readFileSync(lastCheckFile, 'utf8').trim();
            const parsed = new Date(raw);
            if (!isNaN(parsed.getTime())) lastCheckDate = parsed;
        } catch(e) {}
    }

    if (!lastCheckDate && fs.existsSync(refreshLog)) {
        try {
            const stats = fs.statSync(refreshLog);
            lastCheckDate = stats.mtime;
        } catch(e) {}
    }

    if (!lastCheckDate) {
        lastCheckDate = new Date();
    }

    const now = new Date();
    const isToday = now.toDateString() === lastCheckDate.toDateString();
    const hours = String(lastCheckDate.getHours()).padStart(2, '0');
    const minutes = String(lastCheckDate.getMinutes()).padStart(2, '0');

    let isPt = true;
    try {
        if (typeof selectTranslationFile === 'function') {
            isPt = selectTranslationFile().includes('pt');
        }
    } catch(e) {}

    let formatted = "";
    if (isToday) {
        formatted = isPt ? `Hoje, às ${hours}:${minutes}` : `Today, at ${hours}:${minutes}`;
    } else {
        const day = String(lastCheckDate.getDate()).padStart(2, '0');
        const month = String(lastCheckDate.getMonth() + 1).padStart(2, '0');
        formatted = isPt ? `${day}/${month} às ${hours}:${minutes}` : `${month}/${day} at ${hours}:${minutes}`;
    }

    const pillVal = document.getElementById("resting-last-check-time");
    if (pillVal) {
        pillVal.textContent = formatted;
    }
}

// Display elements on the screen according to the current status
setInterval(currentStatus, 500);
function currentStatus() {
    const fs = require('fs');
    const statusFile = "/tmp/regataos-update/status.txt";

    if (fs.existsSync(statusFile)) {
        const getCurrentStatus = fs.readFileSync(statusFile, "utf8");

        const mainNever = document.querySelector("#main-never-update");
        const mainCheck = document.querySelector("#main-check-update");
        const mainInstall = document.querySelector("#main-install-update");
        const mainWithout = document.querySelector("#main-without-update");
        const mainWith = document.querySelector("#main-with-update");
        const div1 = document.querySelector(".div1");
        const mainEl = document.querySelector(".main");

        if (isTransitioningToUpdated) {
            return;
        }

        // Record check completion timestamp on transition from check-updates
        if (previousStatus.includes("check-updates") && !getCurrentStatus.includes("check-updates")) {
            saveLastCheckTimestamp();
        }
        previousStatus = getCurrentStatus;

        if (div1) div1.style.display = "none";
        if (mainNever) mainNever.style.display = "none";
        if (mainCheck) mainCheck.style.display = "none";
        if (mainInstall) mainInstall.style.display = "none";

        const splitHeaderChecking = document.querySelector("#split-header-checking");
        const splitHeaderUpdates = document.querySelector("#split-header-updates");
        const splitHeaderUpdated = document.querySelector("#split-header-updated");
        const splitCheckingView = document.querySelector("#split-checking-view");
        const splitRightCards = document.querySelector("#split-right-cards");
        const splitCheckBtnWrap = document.querySelector("#split-check-button-wrap");
        const updateAll = document.querySelector(".split-left-footer .update-all");

        // Layout 2: Resting View (Tela Única em Repouso)
        const isResting = getCurrentStatus.includes("never-updates") ||
                          getCurrentStatus.includes("no-updates") ||
                          (getCurrentStatus.includes("updated") && !wasInstalling);

        if (isResting) {
            if (mainWith) mainWith.style.display = "none";
            if (mainWithout) mainWithout.style.display = "flex";
            if (mainEl) {
                mainEl.classList.remove("split-active");
                mainEl.classList.add("resting-active");
            }

            const restingBadge = document.querySelector(".resting-badge");
            const restingBadgeText = document.querySelector(".resting-badge-text");
            const restingSubtitle = document.getElementById("resting-hero-subtitle");
            const btnCheckText = document.getElementById("btn-resting-check-text");

            if (getCurrentStatus.includes("never-updates")) {
                if (restingBadge) restingBadge.classList.add("never-updates-mode");
                if (restingBadgeText) restingBadgeText.textContent = "Verificação manual";
                if (restingSubtitle) restingSubtitle.textContent = "A busca automática de atualizações está desativada nas configurações.";
                if (btnCheckText) btnCheckText.textContent = "Verificar agora";
            } else {
                if (restingBadge) restingBadge.classList.remove("never-updates-mode");
                if (restingBadgeText) restingBadgeText.textContent = "Sistema Atualizado";
                if (restingSubtitle) restingSubtitle.textContent = "O Regata OS e todos os seus aplicativos instalados estão na versão estável mais recente.";
                if (btnCheckText) btnCheckText.textContent = "Verificar se há atualizações";
            }

            updateLastCheckTimeDisplay();
            applyTranslationPages();
            return;
        }

        // Active States (Split-View Container)
        if (mainWithout) mainWithout.style.display = "none";
        if (mainWith) mainWith.style.display = "flex";
        if (mainEl) {
            mainEl.classList.remove("resting-active");
            mainEl.classList.add("split-active");
        }

        if (getCurrentStatus.includes("check-updates")) {
            if (splitHeaderChecking) splitHeaderChecking.style.display = "block";
            if (splitHeaderUpdates) splitHeaderUpdates.style.display = "none";
            if (splitHeaderUpdated) splitHeaderUpdated.style.display = "none";
            if (splitCheckingView) splitCheckingView.style.display = "flex";
            if (splitRightCards) splitRightCards.style.display = "none";
            if (splitCheckBtnWrap) splitCheckBtnWrap.style.display = "none";
            if (updateAll) updateAll.style.display = "none";

            applyTranslationPages();

        } else if (getCurrentStatus.includes("installing-updates")) {
            if (!wasInstalling && typeof resetGlobalProgress === 'function') {
                resetGlobalProgress();
            }
            wasInstalling = true;

            if (splitHeaderChecking) splitHeaderChecking.style.display = "none";
            if (splitHeaderUpdates) splitHeaderUpdates.style.display = "block";
            if (splitHeaderUpdated) splitHeaderUpdated.style.display = "none";
            if (splitCheckingView) splitCheckingView.style.display = "none";
            if (splitRightCards) splitRightCards.style.display = "flex";
            if (splitCheckBtnWrap) splitCheckBtnWrap.style.display = "none";

            showNumberUpdates();
            autoUpdate();
            listUpdates();
            applyTranslationPages();

        } else if (getCurrentStatus.includes("show-updates")) {
            if (splitHeaderChecking) splitHeaderChecking.style.display = "none";
            if (splitHeaderUpdates) splitHeaderUpdates.style.display = "block";
            if (splitHeaderUpdated) splitHeaderUpdated.style.display = "none";
            if (splitCheckingView) splitCheckingView.style.display = "none";
            if (splitRightCards) splitRightCards.style.display = "flex";
            if (splitCheckBtnWrap) splitCheckBtnWrap.style.display = "none";

            showNumberUpdates();
            autoUpdate();
            listUpdates();
            applyTranslationPages();

        } else if (getCurrentStatus.includes("updated")) {
            if (wasInstalling) {
                isTransitioningToUpdated = true;
                const tot = (typeof window.lastKnownTotal !== 'undefined' && window.lastKnownTotal > 0) ? window.lastKnownTotal : 1;
                if (typeof updateRegataProgressWidget === 'function') {
                    updateRegataProgressWidget('install-', { stage: 'concluded', currentStep: tot, totalSteps: tot, speed: '' });
                }
                saveLastCheckTimestamp();
                setTimeout(() => {
                    wasInstalling = false;
                    isTransitioningToUpdated = false;
                    currentStatus();
                }, 1800);
            }
        }
    }
}
currentStatus();

// Capture percentage of app download
setInterval(downloadPercentage, 1000);
function downloadPercentage() {
    const fs = require('fs');
    const exec = require('child_process').exec;

    const downloadableApp = "/tmp/regataos-update/downloadable-application.txt";
    if (!fs.existsSync(downloadableApp)) {
        return;
    }

    let files = [];

    // Read the app store's JSON files
    fs.readdirSync("/opt/regataos-store/apps-list").forEach(files => {
        fs.readFile("/opt/regataos-store/apps-list/" + files, "utf8", function (err, data) {
            if (!err) {
                let apps = JSON.parse(data);
                for (let i = 0; i < apps.length; i++) {
                    let appName = apps[i].nickname;
                    let downloadingApp = fs.readFileSync(downloadableApp, "utf8");

                    if (downloadingApp.includes(appName)) {
                        document.querySelector(`div#download-status-${appName}`).style.display = "block";

                        let downloadPercentageApp1 = `tail -2 /tmp/regataos-update/${appName}-download-percentage.log | awk '{print $7}' | head -1 | tail -1`;
                        exec(downloadPercentageApp1, (error, stdout, stderr) => {
                            if (stdout) {
                                if (!stdout.includes("100%")) {
                                    let percentage = '(' + stdout.replace(/\s/g, "") + ')'
                                    document.querySelector(`div#percentage-${appName}`).innerHTML = percentage;
                                }
                            }
                        });

                        let downloadPercentageApp2 = `tail -2 /tmp/regataos-update/${appName}-download-percentage.log | awk '{print $1}' | head -1 | tail -1 | awk '{$1=$1/1024; print $1}' | cut -d'.' -f -1`;
                        exec(downloadPercentageApp2, (error, stdout, stderr) => {
                            if (stdout) {
                                let percentage = stdout.replace(/\s/g, "") + 'MB'
                                document.querySelector(`div#downloaded-${appName}`).innerHTML = percentage;
                            }
                        });

                        let downloadPercentageApp3 = `grep -r application /tmp/regataos-update/${appName}-download-percentage.log | head -1 | tail -1 | cut -d':' -f 2- | cut -d'(' -f 2- | cut -d')' -f -1 | sed 's/M/ MB/' | sed 's/K/ KB/' | sed 's/G/ GB/'`;
                        exec(downloadPercentageApp3, (error, stdout, stderr) => {
                            if (stdout) {
                                let percentage = '/' + stdout.replace(/\s/g, "")
                                document.querySelector(`div#total-download-${appName}`).innerHTML = percentage;
                            }
                        });

                    } else {
                        document.querySelector(`div#download-status-${appName}`).style.display = "none";
                    }
                }
                return;
            }
        });
    });
}
downloadPercentage();

// List of apps that have already been updated
setInterval(listUpdatedApps, 1000);
function listUpdatedApps() {
    const fs = require('fs');

    const listAppsUpdated = "/tmp/regataos-update/list-apps-updated.txt";
    if (!fs.existsSync(listAppsUpdated)) {
        return;
    }

    let files = [];

    // Read the app store's JSON files
    fs.readdirSync("/opt/regataos-store/apps-list").forEach(files => {
        fs.readFile("/opt/regataos-store/apps-list/" + files, "utf8", function (err, data) {
            if (!err) {
                let apps = JSON.parse(data);
                for (let i = 0; i < apps.length; i++) {
                    let appName = apps[i].nickname;
                    let listAppsUpdate = fs.readFileSync(listAppsUpdated, "utf8");

                    if (listAppsUpdate.includes(appName)) {
                        document.querySelector(`div#${appName}`).style.display = "none";
                    } else {
                        document.querySelector(`div#${appName}`).style.display = "block";
                    }
                }
                return;
            }
        });
    });
}
listUpdatedApps();
