window.onload = () => {
    initDataManager();
}



let keysDb, keysData;

async function initDataManager() {
    checkFirebaseConnection();

    if (IS_LOCAL) {
        enableDropdown("data-manager-backup-google-dropdown", "data-manager-backup-google-content");
    } else {
        document.getElementById("data-manager-backup-google-dropdown").parentElement.remove();
    }
    enableDropdown("data-manager-export-file-dropdown", "data-manager-export-file-content");
    if (IS_LOCAL) {
        enableDropdown("data-manager-import-google-dropdown", "data-manager-import-google-content");
    } else {
        document.getElementById("data-manager-import-google-dropdown").parentElement.remove();
    }
    enableDropdown("data-manager-import-file-dropdown", "data-manager-import-file-content");

    if (IS_LOCAL) createDataLayout("data-manager-backup-google-content", "firebase-backup", "Export");
    createDataLayout("data-manager-export-file-content", "file-export", "Export");
    if (IS_LOCAL) createDataLayout("data-manager-import-google-content", "firebase-import", "Import");
    createDataLayout("data-manager-import-file-content", "file-import", "Import");

    generateBackupReminders();
}

async function checkFirebaseConnection() {
    let firebaseContainer = document.getElementById("data-manager-firebase-connection");

    let firebaseRow = document.createElement("div");
    firebaseRow.classList.add("flex-split-row");

    let firebaseStatus = document.createElement("div");
    firebaseStatus.id = "data-manager-firebase-status-row";
    firebaseStatus.classList.add("flex-centered-row");
    let statusCircle = document.createElement("span");
    statusCircle.id = "data-manager-firebase-status-icon";
    let statusText = document.createElement("p");
    let firebaseButton;

    if (IS_LOCAL) {
        statusCircle.style.backgroundColor = "rgb(0, 187, 0)";
        statusText.textContent = `Google Firebase: Locally connected`;
    } else {
        keysDb = await openDatabase(["keys_db", 1], ["keys_os", "key"], [], true);
        keysData = await readDatabase(keysDb, "keys_os", "main", true);

        firebaseButton = document.createElement("p");
        firebaseButton.id = "data-manager-firebase-connection-button";
        firebaseButton.classList.add("dimensional-button");

        if (!keysData) {
            statusCircle.style.backgroundColor = "rgb(234, 51, 35)";
            statusText.textContent = "Disconnected";

            firebaseButton.textContent = "Connect";
            firebaseButton.addEventListener("click", () => {
                let [firebaseConnectOverlay, firebaseConnectWindow] = createOverlay("firebase-connection-window");

                let firebaseConnectTitle = document.createElement("h3");
                firebaseConnectTitle.classList.add("content-overlay-window-title");
                firebaseConnectTitle.textContent = "Connect to Google Firebase";

                let firebaseConnectRow = document.createElement("div");
                firebaseConnectRow.id = "firebase-connection-input-row";
                firebaseConnectRow.classList.add("flex-split-row");

                let inputContainer = document.createElement("div");
                inputContainer.id = "firebase-connection-input-container";
                inputContainer.classList.add("flex-column", "flex-split-row-grow");
                let [urlInput, urlField] = createLabeledInput(
                    ["content-overlay-input-group", "flex-column"],
                    "Database reference URL",
                    "content-overlay-input-label",
                    "firebase-connection-url-input",
                    "content-overlay-field",
                    "https://abc-rtdb.firebaseio.com"
                );
                let [kidInput, kidField] = createLabeledInput(
                    ["content-overlay-input-group", "flex-column"],
                    "KID",
                    "content-overlay-input-label",
                    "firebase-connection-kid-input",
                    "content-overlay-field",
                    "abcdefgh"
                );
                let [issInput, issField] = createLabeledInput(
                    ["content-overlay-input-group", "flex-column"],
                    "ISS",
                    "content-overlay-input-label",
                    "firebase-connection-iss-input",
                    "content-overlay-field",
                    "abcdefgh@gserviceaccount.com"
                );
                let [binaryInput, binaryField] = createLabeledInput(
                    ["content-overlay-input-group", "flex-column"],
                    "Binary key",
                    "content-overlay-input-label",
                    "firebase-connection-binary-input",
                    "content-overlay-field",
                    "abcdefgh"
                );
                inputContainer.append(urlInput, kidInput, issInput, binaryInput);

                let submitButton = createImgButton(["content-overlay-window-button"], "img", "assets/images/checkmark.svg", "0, 187, 0", { text: "Connect", position: "bottom" });
                submitButton.addEventListener("click", async () => {
                    try {
                        let binaryKey = Uint8Array.from(atob(binaryField.value.replace(/\\n|\n/g, "")), c => c.charCodeAt(0));
                        let key = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
                        keysData = {
                            key: "main",
                            firebase: [urlField.value, kidField.value, issField.value, key],
                        };
                        await updateKeys();

                        alert("Successfully connected to the specified Firebase realtime database.");
                        window.location.reload();
                    } catch (err) {
                        console.log(err);
                        keysData = null;
                        return alert("Could not connect to the specified Firebase realtime database.");
                    }
                });

                firebaseConnectRow.append(inputContainer, submitButton);

                let closeButton = createImgButton(["content-overlay-window-close", "content-overlay-window-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Discard & Close", position: "bottom" });
                closeButton.addEventListener("click", () => {
                    firebaseConnectOverlay.remove();
                });

                firebaseConnectWindow.append(firebaseConnectTitle, firebaseConnectRow, closeButton);
                firebaseConnectOverlay.appendChild(firebaseConnectWindow);
                document.body.appendChild(firebaseConnectOverlay);
            });
        } else {
            statusCircle.style.backgroundColor = "rgb(0, 187, 0)";
            statusText.textContent = `Google Firebase: Connected & auto-syncing to: ${keysData.firebase[0]}`;

            firebaseButton.textContent = "Refresh";
            firebaseButton.addEventListener("click", async () => {
                await updateKeys();
                alert("Successfully refreshed API keys from the specified Firebase realtime database.");
            });
        }
    }

    firebaseStatus.append(statusCircle, statusText);
    firebaseRow.appendChild(firebaseStatus);
    if (firebaseButton) firebaseRow.appendChild(firebaseButton);
    firebaseContainer.appendChild(firebaseRow);
}

