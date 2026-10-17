// Run shell process including scripts and commands
function runShellProcess(commandLine) {
	// Keep the process running independently from
	// the main process using 'spawn'.
	const { spawn } = require('child_process');
	const runCommandLine = spawn(commandLine, {
		shell: true,
		detached: true,
		stdio: 'ignore'
	});

	// Unlink the child process
	runCommandLine.unref();
}

// This function lists the updates available automatically
function installAllApps() {
	if (typeof resetGlobalProgress === 'function') {
		resetGlobalProgress();
	}
	const exec = require('child_process').exec;
	const fs = require('fs');

	const appsList = "/tmp/regataos-update/apps-list.txt";
	const installingApp = "/tmp/regataos-update/installing-application.txt";
	const listAppsQueue = "/tmp/regataos-update/list-apps-queue.txt";
	const packageList = "/tmp/regataos-update/package-list.txt";
	const updatedApps = "/tmp/regataos-update/updated-apps.txt";
	const otherUpInProgress = "/tmp/regataos-update/other-updates-in-progress.txt";

	let queueItems = [];
	if (fs.existsSync(listAppsQueue)) {
		queueItems = fs.readFileSync(listAppsQueue, "utf8").split('\n').filter(Boolean);
	}

	const installing = fs.existsSync(installingApp) ? fs.readFileSync(installingApp, "utf8") : "";
	const listAppsUpdate = fs.existsSync(appsList) ? fs.readFileSync(appsList, "utf8") : "";
	const updated = fs.existsSync(updatedApps) ? fs.readFileSync(updatedApps, "utf8") : "";

	// Read the app store's JSON files synchronously
	const storeFiles = fs.readdirSync("/opt/regataos-store/apps-list");
	for (const file of storeFiles) {
		try {
			const data = fs.readFileSync("/opt/regataos-store/apps-list/" + file, "utf8");
			const apps = JSON.parse(data);
			for (let i = 0; i < apps.length; i++) {
				const packageName = apps[i].package;
				const packageNickname = apps[i].nickname;
				if (listAppsUpdate.includes(packageName)) {
					if (!installing.includes(packageNickname) && !queueItems.includes(packageNickname)) {
						queueItems.push(packageNickname);
					}
				}
			}
		} catch (e) { }
	}

	if (fs.existsSync(packageList)) {
		const readPackageList = fs.readFileSync(packageList, "utf8");
		if (readPackageList.length >= 2) {
			if (!queueItems.includes("other-updates") && !updated.includes("other-updates")) {
				queueItems.push("other-updates");
			}
		}
	}

	fs.writeFileSync(listAppsQueue, queueItems.join('\n') + '\n', "utf8");

	if (fs.existsSync(appsList)) {
		let commandLine = "ps -C regataos-up-all.sh; if [ $? = 1 ]; then echo OK; fi";
		exec(commandLine, (error, stdout, stderr) => {
			if (stdout) {
				if (stdout.includes("OK")) {
					if (fs.existsSync(otherUpInProgress)) {
						fs.writeFileSync("/tmp/regataos-update/all-auto-update.txt", "", "utf8");
					} else {
						let commandLine = "/opt/regataos-update-manager/scripts/update-functions-icontray -update-option1";
						runShellProcess(commandLine);
					}
				} else {
					fs.writeFileSync("/tmp/regataos-update/all-auto-update.txt", "", "utf8");
				}
			}
		});
	} else {
		let commandLine = "/opt/regataos-update-manager/scripts/update-functions-icontray -update-option2";
		runShellProcess(commandLine);
	}
}

// Install updates from the system tray icon
setInterval(installUpdatesTrayIcon, 500);
function installUpdatesTrayIcon() {
	const fs = require('fs');
	const statusFile = "/tmp/regataos-update/status.txt";
	const installUpdates = "/tmp/regataos-update/install-updates.txt";
	if (fs.existsSync(installUpdates)) {
		try { fs.unlinkSync(installUpdates); } catch (e) { }
		const checkStatus = fs.existsSync(statusFile) ? fs.readFileSync(statusFile, "utf8") : "";
		if (!checkStatus.includes("installing-updates")) {
			if (checkStatus.includes("show-updates")) {
				installAllApps();
			} else {
				try { fs.writeFileSync("/tmp/regataos-update/all-auto-update.txt", "", "utf8"); } catch (e) { }
			}
		}
	}
}

