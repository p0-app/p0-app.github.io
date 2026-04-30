window.onload = () => {
    initWebchest();
    checkTimerBreak(null, true);
    checkDbBackup("button");
}



let webchestDb, allProfiles;

async function initWebchest() {
    webchestDb = await openDatabase(["webchest_db", 3], ["webchest_os", "profile"], ["color", "order", "sites"]);

    let profileButton = document.getElementById("webchest-add-profile");
    profileButton.addEventListener("click", createProfile, { once: true });

    allProfiles = await readDatabase(webchestDb, "webchest_os");

    if (allProfiles?.length > 0) {
        allProfiles.sort((a, b) => a.order - b.order);

        (async() => {
            for (let profileData of allProfiles) {
                await generateProfileCard(profileData);
            }
            updateSiteColors(allProfiles, webchestDb);
            
            // updateProfileOrder();
            // await saveDatabase(webchestDb, "webchest_os", allProfiles, false);
        })();
    }

    loadTimelySuggestions(document.getElementById("webchest-timely-suggestions"), true, "Site Suggestions", [{ type: "sites", content: allProfiles, db: webchestDb }]);
    initSearchBar(allProfiles, webchestDb);
    initSettings("page-settings", "row", [{ name: "Settings", type: "close-button", classList: ["settings-title", "settings-img-button"] }, { type: "text-button", text: "Clear data", classList: ["danger-button", "dimensional-button"] }], null, null, null);
    createCircularBorders();
}

function createProfile() {
    let profileButton = document.getElementById("webchest-add-profile");
    toggleButtonActive(profileButton, false);

    let profileContainer = document.createElement("div");
    profileContainer.classList.add("webchest-profile-container", "flex-split-row");

    let profileCard = document.createElement("div");
    profileCard.classList.add("webchest-profile-card", "glass-container", "flex-column");

    let profileForm = document.createElement("form");
    profileForm.id = "webchest-profile-form";

    let nameInput = document.createElement("input");
    nameInput.classList.add("webchest-profile-name-input");
    nameInput.type = "text";
    nameInput.required = true;
    nameInput.placeholder = "Profile name";

    profileForm.appendChild(nameInput);
    profileCard.appendChild(profileForm);

    let buttonsDiv = document.createElement("div");
    buttonsDiv.classList.add("webchest-profile-edit-button-container", "centered-div");

    let confirmButton = createImgButton(["webchest-profile-edit-button"], "img", "assets/images/checkmark.svg", "0, 187, 0", { text: "Create", position: "bottom" });
    confirmButton.addEventListener("click", async () => {
        let nameTrimmed = nameInput.value.trim();
        if (nameTrimmed.length > 0) {
            if (allProfiles.map(x => x.profile).includes(nameTrimmed)) {
                alert("This profile name is already in use. Please choose another profile name.");
            } else {
                let newProfile = { profile: nameTrimmed, color: "", order: allProfiles.length + 1, sites: [] };
                await saveDatabase(webchestDb, "webchest_os", [newProfile], true);

                allProfiles.push(newProfile);
                profileContainer.remove();
                profileButton.addEventListener("click", createProfile, { once: true });
                toggleButtonActive(profileButton, true);
                generateProfileCard(newProfile);
            }
        } else {
            alert("The profile name must contain at least one non-whitespace character.");
        }
    });

    let cancelButton = createImgButton(["webchest-profile-edit-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Discard", position: "bottom" });
    cancelButton.addEventListener("click", () => {
        profileContainer.remove();
        profileButton.addEventListener("click", createProfile, { once: true });
        toggleButtonActive(profileButton, true);
    });

    buttonsDiv.append(confirmButton, cancelButton);
    profileContainer.append(profileCard, buttonsDiv);
    document.getElementById("webchest-card-container").appendChild(profileContainer);

    nameInput.focus();
}

