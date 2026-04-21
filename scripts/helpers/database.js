const IS_LOCAL = window.location.href.startsWith("file://");
let firebaseKeys;
let firebaseInfo = [
    { os: "lookahead_os", key: "main" },
    { os: "calculator_os", key: "main" },
    { os: "gradebook_os", key: "main" },
    { os: "rss_os", key: "main" },
    { os: "timer_os", key: "main" },
    { os: "todo_os", key: "main" },
    { os: "trending_os", key: "type" },
    { os: "webchest_os", key: "profile" },
    { os: "widget_os", key: "main" },
];


function openDatabase(dbInfo, schemaInfo, indexInfo, forceLocal = false) {
    if (!IS_LOCAL && !forceLocal) return null;
    return new Promise((resolve, _) => {
        const request = window.indexedDB.open(dbInfo[0], dbInfo[1]);

        request.addEventListener("success", () => {
            resolve(request.result);
        });

        request.addEventListener("error", () => {
            resolve(null);
        });

        request.addEventListener("upgradeneeded", (event) => {
            let db = event.target.result;
            let transaction = event.target.transaction;
            let objectStore;

            if (!db.objectStoreNames.contains(schemaInfo[0])) {
                objectStore = db.createObjectStore(schemaInfo[0], { keyPath: schemaInfo[1] });
                indexInfo.forEach(x => {
                    objectStore.createIndex(x, x, { unique: false });
                });
            } else {
                objectStore = transaction.objectStore(schemaInfo[0]);
                indexInfo.forEach(x => {
                    if (!objectStore.indexNames.contains(x)) {
                        objectStore.createIndex(x, x, { unique: false });
                    }
                });
            }

            transaction.oncomplete = () => {
                resolve(db);
            }
        });
    });
}

async function readDatabase(db, osName, keyPath, forceLocal = false) {
    if (IS_LOCAL || forceLocal) {
        return new Promise((resolve, _) => {
            let request;

            if (keyPath) {
                request = db.transaction(osName).objectStore(osName).get(keyPath);
            } else {
                request = db.transaction(osName).objectStore(osName).getAll();
            }

            request.onsuccess = event => {
                resolve(event.target.result);
            }

            request.onerror = () => {
                resolve(null);
            }
        });
    } else {
        let firebaseFound = firebaseInfo.find(x => x.os == osName);
        if (!firebaseFound) return;

        if (!firebaseKeys) firebaseKeys = await loadKeys("firebase");
        let googleToken = await getGoogleToken(firebaseKeys);
        let firebaseData;
        try {
            let firebaseResp = await fetch(`${firebaseKeys[0]}/${osName.split("_")[0]}.json?access_token=${googleToken}`);
            firebaseData = await firebaseResp.json();
        } catch {
            firebaseData = null;
        }
        if (!firebaseData?.data) return null;

        let formattedData = firebaseFound.key == "main" ? firebaseData.data : Object.values(firebaseData.data);

        if (!keyPath || !formattedData.length) {
            return formattedData;
        } else {
            return formattedData.find(x => x[firebaseData.index] == keyPath);
        }
    }
}

async function saveDatabase(db, osName, newObjs, showSuccess, forceLocal = false) {
    if (IS_LOCAL || forceLocal) {
        return new Promise((resolve, _) => {
            let transaction = db.transaction(osName, "readwrite");
            let objectStore = transaction.objectStore(osName);

            newObjs.forEach(x => {
                objectStore.put(x);
            });

            transaction.oncomplete = () => {
                if (!["widget_os", "lookahead_os"].includes(osName)) {
                    let localSaves = localStorage.getItem("localSaves");
                    let localSaveSplit = localSaves ? localSaves.split(",") : [null];
                    localSaveSplit[0] = Date.now().toString();
                    if (!localSaveSplit.includes(osName)) localSaveSplit.push(osName);
                    localStorage.setItem("localSaves", localSaveSplit.join(","));
                }
                if (showSuccess) dbMessagePopup("Saved to database.", "#469d4a", 1500);
                resolve("ok");
            }

            transaction.onerror = () => {
                dbMessagePopup("A database save error occurred.", "#ff7272", 3000);
                resolve("err");
            }
        });
    } else {
        let firebaseFound = firebaseInfo.find(x => x.os == osName);
        if (!firebaseFound) return;

        if (!firebaseKeys) firebaseKeys = await loadKeys("firebase");
        let googleToken = await getGoogleToken(firebaseKeys);
        let firebaseResp;

        try {
            let patchPayload = {};
            switch (firebaseFound.key) {
                case "main":
                    patchPayload.data = newObjs[0];
                    break;
                default:
                    for (let newObj of newObjs) {
                        patchPayload[`data/${newObj[firebaseFound.key]}`] = newObj;
                    }
                    break;
            }

            firebaseResp = await fetch(`${firebaseKeys[0]}/${firebaseFound.os.split("_")[0]}.json?access_token=${googleToken}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patchPayload),
            });

            switch (firebaseResp.status) {
                case 200:
                    if (!["widget_os", "lookahead_os"].includes(osName)) {
                        firebaseResp = await fetch(`${firebaseKeys[0]}/metadata.json?access_token=${googleToken}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ lastGoogleBackup: Date.now(), [`googleModified/${osName}`]: 1 }),
                        });
                    }
                    if (showSuccess) dbMessagePopup("Saved to database.", "#469d4a", 1500);
                    break;

                default:
                    dbMessagePopup("A database save error occurred.", "#ff7272", 3000);
                    break;
            }
        } catch {
            dbMessagePopup("A database save error occurred.", "#ff7272", 3000);
        }
    }
}

