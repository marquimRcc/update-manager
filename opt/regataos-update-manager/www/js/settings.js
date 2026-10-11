// Disable main hover effect after few seconds
setTimeout(function () {
    document.getElementById("loadscreen").style.display = "none";
}, 1000);

// Automatic update
function checkAutoUpdateConfig() {
    const fs = require('fs');
    const regataosUpdateConf = "/tmp/regataos-update/config/regataos-update.conf";
    const updateConfigButton = document.querySelector("#select-update-config span");
    if (fs.existsSync(regataosUpdateConf)) {
        const checkUpdateConf = fs.readFileSync(regataosUpdateConf, "utf8");
        if (checkUpdateConf.includes("1")) {
            updateConfigButton.classList.add("up-on");
        } else if (checkUpdateConf.includes("2")) {
            updateConfigButton.classList.add("up-only");
        } else if (checkUpdateConf.includes("3")) {
            updateConfigButton.classList.add("up-off");
        }
    } else {
        updateConfigButton.classList.add("up-only");
    }
}
checkAutoUpdateConfig();

// Choose gpu to render
function selectAutoUpdate(setting) {
    const exec = require('child_process').exec;
    const commandLine = `/opt/regataos-update-manager/scripts/update-manager-option -update-${setting}`;
    exec(commandLine, function (error, call, errlog) { });
}

// Functions for buttons with drop-down menu.
sessionStorage.setItem("hideMenu", "");
function hideSpecifiedMenu() {
    let buttonId = sessionStorage.getItem("buttonId");
    let menuId = sessionStorage.getItem("hideMenu");
    let clickedElement = document.activeElement.id;

    if (clickedElement != buttonId) {
        let elementToHide = document.querySelector(`#${menuId}`);
        elementToHide.style.display = "none";
    }
}

function showSpecifiedMenu(buttonId, menuId, optionId) {
    let extendedMenu = document.querySelector(`#${menuId}`);
    let styleDefaultValue = extendedMenu.style.display;

    function openMenu() {
        extendedMenu.style.display = "block";
        sessionStorage.setItem("hideMenu", menuId);
        sessionStorage.setItem("buttonId", buttonId);
    }

    if (styleDefaultValue == "" || styleDefaultValue == "none") {
        // check if there are any menus open
        let checkMenuOpen = sessionStorage.getItem("hideMenu");
        if (checkMenuOpen && checkMenuOpen != menuId) {
            document.querySelector(`#${menuId}`).style.display = "none";
            setTimeout(function () {
                openMenu();
            }, 100);
        } else {
            openMenu();
        }
    } else {
        extendedMenu.style.display = "none";
        const buttonText = document.querySelector(`#${optionId} span`).textContent;
        document.querySelector(`#${buttonId} span`).textContent = buttonText;
    }
}

// Tab Switching (Opção A)
function switchSettingsTab(tabName) {
    sessionStorage.setItem("settingsActiveTab", tabName);
    const tabGeneral = document.getElementById("tab-btn-general");
    const tabMirrors = document.getElementById("tab-btn-mirrors");
    const paneGeneral = document.getElementById("settings-pane-general");
    const paneMirrors = document.getElementById("settings-pane-mirrors");

    if (tabName === "mirrors") {
        if (tabGeneral) tabGeneral.classList.remove("active");
        if (tabMirrors) tabMirrors.classList.add("active");
        if (paneGeneral) paneGeneral.style.display = "none";
        if (paneMirrors) paneMirrors.style.display = "block";
    } else {
        if (tabMirrors) tabMirrors.classList.remove("active");
        if (tabGeneral) tabGeneral.classList.add("active");
        if (paneMirrors) paneMirrors.style.display = "none";
        if (paneGeneral) paneGeneral.style.display = "block";
    }
}

// Restore saved tab
const savedTab = sessionStorage.getItem("settingsActiveTab") || "general";
switchSettingsTab(savedTab);