async function generateProfileCard(profileData) {
    let profileContainer = document.createElement("div");
    profileContainer.classList.add("webchest-profile-container", "flex-split-row");
    profileContainer.dataset.profile = profileData.profile;

    let profileCard = document.createElement("div");
    profileCard.classList.add("webchest-profile-card", "glass-container", "flex-column");
    profileCard.style.setProperty("--card-bg", profileData.color == "" ? "transparent" : profileData.color);

    let cardHeader = document.createElement("div");
    cardHeader.classList.add("webchest-profile-header", "flex-split-row");

    let headerLeft = document.createElement("div");
    headerLeft.classList.add("webchest-profile-header-left", "flex-centered-row");

    let profileName = document.createElement("h3");
    profileName.classList.add("webchest-profile-name");
    profileName.textContent = profileData.profile;

    let profileEdit = document.createElement("div");
    profileEdit.classList.add("webchest-profile-edit", "flex-centered-row");
    let moreSvg = createMoreSvg("30");
    moreSvg.classList.add("webchest-profile-more-button", "webchest-profile-edit-button");
    profileEdit.appendChild(moreSvg);

    let profileEditHandler = () => enterProfileEdit(profileCard, profileData.profile);

    let headerCollapse = createHeaderCollapse(profileData.profile, profileCard, moreSvg, profileEditHandler);

    headerLeft.append(headerCollapse, profileName);
    cardHeader.append(headerLeft, profileEdit);
    profileCard.append(cardHeader);

    if (!localStorage.getItem(`webchestCollapsed-${profileData.profile}`)) {
        moreSvg.addEventListener("click", profileEditHandler, { once: true });

        let siteContainer = document.createElement("div");
        siteContainer.classList.add("webchest-site-container");

        for (let site of profileData.sites) {
            let siteDetail = (await generateSiteDetail(site.url, site.displayText, "site-async", webchestDb, profileData))[0];
            siteContainer.appendChild(siteDetail);
        }

        profileCard.appendChild(siteContainer);
    } else {
        moreSvg.style.cursor = "default";
        moreSvg.classList.add("element-inactive");
    }

    profileContainer.appendChild(profileCard);
    document.getElementById("webchest-card-container").appendChild(profileContainer);
}

