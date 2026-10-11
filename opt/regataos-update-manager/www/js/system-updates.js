// Check the status of system updates.
//Quit if already running.
function checkSystemUpdateStatus() {
    const exec = require('child_process').exec;
    const commandLine = "ps -C status-other-up >/dev/null; if [ $? = 1 ]; then /opt/regataos-update-manager/scripts/status-other-updates.sh start; fi";
    exec(commandLine, function (error, call, errlog) { });
}
checkSystemUpdateStatus();

// Display system updates.
setInterval(showSystemUpdates, 500);
function showSystemUpdates() {
    const fs = require('fs');
    const packageListHtml = "/tmp/regataos-update/package-list-html.txt";
    const packageListFile = "/tmp/regataos-update/package-list.txt";
    const updatedApps = "/tmp/regataos-update/updated-apps.txt";

    if (fs.existsSync(packageListHtml)) {
        const data = fs.readFileSync(packageListFile, "utf8");
        const systemUpdates = document.querySelector(".div2-other-updates");

        if (data.length >= 2) {
            if (fs.existsSync(updatedApps)) {
                const displayOtherUpdates = fs.readFileSync(updatedApps, "utf8");
                if (displayOtherUpdates.includes("other-updates")) {
                    systemUpdates.style.display = "";
                } else {
                    systemUpdates.style.display = "grid";
                }
            } else {
                systemUpdates.style.display = "grid";
            }
        } else {
            systemUpdates.style.display = "";
        }
        return;
    }
}
showSystemUpdates();

// Show number of system updates.
setInterval(showNumberSystemUpdates, 500);
function showNumberSystemUpdates() {
    const fs = require('fs');
    const statusFile = "/tmp/regataos-update/status.txt";
    const numberPackagesFile = "/tmp/regataos-update/number-packages.txt";

    if (fs.existsSync(statusFile)) {
        const appStatus = fs.readFileSync(statusFile, "utf8");
        if ((appStatus.includes("show-updates")) || (appStatus.includes("installing-updates"))) {
            if (fs.existsSync(numberPackagesFile)) {
                const numberPackages = fs.readFileSync(numberPackagesFile, "utf8");
                document.querySelector(".updates-package-number").innerHTML = numberPackages;
            }
        }
    }
}
showNumberSystemUpdates();

// System update status.
function checkProgress(filePath) {
    const fs = require('fs');
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split('\n').filter(l => l.trim() !== '');
        return lines.length > 0 ? lines[lines.length - 1] : '';
    } catch (err) {
        console.error('Error reading the file:', err);
        return '';
    }
}

