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

// Display elements on the screen according to the current status
setInterval(currentStatus, 500);
function currentStatus() {
    const fs = require('fs');
    const statusFile = "/tmp/regataos-update/status.txt";

    if (fs.existsSync(statusFile)) {
        const getCurrentStatus = fs.readFileSync(statusFile, "utf8");

        const neverTitle = document.querySelector(".never-update-title");
        const checkTitle = document.querySelector(".check-update-title");
        const installTitle = document.querySelector(".installing-update-title");
        const searchStatus = document.querySelector(".search-update-status");
        const withoutTitle = document.querySelector(".without-update-title");
        const withTitle = document.querySelector(".with-update-title");
        const updatedTitle = document.querySelector(".updated-system-title");

        const mainNever = document.querySelector("#main-never-update");
        const mainCheck = document.querySelector("#main-check-update");
        const mainInstall = document.querySelector("#main-install-update");
        const mainWithout = document.querySelector("#main-without-update");
        const mainWith = document.querySelector("#main-with-update");
        const div1 = document.querySelector(".div1");
        const div1Sub = document.querySelector(".div1-sub");
        const mainEl = document.querySelector(".main");

        if (isTransitioningToUpdated) {
            return;
        }

        const splitHeaderChecking = document.querySelector("#split-header-checking");
        const splitHeaderUpdates = document.querySelector("#split-header-updates");
        const splitHeaderUpdated = document.querySelector("#split-header-updated");
        const splitCheckingView = document.querySelector("#split-checking-view");
        const splitUpdatedView = document.querySelector("#split-updated-view");
        const splitRightCards = document.querySelector("#split-right-cards");
        const splitCheckBtnWrap = document.querySelector("#split-check-button-wrap");
        const updateAll = document.querySelector(".split-left-footer .update-all");

        if (div1) div1.style.display = "none";
        if (mainNever) mainNever.style.display = "none";
        if (mainCheck) mainCheck.style.display = "none";
        if (mainInstall) mainInstall.style.display = "none";
        if (mainWithout) mainWithout.style.display = "none";
        if (mainWith) mainWith.style.display = "flex";
        if (mainEl) mainEl.classList.add("split-active");

        if (getCurrentStatus.includes("never-updates")) {
            if (splitHeaderChecking) splitHeaderChecking.style.display = "none";
            if (splitHeaderUpdates) splitHeaderUpdates.style.display = "none";
            if (splitHeaderUpdated) splitHeaderUpdated.style.display = "block";
            if (splitCheckingView) splitCheckingView.style.display = "none";
            if (splitUpdatedView) splitUpdatedView.style.display = "flex";
            if (splitRightCards) splitRightCards.style.display = "none";
            if (splitCheckBtnWrap) splitCheckBtnWrap.style.display = "block";
            if (updateAll) updateAll.style.display = "none";

            const stepVerify = document.getElementById('install-step-verify');
            const stepVerifyTitle = document.getElementById('install-step-verify-title');
            const verifyDetails = document.getElementById('install-verify-details');
            if (stepVerify) stepVerify.className = 'v-step';
            if (stepVerifyTitle) stepVerifyTitle.textContent = '1. Verificação';
            if (verifyDetails) verifyDetails.textContent = 'Desativada';

        } else if (getCurrentStatus.includes("check-updates")) {
            if (splitHeaderChecking) splitHeaderChecking.style.display = "block";
            if (splitHeaderUpdates) splitHeaderUpdates.style.display = "none";
            if (splitHeaderUpdated) splitHeaderUpdated.style.display = "none";
            if (splitCheckingView) splitCheckingView.style.display = "flex";
            if (splitUpdatedView) splitUpdatedView.style.display = "none";
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
            if (splitUpdatedView) splitUpdatedView.style.display = "none";
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
            if (splitUpdatedView) splitUpdatedView.style.display = "none";
            if (splitRightCards) splitRightCards.style.display = "flex";
            if (splitCheckBtnWrap) splitCheckBtnWrap.style.display = "none";

            showNumberUpdates();
            autoUpdate();
            listUpdates();
            applyTranslationPages();

        } else if ((getCurrentStatus.includes("no-updates")) || (getCurrentStatus.includes("updated"))) {
            if (wasInstalling && getCurrentStatus.includes("updated")) {
                isTransitioningToUpdated = true;
                const tot = (typeof window.lastKnownTotal !== 'undefined' && window.lastKnownTotal > 0) ? window.lastKnownTotal : 1;
                if (typeof updateRegataProgressWidget === 'function') {
                    updateRegataProgressWidget('install-', { stage: 'concluded', currentStep: tot, totalSteps: tot, speed: '' });
                }
                setTimeout(() => {
                    wasInstalling = false;
                    isTransitioningToUpdated = false;
                    currentStatus();
                }, 1800);
                return;
            }

            if (splitHeaderChecking) splitHeaderChecking.style.display = "none";
            if (splitHeaderUpdates) splitHeaderUpdates.style.display = "none";
            if (splitHeaderUpdated) splitHeaderUpdated.style.display = "block";
            if (splitCheckingView) splitCheckingView.style.display = "none";
            if (splitUpdatedView) splitUpdatedView.style.display = "flex";
            if (splitRightCards) splitRightCards.style.display = "none";
            if (splitCheckBtnWrap) splitCheckBtnWrap.style.display = "block";
            if (updateAll) updateAll.style.display = "none";

            // Left panel steps in completed state
            const circle = document.getElementById('install-circle-progress');
            const text = document.getElementById('install-circle-percentage');
            const stepVerify = document.getElementById('install-step-verify');
            const stepVerifyTitle = document.getElementById('install-step-verify-title');
            const verifyDetails = document.getElementById('install-verify-details');
            const stepDownload = document.getElementById('install-step-download');
            const downloadDetails = document.getElementById('install-download-details');
            const stepInstall = document.getElementById('install-step-install');
            const installDetails = document.getElementById('install-install-details');

            if (typeof setProgressArc === 'function') {
                setProgressArc(circle, text, 100, false);
            }
            if (text) text.textContent = '100%';
            if (stepVerify) stepVerify.className = 'v-step completed';
            if (stepVerifyTitle) stepVerifyTitle.textContent = '1. Verificado';
            if (verifyDetails) verifyDetails.textContent = 'Tudo atualizado';
            if (stepDownload) stepDownload.className = 'v-step completed';
            if (downloadDetails) downloadDetails.textContent = 'Concluído';
            if (stepInstall) stepInstall.className = 'v-step completed';
            if (installDetails) installDetails.textContent = 'Concluído';

            showNumberUpdates();
            autoUpdate();
            applyTranslationPages();
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