function enterProfileEdit(profileCard, profileName) {
    let moreSvg = profileCard.querySelector(".webchest-profile-more-button");
    let profileEdit = profileCard.querySelector(".webchest-profile-edit");
    let siteContainer = profileCard.querySelector(".webchest-site-container");

    toggleButtonActive(moreSvg, false);
    profileCard.querySelector(".webchest-profile-header-collapse")?.remove();

    siteContainer.querySelectorAll(".webchest-site-details").forEach((x, i) => {
        x.classList.remove("webchest-site-details-bg", "dimensional-button");
        x.classList.add("webchest-site-details-edit");

        enableDrag(x, i, profileName);

        let deleteSiteButton = document.createElement("p");
        deleteSiteButton.classList.add("webchest-site-details-delete");
        deleteSiteButton.textContent = "X";

        deleteSiteButton.addEventListener("click", event => {
            event.stopPropagation();
            allProfiles.find(x => x.profile == profileName).sites[parseInt(x.dataset.siteIndex)].toDelete = true;
            x.classList.add("webchest-site-details-remtemp");
            deleteSiteButton.remove();
        });

        x.appendChild(deleteSiteButton);
    });

    let buttonsDiv = document.createElement("div");
    buttonsDiv.classList.add("webchest-profile-edit-button-container", "centered-div");

    let colorPickContainer = document.createElement("div");
    colorPickContainer.classList.add("color-picker");
    let colorPickButton = document.createElement("div");
    colorPickButton.classList.add("color-picker-button", "centered-div", "hover-label");
    colorPickButton.dataset.label = "Tint color";
    colorPickButton.dataset.position = "bottom";
    colorPickButton.style.setProperty("--picker-rgb", profileCard.style.getPropertyValue("--card-bg") == "transparent" ? "255, 255, 255" : profileCard.style.getPropertyValue("--card-bg"));
    let colorPickSvg = createPaletteSvg("24");

    /*
    colorPickButton.addEventListener("click", () => {
        let pickerTable = profileCard.querySelector(".color-picker-table");
        if (!pickerTable) {
            const updateColor = (color) => {
                allProfiles.find(x => x.profile == profileName).color = color;

                profileCard.style.setProperty("--card-bg", color == "" ? "transparent" : color);
                colorPickButton.style.setProperty("--picker-rgb", color == "" ? "255, 255, 255" : color);
            }

            colorPickContainer.appendChild(generateColorPicker(["", "255, 75, 75", "255, 200, 0", "88, 204, 2", "43, 112, 201", "206, 130, 255"], 3, allProfiles.find(x => x.profile == profileName).color, updateColor));
        } else {
            pickerTable.remove();
        }
    });
    */

    const updateColor = (color) => {
        if (color == "255, 255, 255") color = "";
        
        allProfiles.find(x => x.profile == profileName).color = color;

        profileCard.style.setProperty("--card-bg", color == "" ? "transparent" : color);
        colorPickButton.style.setProperty("--picker-rgb", color == "" ? "255, 255, 255" : color);
    }

    let colorInput = generateColorPicker(allProfiles.find(x => x.profile == profileName).color, updateColor);
    colorPickButton.addEventListener("click", () => colorInput.click());

    colorPickButton.appendChild(colorPickSvg);
    colorPickContainer.append(colorPickButton, colorInput);

    let profileUpButton = createImgButton(["webchest-profile-edit-button"], "svg", createArrowSvg("28", "up"), "255, 255, 255", { text: "Move profile up", position: "bottom" });
    profileUpButton.addEventListener("click", () => {
        let prevSibling = profileCard.parentElement.previousElementSibling;
        if (prevSibling && prevSibling.classList.contains("webchest-profile-container")) {
            profileCard.parentElement.parentElement.insertBefore(profileCard.parentElement, prevSibling);
            document.getElementById("webchest-card-container").dataset.orderChanged = "true";
            updateProfileOrder();
        }
    });

    let profileDownButton = createImgButton(["webchest-profile-edit-button"], "svg", createArrowSvg("28", "down"), "255, 255, 255", { text: "Move profile down", position: "bottom" });
    profileDownButton.addEventListener("click", () => {
        let nextSibling = profileCard.parentElement.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains("webchest-profile-container")) {
            profileCard.parentElement.parentElement.insertBefore(nextSibling, profileCard.parentElement);
            document.getElementById("webchest-card-container").dataset.orderChanged = "true";
            updateProfileOrder();
        }
    });

    let confirmButton = createImgButton(["webchest-profile-edit-button"], "img", "assets/images/checkmark.svg", "0, 187, 0", { text: "Save changes", position: "bottom" });
    confirmButton.addEventListener("click", async () => {
        let profileData = allProfiles.find(x => x.profile == profileName);
        
        siteContainer.querySelectorAll(".webchest-site-details-addtemp").forEach(x => {
            x.classList.remove("webchest-site-details-addtemp");
            generateActualSite(x, x.querySelector("img"), false, webchestDb, profileData);
        });
        siteContainer.querySelectorAll(".webchest-site-details-text-addtemp").forEach(x => x.classList.remove("webchest-site-details-text-addtemp"));
        siteContainer.querySelectorAll(".webchest-site-details-remtemp").forEach(x => x.remove());

        profileData.sites = profileData.sites.filter(site => !site.toDelete);

        let mainCardContainer = document.getElementById("webchest-card-container");
        let profilesToSave;

        if (mainCardContainer.dataset.orderChanged == "true") {
            profilesToSave = allProfiles;
            delete mainCardContainer.dataset.orderChanged;
        } else {
            profilesToSave = [profileData];
        }

        await exitProfileEdit(profileCard, profileName, buttonsDiv, "confirm");
        await saveDatabase(webchestDb, "webchest_os", profilesToSave, true);
    });

    let cancelButton = createImgButton(["webchest-profile-edit-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Discard changes", position: "bottom" });
    cancelButton.addEventListener("click", async () => {
        await exitProfileEdit(profileCard, profileName, buttonsDiv, "cancel");
    });

    let deleteProfileButton = createImgButton(["webchest-profile-edit-button"], "img", "assets/images/delete.svg", "234, 51, 35", { text: "Delete profile", position: "bottom" });
    deleteProfileButton.addEventListener("click", async () => {
        let deleteConfirm = confirm("Are you sure you want to permanently delete this profile? This action cannot be undone.");
        if (deleteConfirm) {
            await deleteDatabase(webchestDb, "webchest_os", profileName);
            profileCard.parentElement.remove();

            allProfiles = allProfiles.filter(x => x.profile != profileName);
            updateProfileOrder();
            await saveDatabase(webchestDb, "webchest_os", allProfiles, true);
        }
    });

    buttonsDiv.append(colorPickContainer, profileUpButton, profileDownButton, confirmButton, cancelButton, deleteProfileButton);
    profileEdit.appendChild(buttonsDiv);

    let [siteAddContainer, siteAddButton] = generateSiteDetail("assets/images/add.svg", "Add site...", "add");
    siteAddContainer.classList.add("webchest-site-add-button");

    siteAddButton.addEventListener("click", () => {
        openSiteAddOverlay(allProfiles.find(x => x.profile == profileName), siteContainer);
    });

    siteContainer.appendChild(siteAddContainer);
}