// Automatically launch the "update all" option
setInterval(startAllAutoUpdate, 1000);
function startAllAutoUpdate() {
	const fs = require('fs');
	const allAutoUpdate = "/tmp/regataos-update/all-auto-update.txt";
	if (fs.existsSync(allAutoUpdate)) {
		installAllApps();
	}
}

// Cancel installation of all updates
function cancelAllApps() {
	const commandLine = 'rm -f "/tmp/regataos-update/all-auto-update.txt"; \
	rm -f "/tmp/regataos-update/install-updates.txt" \
	echo "" > "/tmp/regataos-update/stop-all-update.txt"; \
	sudo /opt/regataos-update-manager/scripts/regataos-up-cancel-all.sh';
	runShellProcess(commandLine);
}

// Install "other updates"
function installOtherUpdates() {
	if (typeof resetGlobalProgress === 'function') {
		resetGlobalProgress();
	}
	const commandLine = 'if test ! -e "/tmp/regataos-update/updated-apps.txt"; then \
	echo "" > "/tmp/regataos-update/updated-apps.txt"; fi; \
	echo "other-updates" > "/tmp/regataos-update/list-apps-queue.txt"; \
	echo "other-updates" > "/tmp/regataos-update/other-updates-in-progress.txt"; \
	echo "other-updates" > "/tmp/regataos-update/downloadable-application-other-updates.txt"; \
	echo "installing-updates" > "/tmp/regataos-update/status.txt"; \
	rm -f "/tmp/regataos-update/stop-all-update.txt"; \
	sudo /opt/regataos-update-manager/scripts/regataos-up-other-up.sh';
	runShellProcess(commandLine);

	setTimeout(function () {
		const btn = document.querySelector("div#update-app-other-updates");
		if (btn) btn.style.display = "none";
	}, 1000);
}

setInterval(updateSystemOrCancelUpdate, 500);
function updateSystemOrCancelUpdate() {
	const fs = require('fs');
	const downloadableApp = "/tmp/regataos-update/downloadable-application.txt";
	const listAppsQueue = "/tmp/regataos-update/list-apps-queue.txt";
	const upInProgress = "/tmp/regataos-update/update-in-progress.txt";
	const otherUpInProgress = "/tmp/regataos-update/other-updates-in-progress.txt";
	const upSpecificInProgress = "/tmp/regataos-update/update-specific-in-progress.txt";
	const status = "/tmp/regataos-update/status.txt";
	const allAutoUpdate = "/tmp/regataos-update/all-auto-update.txt";
	const stopAllUp = "/tmp/regataos-update/stop-all-update.txt";

	const updateAll = document.querySelector(".update-all");
	const upAllButton = document.querySelector(".update-all-button1");
	const cancelUpButton = document.querySelector(".update-all-button2");
	const upAppButton = document.querySelector(".update-app");

	function showInstallAllButton() {
		const appsList = "/tmp/regataos-update/apps-list.txt";
		const pkgList = "/tmp/regataos-update/package-list.txt";
		let hasUpdates = false;
		if (fs.existsSync(appsList)) {
			let data = fs.readFileSync(appsList, "utf8").split('\n').filter(Boolean);
			if (data.length >= 1) hasUpdates = true;
		}
		if (fs.existsSync(pkgList)) {
			let data = fs.readFileSync(pkgList, "utf8").split('\n').filter(Boolean);
			if (data.length >= 1) hasUpdates = true;
		}
		if (hasUpdates) {
			if (updateAll) updateAll.style.display = "block";
			if (upAllButton) upAllButton.style.display = "block";
			if (cancelUpButton) cancelUpButton.style.display = "none";
		} else {
			if (updateAll) updateAll.style.display = "none";
		}
	}

	let isUpdating = false;
	try {
		if (fs.existsSync(status)) {
			const st = fs.readFileSync(status, "utf8");
			if (st.includes("installing-updates")) {
				isUpdating = true;
			}
		}
	} catch (e) { }

	if (!isUpdating) {
		const activeIndicators = [
			allAutoUpdate,
			upSpecificInProgress,
			otherUpInProgress,
			"/tmp/regataos-update/downloadable-application-other-updates.txt",
			"/tmp/regataos-update/installing-application-other-updates.txt",
			"/tmp/regataos-update/downloading-system-update.txt",
			"/tmp/regataos-update/installing-system-update.txt"
		];
		for (const indicator of activeIndicators) {
			if (fs.existsSync(indicator)) {
				isUpdating = true;
				break;
			}
		}
	}

	if (!isUpdating && fs.existsSync(upInProgress)) {
		try {
			const download = fs.existsSync(downloadableApp) ? fs.readFileSync(downloadableApp, "utf8") : "";
			const queue = fs.existsSync(listAppsQueue) ? fs.readFileSync(listAppsQueue, "utf8") : "";
			if (download.length >= 2 || queue.length >= 2) {
				isUpdating = true;
			}
		} catch (e) { }
	}

	if (isUpdating) {
		if (updateAll) updateAll.style.display = "block";
		if (upAllButton) upAllButton.style.display = "none";
		if (cancelUpButton) cancelUpButton.style.display = "block";
		if (upAppButton) upAppButton.style.display = "none";
	} else {
		let isUpdated = false;
		try {
			if (fs.existsSync(status)) {
				const updated = fs.readFileSync(status, "utf8");
				if (updated.includes("updated")) {
					isUpdated = true;
				}
			}
		} catch (e) { }

		if (isUpdated) {
			if (upAllButton) upAllButton.style.display = "none";
			if (cancelUpButton) cancelUpButton.style.display = "none";
		} else {
			showInstallAllButton();
		}
	}
}