// Download Mirror Configuration & Diagnostics (Alternativa B)
const MIRROR_LIST = [
    {
        id: "c3sl",
        name: "UFPR C3SL",
        location: "Brasil - Curitiba, PR",
        url: "http://opensuse.c3sl.ufpr.br/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: "Recomendado"
    },
    {
        id: "mirror-br",
        name: "openSUSE Brasil",
        location: "Brasil - São Paulo, SP",
        url: "http://mirror-br.opensuse.org/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: ""
    },
    {
        id: "default",
        name: "openSUSE Oficial",
        location: "MirrorCache CDN Global",
        url: "https://download.opensuse.org/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: "Padrão"
    },
    {
        id: "rit",
        name: "RIT Mirror",
        location: "Estados Unidos - Nova York",
        url: "https://mirrors.rit.edu/opensuse/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: ""
    },
    {
        id: "uwaterloo",
        name: "UWaterloo CS Club",
        location: "Canadá (América do Norte)",
        url: "https://mirror.csclub.uwaterloo.ca/opensuse/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: ""
    },
    {
        id: "fau",
        name: "FAU Erlangen",
        location: "Alemanha - Erlangen",
        url: "https://ftp.fau.de/opensuse/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: ""
    },
    {
        id: "leaseweb",
        name: "Leaseweb Global",
        location: "Holanda (Tier-1 Backbone)",
        url: "https://mirror.leaseweb.com/opensuse/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: ""
    },
    {
        id: "gwdg",
        name: "GWDG",
        location: "Alemanha (Europa Central)",
        url: "https://ftp.gwdg.de/pub/opensuse/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: ""
    },
    {
        id: "dotsrc",
        name: "dotsrc.org",
        location: "Dinamarca (Europa do Norte)",
        url: "https://mirrors.dotsrc.org/opensuse/distribution/leap/16.0/repo/oss/INDEX.gz",
        badge: ""
    }
];

let mirrorBenchmarkData = {};
try {
    const cachedBench = sessionStorage.getItem("regataos_mirror_bench");
    if (cachedBench) {
        mirrorBenchmarkData = JSON.parse(cachedBench);
    }
} catch (e) {}

window.currentTestingMirrorId = null;
window.currentTestingPhase = null;
window.currentTestingTempPing = null;

function getCurrentMirror() {
    const fs = require('fs');
    const mirrorConf1 = "/tmp/regataos-update/config/mirror.conf";
    const mirrorConf2 = `${process.env.HOME}/.config/regataos-update/mirror.conf`;

    let confContent = "";
    if (fs.existsSync(mirrorConf1)) {
        confContent = fs.readFileSync(mirrorConf1, "utf8");
    } else if (fs.existsSync(mirrorConf2)) {
        confContent = fs.readFileSync(mirrorConf2, "utf8");
    }

    if (confContent.includes("mirror=c3sl") || confContent.includes("mirror=ufpr")) return "c3sl";
    if (confContent.includes("mirror=mirror-br")) return "mirror-br";
    if (confContent.includes("mirror=rit")) return "rit";
    if (confContent.includes("mirror=uwaterloo")) return "uwaterloo";
    if (confContent.includes("mirror=fau")) return "fau";
    if (confContent.includes("mirror=leaseweb")) return "leaseweb";
    if (confContent.includes("mirror=dotsrc")) return "dotsrc";
    if (confContent.includes("mirror=gwdg")) return "gwdg";
    if (confContent.includes("mirror=default")) return "default";

    const repoFile = "/etc/zypp/repos.d/leap_16.0.repo";
    if (fs.existsSync(repoFile)) {
        const repoContent = fs.readFileSync(repoFile, "utf8");
        if (repoContent.includes("c3sl.ufpr.br")) return "c3sl";
        if (repoContent.includes("mirror-br.opensuse.org")) return "mirror-br";
        if (repoContent.includes("mirrors.rit.edu")) return "rit";
        if (repoContent.includes("uwaterloo.ca")) return "uwaterloo";
        if (repoContent.includes("ftp.fau.de")) return "fau";
        if (repoContent.includes("mirror.leaseweb.com")) return "leaseweb";
        if (repoContent.includes("dotsrc.org")) return "dotsrc";
        if (repoContent.includes("ftp.gwdg.de")) return "gwdg";
    }

    return "default";
}