async function exitProfileEdit(profileCard, profileName, buttonsDiv, type) {
    let moreSvg = profileCard.querySelector(".webchest-profile-more-button");
    let siteContainer = profileCard.querySelector(".webchest-site-container");
    let headerLeft = profileCard.querySelector(".webchest-profile-header-left");

    buttonsDiv.remove();

    switch (type) {
        case "confirm":
            siteContainer.querySelectorAll(".webchest-site-details-addtemp, .webchest-site-add-button").forEach(x => x.remove());
            siteContainer.querySelectorAll(".webchest-site-details").forEach(x => {
                x.classList.add("webchest-site-details-bg", "dimensional-button");
                x.classList.remove("webchest-site-details-edit");
                x.querySelectorAll(".webchest-site-details-delete").forEach(y => y.remove());

                x.draggable = false;
                x.removeAttribute('data-site-index');
                x.removeEventListener("dragstart", x.dragStartHandler);
                x.removeEventListener("dragover", x.dragOverHandler);
                x.removeEventListener('dragenter', x.dragEnterHandler);
                x.removeEventListener('dragleave', x.dragLeaveHandler);
                x.removeEventListener("drop", x.dropHandler);
                x.removeEventListener("dragend", x.dragEndHandler);

                delete x.dragStartHandler;
                delete x.dragOverHandler;
                delete x.dragEnterHandler;
                delete x.dragLeaveHandler;
                delete x.dropHandler;
                delete x.dragEndHandler;
                delete x.dataset.siteIndex;
            });
            
            break;

        case "cancel":
            let originalProfiles, originalProfile;
            
            originalProfile = await readDatabase(webchestDb, "webchest_os", profileName);

            if (originalProfile) {
                profileCard.style.setProperty("--card-bg", originalProfile.color == "" ? "transparent" : originalProfile.color);
                siteContainer.innerHTML = "";
                originalProfile.sites.forEach(async site => {
                    siteContainer.appendChild(generateSiteDetail(site.url, site.displayText, "site-sync", webchestDb, originalProfile)[0]);
                });

                let mainCardContainer = document.getElementById("webchest-card-container");
                let profileIdx = allProfiles.findIndex(x => x.profile == profileName);
                
                if (mainCardContainer.dataset.orderChanged == "true") {
                    if (allProfiles[profileIdx].order != originalProfile.order) {
                        originalProfiles = await readDatabase(webchestDb, "webchest_os");
                        let mainCardContainer = document.getElementById("webchest-card-container");
                        mainCardContainer.insertBefore(profileCard.parentElement, mainCardContainer.querySelector(`[data-profile=${originalProfiles.find(x => x.order == originalProfile.order + 1)?.profile}]`));
                    }

                    if (document.querySelectorAll(".webchest-profile-edit > .webchest-profile-edit-button-container").length == 0) delete mainCardContainer.dataset.orderChanged;
                }

                allProfiles[profileIdx] = originalProfile;
            }

            break;
    }

    let profileEditHandler = () => enterProfileEdit(profileCard, profileName);
    moreSvg.addEventListener("click", profileEditHandler, { once: true });
    toggleButtonActive(moreSvg, true);

    if (headerLeft) {
        headerLeft.prepend(createHeaderCollapse(profileName, profileCard, moreSvg, profileEditHandler));
    }
}