setInterval(systemUpdateStatus, 1000);
function systemUpdateStatus() {
    const fs = require('fs');
    const updatedAppsFile = "/tmp/regataos-update/updated-apps.txt";
    const regataosOtherUpdatesLog = "/var/log/regataos-logs/regataos-other-updates.log";
    const regataosOtherUpdatesFile = "/var/log/regataos-logs/regataos-other-updates.txt";
    const updateSpecificProgressFile = "/tmp/regataos-update/update-specific-in-progress.txt";

    if (fs.existsSync(updatedAppsFile)) {
        const listAppsQueue = fs.existsSync("/tmp/regataos-update/list-apps-queue.txt") ? fs.readFileSync("/tmp/regataos-update/list-apps-queue.txt", "utf8") : "";
        const installingApplication = fs.existsSync("/tmp/regataos-update/installing-application-other-updates.txt") ? fs.readFileSync("/tmp/regataos-update/installing-application-other-updates.txt", "utf8") : "";
        const downloadableApplication = fs.existsSync("/tmp/regataos-update/downloadable-application-other-updates.txt") ? fs.readFileSync("/tmp/regataos-update/downloadable-application-other-updates.txt", "utf8") : "";
        const updatedApplication = fs.existsSync("/tmp/regataos-update/updated-apps.txt") ? fs.readFileSync("/tmp/regataos-update/updated-apps.txt", "utf8") : "";

        const pendingOtherUpdates = document.querySelector("div#pending-other-updates");
        const downloadingOtherUpdates = document.querySelector("div#downloading-other-updates");
        const installingOtherUpdates = document.querySelector("div#installing-other-updates");
        const percentageOtherUpdates = document.querySelector("div#percentage-other-updates");
        const updateAppOtherUpdates = document.querySelector("div#update-app-other-updates");
        const concludedOtherUpdates = document.querySelector("div#concluded-other-updates");

        const otherProgressWidget = document.querySelector("#other-updates-progress-widget");

        if (updatedApplication.includes("other-updates")) {
            pendingOtherUpdates.style.display = "none";
            downloadingOtherUpdates.style.display = "none";
            installingOtherUpdates.style.display = "none";
            percentageOtherUpdates.style.display = "none";
            updateAppOtherUpdates.style.display = "none";
            concludedOtherUpdates.style.display = "block";
            if (otherProgressWidget) otherProgressWidget.style.display = "none";

        } else if (installingApplication.includes("other-updates")) {
            pendingOtherUpdates.style.display = "none";
            downloadingOtherUpdates.style.display = "none";
            updateAppOtherUpdates.style.display = "none";
            concludedOtherUpdates.style.display = "none";
            if (otherProgressWidget) otherProgressWidget.style.display = "flex";

            if (fs.existsSync(regataosOtherUpdatesFile)) {
                const status = checkProgress(regataosOtherUpdatesFile);

                if (status.includes("Checking")) {
                    installingOtherUpdates.style.display = "none";
                    percentageOtherUpdates.style.display = "none";
                } else {
                    installingOtherUpdates.style.display = "block";
                    percentageOtherUpdates.style.display = "block";
                }
            } else {
                installingOtherUpdates.style.display = "block";
                percentageOtherUpdates.style.display = "block";
            }

        } else if (downloadableApplication.includes("other-updates")) {
            pendingOtherUpdates.style.display = "none";
            installingOtherUpdates.style.display = "none";
            updateAppOtherUpdates.style.display = "none";
            concludedOtherUpdates.style.display = "none";
            if (otherProgressWidget) otherProgressWidget.style.display = "flex";

            if (fs.existsSync(regataosOtherUpdatesFile)) {
                const status = checkProgress(regataosOtherUpdatesFile);

                if (status.includes("Checking")) {
                    downloadingOtherUpdates.style.display = "none";
                    percentageOtherUpdates.style.display = "none";
                } else {
                    downloadingOtherUpdates.style.display = "block";
                    percentageOtherUpdates.style.display = "block";
                }
            } else {
                downloadingOtherUpdates.style.display = "block";
                percentageOtherUpdates.style.display = "block";
            }

        } else if (listAppsQueue.includes("other-updates")) {
            pendingOtherUpdates.style.display = "block";
            downloadingOtherUpdates.style.display = "none";
            installingOtherUpdates.style.display = "none";
            percentageOtherUpdates.style.display = "none";
            updateAppOtherUpdates.style.display = "none";
            concludedOtherUpdates.style.display = "none";
            if (otherProgressWidget) otherProgressWidget.style.display = "none";

        } else {
            pendingOtherUpdates.style.display = "none";
            downloadingOtherUpdates.style.display = "none";
            installingOtherUpdates.style.display = "none";
            percentageOtherUpdates.style.display = "none";
            concludedOtherUpdates.style.display = "none";
            if (otherProgressWidget) otherProgressWidget.style.display = "none";

            if (fs.existsSync(updateSpecificProgressFile)) {
                updateAppOtherUpdates.style.display = "none";
            } else {
                if (fs.existsSync(regataosOtherUpdatesLog)) {
                    updateAppOtherUpdates.style.display = "none";
                } else {
                    updateAppOtherUpdates.style.display = "block";
                }
            }
        }
    }
}
systemUpdateStatus();

// Helper to set circular progress arc and text
function setProgressArc(circleElement, textElement, percent, isIndeterminate) {
    const circumference = 238.76;
    if (!circleElement || !textElement) return;

    if (isIndeterminate) {
        circleElement.classList.add('indeterminate');
        circleElement.style.strokeDashoffset = '170';
        textElement.textContent = '...';
        return;
    }

    circleElement.classList.remove('indeterminate');
    const clamped = Math.max(0, Math.min(100, percent));
    const offset = circumference - (circumference * clamped / 100);
    circleElement.style.strokeDashoffset = offset;
    textElement.textContent = Math.round(clamped) + '%';
}

let lastKnownSpeed = '';
let lastKnownTotal = 0;
window.lastKnownTotal = 0;
let highestProgressPercent = 0;
let highestSysDownloadStep = 0;
let highestSysInstallStep = 0;
let initialTotalItems = 0;

function resetGlobalProgress() {
    highestProgressPercent = 0;
    highestSysDownloadStep = 0;
    highestSysInstallStep = 0;
    initialTotalItems = 0;
    lastKnownSpeed = '';
    lastKnownTotal = 0;
    window.lastKnownTotal = 0;
}