// Update application individually
function updateSpecificApp(nickname) {
	const commandLine = 'if test ! -e "/tmp/regataos-update/updated-apps.txt"; then \
	echo "" > "/tmp/regataos-update/updated-apps.txt"; fi; \
	echo "' + nickname + '" >> "/tmp/regataos-update/list-apps-queue.txt"; \
	sed -i "/^$/d" "/tmp/regataos-update/list-apps-queue.txt"; \
	export NICKNAME="' + nickname + '"; \
	sudo -E /opt/regataos-update-manager/scripts/regataos-up-specific.sh ' + nickname;
	runShellProcess(commandLine);
}

// Update application individually
function cancelSpecificApp(nickname) {
	const commandLine = 'export NICKNAME="' + nickname + '"; \
	echo "" > "/tmp/regataos-update/cancel-up-' + nickname + '.txt"; \
	sudo -E /opt/regataos-update-manager/scripts/regataos-cancel-up-specific.sh; \
	echo "" > "/tmp/regataos-update/cancel-up-' + nickname + '.txt"';
	runShellProcess(commandLine);
}

// Check for updates manually
function checkUpdatesManually() {
	const fs = require('fs');
	const exec = require('child_process').exec;
	try {
		fs.writeFileSync("/tmp/regataos-update/status.txt", "check-updates\n", "utf8");
	} catch (e) { }
	if (typeof currentStatus === 'function') {
		currentStatus();
	}
	const commandLine = "/opt/regataos-update-manager/scripts/update-manager-option -update-button";
	exec(commandLine, function (error, call, errlog) { });
}

// Cancel checking for updates (Opção 1.B)
function cancelCheckingUpdates() {
	const fs = require('fs');
	const exec = require('child_process').exec;

	let returnStatus = "no-updates";
	if (fs.existsSync("/tmp/regataos-update/package-list.txt")) {
		const pkg = fs.readFileSync("/tmp/regataos-update/package-list.txt", "utf8").trim();
		if (pkg.length > 0) {
			returnStatus = "show-updates";
		}
	}

	const cmd = `sudo /opt/regataos-update-manager/scripts/regataos-up.sh -stop-up 2>/dev/null; \
	             echo "${returnStatus}" > /tmp/regataos-update/status.txt; \
	             echo "1" > /tmp/regataos-update/already_updated.txt`;
	exec(cmd, function (err, stdout, stderr) {
		if (typeof currentStatus === 'function') {
			currentStatus();
		}
	});
}