function createHeaderCollapse(profileName, profileCard, moreSvg, profileEditHandler) {
    let headerCollapse = createArrowSvg("30", localStorage.getItem(`webchestCollapsed-${profileName}`) ? "right" : "down");
    headerCollapse.classList.add("webchest-profile-header-collapse", "centered-div");

    headerCollapse.addEventListener("click", async () => {
        let isCollapsed = !!localStorage.getItem(`webchestCollapsed-${profileName}`);
        if (isCollapsed) {
            localStorage.removeItem(`webchestCollapsed-${profileName}`);
        } else {
            localStorage.setItem(`webchestCollapsed-${profileName}`, "true");
        }
        isCollapsed = !isCollapsed;

        if (isCollapsed) {
            headerCollapse.querySelector("path").setAttribute("d", "M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z");
            profileCard.querySelector(".webchest-site-container").remove();
            moreSvg.removeEventListener("click", profileEditHandler, { once: true });
            toggleButtonActive(moreSvg, false);
        } else {
            let profileData = allProfiles.find(x => x.profile == profileName);
            headerCollapse.querySelector("path").setAttribute("d", "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z");
            let siteContainer = document.createElement("div");
            siteContainer.classList.add("webchest-site-container");

            for (let site of profileData.sites) {
                let siteDetail = (await generateSiteDetail(site.url, site.displayText, "site-async", webchestDb, profileData))[0];
                siteContainer.appendChild(siteDetail);
            }

            profileCard.appendChild(siteContainer);
            moreSvg.addEventListener("click", profileEditHandler, { once: true });
            toggleButtonActive(moreSvg, true);
            updateSiteColors([profileData], webchestDb);
        }
    });

    return headerCollapse;
}

function openSiteAddOverlay(profileData, siteContainer) {
    let [siteAddOverlay, siteAddWindow] = createOverlay("webchest-site-add-window");

    let siteAddTitle = document.createElement("h3");
    siteAddTitle.id = "webchest-site-add-title";
    siteAddTitle.classList.add("content-overlay-window-title");
    siteAddTitle.textContent = "Add site to web chest";

    let inputContainer = document.createElement("div");
    inputContainer.id = "webchest-site-add-input-container";

    let [nameInput, nameField] = createLabeledInput(
        ["content-overlay-input-group", "flex-column"],
        "Display text",
        "content-overlay-input-label",
        "webchest-site-add-name",
        "content-overlay-field",
        "This is what will appear in the list"
    );

    let [urlInput, urlField] = createLabeledInput(
        ["content-overlay-input-group", "flex-column"],
        "URL",
        "content-overlay-input-label",
        "webchest-site-add-url",
        "content-overlay-field",
        "https://example.com"
    );

    let submitButton = createImgButton(["content-overlay-window-button"], "img", "assets/images/checkmark.svg", "0, 187, 0", { text: "Add site", position: "bottom" });

    inputContainer.append(nameInput, urlInput, submitButton);

    let faviconContainer = document.createElement("div");
    faviconContainer.id = "webchest-site-add-favicon-container";
    faviconContainer.classList.add("flex-centered-row");

    let faviconText = document.createElement("h4");
    faviconText.textContent = "Icon preview";
    faviconText.classList.add("content-overlay-input-label");

    let faviconImg = document.createElement("img");
    faviconImg.id = "webchest-site-add-favicon-img";

    faviconContainer.append(faviconText, faviconImg);

    let closeButton = createImgButton(["content-overlay-window-close", "content-overlay-window-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Discard & Close", position: "bottom" });

    siteAddOverlay.addEventListener("click", event => {
        event.stopPropagation();
    });

    closeButton.addEventListener("click", () => {
        siteAddOverlay.remove();
    });

    urlField.addEventListener("input", event => {
        let urlValue = event.target.value.trim();

        try {
            new URL(urlValue);
            faviconImg.style.visibility = "visible";
            faviconImg.src = `https://s2.googleusercontent.com/s2/favicons?domain=${encodeURI(urlValue)}&sz=64`;
        } catch {
            faviconImg.style.visibility = "hidden";
        }
    });

    submitButton.addEventListener("click", () => {
        let nameValue = nameField.value.trim();
        let urlValue = urlField.value.trim();

        if (nameValue.length == 0 || nameValue.length > 11) {
            return alert("Display text must be between 1 and 11 non-whitespace characters.");
        }

        if (urlValue.length == 0) {
            return alert("Please provide a URL.");
        }

        try {
            new URL(urlValue);
        } catch {
            return alert("Invalid URL. Please enter a complete URL including http:// or https://");
        }

        if (profileData.sites.findIndex(x => x.displayText == nameValue || x.url == urlValue) != -1) {
            return alert("The same display text and/or URL has already been added to this profile.");
        }

        profileData.sites.push({
            displayText: nameValue,
            url: urlValue,
            visits: {
                weekdays: {},
                weekends: {},
            },
        });

        siteAddOverlay.remove();

        let newSiteDetail = generateSiteDetail(urlValue, nameValue, "temporary", webchestDb, profileData)[0];
        newSiteDetail.classList.add("webchest-site-details-edit");
        enableDrag(newSiteDetail, profileData.sites.length - 1, profileData.profile);

        siteContainer.insertBefore(newSiteDetail, siteContainer.querySelector(".webchest-site-add-button"));
    });

    siteAddWindow.append(siteAddTitle, inputContainer, faviconContainer, closeButton);
    siteAddOverlay.appendChild(siteAddWindow);
    document.body.appendChild(siteAddOverlay);
}