function updateGlobalProgressWidget(state) {
    const circle = document.getElementById('install-circle-progress');
    const text = document.getElementById('install-circle-percentage');
    const stepVerify = document.getElementById('install-step-verify');
    const stepDownload = document.getElementById('install-step-download');
    const stepInstall = document.getElementById('install-step-install');
    const verifyDetails = document.getElementById('install-verify-details');
    const downloadDetails = document.getElementById('install-download-details');
    const installDetails = document.getElementById('install-install-details');

    const { percent, downloaded, installed, total, speed, isConcluded, hasActiveInstalls } = state;

    setProgressArc(circle, text, percent, false);

    if (isConcluded) {
        if (stepVerify) stepVerify.className = 'v-step completed';
        if (stepDownload) stepDownload.className = 'v-step completed';
        if (stepInstall) stepInstall.className = 'v-step completed';
        if (verifyDetails) verifyDetails.textContent = total > 0 ? `${total} concluídos` : 'Concluído';
        if (downloadDetails) downloadDetails.textContent = total > 0 ? `(${total} de ${total})` : 'Concluído';
        if (installDetails) installDetails.textContent = total > 0 ? `(${total} de ${total})` : 'Concluído';
        return;
    }

    // Step 1: Verificando
    if (stepVerify) {
        stepVerify.className = 'v-step completed';
        if (verifyDetails) {
            verifyDetails.textContent = total > 0 ? `${total} atualizações prontas` : 'Atualizações prontas';
        }
    }

    // Step 2: Baixando
    if (downloaded >= total && total > 0) {
        if (stepDownload) stepDownload.className = 'v-step completed';
        if (downloadDetails) downloadDetails.textContent = `(${total} de ${total})`;
    } else if (downloaded > 0 || (downloaded === 0 && installed === 0)) {
        if (stepDownload) stepDownload.className = 'v-step active';
        let detail = `(${downloaded} de ${total})`;
        if (speed) detail += ` • ${speed}`;
        if (downloadDetails) downloadDetails.textContent = detail;
    } else {
        if (stepDownload) stepDownload.className = 'v-step';
        if (downloadDetails) downloadDetails.textContent = 'Aguardando início';
    }

    // Step 3: Instalando
    if (installed >= total && total > 0) {
        if (stepInstall) stepInstall.className = 'v-step completed';
        if (installDetails) installDetails.textContent = `(${total} de ${total})`;
    } else if (hasActiveInstalls || installed > 0) {
        if (stepInstall) stepInstall.className = 'v-step active';
        if (installDetails) installDetails.textContent = `(${installed} de ${total})`;
    } else {
        if (stepInstall) stepInstall.className = 'v-step';
        if (installDetails) installDetails.textContent = 'Pacotes e dependências';
    }
}

function updateRegataProgressWidget(prefix, state) {
    if (prefix === 'install-') {
        // Fallback redirection to unified widget
        const { currentStep, totalSteps, speed, forcedPercent, stage } = state;
        const tot = totalSteps || lastKnownTotal || 1;
        const stp = Math.min(tot, currentStep || 0);
        updateGlobalProgressWidget({
            percent: forcedPercent !== undefined ? forcedPercent : highestProgressPercent,
            downloaded: stp,
            installed: stage === 'installing' ? stp : 0,
            total: tot,
            speed: speed || lastKnownSpeed,
            isConcluded: stage === 'concluded',
            hasActiveInstalls: stage === 'installing'
        });
        return;
    }

    const circle = document.getElementById(`${prefix}circle-progress`);
    const text = document.getElementById(`${prefix}circle-percentage`);
    const stepVerify = document.getElementById(`${prefix}step-verify`);
    const stepDownload = document.getElementById(`${prefix}step-download`);
    const stepInstall = document.getElementById(`${prefix}step-install`);
    const downloadDetails = document.getElementById(`${prefix}download-details`);
    const installDetails = document.getElementById(`${prefix}install-details`);

    const { stage, currentStep, totalSteps, speed, forcedPercent } = state;
    const effTotal = totalSteps || 1;
    const effStep = Math.min(effTotal, currentStep || 0);

    if (stage === 'checking') {
        setProgressArc(circle, text, 0, true);
        if (stepVerify) stepVerify.className = 'regata-step step-verify active';
        if (stepDownload) stepDownload.className = 'regata-step step-download';
        if (stepInstall) stepInstall.className = 'regata-step step-install';
        if (downloadDetails) downloadDetails.textContent = '';
        if (installDetails) installDetails.textContent = '';
    }
}