async function updateKeys() {
    let googleToken = await getGoogleToken(keysData.firebase);
    let firebaseResp = await fetch(`${keysData.firebase[0]}/apikeys.json?access_token=${googleToken}`);
    let firebaseData = await firebaseResp.json();
    if (firebaseData) {
        // let textEncoder = new TextEncoder();
        for (let [key, items] of Object.entries(firebaseData)) {
            keysData[key] = [];
            for (let item of items) {
                /*
                if (item.encrypt) {
                    let keyData = textEncoder.encode(item.value);
                    let cryptoKey = await crypto.subtle.importKey(
                        "raw",
                        keyData,
                        { name: "HMAC", hash: "SHA-256" },
                        false,
                        ["sign", "verify"]
                    );
                    keysData[key].push(cryptoKey);
                } else {
                    keysData[key].push(item.value);
                }
                */
                keysData[key].push(item.value);
            }
        }
    }
    await saveDatabase(keysDb, "keys_os", [keysData], true, true);
}

function createDataLayout(contentId, action, transferType) {
    const EXPORT_ITEMS = [
        { display: "Assignment lookahead states", db: "lookahead 2 key main" },
        { display: "Calculator recents & variables", db: "calculator 1 key main" },
        { display: "Gradebook course cache", db: "gradebook 1 key main" },
        { display: "RSS feeds & item cache", db: "rss 1 key main" },
        { display: "Timer states & focus session stats", db: "timer 4 key main" },
        { display: "Todo tasks & streak", db: "todo 2 key main" },
        { display: "Trending media cache & watch lists", db: "trending 1 type" },
        { display: "Webchest profiles & visit counts", db: "webchest 3 profile" },
        { display: "Widgets cache", db: "widget 1 key main" },
    ];

    let itemList = document.createElement("div");
    itemList.classList.add("data-manager-export-select", "flex-column", "flex-split-row-grow");
    EXPORT_ITEMS.forEach(exportItem => {
        let [optionItem,] = generateMultiselectItem(null, exportItem.display, exportItem.db, false);
        itemList.appendChild(optionItem);
    });

    let selectAll = createImgButton(["data-manager-transfer-button"], "svg", createSelectAllSvg("28"), "180, 180, 180", { text: "Select all", position: "bottom" });
    selectAll.addEventListener("click", () => {
        let inputs = itemList.querySelectorAll("input");
        let allSelected = Array.from(inputs).every(input => input.checked);
        inputs.forEach(x => x.checked = !allSelected);
    });
    let transferButton = createImgButton(["data-manager-transfer-button"], "img", `assets/images/${transferType.toLowerCase()}.svg`, "28, 176, 246", { text: transferType, position: "bottom" });
    let actionButtons = document.createElement("div");
    actionButtons.classList.add("data-manager-transfer-button-container", "flex-column");
    actionButtons.append(selectAll, transferButton);

    document.getElementById(contentId).append(itemList, actionButtons);

    switch (action) {
        case "file-import":
            transferButton.id = "data-manager-transfer-file-upload";
            let uploadInput = document.createElement("input");
            uploadInput.id = "data-manager-transfer-file-input";
            uploadInput.type = "file";
            uploadInput.accept = ".json";
            uploadInput.style.display = "none";
            document.getElementById(contentId).appendChild(uploadInput);
            initUpload(null, "data-manager-transfer-file-upload", "data-manager-transfer-file-input", "application/json", async files => {
                if (files?.length > 0) {
                    try {
                        let fileText = await files[0].text();
                        processData(JSON.parse(fileText));
                    } catch {
                        alert("Error reading file: Invalid JSON format");
                    }
                }
            });
            break;

        default:
            transferButton.addEventListener("click", () => {
                processData();
            });
            break;
    }

    async function processData(importData) {
        let inputs = itemList.querySelectorAll("input"), results = { successes: [], fails: [] }, writeData = [], googleToken;
        
        if (["firebase-backup", "firebase-import"].includes(action)) {
            if (!IS_LOCAL && !keysData) return alert("This feature requires a connection to a Firebase realtime database. To connect, use the \"Connect\" button \"Google Firebase Connection\" section.");
            if (![...inputs].some(x => x.checked)) return alert("Please select at least one item to transfer.");
            googleToken = await getGoogleToken();
            if (!googleToken) return alert("Failed to obtain Google access token.");
        }

        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].checked) {
                let dbInfo = inputs[i].value.split(" ");
                let db = await openDatabase([`${dbInfo[0]}_db`, parseInt(dbInfo[1])]);
                if (!db) {
                    results.fails.push(dbInfo[0]);
                    continue;
                }
                let firebaseResp, firebaseData, dbData;

                switch (action) {
                    case "firebase-backup":
                        try {
                            dbData = await readDatabase(db, `${dbInfo[0]}_os`, dbInfo.length > 3 ? dbInfo[3] : null);
                            let formattedData = dbInfo.length > 3
                                ? dbData
                                : Object.fromEntries(dbData.map(item => [item[dbInfo[2]], item]));

                            firebaseResp = await fetch(`${IS_LOCAL ? API_KEYS.firebase[0] : keysData.firebase[0]}/${dbInfo[0]}.json?access_token=${googleToken}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: dbInfo[0], data: formattedData, index: dbInfo[2] }),
                            });
                            if (firebaseResp.status == 200) {
                                results.successes.push(dbInfo[0]);
                            } else {
                                results.fails.push(dbInfo[0]);
                            }
                        } catch {
                            results.fails.push(dbInfo[0]);
                        }

                        break;

                    case "file-export":
                        dbData = await readDatabase(db, `${dbInfo[0]}_os`, dbInfo.length > 3 ? dbInfo[3] : null);
                        writeData.push({ name: dbInfo[0], data: dbData, index: dbInfo[2] });
                        results.successes.push(dbInfo[0]);
                        break;

                    case "firebase-import":
                        try {
                            firebaseResp = await fetch(`${IS_LOCAL ? API_KEYS.firebase[0] : keysData.firebase[0]}/${dbInfo[0]}.json?access_token=${googleToken}`);
                            firebaseData = await firebaseResp.json();
                        } catch {
                            firebaseData = null;
                        }
                        if (!firebaseData?.data) {
                            results.fails.push(dbInfo[0]);
                            continue;
                        }

                        await saveDatabase(db, `${dbInfo[0]}_os`, dbInfo.length > 3 ? [firebaseData.data] : Object.values(firebaseData.data), false);
                        results.successes.push(dbInfo[0]);

                        break;

                    case "file-import":
                        let importFound = importData.find(x => x.name == dbInfo[0]);
                        if (!importFound) {
                            results.fails.push(dbInfo[0]);
                            continue;
                        }
                        
                        await saveDatabase(db, `${dbInfo[0]}_os`, dbInfo.length > 3 ? [importFound.data] : importFound.data, false);
                        results.successes.push(dbInfo[0]);

                        break;
                }

                db.close();
            }
        }

        if (writeData.length > 0) {
            let json = JSON.stringify(writeData, null, 2);
            let blob = new Blob([json], { type: "application/json" });
            let url = URL.createObjectURL(blob);

            let a = document.createElement("a");
            a.href = url;
            a.download = "pagezero-export.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            blob = null;
        }

        inputs.forEach(x => x.checked = false);

        if (IS_LOCAL) {
            let backupReminder, backupList;
            switch (action) {
                case "firebase-backup":
                    let localSaves = localStorage.getItem("localSaves");
                    if (!localSaves) return;
                    let localSaveTime = localSaves.split(",")[0];
                    localStorage.setItem("localSaves", localSaveTime);
                    try {
                        await fetch(`${API_KEYS.firebase[0]}/metadata.json?access_token=${googleToken}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ lastGoogleBackup: parseInt(localSaveTime) }),
                        });
                    } catch {
                        alert("Failed to update Firebase backup time metadata.");
                        return;
                    }
                    backupReminder = document.getElementById("data-manager-backup-reminder");
                    backupList = document.getElementById("data-manager-backup-google-content");
                    break;

                case "firebase-import":
                    let metadata;
                    try {
                        let metadataResp = await fetch(`${API_KEYS.firebase[0]}/metadata.json?access_token=${googleToken}`);
                        metadata = await metadataResp.json();
                    } catch {
                        metadata = null;
                    }
                    if (!metadata?.lastGoogleBackup) {
                        alert("Failed to fetch Firebase backup time metadata.");
                        return;
                    }
                    localStorage.setItem("localSaves", metadata.lastGoogleBackup.toString());
                    backupReminder = document.getElementById("data-manager-import-reminder");
                    backupList = document.getElementById("data-manager-import-google-content");
                    break;
            }
            if (backupReminder) {
                backupReminder.innerHTML = "";
                backupReminder.style.display = "none";
            }
            if (backupList) {
                backupList.querySelectorAll("label").forEach(x => x.style.setProperty("--checkmark-color", "rgb(28, 176, 246)"));
                let backupButtons = backupList.querySelector(".data-manager-transfer-button-container").children;
                if (backupButtons.length >= 3) backupButtons[1].remove();
            }
        }

        alert(`Data transfer complete!\n\nSuccessful transfers: ${results.successes.length > 0 ? results.successes.join(", ") : "None"}\nFailed transfers: ${results.fails.length > 0 ? results.fails.join(", ") : "None"}`);
    }
}