function enableDrag(x, i, profileName) {
    x.draggable = true;
    x.dataset.siteIndex = i;

    x.dragStartHandler = e => handleDragStart(e, x);
    x.dragOverHandler = e => handleDragOver(e);
    x.dragEnterHandler = () => handleDragEnter(x);
    x.dragLeaveHandler = e => handleDragLeave(e, x);
    x.dropHandler = e => handleDrop(e, x, profileName);
    x.dragEndHandler = () => handleDragEnd();

    x.addEventListener("dragstart", x.dragStartHandler);
    x.addEventListener("dragover", x.dragOverHandler);
    x.addEventListener('dragenter', x.dragEnterHandler);
    x.addEventListener('dragleave', x.dragLeaveHandler);
    x.addEventListener("drop", x.dropHandler);
    x.addEventListener("dragend", x.dragEndHandler);
}

function handleDragStart(e, element) {
    element.classList.add('webchest-edit-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', element.innerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(element) {
    element.classList.add('webchest-edit-drag-over');
}

function handleDragLeave(e, element) {
    let relatedTarget = e.relatedTarget;
    if (!relatedTarget || !element.contains(relatedTarget)) {
        element.classList.remove('webchest-edit-drag-over');
    }
}

function handleDrop(e, dropTarget, profileName) {
    e.stopPropagation();

    let draggingElement = document.querySelector('.webchest-edit-dragging');
    if (draggingElement != dropTarget) {
        let container = dropTarget.parentNode;

        let draggingIndex = parseInt(draggingElement.dataset.siteIndex);
        let targetIndex = parseInt(dropTarget.dataset.siteIndex);

        if (draggingIndex < targetIndex) {
            container.insertBefore(draggingElement, dropTarget.nextSibling);
        } else {
            container.insertBefore(draggingElement, dropTarget);
        }

        let profileData = allProfiles.find(x => x.profile == profileName);
        let movedSite = profileData.sites.splice(draggingIndex, 1)[0];
        profileData.sites.splice(targetIndex, 0, movedSite);

        let siteDetails = container.querySelectorAll('.webchest-site-details:not(.webchest-site-add-button)');
        siteDetails.forEach((x, i) => {
            x.dataset.siteIndex = i;
        });
    }

    dropTarget.classList.remove('webchest-edit-drag-over');
    return false;
}

function handleDragEnd() {
    document.querySelectorAll('.webchest-site-details').forEach(item => {
        item.classList.remove('webchest-edit-drag-over');
        item.classList.remove('webchest-edit-dragging');
    });
}

function updateProfileOrder() {
    document.getElementById("webchest-card-container").querySelectorAll(".webchest-profile-name").forEach((x, i) => {
        allProfiles.find(y => y.profile == x.textContent).order = i + 1;
    });
}