// Show progress of system updates with unified macro calculation.
const systemUpProgress = setInterval(systemUpdatesProgress, 500);
function systemUpdatesProgress() {
    const fs = require('fs');
    const statusFile = "/tmp/regataos-update/status.txt";
    const regataosOtherUpdatesLog = "/var/log/regataos-logs/regataos-other-updates.log";
    const downloadableAppOtherUpdates = "/tmp/regataos-update/downloadable-application-other-updates.txt";
    const installingAppOtherUpdates = "/tmp/regataos-update/installing-application-other-updates.txt";
    const otherUpInProgress = "/tmp/regataos-update/other-updates-in-progress.txt";

    try {
        if (!fs.existsSync(statusFile)) return;

        const currentStatus = fs.readFileSync(statusFile, "utf8");

        // Keep check widget in sync if checking for updates
        if (currentStatus.includes("check-updates")) {
            const refreshLog = "/var/log/regataos-logs/regataos-refresh-repo.log";
            let totalRepos = 28;
            try {
                const repos = fs.readdirSync('/etc/zypp/repos.d').filter(f => f.endsWith('.repo'));
                if (repos.length > 0) totalRepos = repos.length;
            } catch (e) { }

            let currentRepos = 0;
            if (fs.existsSync(refreshLog)) {
                try {
                    const data = fs.readFileSync(refreshLog, 'utf8');
                    const repoRegex = /(?:Repository|Retrieving repository|Building repository)\s+["\x27]([^"\x27]+)["\x27]/gi;
                    const foundRepos = new Set();
                    let m;
                    while ((m = repoRegex.exec(data)) !== null) {
                        foundRepos.add(m[1]);
                    }
                    currentRepos = Math.min(totalRepos, foundRepos.size);
                    if (data.includes("All repositories have been refreshed.")) {
                        currentRepos = totalRepos;
                    }
                } catch (e) { }
            }

            // Watchdog: If check-updates is active, verify that an updater/zypper process is actually alive
            if (!window._checkUpdatesWatchdogCounter) window._checkUpdatesWatchdogCounter = 0;
            window._checkUpdatesWatchdogCounter++;
            if (window._checkUpdatesWatchdogCounter >= 4) {
                window._checkUpdatesWatchdogCounter = 0;
                try {
                    const { exec } = require('child_process');
                    exec('pgrep -f "regataos-up|zypper"', (err, stdout) => {
                        if (!stdout || stdout.trim().length === 0) {
                            const pkgList = "/tmp/regataos-update/package-list.txt";
                            let nextStatus = "no-updates";
                            if (fs.existsSync(pkgList)) {
                                const pkgs = fs.readFileSync(pkgList, "utf8").trim();
                                if (pkgs.length > 0) nextStatus = "show-updates";
                            }
                            try {
                                fs.writeFileSync(statusFile, nextStatus + "\n", "utf8");
                            } catch (e) {}
                        }
                    });
                } catch (e) {}
            }

            // Target unified Split View elements
            const circle = document.getElementById('install-circle-progress');
            const text = document.getElementById('install-circle-percentage');
            const stepVerify = document.getElementById('install-step-verify');
            const stepVerifyTitle = document.getElementById('install-step-verify-title');
            const verifyDetails = document.getElementById('install-verify-details');
            const stepDownload = document.getElementById('install-step-download');
            const stepDownloadTitle = document.getElementById('install-step-download-title');
            const downloadDetails = document.getElementById('install-download-details');
            const stepInstall = document.getElementById('install-step-install');
            const stepInstallTitle = document.getElementById('install-step-install-title');
            const installDetails = document.getElementById('install-install-details');
            const checkingLabel = document.getElementById('checking-status-label');

            if (stepVerify) stepVerify.className = 'v-step active';
            if (stepVerifyTitle) stepVerifyTitle.textContent = '1. Verificando';
            if (stepDownload) stepDownload.className = 'v-step';
            if (stepDownloadTitle) stepDownloadTitle.textContent = '2. Download';
            if (downloadDetails) downloadDetails.textContent = 'Aguardando verificação';
            if (stepInstall) stepInstall.className = 'v-step';
            if (stepInstallTitle) stepInstallTitle.textContent = '3. Instalação';
            if (installDetails) installDetails.textContent = 'Aguardando verificação';

            if (currentRepos > 0) {
                const pct = Math.min(100, Math.round((currentRepos / totalRepos) * 100));
                setProgressArc(circle, text, pct, false);
                if (text) text.textContent = pct + '%';
                if (verifyDetails) verifyDetails.textContent = `(${currentRepos} de ${totalRepos} repositórios)`;
                if (checkingLabel) checkingLabel.textContent = `Sincronizando repositório ${currentRepos} de ${totalRepos}...`;
            } else {
                setProgressArc(circle, text, 0, true);
                if (text) text.textContent = '0%';
                if (verifyDetails) verifyDetails.textContent = `(0 de ${totalRepos} repositórios)`;
                if (checkingLabel) checkingLabel.textContent = 'Consultando repositórios do sistema...';
            }

            // Backward compatibility for old widgets if present
            const oldCircle = document.getElementById('check-circle-progress');
            const oldText = document.getElementById('check-circle-percentage');
            const oldVerifyDetails = document.getElementById('check-verify-details');
            const oldStepVerify = document.getElementById('check-step-verify');
            if (oldCircle) setProgressArc(oldCircle, oldText, currentRepos > 0 ? Math.min(100, Math.round((currentRepos / totalRepos) * 100)) : 0, currentRepos === 0);
            if (oldText) oldText.textContent = currentRepos > 0 ? `${Math.min(100, Math.round((currentRepos / totalRepos) * 100))}%` : '0%';
            if (oldVerifyDetails) oldVerifyDetails.textContent = `(${currentRepos} de ${totalRepos} repositórios)`;
            if (oldStepVerify) oldStepVerify.className = 'regata-step step-verify active';

            return;
        }

        // Active update in progress
        const isUpdating = currentStatus.includes("installing-updates") ||
            fs.existsSync(otherUpInProgress) ||
            (fs.existsSync(downloadableAppOtherUpdates) && fs.readFileSync(downloadableAppOtherUpdates, "utf8").includes("other-updates")) ||
            (fs.existsSync(installingAppOtherUpdates) && fs.readFileSync(installingAppOtherUpdates, "utf8").includes("other-updates")) ||
            fs.existsSync("/tmp/regataos-update/update-in-progress.txt") ||
            fs.existsSync("/tmp/regataos-update/all-auto-update.txt");

        if (!isUpdating && currentStatus.includes("show-updates")) {
            let totalShow = 0;
            const appsListFile = "/tmp/regataos-update/apps-list.txt";
            if (fs.existsSync(appsListFile)) {
                totalShow += fs.readFileSync(appsListFile, "utf8").trim().split('\n').filter(Boolean).length;
            }
            const packageListFile = "/tmp/regataos-update/package-list.txt";
            if (fs.existsSync(packageListFile)) {
                const pkgLines = fs.readFileSync(packageListFile, "utf8").trim().split('\n').filter(Boolean);
                if (pkgLines.length > 0) totalShow += 1;
            }
            if (totalShow === 0) {
                const numberAppsFile = "/tmp/regataos-update/number-apps.txt";
                if (fs.existsSync(numberAppsFile)) {
                    const m = fs.readFileSync(numberAppsFile, "utf8").match(/\d+/);
                    if (m) totalShow = parseInt(m[0], 10);
                }
            }

            const circle = document.getElementById('install-circle-progress');
            const text = document.getElementById('install-circle-percentage');
            const stepVerify = document.getElementById('install-step-verify');
            const stepVerifyTitle = document.getElementById('install-step-verify-title');
            const stepDownload = document.getElementById('install-step-download');
            const stepDownloadTitle = document.getElementById('install-step-download-title');
            const stepInstall = document.getElementById('install-step-install');
            const stepInstallTitle = document.getElementById('install-step-install-title');
            const verifyDetails = document.getElementById('install-verify-details');
            const downloadDetails = document.getElementById('install-download-details');
            const installDetails = document.getElementById('install-install-details');

            setProgressArc(circle, text, 0, false);
            if (text) text.textContent = '0%';
            if (stepVerify) {
                stepVerify.className = 'v-step completed';
                if (stepVerifyTitle) stepVerifyTitle.textContent = '1. Verificado';
                if (verifyDetails) {
                    verifyDetails.textContent = totalShow > 0 ? `${totalShow} atualizações prontas` : 'Atualizações prontas';
                }
            }
            if (stepDownload) {
                stepDownload.className = 'v-step';
                if (stepDownloadTitle) stepDownloadTitle.textContent = '2. Download';
                if (downloadDetails) downloadDetails.textContent = 'Aguardando início';
            }
            if (stepInstall) {
                stepInstall.className = 'v-step';
                if (stepInstallTitle) stepInstallTitle.textContent = '3. Instalação';
                if (installDetails) installDetails.textContent = 'Pacotes e dependências';
            }
            return;
        }

        if (isUpdating) {
            // 1. Contabilização de Aplicativos da Loja
            let totalApps = 0;
            let appsDownloaded = 0;
            let appsInstalled = 0;

            const appsListFile = "/tmp/regataos-update/apps-list.txt";
            const updatedAppFile = "/tmp/regataos-update/updated-apps.txt";
            const downloadableAppFile = "/tmp/regataos-update/downloadable-application.txt";
            const installingAppFile = "/tmp/regataos-update/installing-application.txt";

            let updatedList = [];
            if (fs.existsSync(updatedAppFile)) {
                updatedList = fs.readFileSync(updatedAppFile, "utf8").trim().split('\n').filter(Boolean);
            }
            const storeAppsUpdated = updatedList.filter(app => app !== 'other-updates');
            appsInstalled = storeAppsUpdated.length;

            let remainingAppsList = [];
            if (fs.existsSync(appsListFile)) {
                remainingAppsList = fs.readFileSync(appsListFile, "utf8").trim().split('\n').filter(Boolean);
            }

            totalApps = appsInstalled + remainingAppsList.length;

            // Apps baixados: quem já instalou já baixou; quem está instalando já baixou; quem está baixando conta proporcional
            appsDownloaded = appsInstalled;
            if (fs.existsSync(installingAppFile)) {
                const instApps = fs.readFileSync(installingAppFile, "utf8").trim().split('\n').filter(Boolean);
                appsDownloaded += instApps.length;
            }
            if (fs.existsSync(downloadableAppFile)) {
                const downApps = fs.readFileSync(downloadableAppFile, "utf8").trim().split('\n').filter(Boolean);
                downApps.forEach(appName => {
                    let logFile = `/tmp/regataos-update/${appName}-download-percentage.log`;
                    if (fs.existsSync(logFile)) {
                        try {
                            const logContent = fs.readFileSync(logFile, "utf8");
                            if (logContent.includes("100%")) {
                                appsDownloaded += 1.0;
                            } else {
                                appsDownloaded += 0.5;
                            }
                        } catch(e) {
                            appsDownloaded += 0.5;
                        }
                    } else {
                        appsDownloaded += 0.2;
                    }
                });
            }

            // 2. Contabilização de Pacotes do Sistema
            let totalSys = 0;
            const packageListFile = "/tmp/regataos-update/package-list.txt";
            if (fs.existsSync(packageListFile)) {
                const sysLines = fs.readFileSync(packageListFile, "utf8").trim().split('\n').filter(Boolean);
                totalSys = sysLines.length;
            }
            if (totalSys === 0) {
                const numberPackagesFile = "/tmp/regataos-update/number-packages.txt";
                if (fs.existsSync(numberPackagesFile)) {
                    const m = fs.readFileSync(numberPackagesFile, "utf8").match(/\d+/);
                    if (m) totalSys = parseInt(m[0], 10);
                }
            }

            // 3. Leitura e Parse dos logs do sistema
            let progressContent = '';
            if (fs.existsSync(regataosOtherUpdatesLog)) {
                try {
                    progressContent = fs.readFileSync(regataosOtherUpdatesLog, "utf8");
                } catch (e) { }
            }

            let currentSpeed = '';
            let parsedSysDownStep = 0;
            let parsedSysDownTotal = 0;
            let parsedSysInstStep = 0;
            let parsedSysInstTotal = 0;
            const isSysConcluded = updatedList.includes('other-updates') ||
                                   (progressContent && (progressContent.includes("There are running programs") || progressContent.includes("have been updated")));

            if (progressContent) {
                const lines = progressContent.split('\n');
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    if (!currentSpeed) {
                        const speedMatch = line.match(/(?:done|concluído)?\s*\(?([\d.,]+\s*(?:KiB|MiB|GiB|B|KB|MB|GB)\/s)\)?/i);
                        if (speedMatch) {
                            currentSpeed = speedMatch[1].trim();
                        }
                    }

                    if (!parsedSysInstStep && (line.includes("Installing:") || line.includes("Instalando:"))) {
                        const m = line.match(/[\(\[]\s*(\d+)\s*\/\s*(\d+)\s*[\)\]]/);
                        if (m) {
                            parsedSysInstStep = parseInt(m[1], 10);
                            parsedSysInstTotal = parseInt(m[2], 10);
                        }
                    }

                    if (!parsedSysDownStep && (line.includes("Retrieving:") || line.includes("Baixando") || line.includes("Fetching"))) {
                        const m = line.match(/[\(\[]\s*(\d+)\s*\/\s*(\d+)\s*[\)\]]/);
                        if (m) {
                            parsedSysDownStep = parseInt(m[1], 10);
                            parsedSysDownTotal = parseInt(m[2], 10);
                        }
                    }

                    if (currentSpeed && parsedSysInstStep && parsedSysDownStep) break;
                }
            }

            if (currentSpeed) lastKnownSpeed = currentSpeed;
            if (parsedSysDownStep > highestSysDownloadStep) highestSysDownloadStep = parsedSysDownStep;
            if (parsedSysInstStep > highestSysInstallStep) highestSysInstallStep = parsedSysInstStep;

            const installedFile = "/tmp/regataos-update/system-update-installed.txt";
            if (fs.existsSync(installedFile)) {
                try {
                    const instCount = fs.readFileSync(installedFile, "utf8").trim().split('\n').filter(Boolean).length;
                    if (instCount > highestSysInstallStep) highestSysInstallStep = instCount;
                } catch(e) {}
            }

            if (parsedSysDownTotal > totalSys) totalSys = parsedSysDownTotal;
            if (parsedSysInstTotal > totalSys) totalSys = parsedSysInstTotal;

            const prefetchDone = fs.existsSync("/tmp/regataos-update/system-updates-download-complete.txt");
            let sysDownloaded = 0;
            if (isSysConcluded || prefetchDone) {
                sysDownloaded = totalSys;
            } else {
                sysDownloaded = Math.min(totalSys, highestSysDownloadStep);
            }

            let sysInstalled = isSysConcluded ? totalSys : Math.min(totalSys, highestSysInstallStep);

            // 4. TOTALIZAÇÃO UNIFICADA
            let totalItems = totalApps + totalSys;
            if (totalItems > initialTotalItems) initialTotalItems = totalItems;
            const effTotal = Math.max(initialTotalItems, totalItems, lastKnownTotal, 1);
            lastKnownTotal = effTotal;
            window.lastKnownTotal = effTotal;

            const effDownloaded = Math.min(effTotal, Math.round(appsDownloaded + sysDownloaded));
            const effInstalled = Math.min(effTotal, Math.round(appsInstalled + sysInstalled));

            // 5. CÁLCULO MONOTÔNICO DA PORCENTAGEM GLOBAL
            let globalPercent = 0;
            if (currentStatus.includes("updated") || (isSysConcluded && (totalApps === 0 || appsInstalled >= totalApps))) {
                highestProgressPercent = 100;
                globalPercent = 100;
            } else {
                const downloadRatio = Math.min(1, (appsDownloaded + sysDownloaded) / effTotal);
                const installRatio = Math.min(1, (appsInstalled + sysInstalled) / effTotal);

                // Verificação: 5%
                // Download cumulativo: 45% (5% -> 50%)
                // Instalação cumulativa: 45% (50% -> 95%)
                // Pós-configurações / scripts: 95% -> 99%
                let raw = 5 + (downloadRatio * 45) + (installRatio * 45);
                if (effInstalled >= effTotal && effTotal > 0) {
                    raw = 99;
                }
                let calculated = Math.min(99, Math.round(raw));
                highestProgressPercent = Math.max(highestProgressPercent, calculated);
                globalPercent = highestProgressPercent;
            }

            // 6. Atualização dos Componentes Visuais
            const hasActiveInst = effInstalled > 0 ||
                                  (fs.existsSync(installingAppFile) && fs.readFileSync(installingAppFile, "utf8").trim().length > 0) ||
                                  (fs.existsSync(installingAppOtherUpdates) && fs.readFileSync(installingAppOtherUpdates, "utf8").includes("other-updates"));

            updateGlobalProgressWidget({
                percent: globalPercent,
                downloaded: effDownloaded,
                installed: effInstalled,
                total: effTotal,
                speed: lastKnownSpeed,
                isConcluded: globalPercent === 100,
                hasActiveInstalls: hasActiveInst
            });

            // Linha descritiva do card de atualizações do sistema
            const percentageOtherUpdates = document.querySelector("div#percentage-other-updates");
            if (percentageOtherUpdates && totalSys > 0) {
                let currentItem = sysInstalled > 0 ? sysInstalled : sysDownloaded;
                let t = `(${currentItem} de ${totalSys})`;
                if (lastKnownSpeed) t += ` • ${lastKnownSpeed}`;
                percentageOtherUpdates.innerHTML = t;
            }
        }
    } catch (err) {
        try {
            fs.appendFileSync('/tmp/regataos-update/progress_debug.log', `${new Date().toISOString()} ${err.stack || err}\n`);
        } catch(e) {}
    }
}
systemUpdatesProgress();

