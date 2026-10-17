// Apply in-app translation based on user's language settings.

// Apply text translations in the app
function applyTranslationPages() {
    const fs = require('fs');
    const getTranslation = selectTranslationFile();

    let data = fs.readFileSync(getTranslation, "utf8");
    data = JSON.parse(data);

    for (let i = 0; i < data.length; i++) {
        // Apply translations according to page URL
        const pageUrl = window.location.href;

        if (pageUrl.includes("home.html")) {
            // Title
            document.querySelectorAll("h1").forEach(el => el.innerHTML = data[i].index.windowTitle);

            // Split brand subtitle & step titles
            const splitSub = document.querySelector(".split-brand-subtitle");
            if (splitSub) {
                splitSub.innerHTML = (data[i].index.sideBar && data[i].index.sideBar.home === "Atualizações") ? "Gerenciador de atualizações" : "Update Manager";
            }
            const stepVTitle = document.getElementById("install-step-verify-title");
            if (stepVTitle) {
                const fs = require('fs');
                const statusFile = "/tmp/regataos-update/status.txt";
                let isChecking = false;
                if (fs.existsSync(statusFile)) {
                    isChecking = fs.readFileSync(statusFile, 'utf8').includes('check-updates');
                }
                if (isChecking) {
                    stepVTitle.innerHTML = (data[i].index.sideBar && data[i].index.sideBar.home === "Atualizações") ? "1. Verificando" : "1. Checking";
                } else {
                    stepVTitle.innerHTML = (data[i].index.sideBar && data[i].index.sideBar.home === "Atualizações") ? "1. Verificado" : "1. Verified";
                }
            }
            const stepDTitle = document.getElementById("install-step-download-title");
            if (stepDTitle) {
                stepDTitle.innerHTML = (data[i].index.sideBar && data[i].index.sideBar.home === "Atualizações") ? "2. Download" : "2. Download";
            }
            const stepITitle = document.getElementById("install-step-install-title");
            if (stepITitle) {
                stepITitle.innerHTML = (data[i].index.sideBar && data[i].index.sideBar.home === "Atualizações") ? "3. Instalação" : "3. Installation";
            }

            // Top button
            document.querySelectorAll(".update-all-button1").forEach(el => el.innerHTML = data[i].home.topButton.updateAll);
            document.querySelectorAll(".update-all-button2").forEach(el => el.innerHTML = data[i].home.topButton.cancel);

            // Update status
            document.querySelectorAll(".check-update-title").forEach(el => el.innerHTML = data[i].home.appStatus.checkUp);
            document.querySelectorAll(".without-update-title").forEach(el => el.innerHTML = data[i].home.appStatus.noUpdates);
            document.querySelectorAll(".never-update-title").forEach(el => el.innerHTML = data[i].home.appStatus.neverUp);
            document.querySelectorAll(".yes-up").forEach(el => el.innerHTML = data[i].home.appStatus.yesUp);
            document.querySelectorAll(".updated").forEach(el => el.innerHTML = data[i].home.appStatus.updated);
            document.querySelectorAll(".search-update-status").forEach(el => el.innerHTML = data[i].home.appStatus.searchUp);
            if (document.querySelector(".installing-update-title")) {
                document.querySelector(".installing-update-title").innerHTML = data[i].home.updateStatus.installing;
            }
            document.querySelectorAll(".not-up-auto").forEach(el => el.innerHTML = data[i].home.appStatus.noUpAuto);
            document.querySelectorAll(".yes-update-auto").forEach(el => el.innerHTML = data[i].home.appStatus.yesUpAuto);

            // App Status
            const appStatusPending = document.querySelectorAll(".app-status-pending");
            for (let b = 0; b < appStatusPending.length; b++) {
                appStatusPending[b].innerHTML = data[i].home.updateStatus.pending;
            }

            const appStatusDownload = document.querySelectorAll(".app-status-download");
            for (let b = 0; b < appStatusDownload.length; b++) {
                appStatusDownload[b].innerHTML = data[i].home.updateStatus.download;
            }

            const appStatusInstall = document.querySelectorAll(".app-status-install");
            for (let b = 0; b < appStatusInstall.length; b++) {
                appStatusInstall[b].innerHTML = data[i].home.updateStatus.installing;
            }

            const appStatusConcluded = document.querySelectorAll(".app-status-concluded");
            for (let b = 0; b < appStatusConcluded.length; b++) {
                appStatusConcluded[b].innerHTML = data[i].home.updateStatus.concluded;
            }

            if (document.querySelector("#check-updates-button")) {
                document.querySelector("#check-updates-button").innerHTML = data[i].home.updateStatus.verify;
            }
            if (document.querySelector("#never-check-updates-button")) {
                document.querySelector("#never-check-updates-button").innerHTML = data[i].home.updateStatus.verify;
            }
            if (document.querySelector("#check-updates-button-title")) {
                document.querySelector("#check-updates-button-title").innerHTML = data[i].home.updateStatus.allReady;
            }
            if (document.querySelector("#check-updates-button-desc")) {
                document.querySelector("#check-updates-button-desc").innerHTML = data[i].home.updateStatus.allReadyDesc;
            }

            if (document.querySelector("#split-check-updates-btn")) {
                document.querySelector("#split-check-updates-btn").innerHTML = data[i].home.updateStatus.verify;
            }
            if (document.querySelector("#split-check-updates-button")) {
                document.querySelector("#split-check-updates-button").innerHTML = data[i].home.updateStatus.verify;
            }

            // Resting Hero View (Layout 2)
            const restingHeroTitle = document.getElementById("resting-hero-title");
            const restingHeroSubtitle = document.getElementById("resting-hero-subtitle");
            const btnRestingCheckText = document.getElementById("btn-resting-check-text");
            const restingBadgeText = document.querySelector(".resting-badge-text");
            const pillLabel = document.querySelector(".pill-label");

            const isPt = data[i].index.sideBar && data[i].index.sideBar.home === "Atualizações";
            if (restingHeroTitle) {
                restingHeroTitle.innerHTML = (data[i].home && data[i].home.updateStatus && data[i].home.updateStatus.allReady) || (isPt ? "Tudo pronto por aqui!" : "All ready here!");
            }
            if (restingHeroSubtitle) {
                const fs = require('fs');
                const statusFile = "/tmp/regataos-update/status.txt";
                let isNever = false;
                if (fs.existsSync(statusFile)) {
                    isNever = fs.readFileSync(statusFile, 'utf8').includes('never-updates');
                }
                if (isNever) {
                    restingHeroSubtitle.innerHTML = isPt ? "A busca automática de atualizações está desativada nas configurações." : "Automatic update check is disabled in settings.";
                } else {
                    restingHeroSubtitle.innerHTML = (data[i].home && data[i].home.updateStatus && data[i].home.updateStatus.allReadyDesc) || (isPt ? "O Regata OS e todos os seus aplicativos instalados estão na versão estável mais recente." : "Regata OS and all your installed apps are up to date with the latest stable versions.");
                }
            }
            if (btnRestingCheckText) {
                const fs = require('fs');
                const statusFile = "/tmp/regataos-update/status.txt";
                let isNever = false;
                if (fs.existsSync(statusFile)) {
                    isNever = fs.readFileSync(statusFile, 'utf8').includes('never-updates');
                }
                if (isNever) {
                    btnRestingCheckText.innerHTML = isPt ? "Verificar agora" : "Check now";
                } else {
                    btnRestingCheckText.innerHTML = (data[i].home && data[i].home.updateStatus && data[i].home.updateStatus.verify) || (isPt ? "Verificar se há atualizações" : "Check for updates");
                }
            }
            if (restingBadgeText) {
                const fs = require('fs');
                const statusFile = "/tmp/regataos-update/status.txt";
                let isNever = false;
                if (fs.existsSync(statusFile)) {
                    isNever = fs.readFileSync(statusFile, 'utf8').includes('never-updates');
                }
                if (isNever) {
                    restingBadgeText.innerHTML = isPt ? "Verificação manual" : "Manual check";
                } else {
                    restingBadgeText.innerHTML = isPt ? "Sistema Atualizado" : "System Up to Date";
                }
            }
            if (pillLabel) {
                pillLabel.innerHTML = isPt ? "Última checagem:" : "Last check:";
            }

            const stageTag = document.getElementById("split-circle-stage-tag");
            if (stageTag) {
                const txt = stageTag.textContent.trim();
                if (txt.includes("Etapa 1") || txt.includes("Stage 1")) {
                    stageTag.textContent = isPt ? "Etapa 1: Verificação" : "Stage 1: Checking";
                } else if (txt.includes("Etapa 2") || txt.includes("Stage 2")) {
                    stageTag.textContent = isPt ? "Etapa 2: Download" : "Stage 2: Download";
                } else if (txt.includes("Etapa 3") || txt.includes("Stage 3")) {
                    stageTag.textContent = isPt ? "Etapa 3: Instalação" : "Stage 3: Installation";
                } else if (txt.includes("Atualizações prontas") || txt.includes("Updates ready")) {
                    stageTag.textContent = isPt ? "Atualizações prontas" : "Updates ready";
                } else if (txt.includes("Concluído") || txt.includes("Completed")) {
                    stageTag.textContent = isPt ? "Concluído" : "Completed";
                }
            }

            // System updates status
            const otherUpStatusWaiting = document.querySelectorAll(".otherup-app-status-waiting");
            for (let b = 0; b < otherUpStatusWaiting.length; b++) {
                otherUpStatusWaiting[b].innerHTML = data[i].home.updateStatus.waiting;
            }

            const otherUpStatusDownload = document.querySelectorAll(".otherup-app-status-download");
            for (let b = 0; b < otherUpStatusDownload.length; b++) {
                otherUpStatusDownload[b].innerHTML = data[i].home.updateStatus.download;
            }

            const otherUpStatusInstall = document.querySelectorAll(".otherup-app-status-install");
            for (let b = 0; b < otherUpStatusInstall.length; b++) {
                otherUpStatusInstall[b].innerHTML = data[i].home.updateStatus.installing;
            }

            const otherUpStatusConcluded = document.querySelectorAll(".otherup-app-status-concluded");
            for (let b = 0; b < otherUpStatusConcluded.length; b++) {
                otherUpStatusConcluded[b].innerHTML = data[i].home.updateStatus.concluded;
            }

            // Button
            const updateApp = document.querySelectorAll(".update-app");
            for (let b = 0; b < updateApp.length; b++) {
                updateApp[b].innerHTML = data[i].home.button.update;
            }

            const cancelUpdate = document.querySelectorAll(".cancel-app");
            for (let b = 0; b < cancelUpdate.length; b++) {
                cancelUpdate[b].innerHTML = data[i].home.button.cancel;
            }

            const cancelChecking = document.querySelectorAll(".cancel-checking-text");
            for (let b = 0; b < cancelChecking.length; b++) {
                cancelChecking[b].innerHTML = data[i].home.button.cancel;
            }

            // Other updates
            document.querySelector(".other-updates .app-name").innerHTML = data[i].home.otherUpdates.title;
            document.querySelector("#update-app-other-updates").innerHTML = data[i].home.otherUpdates.otherUpButton;

            const moreDetailsText = document.querySelectorAll(".more-details-text");
            for (let b = 0; b < moreDetailsText.length; b++) {
                moreDetailsText[b].innerHTML = data[i].home.otherUpdates.moreDetails;
            }

            // Progress widget step labels
            const stepVerifyLabels = document.querySelectorAll(".step-verify .step-label");
            for (let b = 0; b < stepVerifyLabels.length; b++) {
                stepVerifyLabels[b].innerHTML = data[i].home.updateStatus.checking.replace(/\.+$/, '');
            }
            const stepDownloadLabels = document.querySelectorAll(".step-download .step-label");
            for (let b = 0; b < stepDownloadLabels.length; b++) {
                stepDownloadLabels[b].innerHTML = data[i].home.updateStatus.download.replace(/\.+$/, '');
            }
            const stepInstallLabels = document.querySelectorAll(".step-install .step-label");
            for (let b = 0; b < stepInstallLabels.length; b++) {
                stepInstallLabels[b].innerHTML = data[i].home.updateStatus.installing.replace(/\.+$/, '');
            }

        } else if (pageUrl.includes("historic.html")) {
            // Title
            document.querySelector("h1").innerHTML = data[i].index.windowTitle;
            document.querySelector(".apps-updated").innerHTML = data[i].historic.title;

            // Open app button
            const openApp = document.querySelectorAll(".open-app");
            for (let b = 0; b < openApp.length; b++) {
                openApp[b].innerHTML = data[i].historic.openApp;
            }

        } else if (pageUrl.includes("settings.html")) {
            // Title
            document.querySelector("h1").innerHTML = data[i].index.windowTitle;
            document.querySelector(".apps-settings").innerHTML = data[i].settings.title;

            // Tabs
            if (data[i].settings.tabs) {
                const tabGeneral = document.querySelector(".tab-label-general");
                if (tabGeneral) tabGeneral.innerHTML = data[i].settings.tabs.general;

                const tabMirrors = document.querySelector(".tab-label-mirrors");
                if (tabMirrors) tabMirrors.innerHTML = data[i].settings.tabs.mirrors;
            }

            // General tab texts
            if (data[i].settings.generalTab) {
                const sub = document.querySelector(".general-setting-subtitle");
                if (sub) sub.innerHTML = data[i].settings.generalTab.subtitle;

                const onTitle = document.querySelector(".up-on-card-title");
                if (onTitle) onTitle.innerHTML = data[i].settings.generalTab.autoTitle;
                const onDesc = document.querySelector(".up-on-card-desc");
                if (onDesc) onDesc.innerHTML = data[i].settings.generalTab.autoDesc;

                const onlyTitle = document.querySelector(".up-only-card-title");
                if (onlyTitle) onlyTitle.innerHTML = data[i].settings.generalTab.checkTitle;
                const onlyDesc = document.querySelector(".up-only-card-desc");
                if (onlyDesc) onlyDesc.innerHTML = data[i].settings.generalTab.checkDesc;

                const offTitle = document.querySelector(".up-off-card-title");
                if (offTitle) offTitle.innerHTML = data[i].settings.generalTab.neverTitle;
                const offDesc = document.querySelector(".up-off-card-desc");
                if (offDesc) offDesc.innerHTML = data[i].settings.generalTab.neverDesc;
            }

            // Auto update option
            document.querySelector(".up-apps-auto").innerHTML = data[i].settings.autoUpdateOption.title;

            const upOn = document.querySelectorAll(".up-on");
            for (let b = 0; b < upOn.length; b++) {
                upOn[b].innerHTML = data[i].settings.autoUpdateOption.autoUpOn;
            }

            const upOnly = document.querySelectorAll(".up-only");
            for (let b = 0; b < upOnly.length; b++) {
                upOnly[b].innerHTML = data[i].settings.autoUpdateOption.checkUpOnly;
            }

            const upOff = document.querySelectorAll(".up-off");
            for (let b = 0; b < upOff.length; b++) {
                upOff[b].innerHTML = data[i].settings.autoUpdateOption.neverUpdate;
            }

            // Mirror options
            if (data[i].settings.mirrorTab) {
                const activeTag = document.querySelector(".mirror-active-tag");
                if (activeTag) activeTag.innerHTML = data[i].settings.mirrorTab.activeTag;

                const activeDesc = document.querySelector(".mirror-active-desc");
                if (activeDesc) activeDesc.innerHTML = data[i].settings.mirrorTab.activeDesc;
            }

            if (data[i].settings.mirrorOption) {
                const mirrorTitle = document.querySelector(".mirror-setting-title");
                if (mirrorTitle) mirrorTitle.innerHTML = data[i].settings.mirrorOption.title;

                const mirrorDiagTitle = document.querySelector(".mirror-diag-title");
                if (mirrorDiagTitle) mirrorDiagTitle.innerHTML = data[i].settings.mirrorOption.diagTitle;

                const thServer = document.querySelector(".th-server");
                if (thServer) thServer.innerHTML = data[i].settings.mirrorOption.colServer;

                const thPing = document.querySelector(".th-ping");
                if (thPing) thPing.innerHTML = data[i].settings.mirrorOption.colPing;

                const thSpeed = document.querySelector(".th-speed");
                if (thSpeed) thSpeed.innerHTML = data[i].settings.mirrorOption.colSpeed;

                const thAction = document.querySelector(".th-action");
                if (thAction) thAction.innerHTML = data[i].settings.mirrorOption.colAction;

                const testBtnText = document.querySelector("#btn-test-mirrors-text");
                if (testBtnText && !window.isTestingMirrors) {
                    testBtnText.innerHTML = data[i].settings.mirrorOption.btnTest;
                }
            }
        }
    }
}
applyTranslationPages();