function deleteDatabase(db, osName, keyPath) {
    if (IS_LOCAL) {
        return new Promise((resolve, _) => {
            if (keyPath) {
                db.transaction(osName, "readwrite").objectStore(osName).delete(keyPath).onsuccess = () => {
                    resolve("ok");
                }
            }
        });
    }
}

function dbMessagePopup(message, bgColor, timeout) {
    let elem = document.createElement("div");
    elem.classList.add("database-message", "flex-centered-row", "database-message-slide-in");
    elem.style.backgroundColor = bgColor;

    let dbImg = document.createElement("img");
    dbImg.src = "assets/images/database.svg";

    let errorMsg = document.createElement("p");
    errorMsg.textContent = message;

    elem.append(dbImg, errorMsg);
    document.body.appendChild(elem);

    setTimeout(() => {
        elem.classList.remove("database-message-slide-in");
        elem.classList.add("database-message-slide-out");
        elem.addEventListener("animationend", () => elem.remove(), { once: true });
    }, timeout);
}

async function checkDbBackup(mode) {
    if (!IS_LOCAL) return;

    let localSaves = localStorage.getItem("localSaves"), localSaveSplit, localSaveTime;
    if (localSaves) {
        localSaveSplit = localSaves.split(",");
        localSaveTime = parseInt(localSaveSplit[0]);
    } else {
        localSaveTime = -1;
    }

    let cloudBackupTime, cloudModified;
    try {
        let googleToken = await getGoogleToken();
        if (!googleToken) return;
        let metadataResp = await fetch(`${API_KEYS.firebase[0]}/metadata.json?access_token=${googleToken}`);
        let metadata = await metadataResp.json();
        cloudBackupTime = metadata?.lastGoogleBackup ?? 0;
        cloudModified = metadata?.googleModified;
    } catch (err) {
        console.log(err);
        cloudBackupTime = -1;
    }

    let requiredAction = cloudBackupTime == -1 ? null : (localSaveTime < cloudBackupTime || localSaveTime == -1) ? "cloud-download" : (localSaveTime > cloudBackupTime) ? "cloud-upload" : null;
    if (!requiredAction) return;

    switch (mode) {
        case "button":
            let managerButtonImg = document.getElementById("data-manager-button")?.firstElementChild;
            if (!managerButtonImg) return;
            managerButtonImg.src = `assets/images/${requiredAction}.svg`;
            managerButtonImg.style.opacity = 1;
            // let managerButton = document.getElementById("data-manager-button");
            // managerButton.classList.add("notification-circle");
            // managerButton.dataset.action = requiredAction;
            break;

        case "return":
            return { requiredAction, cloudModified };
    }
}

async function getGoogleToken(firebaseKeys) {
    let existingToken = await getCookie("googleToken");
    if (existingToken) return existingToken;
    if (!IS_LOCAL && !firebaseKeys) return null;

    function base64UrlEncode(data) {
        return btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    let nowSeconds = Math.floor(new Date().getTime() / 1000);
    let jwtHeader = base64UrlEncode({ "alg": "RS256", "typ": "JWT", "kid": IS_LOCAL ? API_KEYS.firebase[1] : firebaseKeys[1] });
    let jwtClaim = base64UrlEncode({
        "iss": IS_LOCAL ? API_KEYS.firebase[2] : firebaseKeys[2],
        "scope": "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": nowSeconds,
        "exp": nowSeconds + 60
    });

    let key;
    if (IS_LOCAL) {
        let binaryKey = Uint8Array.from(atob(API_KEYS.firebase[3].replace(/\n/g, '')), c => c.charCodeAt(0));
        key = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    } else {
        key = firebaseKeys[3];
    }
    let signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${jwtHeader}.${jwtClaim}`));
    let digest = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    let googleData;
    try {
        let googleResp = await fetch(`https://oauth2.googleapis.com/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: `${jwtHeader}.${jwtClaim}.${digest}`
            }),
        });
        if (!googleResp.ok) return null;
        googleData = await googleResp.json();
    } catch {
        googleData = null;
    }
    if (!googleData?.access_token) return null;

    await setCookie("googleToken", googleData.access_token, googleData.expires_in ? googleData.expires_in / 3600 : 1);
    return googleData.access_token;
}

async function loadKeys(service) {
    if (IS_LOCAL) return null;

    let keysDb = await openDatabase(["keys_db", 1], ["keys_os", "key"], [], true);
    let keysData = await readDatabase(keysDb, "keys_os", "main", true);
    keysDb.close();

    if (!service) {
        return keysData;
    } else {
        return keysData[service];
    }
}