// Functions to show or hide install details in the progress card
function displayInstallDetails(display) {
    const fs = require('fs');
    const contents = document.querySelector(".install-details-contents");
    const showBtn = document.querySelector(".show-install-details");
    const hideBtn = document.querySelector(".hide-install-details");

    if (!contents || !showBtn || !hideBtn) return;

    if (display === 'show') {
        const packageListHtml = "/tmp/regataos-update/package-list-html.txt";
        if (fs.existsSync(packageListHtml)) {
            let html = fs.readFileSync(packageListHtml, "utf8");
            html = html.replace(/\s/g, "\n");
            contents.innerHTML = html;
        }
        showBtn.style.display = "none";
        hideBtn.style.display = "inline-flex";
        contents.style.display = "block";
        cacheSystemUpdateElements();
    } else {
        contents.style.display = "none";
        showBtn.style.display = "inline-flex";
        hideBtn.style.display = "none";
    }
}

// Cache of DOM elements per package — populated once when the list is rendered.
const systemUpdateElements = {};

function cacheSystemUpdateElements() {
    const fs = require('fs');
    const listSystemUpdates = "/tmp/regataos-update/package-list.txt";
    if (!fs.existsSync(listSystemUpdates)) return;

    const lines = fs.readFileSync(listSystemUpdates, "utf8").split('\n');
    lines.forEach(line => {
        if (!line || systemUpdateElements[line]) return;
        // Use getElementsByClassName to avoid CSS selector issues with special
        // characters in package names (e.g. + in libconfig++15).
        const concluded = document.getElementsByClassName(`otherup-app-status-concluded-${line}`)[0];
        if (!concluded) return;
        systemUpdateElements[line] = {
            concluded: concluded,
            waiting:   document.getElementsByClassName(`otherup-app-status-waiting-${line}`)[0],
            install:   document.getElementsByClassName(`otherup-app-status-install-${line}`)[0],
            download:  document.getElementsByClassName(`otherup-app-status-download-${line}`)[0],
            _state:    null,
        };
    });
}

