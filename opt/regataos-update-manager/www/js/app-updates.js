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

// Helper to hide and clean app download status
function hideAppDownloadStatus(appName) {
    const statusEl = document.querySelector(`div#download-status-${appName}`);
    if (statusEl) statusEl.style.display = "none";
    const downEl = document.querySelector(`div#downloaded-${appName}`);
    if (downEl) downEl.innerHTML = "";
    const totEl = document.querySelector(`div#total-download-${appName}`);
    if (totEl) totEl.innerHTML = "";
    const pctEl = document.querySelector(`div#percentage-${appName}`);
    if (pctEl) pctEl.innerHTML = "";
}

// Capture percentage of app download
setInterval(downloadPercentage, 1000);
function downloadPercentage() {
    const fs = require('fs');

    const downloadableApp = "/tmp/regataos-update/downloadable-application.txt";
    if (!fs.existsSync(downloadableApp)) {
        document.querySelectorAll(".download-status-app").forEach(div => {
            const id = div.id || "";
            const appName = id.replace("download-status-", "");
            if (appName) hideAppDownloadStatus(appName);
        });
        return;
    }

    let downloadingApps = [];
    try {
        downloadingApps = fs.readFileSync(downloadableApp, "utf8").trim().split('\n').map(s => s.trim()).filter(Boolean);
    } catch (e) {
        return;
    }

    // Hide status for any app that is no longer in downloadable-application.txt
    document.querySelectorAll(".download-status-app").forEach(div => {
        const id = div.id || "";
        const appName = id.replace("download-status-", "");
        if (appName && !downloadingApps.includes(appName)) {
            hideAppDownloadStatus(appName);
        }
    });

    if (downloadingApps.length === 0) {
        return;
    }

    // Process downloading apps
    downloadingApps.forEach(appName => {
        const logFile = `/tmp/regataos-update/${appName}-download-percentage.log`;
        if (!fs.existsSync(logFile)) {
            hideAppDownloadStatus(appName);
            return;
        }

        let rawLog = '';
        try {
            rawLog = fs.readFileSync(logFile, "utf8").trim();
        } catch (e) {
            hideAppDownloadStatus(appName);
            return;
        }

        if (!rawLog) {
            hideAppDownloadStatus(appName);
            return;
        }

        const lines = rawLog.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            hideAppDownloadStatus(appName);
            return;
        }

        let downloadedMB = '';
        let totalStr = '';
        let percentageStr = '';

        // Check if log indicates completion (100)
        const lastLine = lines[lines.length - 1];
        if (lastLine === "100" || lastLine.includes("100%")) {
            hideAppDownloadStatus(appName);
            return;
        }

        // 1. Format: aria2c (e.g. "[#3683ee 24MiB/85MiB(28%) CN:16 DL:12MiB]")
        const ariaMatch = rawLog.match(/([0-9.]+)\s*([KMGT]?i?B)\s*\/\s*([0-9.]+)\s*([KMGT]?i?B)\s*\(\s*(\d+)%\s*\)/i);
        if (ariaMatch) {
            let downNum = parseFloat(ariaMatch[1]);
            let downUnit = ariaMatch[2].toUpperCase();
            if (downUnit.startsWith("K") && downNum >= 1024) {
                downNum = Math.floor(downNum / 1024);
                downUnit = "MB";
            } else if (downUnit.startsWith("M")) {
                downNum = Math.round(downNum);
                downUnit = "MB";
            } else if (downUnit.startsWith("G")) {
                downNum = parseFloat(downNum.toFixed(1));
                downUnit = "GB";
            }
            if (downNum > 0) {
                downloadedMB = `${downNum}${downUnit.replace('I', '')}`;
            }

            let totNum = parseFloat(ariaMatch[3]);
            let totUnit = ariaMatch[4].toUpperCase().replace('I', '');
            if (totUnit.startsWith("M")) totNum = Math.round(totNum);
            else if (totUnit.startsWith("G")) totNum = parseFloat(totNum.toFixed(1));
            totalStr = `/${totNum}${totUnit}`;

            const pctVal = parseInt(ariaMatch[5], 10);
            if (pctVal > 0 && pctVal < 100) {
                percentageStr = `(${pctVal}%)`;
            }
        }

        // 2. Format: wget (e.g. " 51200K .......... .......... 60% 3.4M 12s")
        if (!downloadedMB && !percentageStr) {
            for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
                const wMatch = lines[i].match(/^\s*([0-9.]+)\s*([KMGT]?)\s+.*?\s+(\d+)%/);
                if (wMatch) {
                    let wDown = parseFloat(wMatch[1]);
                    const unit = (wMatch[2] || 'K').toUpperCase();
                    if (unit === 'K' && wDown >= 1024) {
                        downloadedMB = `${Math.floor(wDown / 1024)}MB`;
                    } else if (unit === 'M' && wDown > 0) {
                        downloadedMB = `${Math.round(wDown)}MB`;
                    }
                    const pctVal = parseInt(wMatch[3], 10);
                    if (pctVal > 0 && pctVal < 100) {
                        percentageStr = `(${pctVal}%)`;
                    }
                    break;
                }
            }
        }

        // 3. Format: pv -n (integer percentage per line)
        if (!percentageStr) {
            if (/^\d{1,3}$/.test(lastLine)) {
                const pctVal = parseInt(lastLine, 10);
                if (pctVal > 0 && pctVal < 100) {
                    percentageStr = `(${pctVal}%)`;
                }
            }
        }

        // 4. Format: classic Regata OS column output
        if (!percentageStr || !downloadedMB) {
            for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
                const cols = lines[i].split(/\s+/).filter(Boolean);
                if (cols.length >= 7) {
                    if (!percentageStr) {
                        const pctM = cols[6].match(/(\d+)%/);
                        if (pctM) {
                            const val = parseInt(pctM[1], 10);
                            if (val > 0 && val < 100) percentageStr = `(${val}%)`;
                        }
                    }
                    if (!downloadedMB) {
                        const num = parseFloat(cols[0]);
                        if (!isNaN(num) && num > 1024) {
                            const mb = Math.floor(num / 1024);
                            if (mb > 0) downloadedMB = `${mb}MB`;
                        }
                    }
                }
            }
        }

        // 5. Total size from "application" line if available
        if (!totalStr) {
            const appLine = lines.find(l => l.includes("application"));
            if (appLine) {
                const totM = appLine.match(/\(([\d.]+\s*[KMGT]?B?)\)/i) || appLine.match(/:\s*([\d.]+\s*[KMGT]?B?)/i);
                if (totM) {
                    let tStr = totM[1].replace(/\s+/g, "").toUpperCase();
                    if (/^\d+[MKG]$/.test(tStr)) tStr += "B";
                    totalStr = `/${tStr}`;
                }
            }
        }

        // STRICT VALIDATION: Never show "0MB" or empty "()"
        if (downloadedMB === "0MB" || downloadedMB === "0") downloadedMB = "";
        if (percentageStr === "()" || percentageStr === "(0%)" || percentageStr === "(100%)") percentageStr = "";

        // Only display if there is REAL numerical progress (> 0 MB or > 0%)
        const hasRealProgress = Boolean(downloadedMB) || Boolean(percentageStr);

        if (!hasRealProgress) {
            hideAppDownloadStatus(appName);
        } else {
            const statusDiv = document.querySelector(`div#download-status-${appName}`);
            if (statusDiv) {
                statusDiv.style.display = "block";
                const dEl = document.querySelector(`div#downloaded-${appName}`);
                if (dEl) dEl.innerHTML = downloadedMB || "";
                const tEl = document.querySelector(`div#total-download-${appName}`);
                if (tEl) tEl.innerHTML = totalStr || "";
                const pEl = document.querySelector(`div#percentage-${appName}`);
                if (pEl) pEl.innerHTML = percentageStr || "";
            }
        }
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