async function generateBackupReminders() {
    let cloudInfo = await checkDbBackup("return");
    if (!cloudInfo) return;

    let backupReminder;

    function showModifiedItems(contentId, modifiedKeys) {
        let contentContainer = document.getElementById(contentId);
        let modifiedInputs = [];

        contentContainer.querySelectorAll("input").forEach(x => {
            if (modifiedKeys.includes(`${x.value.split(" ")[0]}_os`)) {
                x.parentElement.style.setProperty("--checkmark-color", "rgb(255, 200, 0)");
                modifiedInputs.push(x);
            }
        });

        let selectModifiedButton = createImgButton(["data-manager-transfer-button"], "svg", createSelectAllSvg("28"), "255, 200, 0", { text: "Select modified", position: "bottom" }, true);
        selectModifiedButton.addEventListener("click", () => {
            modifiedInputs.forEach(x => x.checked = true);
        });
        let buttonContainer = contentContainer.querySelector(".data-manager-transfer-button-container");
        buttonContainer.insertBefore(selectModifiedButton, buttonContainer.lastElementChild);
    }

    switch (cloudInfo.requiredAction) {
        case "cloud-upload":
            backupReminder = document.getElementById("data-manager-backup-reminder");
            backupReminder.innerHTML = `<img src="assets/images/info.svg"><p>Locally stored data has been modified. Back up to Firebase to synchronize.</p><p style="color: rgb(255, 200, 0);">Modified items</p>`;

            let localSaves = localStorage.getItem("localSaves"), localSaveSplit = localSaves ? localSaves.split(",") : null;
            if (localSaveSplit?.length > 1) {
                showModifiedItems("data-manager-backup-google-content", localSaveSplit);
            }

            break;

        case "cloud-download":
            backupReminder = document.getElementById("data-manager-import-reminder");
            backupReminder.innerHTML = `<img src="assets/images/info.svg"><p>Cloud data has been modified. Import from Firebase to synchronize.</p><p style="color: rgb(255, 200, 0);">Modified items</p>`;
            
            if (cloudInfo.cloudModified) {
                let modifiedKeys = Object.keys(cloudInfo.cloudModified);
                if (modifiedKeys?.length > 0) {
                    showModifiedItems("data-manager-import-google-content", modifiedKeys);
                }
            }

            break;
    }

    backupReminder.style.display = "flex";
    backupReminder.style.backgroundColor = "rgba(234, 51, 35, 0.3)";
}