// Functions to show or hide "Other updates" details.
function displayDetails(display) {
    const fs = require('fs');
    const moreDetailsContents = document.querySelector(".more-details-contents");
    const showDetails = document.querySelector(".show-details");
    const hideDetails = document.querySelector(".hide-details");

    if (display.includes("show")) {
        const packageListHtml = "/tmp/regataos-update/package-list-html.txt";
        if (fs.existsSync(packageListHtml)) {
            let getPackageListHtml = fs.readFileSync(packageListHtml, "utf8");
            getPackageListHtml = getPackageListHtml.replace(/\s/g, "\n");
            moreDetailsContents.innerHTML = getPackageListHtml;
        }
        showDetails.style.display = "none";
        hideDetails.style.display = "flex";
        moreDetailsContents.style.display = "block";

        // Rebuild the DOM cache after injecting the new HTML.
        Object.keys(systemUpdateElements).forEach(k => delete systemUpdateElements[k]);
        cacheSystemUpdateElements();
    } else {
        // Clear the DOM cache when the panel is closed.
        Object.keys(systemUpdateElements).forEach(k => delete systemUpdateElements[k]);
        moreDetailsContents.style.display = "none";
        showDetails.style.display = "flex";
        hideDetails.style.display = "none";
    }
}

// Check and show the installation status of system updates.
setInterval(checkInstallStatusOfSystemUpdates, 1000);
function checkInstallStatusOfSystemUpdates() {
    const fs = require('fs');
    const listSystemUpdates = "/tmp/regataos-update/package-list.txt";

    // Panel is closed — nothing to update.
    if (Object.keys(systemUpdateElements).length === 0) return;

    if (!fs.existsSync(listSystemUpdates)) return;

    // Read each status file once, outside the loop.
    const installed   = fs.existsSync("/tmp/regataos-update/system-update-installed.txt") ? fs.readFileSync("/tmp/regataos-update/system-update-installed.txt",  "utf8") : "";
    const waiting     = fs.existsSync("/tmp/regataos-update/waiting-for-installation.txt") ? fs.readFileSync("/tmp/regataos-update/waiting-for-installation.txt", "utf8") : "";
    const installing  = fs.existsSync("/tmp/regataos-update/installing-system-update.txt") ? fs.readFileSync("/tmp/regataos-update/installing-system-update.txt", "utf8") : "";
    const downloading = fs.existsSync("/tmp/regataos-update/downloading-system-update.txt") ? fs.readFileSync("/tmp/regataos-update/downloading-system-update.txt","utf8") : "";

    const lines = fs.readFileSync(listSystemUpdates, "utf8").split('\n');
    lines.forEach(line => {
        if (!line) return;
        const els = systemUpdateElements[line];
        if (!els) return;

        // Resolve the new state for this package.
        let newState;
        if      (installed.includes(line))   newState = "concluded";
        else if (installing.includes(line))  newState = "install";
        else if (waiting.includes(line))     newState = "waiting";
        else if (downloading.includes(line)) newState = "download";
        else                                 newState = "none";

        // Skip DOM update if the state hasn't changed since last tick.
        if (els._state === newState) return;
        els._state = newState;

        els.concluded.style.display = newState === "concluded" ? "block" : "none";
        els.waiting.style.display   = newState === "waiting"   ? "block" : "none";
        els.install.style.display   = newState === "install"   ? "block" : "none";
        els.download.style.display  = newState === "download"  ? "block" : "none";
    });
}
checkInstallStatusOfSystemUpdates();