function renderMirrorTable(activeMirrorId) {
    const tbody = document.getElementById("mirror-bench-tbody");
    if (!tbody) return;

    let html = "";
    MIRROR_LIST.forEach(m => {
        const isActive = (m.id === activeMirrorId);
        const isTesting = (window.currentTestingMirrorId === m.id);
        const bench = mirrorBenchmarkData[m.id] || null;

        let dotClass = "dot-green";
        let pingText = "—";
        let speedText = "—";

        if (isTesting) {
            dotClass = "dot-yellow";
            if (window.currentTestingPhase === "ping") {
                pingText = `<span class="bench-spin">⟳</span> Medindo...`;
                speedText = `<span style="opacity: 0.6;">Aguardando...</span>`;
            } else {
                pingText = window.currentTestingTempPing ? `${window.currentTestingTempPing} ms` : `—`;
                speedText = `<span class="bench-spin">⟳</span> Medindo velocidade...`;
            }
        } else if (bench) {
            if (bench.status === "ok") {
                dotClass = bench.pingMs < 100 ? "dot-green" : (bench.pingMs < 250 ? "dot-yellow" : "dot-yellow");
                pingText = bench.pingMs + " ms";
                speedText = bench.speedFormatted;
            } else {
                dotClass = "dot-red";
                pingText = "Timeout";
                speedText = "Falha";
            }
        }

        let badgesHtml = "";
        if (bench && bench.isFastest) {
            badgesHtml += `<span class="mirror-row-badge badge-fastest">⚡ Mais rápido</span>`;
        } else if (m.badge) {
            badgesHtml += `<span class="mirror-row-badge">${m.badge}</span>`;
        }

        const actionBtn = isActive
            ? `<button class="btn-mirror-action btn-mirror-active" disabled>Ativo</button>`
            : `<button class="btn-mirror-action" onclick="selectMirror('${m.id}')">Usar</button>`;

        let rowClasses = [];
        if (isActive) rowClasses.push("row-active");
        if (isTesting) rowClasses.push("row-testing");

        html += `
            <tr id="mirror-row-${m.id}" class="${rowClasses.join(' ')}">
                <td>
                    <span class="dot ${dotClass}"></span>
                    <span class="mirror-table-name">${m.name}</span>
                    ${badgesHtml}
                    <span class="mirror-table-loc">(${m.location})</span>
                </td>
                <td class="mirror-td-ping">${pingText}</td>
                <td class="mirror-td-speed">${speedText}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function updateMirrorUI(mirrorObj) {
    const mirrorActiveDisplay = document.getElementById("mirror-active-display");
    if (mirrorActiveDisplay) {
        mirrorActiveDisplay.textContent = `${mirrorObj.name} (${mirrorObj.location})`;
    }
    const mirrorTextSpan = document.getElementById("select-mirror-text");
    if (mirrorTextSpan) {
        mirrorTextSpan.textContent = `${mirrorObj.name} (${mirrorObj.location})`;
    }
}

function checkMirrorConfig() {
    const activeMirror = getCurrentMirror();
    const mirrorObj = MIRROR_LIST.find(m => m.id === activeMirror) || MIRROR_LIST[0];

    updateMirrorUI(mirrorObj);
    renderMirrorTable(activeMirror);

    // If cached benchmark has a winner, update summary text
    const summarySpan = document.getElementById("mirror-test-summary");
    if (summarySpan) {
        let fastestItem = null;
        MIRROR_LIST.forEach(item => {
            const b = mirrorBenchmarkData[item.id];
            if (b && b.isFastest) fastestItem = { item, b };
        });
        if (fastestItem) {
            summarySpan.innerHTML = `🏆 Mais rápido: <strong>${fastestItem.item.name}</strong> (${fastestItem.b.speedFormatted} • ${fastestItem.b.pingMs} ms)`;
        }
    }
}
checkMirrorConfig();

function selectMirror(mirrorId) {
    const mirrorObj = MIRROR_LIST.find(m => m.id === mirrorId) || MIRROR_LIST[0];
    updateMirrorUI(mirrorObj);
    renderMirrorTable(mirrorId);

    const exec = require('child_process').exec;
    const cmd = `/opt/regataos-update-manager/scripts/update-manager-option -set-mirror ${mirrorId}`;
    exec(cmd, function(err, stdout, stderr) {
        if (err) {
            console.error("Error setting mirror:", err);
        }
    });
}

function formatSpeed(bytesPerSec) {
    if (bytesPerSec >= 1048576) {
        return (bytesPerSec / 1048576).toFixed(2) + " MB/s";
    } else if (bytesPerSec >= 1024) {
        return (bytesPerSec / 1024).toFixed(0) + " KB/s";
    } else if (bytesPerSec > 0) {
        return bytesPerSec.toFixed(0) + " B/s";
    }
    return "0 KB/s";
}

function benchmarkSingleMirror(mirror, onPhaseChange) {
    return new Promise((resolve) => {
        const { exec } = require('child_process');

        // Phase 1: Latency probe (HEAD request)
        if (typeof onPhaseChange === 'function') onPhaseChange('ping');
        const pingCmd = `curl -s -I -m 4 -w "%{time_connect}|%{http_code}" -o /dev/null "${mirror.url}"`;

        exec(pingCmd, (pErr, pStdout) => {
            let pingMs = 999;
            if (!pErr && pStdout && pStdout.includes("|")) {
                const parts = pStdout.trim().split("|");
                const timeConnect = parseFloat(parts[0]);
                if (!isNaN(timeConnect) && timeConnect > 0) {
                    pingMs = Math.max(1, Math.round(timeConnect * 1000));
                }
            }

            // Phase 2: Bandwidth / Download Speed with sustained sampling
            if (typeof onPhaseChange === 'function') onPhaseChange('speed', pingMs);
            const startTime = Date.now();
            const dlCmd = `curl -s -L -m 10 -w "%{time_connect}|%{speed_download}|%{http_code}" -o /dev/null "${mirror.url}"`;

            exec(dlCmd, (dErr, dStdout) => {
                const elapsed = Date.now() - startTime;
                // Keep measurement active for at least 2200ms per server so the user clearly perceives the speed test
                const delayNeeded = Math.max(0, 2200 - elapsed);

                setTimeout(() => {
                    let benchResult = { status: "error", pingMs: 9999, speedFormatted: "Falha", speedRaw: 0 };

                    if (!dErr && dStdout && dStdout.includes("|")) {
                        const parts = dStdout.trim().split("|");
                        const timeConnect = parseFloat(parts[0]);
                        const speedBps = parseFloat(parts[1]);
                        const httpCode = parseInt(parts[2]);

                        if (httpCode >= 200 && httpCode < 400 && !isNaN(speedBps)) {
                            const finalPing = (!isNaN(timeConnect) && timeConnect > 0)
                                ? Math.max(1, Math.round(timeConnect * 1000))
                                : pingMs;
                            benchResult = {
                                status: "ok",
                                pingMs: finalPing,
                                speedFormatted: formatSpeed(speedBps),
                                speedRaw: speedBps,
                                isFastest: false
                            };
                        }
                    }
                    resolve(benchResult);
                }, delayNeeded);
            });
        });
    });
}

window.isTestingMirrors = false;
async function testAllMirrors() {
    if (window.isTestingMirrors) return;
    window.isTestingMirrors = true;

    const btn = document.getElementById("btn-test-mirrors");
    const btnText = document.getElementById("btn-test-mirrors-text");
    const summarySpan = document.getElementById("mirror-test-summary");

    if (btn) btn.classList.add("testing");
    if (summarySpan) summarySpan.textContent = "Testando velocidade dos servidores...";

    const activeMirror = getCurrentMirror();

    // Reset fastest badges
    Object.keys(mirrorBenchmarkData).forEach(k => {
        if (mirrorBenchmarkData[k]) mirrorBenchmarkData[k].isFastest = false;
    });

    for (let i = 0; i < MIRROR_LIST.length; i++) {
        const m = MIRROR_LIST[i];
        if (btnText) btnText.textContent = `Testando ${m.name} (${i + 1}/${MIRROR_LIST.length})...`;

        window.currentTestingMirrorId = m.id;
        window.currentTestingPhase = "ping";
        window.currentTestingTempPing = null;
        renderMirrorTable(activeMirror);

        const result = await benchmarkSingleMirror(m, (phase, tempPing) => {
            window.currentTestingPhase = phase;
            if (tempPing) window.currentTestingTempPing = tempPing;
            renderMirrorTable(activeMirror);
        });

        mirrorBenchmarkData[m.id] = result;
        window.currentTestingMirrorId = null;
        window.currentTestingPhase = null;
        window.currentTestingTempPing = null;
        renderMirrorTable(activeMirror);
    }

    // Determine the fastest mirror
    let fastest = null;
    let maxSpeed = -1;
    let minPing = 99999;

    MIRROR_LIST.forEach(item => {
        const b = mirrorBenchmarkData[item.id];
        if (b && b.status === "ok") {
            if (b.speedRaw > maxSpeed || (b.speedRaw === maxSpeed && b.pingMs < minPing)) {
                maxSpeed = b.speedRaw;
                minPing = b.pingMs;
                fastest = item;
            }
        }
    });

    if (fastest && mirrorBenchmarkData[fastest.id]) {
        mirrorBenchmarkData[fastest.id].isFastest = true;
    }

    try {
        sessionStorage.setItem("regataos_mirror_bench", JSON.stringify(mirrorBenchmarkData));
    } catch (e) {}

    window.isTestingMirrors = false;
    if (btn) btn.classList.remove("testing");
    if (btnText) btnText.textContent = "Testar velocidade dos servidores";

    renderMirrorTable(activeMirror);

    if (fastest && summarySpan) {
        const fb = mirrorBenchmarkData[fastest.id];
        summarySpan.innerHTML = `🏆 Mais rápido: <strong>${fastest.name}</strong> (${fb.speedFormatted} • ${fb.pingMs} ms)`;
    }
}


