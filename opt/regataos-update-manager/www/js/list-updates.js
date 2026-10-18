// Disable main hover effect after few seconds
setTimeout(function () {
	document.getElementById("loadscreen").style.display = "none";
}, 1000);

// Helper to get store apps catalog from window or fallback
function getCatalog() {
	if (typeof window !== "undefined" && typeof window.getStoreAppsCatalog === "function") {
		return window.getStoreAppsCatalog();
	}
	if (typeof getStoreAppsCatalog === "function") {
		return getStoreAppsCatalog();
	}
	return [];
}

// This function lists the updates available automatically
function listUpdates() {
	const fs = require('fs');
	const appsListFile = "/tmp/regataos-update/apps-list.txt";
	if (!fs.existsSync(appsListFile)) return;

	const listAppsUpdate = fs.readFileSync(appsListFile, "utf8");
	const apps = getCatalog();
	const dad = window.document.querySelector("div#all-apps");
	if (!dad) return;

	for (let i = 0; i < apps.length; i++) {
		const packageName = apps[i].package;
		const packageNickname = apps[i].nickname;
		if (listAppsUpdate.includes(packageName)) {
			const child = dad.querySelector("div#" + packageNickname);
			if (child == null) {
				let iconFile = "";
				const iconPath = "/tmp/regataos-update/" + packageName + "-icon.txt";
				if (fs.existsSync(iconPath)) {
					try { iconFile = fs.readFileSync(iconPath, "utf8"); } catch (e) { }
				}
				let appName = apps[i].name;
				let marks = "'";
				let newAppBlocks = document.createElement("div");
				newAppBlocks.id = packageNickname;
				newAppBlocks.classList.add("block-app");
				newAppBlocks.innerHTML = ' \
				<div class="icon-app" style="background-image:url(' + iconFile + ');"></div> \
				<div class="app-name">' + appName + '</div> \
				<div id="pending-' + packageNickname + '" class="app-status-pending app-status">Pending...</div> \
				<div id="downloading-' + packageNickname + '" class="app-status-download app-status">Downloading...</div> \
				<div id="download-status-' + packageNickname + '" class="download-status-app"> \
					<div id="downloaded-' + packageNickname + '" class="app-status-percentage app-status"></div> \
					<div id="total-download-' + packageNickname + '" class="total-download-percentage app-status"></div> \
					<div id="percentage-' + packageNickname + '" class="app-status-percentage app-status"></div> \
				</div> \
				<div id="installing-' + packageNickname + '" class="app-status-install app-status">Installing...</div> \
				<div id="concluded-' + packageNickname + '" class="app-status-concluded app-status">Concluded!</div> \
				<div id="update-app-' + packageNickname + '" class="update-app" onclick=' + marks + 'updateSpecificApp("' + packageNickname + '");' + marks + '>Update</div> \
				<div id="cancel-app-' + packageNickname + '" class="cancel-app-' + packageNickname + ' cancel-app" onclick=' + marks + 'cancelSpecificApp("' + packageNickname + '");' + marks + '>Cancel</div>';
				dad.appendChild(newAppBlocks);
				if (typeof applyTranslationPages === "function") applyTranslationPages();
				cacheAppQueueElements();
			}
		}
	}
}

// Cache of DOM elements per app — populated once when the app list is rendered.
const appQueueElements = {};

function cacheAppQueueElements() {
	const fs = require('fs');
	const appsListFile = "/tmp/regataos-update/apps-list.txt";
	if (!fs.existsSync(appsListFile)) return;

	const appsListContent = fs.readFileSync(appsListFile, "utf8");
	const apps = getCatalog();
	for (let i = 0; i < apps.length; i++) {
		const nickname = apps[i].nickname;
		if (appQueueElements[nickname]) continue;
		// Only cache apps that are in the update list and rendered in the DOM.
		if (!appsListContent.includes(apps[i].package)) continue;
		const pending = document.querySelector("div#pending-" + nickname);
		if (pending === null) continue;
		appQueueElements[nickname] = {
			pending:     pending,
			downloading: document.querySelector("div#downloading-" + nickname),
			installing:  document.querySelector("div#installing-" + nickname),
			updateApp:   document.querySelector("div#update-app-" + nickname),
			cancelApp:   document.querySelector("div.cancel-app-" + nickname),
			concluded:   document.querySelector("div#concluded-" + nickname),
			_state:      null,
		};
	}
}

// List of applications in the queue and downloading
function listUpdatedQueue() {
	const fs = require('fs');

	// Nothing cached yet — nothing to update.
	if (Object.keys(appQueueElements).length === 0) return;

	// Read each status file once, outside the loop.
	const listAppsQueue           = fs.existsSync("/tmp/regataos-update/list-apps-queue.txt") ? fs.readFileSync("/tmp/regataos-update/list-apps-queue.txt", "utf8") : "";
	const downloadableApplication = fs.existsSync("/tmp/regataos-update/downloadable-application.txt") ? fs.readFileSync("/tmp/regataos-update/downloadable-application.txt", "utf8") : "";
	const installingApplication   = fs.existsSync("/tmp/regataos-update/installing-application.txt") ? fs.readFileSync("/tmp/regataos-update/installing-application.txt", "utf8") : "";
	const updatedApplication      = fs.existsSync("/tmp/regataos-update/updated-apps.txt") ? fs.readFileSync("/tmp/regataos-update/updated-apps.txt", "utf8") : "";
	const otherUpInProgress       = fs.existsSync('/tmp/regataos-update/other-updates-in-progress.txt');

	for (const nickname in appQueueElements) {
		const els = appQueueElements[nickname];

		// Resolve the new state for this app with proper priority:
		// concluded > installing > downloading > pending > default
		let newState;
		if      (updatedApplication.includes(nickname))       newState = "concluded";
		else if (installingApplication.includes(nickname))    newState = "installing";
		else if (downloadableApplication.includes(nickname))  newState = "downloading";
		else if (listAppsQueue.includes(nickname))            newState = "pending";
		else                                                   newState = otherUpInProgress ? "none" : "update";

		// Skip DOM update if state hasn't changed since last tick.
		if (els._state === newState) continue;
		els._state = newState;

		els.pending.style.display     = "none";
		els.downloading.style.display = "none";
		els.installing.style.display  = "none";
		els.updateApp.style.display   = "none";
		els.cancelApp.style.display   = "none";
		els.concluded.style.display   = "none";

		const downStatusEl = document.querySelector(`div#download-status-${nickname}`);
		if (downStatusEl && newState !== "downloading") {
			downStatusEl.style.display = "none";
		}

		if (newState === "pending") {
			els.pending.style.display = "block";
			setTimeout(() => { els.cancelApp.style.display = "block"; }, 500);
		} else if (newState === "downloading") {
			els.downloading.style.display = "block";
			setTimeout(() => { els.cancelApp.style.display = "block"; }, 500);
		} else if (newState === "installing") {
			els.installing.style.display = "block";
		} else if (newState === "concluded") {
			els.concluded.style.display = "block";
		} else if (newState === "update") {
			setTimeout(() => { els.updateApp.style.display = "block"; }, 500);
		}
	}
}

setInterval(function () {
	const fs = require('fs');
	if (fs.existsSync("/tmp/regataos-update/apps-list.txt")) {
		const appStatus = fs.readFileSync("/tmp/regataos-update/status.txt", "utf8");
		if ((appStatus.includes("show-updates")) || (appStatus.includes("installing-updates"))) {
			listUpdatedQueue();
				return;
			}
		}
}, 1000);
