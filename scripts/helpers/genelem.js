function toggleButtonActive(element, activate) {
    if (activate) {
        element.classList.remove("element-inactive");
        element.style.cursor = "pointer";
    } else {
        element.classList.add("element-inactive");
        element.style.cursor = "default";
    }
}

function createImgButton(classList, imgType, imgSrc, borderColor, hoverLabel) {
    let button = document.createElement("button");
    if (classList?.length > 0) button.classList.add(...classList);

    let imgElement;
    switch (imgType) {
        case "img":
            imgElement = document.createElement("img");
            imgElement.src = imgSrc;
            break;

        case "svg":
            imgElement = imgSrc;
            break;
    }

    if (borderColor) {
        imgElement.classList.add("bordered-img-button");
        imgElement.style.borderColor = `rgb(${borderColor})`;
        imgElement.style.setProperty("--hover-bg", borderColor);
    }
    button.appendChild(imgElement);

    if (hoverLabel) {
        button.classList.add("hover-label");
        button.dataset.label = hoverLabel.text;
        button.dataset.position = hoverLabel.position;
    }

    return button;
}

function createImgTextDiv(classList, idList, imgType, imgSrc, imgHover, textType, text, link, appendOrder = "img-first") {
    const applyAttributes = (element, index) => {
        if (classList?.[index]?.length > 0) element.classList.add(...classList[index]);
        if (idList?.[index]) element.id = idList[index];
        return element;
    };

    let div = applyAttributes(document.createElement(!link ? "div" : "a"), 0);
    if (link) div.href = sanitizeURL(link);

    let imgElement;
    switch (imgType) {
        case "img":
            imgElement = document.createElement("img");
            imgElement.src = sanitizeURL(imgSrc);
            imgElement.draggable = false;
            break;

        case "svg":
            imgElement = imgSrc;
            break;
    }
    imgElement = applyAttributes(imgElement, 1);

    let imgContainer;
    if (!imgHover) {
        imgContainer = imgElement;
    } else {
        imgElement.style.verticalAlign = "middle";
        imgContainer = document.createElement("div");
        imgContainer.classList.add("hover-label");
        imgContainer.dataset.label = imgHover.label;
        imgContainer.dataset.position = imgHover.position;
        imgContainer.appendChild(imgElement);
    }

    let textElement = applyAttributes(document.createElement(textType), 2);
    textElement.textContent = text;

    switch (appendOrder) {
        case "img-first":
            div.append(imgContainer, textElement);
            break;

        case "text-first":
            div.append(textElement, imgContainer);
            break;
    }
    return div;
}

function createLabeledInput(overallClasses, labelText, labelClass, inputId, inputClass, inputPlaceholder) {
    let overall = document.createElement("div");
    overall.classList.add(...overallClasses);

    let label = document.createElement("h4");
    label.classList.add(labelClass);
    label.textContent = labelText;

    let input = document.createElement("input");
    input.id = inputId;
    input.classList.add(inputClass);
    if (inputPlaceholder) input.placeholder = inputPlaceholder;

    overall.append(label, input);

    return [overall, input];
}

function createNumericalInput(classList, placeholder, min, max, totalDigits) {
    let input = document.createElement("input");
    input.classList.add(...classList);
    input.placeholder = placeholder;
    input.addEventListener("focusout", () => {
        if (input.value != "") {
            let int = parseInt(input.value);
            if (isNaN(int) || (min != null && int < min) || (max != null && int > max)) {
                input.value = "";
            } else {
                if (totalDigits) input.value = input.value.padStart(totalDigits, "0");
            }
        }
    });
    return input;
}

function createToggle(id, isChecked) {
    let toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = id;
    toggle.checked = isChecked;
    let slider = document.createElement("span");
    slider.classList.add("toggle-slider");
    return [toggle, slider];
}

function generateStatGroup(groupClass, textColor, value, label) {
    let group = document.createElement("div");
    group.classList.add(...groupClass);
    if (textColor) group.style.color = textColor;

    let valText = document.createElement("p");
    valText.classList.add(value[1]);
    valText.innerHTML = value[0];

    let labelText = document.createElement("p");
    labelText.classList.add(label[1]);
    labelText.textContent = label[0];

    group.append(valText, labelText);
    return group;
}

function generateModifiedStat(oldStat, newStat, transitionColor) {
    let separatorHtml = "";
    for (let i = 0; i < 3; i++) {
        separatorHtml += `<span class="stat-transition-char" style="animation: color-change 3s ${i * 0.5}s ease infinite;">&gt;</span>`;
    }
    return `<span style="color: #b4b4b4;">${oldStat}</span><span style="margin: 0 5px; font-family: 'Din Round'; color: rgb(${transitionColor}); --transition-color: ${transitionColor};">${separatorHtml}</span><span style="color: rgb(${transitionColor});">${newStat}</span>`;
}

function initSettings(buttonId, orientation, settingItems, db, os, dbData) {
    let settingsButton = document.getElementById(buttonId);

    const generateSettingsPane = () => {
        let settingContainer = document.createElement("div");
        settingContainer.id = `${buttonId}-pane`;
        settingContainer.classList.add("settings-container", "glass-container", "glass-bg", "flex-column");
        
        settingItems.forEach(itemData => {
            settingContainer.appendChild(generateSettingsItem(itemData));
        });

        return settingContainer;
    }

    const generateSettingsItem = itemData => {
        let item = document.createElement("div");

        switch (orientation) {
            case "row":
                item.classList.add("settings-row", "flex-split-row");
                break;
            case "column":
                item.classList.add("settings-column", "flex-column");
                break;
        }

        if (itemData.name) {
            let name = document.createElement("div");
            name.classList.add("settings-name");
            if (itemData.classList?.length > 0) name.classList.add(itemData.classList[0]);
            name.textContent = itemData.name;
            if (itemData.icon) {
                let icon = document.createElement("img");
                icon.classList.add("settings-icon");
                icon.src = itemData.icon;
                icon.draggable = false;
                name.prepend(icon);
            }
            item.appendChild(name);
        }

        let interactive, selectedObj;
        switch (itemData.type) {
            case "close-button":
                if (orientation == "column") {
                    item.classList.remove("settings-column", "flex-column");
                    item.classList.add("settings-row", "flex-split-row");
                }
                interactive = createImgButton([itemData.classList[1]], "img", "assets/images/checkmark.svg", "0, 187, 0", { text: "Save & Close", position: "bottom" });
                interactive.id = "settings-close-button";
                interactive.addEventListener("click", async event => {
                    event.stopPropagation();
                    document.getElementById(`${buttonId}-pane`)?.remove();
                    document.removeEventListener("click", exitSettings);
                    activateSettings();
                    if (db != null && os != null) {
                        await saveDatabase(db, os, [dbData], true);
                    }
                    if (itemData.func != null) itemData.func();
                });
                break;

            case "text-button":
                interactive = document.createElement("p");
                interactive.classList.add(...itemData.classList);
                interactive.textContent = itemData.text;
                if (itemData.func) {
                    interactive.addEventListener("click", () => itemData.func());
                }
                break;

            case "toggle":
                interactive = document.createElement("label");
                interactive.classList.add("toggle", "settings-toggle");
                let [toggle, slider] = createToggle(itemData.classList[1], getObjProperty(dbData.settings, itemData.key));
                toggle.addEventListener("input", event => {
                    setObjProperty(dbData.settings, itemData.key, event.target.checked);
                });
                interactive.append(toggle, slider);
                break;

            case "time":
                interactive = document.createElement("div");
                interactive.classList.add(...itemData.classList[1]);
                let [hourInput, minuteInput] = [createNumericalInput(["settings-text-input"], "12", 1, 12, null), createNumericalInput(["settings-text-input"], "34", 0, 59, 2)];
                let timeObj = getObjProperty(dbData.settings, itemData.key);
                if (timeObj?.time != null) {
                    [hourInput.value, minuteInput.value] = decimalToTime(timeObj.time, "arr");
                }
                hourInput.style.textAlign = "right";
                let updateTime = () => {
                    if (hourInput.value != "" && minuteInput.value != "") {
                        setObjProperty(dbData.settings, `${itemData.key}.time`, timeToDecimal(hourInput.value, minuteInput.value, itemData.amPm));
                    } else {
                        setObjProperty(dbData.settings, `${itemData.key}.time`, null);
                    }
                }
                hourInput.addEventListener("focusout", () => updateTime());
                minuteInput.addEventListener("focusout", () => updateTime());
                interactive.append(hourInput, ":", minuteInput, itemData.amPm);
                break;

            case "select":
                interactive = document.createElement("select");
                interactive.classList.add("settings-select");
                selectedObj = getObjProperty(dbData.settings, itemData.key);
                itemData.options.forEach(x => interactive.options.add(new Option(x, x)));
                interactive.value = selectedObj;
                interactive.addEventListener("input", () => {
                    setObjProperty(dbData.settings, itemData.key, interactive.value);
                });
                break;

            case "multiselect":
                interactive = document.createElement("div");
                interactive.classList.add("settings-multiselect");

                selectedObj = getObjProperty(dbData.settings, itemData.key);
                let selectedSet = new Set(selectedObj);

                let dropdown = document.createElement("div");
                dropdown.classList.add("settings-multiselect-dropdown", "flex-split-row");

                let dropdownText = document.createElement("p");
                dropdownText.classList.add("settings-multiselect-dropdown-text", "flex-split-row-grow");
                dropdownText.textContent = `${selectedObj.length} selected`;
                let dropdownArrow = createArrowSvg("22", "down");
                dropdown.append(dropdownText, dropdownArrow);

                let dropdownContent = document.createElement("div");
                dropdownContent.classList.add("settings-multiselect-content", "glass-container", "glass-bg");
                itemData.options.forEach(option => {
                    let [optionItem, checkbox] = generateMultiselectItem(option.color, option.name, option.name, selectedSet.has(option.name));
                    dropdownContent.appendChild(optionItem);

                    checkbox.addEventListener("change", event => {
                        if (event.target.checked) {
                            selectedSet.add(option.name);
                        } else {
                            selectedSet.delete(option.name);
                        }

                        let currentSelected = Array.from(selectedSet);
                        setObjProperty(dbData.settings, itemData.key, currentSelected);
                        dropdownText.textContent = `${currentSelected.length} selected`;
                    });
                });

                dropdown.addEventListener("click", () => {
                    item.parentElement.querySelectorAll(".settings-multiselect-open").forEach(el => {
                        if (el != interactive) {
                            el.classList.remove("settings-multiselect-open");
                            el.querySelector("path").setAttribute("d", "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z");
                        }
                    });
                    interactive.classList.toggle("settings-multiselect-open");
                    dropdownArrow.querySelector("path")?.setAttribute("d", interactive.classList.contains("settings-multiselect-open") ? "M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z" : "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z");
                });

                interactive.append(dropdown, dropdownContent);
                break;
        }
        item.appendChild(interactive);

        return item;
    }

    const activateSettings = () => {
        settingsButton.firstElementChild.firstElementChild.classList.remove("element-inactive");
        settingsButton.addEventListener("click", () => {
            settingsButton.firstElementChild.firstElementChild.classList.add("element-inactive");
            settingsButton.appendChild(generateSettingsPane());
            document.addEventListener("click", exitSettings);
        }, { once: true });
    }

    const exitSettings = event => {
        if (!settingsButton.contains(event.target)) {
            document.getElementById(`${buttonId}-pane`)?.remove();
            document.removeEventListener("click", exitSettings);
            activateSettings();
        }
    }

    activateSettings();
}

function generateMultiselectItem(color, name, value, isChecked) {
    let optionItem = document.createElement("label");
    optionItem.classList.add("settings-multiselect-option", "flex-centered-row");
    optionItem.style.setProperty("--checkmark-color", color ?? "rgb(28, 176, 246)");

    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.checked = isChecked;

    let checkmark = document.createElement("span");
    checkmark.classList.add("settings-multiselect-checkmark");

    let optionText = document.createElement("span");
    optionText.classList.add("settings-multiselect-option-text");
    optionText.textContent = name;

    optionItem.append(checkbox, checkmark, optionText);
    return [optionItem, checkbox];
}

function initSearchBar(allProfiles, webchestDb) {
    let searchBarElement = document.getElementById("search-bar");
    let searchVal, lowerSearchVal, hasText = false, completionTimeout, completionController;
    let allSites = allProfiles.flatMap(x => x.sites);
    let searchPlaceholders = ["Ready when you are.", "What's on your mind today?", "Let's get started.", "What are you working on?", "Where should we begin?", "Got a question to look up?"];
    let searchEngines = [{ name: "Google", urlPrefix: "https://www.google.com/search?q=", icon: "google.svg" }, { name: "Bing", urlPrefix: "https://www.bing.com/search?q=", icon: "microsoft.svg" }, { name: "Yahoo", urlPrefix: "https://ca.search.yahoo.com/search?p=", icon: "yahoo.svg" }, { name: "DuckDuckGo", urlPrefix: "https://duckduckgo.com/?ia=web&q=", icon: "duckduckgo.svg" }, { name: "Baidu", urlPrefix: "https://www.baidu.com/s?ie=utf-8&tn=baidu&wd=", icon: "baidu.svg" }], selectedEngine = 0;

    let searchIconContainer = document.createElement("div");
    searchIconContainer.id = "search-bar-icon-container";
    let searchIconImg = document.createElement("img");
    searchIconImg.id = "search-bar-icon";
    searchIconImg.src = `assets/images/${searchEngines[selectedEngine].icon}`;
    searchIconImg.draggable = false;
    let searchSwitcher = document.createElement("div");
    searchSwitcher.id = "search-bar-engine-switcher";
    searchSwitcher.classList.add("flex-column");
    searchSwitcher.style.display = "none";
    for (let i = 0; i < searchEngines.length; i++) {
        let engineRow = document.createElement("div");
        engineRow.classList.add("search-bar-engine-row", "flex-centered-row");
        if (i == selectedEngine) engineRow.classList.add("search-bar-engine-selected");
        let engineIcon = document.createElement("img");
        engineIcon.classList.add("search-bar-engine-icon");
        engineIcon.src = `assets/images/${searchEngines[i].icon}`;
        engineIcon.draggable = false;
        let engineName = document.createElement("p");
        engineName.textContent = searchEngines[i].name;
        engineRow.append(engineIcon, engineName);
        engineRow.addEventListener("click", () => {
            selectedEngine = i;
            searchIconImg.src = `assets/images/${searchEngines[selectedEngine].icon}`;
            document.querySelector(".search-bar-engine-selected")?.classList?.remove("search-bar-engine-selected");
            engineRow.classList.add("search-bar-engine-selected");
        });
        searchSwitcher.appendChild(engineRow);
    }
    searchIconContainer.addEventListener("click", () => {
        searchSwitcher.style.display = searchSwitcher.style.display == "none" ? "flex" : "none";
    });
    document.addEventListener("click", event => {
        if (!searchIconContainer.contains(event.target)) searchSwitcher.style.display = "none";
    });
    searchIconContainer.append(searchIconImg, searchSwitcher);

    let searchInput = document.createElement("input");
    searchInput.id = "search-bar-input";
    searchInput.type = "text";
    searchInput.placeholder = searchPlaceholders[Math.floor(Math.random() * searchPlaceholders.length)];

    searchBarElement.append(searchIconContainer, searchInput);

    function generateSuggestionList(suggestionList, searchSuggestions) {
        let toAppend = false;
        let ul = document.getElementById("search-suggestions-list");
        if (!ul) {
            ul = document.createElement("ul");
            ul.id = "search-suggestions-list";
            toAppend = true;
        } /* else {
            ul.querySelectorAll(".search-suggestion-completion").forEach(el => el.remove());
        } */

        suggestionList.forEach(suggestionItem => {
            let li = document.createElement("li");

            switch (suggestionItem.type) {
                case "text":
                    // li.classList.add("search-suggestion-item", "search-suggestion-completion");
                    li.classList.add("search-suggestion-item");

                    let lowerSuggestion = suggestionItem.value.toLowerCase();
                    let highlightIndex = -1;

                    if (lowerSuggestion.startsWith(lowerSearchVal)) {
                        highlightIndex = searchVal.length;
                    }

                    if (highlightIndex != -1 && highlightIndex < suggestionItem.value.length) {
                        let originalPart = suggestionItem.value.substring(0, highlightIndex);
                        let highlightedPart = suggestionItem.value.substring(highlightIndex);
                        li.innerHTML = `${sanitizeInnerHTML(originalPart)}<span class="search-suggestion-highlight">${sanitizeInnerHTML(highlightedPart)}</span>`;
                    } else {
                        li.textContent = suggestionItem.value;
                    }

                    li.addEventListener("click", clickEvent => {
                        clickEvent.stopPropagation();
                        searchVal = suggestionItem.value;
                        searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                    });

                    break;

                case "profile":
                    li.classList.add("search-suggestion-horizontal-container", "flex-centered-row");
                    suggestionItem.value.forEach(site => {
                        let domainSuggestion = document.createElement("div");
                        domainSuggestion.classList.add("search-suggestion-item", "search-suggestion-domain", "flex-centered-row");
                        domainSuggestion.innerHTML = `<p>${sanitizeInnerHTML(site.displayText)}</p>`;

                        let domainImg = document.createElement("img");
                        domainImg.src = `https://s2.googleusercontent.com/s2/favicons?domain=${encodeURI(site.url)}&sz=64`;
                        domainSuggestion.prepend(domainImg);

                        domainSuggestion.addEventListener("click", async clickEvent => {
                            clickEvent.stopPropagation();

                            let matchingProfile = allProfiles.find(x => x.sites.find(y => y.url == site.url));
                            if (matchingProfile) await updateSiteVisits(site.url, matchingProfile, webchestDb);

                            window.location.href = sanitizeURL(site.url);
                        });

                        li.appendChild(domainSuggestion);
                    });

                    break;

                case "domain":
                    li.classList.add("search-suggestion-horizontal-container", "flex-centered-row");

                    suggestionItem.matchedDomains.forEach(domain => {
                        let domainSuggestion = document.createElement("div");
                        domainSuggestion.classList.add("search-suggestion-item", "search-suggestion-domain", "flex-centered-row");
                        domainSuggestion.innerHTML = `<p>${sanitizeInnerHTML(suggestionItem.value + domain)}</p>`;

                        let domainImg = document.createElement("img");
                        domainImg.src = `assets/images/link.svg`;
                        domainSuggestion.prepend(domainImg);

                        domainSuggestion.addEventListener("click", clickEvent => {
                            clickEvent.stopPropagation();
                            window.location.href = `https://${domainSuggestion.textContent}`;
                        });

                        li.appendChild(domainSuggestion);
                    });

                    break;
            }

            ul.appendChild(li);
        });

        if (toAppend) searchSuggestions.appendChild(ul);
    }

    searchInput.addEventListener("input", event => {
        searchVal = event.target.value?.trim();
        if (completionTimeout) clearTimeout(completionTimeout);
        if (completionController) completionController.abort();

        let searchSuggestions;

        if (searchVal != "") {
            if (!hasText) {
                hasText = true;

                let enterText = document.createElement("p");
                enterText.id = "search-bar-input-enter";
                enterText.textContent = "ENTER";
                searchBarElement.appendChild(enterText);

                searchSuggestions = document.createElement("div");
                searchSuggestions.id = "search-bar-suggestion-container";
                searchBarElement.appendChild(searchSuggestions);
            } else {
                searchSuggestions = document.getElementById("search-bar-suggestion-container");
                searchSuggestions.innerHTML = "";
            }

            let suggestionList = [];
            lowerSearchVal = searchVal.toLowerCase();

            if (!searchVal.includes(" ") && searchVal.length > 1 && searchVal.length <= 30) {
                let domainMatch = searchVal.match(/([a-z0-9]+\.)+[a-z]*$/i);
                if (domainMatch?.[0]) {
                    let matchSplit = domainMatch[0].split(".");
                    let basePart = matchSplit.slice(0, -1).join("."), partialExtension = matchSplit[matchSplit.length - 1];
                    let domains = ["com", "ca", "org", "net", "edu", "gov"];
                    if (partialExtension) domains = domains.filter(x => x.startsWith(partialExtension.toLowerCase()));

                    if (domains.length > 0) {
                        suggestionList.unshift({
                            type: "domain",
                            value: `${basePart}.`,
                            partialExtension,
                            matchedDomains: domains,
                        });
                    }
                }
            }
            if (allSites?.length > 0 && searchVal.length >= 3) {
                let siteMatches = allSites.filter(x => x.displayText.toLowerCase().includes(lowerSearchVal) || x.url.includes(lowerSearchVal));
                if (siteMatches.length > 0) suggestionList.unshift({ type: "profile", value: siteMatches });
            }

            if (suggestionList.length > 0) generateSuggestionList(suggestionList, searchSuggestions);

            completionTimeout = setTimeout(async () => {
                if (!IS_LOCAL && searchInput.value.length < 3) return;
                try {
                    completionController = new AbortController();
                    let suggestionsData;
                    try {
                        suggestionsData = await fetchJSON(`https://clients1.google.com/complete/search?client=safari&q=${searchInput.value.replaceAll(" ", "+")}`, {
                            headers: {
                                "Accept": "*/*",
                                "Accept-Language": "en-CA,en-US;q=0.9,en;q=0.8",
                                "Accept-Encoding": "gzip, deflate, br",
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15"
                            },
                            signal: completionController.signal
                        }, false, true);
                    } catch (err) {
                        suggestionsData = null;
                    }
                    if (!suggestionsData) return;

                    let searchCompletions = suggestionsData?.[1]?.map(x => ({ type: "text", value: x[0] })) || [];
                    if (searchCompletions.length > 0) generateSuggestionList(searchCompletions, searchSuggestions);
                    
                    if (!searchSuggestions.innerHTML) {
                        searchSuggestions.innerHTML = "<p class='search-suggestion-filler'>No suggestions found.</p>";
                    }
                } catch (err) {
                    console.log(err);
                }
            }, IS_LOCAL ? 100 : 1200);
        } else {
            hasText = false;
            document.getElementById("search-bar-input-enter")?.remove();
            document.getElementById("search-bar-suggestion-container")?.remove();
            searchInput.placeholder = searchPlaceholders[Math.floor(Math.random() * searchPlaceholders.length)];
        }
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key == "Enter") {
            if (searchVal) {
                if (searchVal.match(/^https?:\/\//i)) {
                    window.location.href = searchVal;
                } else if (searchVal.match(/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i)) {
                    window.location.href = `https://${searchVal}`;
                } else {
                    window.location.href = `${searchEngines[selectedEngine].urlPrefix}${encodeURIComponent(searchVal)}`;
                }
            }
        }
    });

    let searchButtonsContainer = document.getElementById("search-bar-button-container");
    let googleButton = createImgButton(["search-bar-button"], "img", "assets/images/gemini.svg", null, { text: "Gemini", position: "bottom" });
    googleButton.onclick = () => {
        window.location.href = searchVal ? `https://gemini.google.com/app?q=${encodeURIComponent(searchVal)}` : "https://gemini.google.com";
    }
    let msCopilotButton = createImgButton(["search-bar-button"], "img", "assets/images/copilot.svg", null, { text: "Copilot", position: "bottom" });
    msCopilotButton.onclick = () => {
        window.location.href = searchVal ? `https://copilot.microsoft.com?q=${encodeURIComponent(searchVal)}` : "https://copilot.microsoft.com";
    }
    let chatGptButton = createImgButton(["search-bar-button"], "img", "assets/images/chatgpt.svg", null, { text: "ChatGPT", position: "bottom" });
    chatGptButton.onclick = () => {
        window.location.href = searchVal ? `https://chatgpt.com?q=${encodeURIComponent(searchVal)}` : "https://chatgpt.com";
    }
    let deepseekButton = createImgButton(["search-bar-button"], "img", "assets/images/deepseek.svg", null, { text: "DeepSeek", position: "bottom" });
    deepseekButton.onclick = () => {
        if (searchVal) navigator.clipboard.writeText(searchVal);
        window.location.href = "https://chat.deepseek.com";
    }
    searchButtonsContainer.append(googleButton, msCopilotButton, chatGptButton, deepseekButton);
}

function generateSiteDetail(source, text, type, webchestDb, profileData) {
    let siteDetailContainer = document.createElement("div");
    siteDetailContainer.classList.add("webchest-site-details", "centered-div");

    let siteDetailImg = document.createElement("img");
    if (source.startsWith("http")) {
        siteDetailImg.src = `https://s2.googleusercontent.com/s2/favicons?domain=${encodeURI(source)}&sz=256`;
        siteDetailImg.dataset.url = source;
    } else {
        siteDetailImg.src = source;
    }
    siteDetailImg.draggable = false;

    let siteDetailText = document.createElement("p");
    siteDetailText.textContent = text;

    switch (type) {
        case "add":
            siteDetailContainer.appendChild(siteDetailImg);
            siteDetailContainer.appendChild(siteDetailText);
            return [siteDetailContainer, siteDetailImg];

        case "temporary":
            siteDetailContainer.classList.add("webchest-site-details-addtemp");
            siteDetailText.classList.add("webchest-site-details-text-addtemp");
            siteDetailContainer.appendChild(siteDetailImg);
            siteDetailContainer.appendChild(siteDetailText);
            return [siteDetailContainer, siteDetailImg];

        case "site-sync":
            siteDetailContainer.classList.add("dimensional-button");
            siteDetailContainer.title = source;
            generateActualSite(siteDetailContainer, siteDetailImg, true, webchestDb, profileData);
            siteDetailContainer.appendChild(siteDetailImg);
            siteDetailContainer.appendChild(siteDetailText);
            return [siteDetailContainer, siteDetailImg];

        case "site-async":
            return new Promise(async resolve => {
                siteDetailContainer.classList.add("dimensional-button");
                siteDetailContainer.title = source;
                await generateActualSite(siteDetailContainer, siteDetailImg, true, webchestDb, profileData);
                siteDetailContainer.appendChild(siteDetailImg);
                siteDetailContainer.appendChild(siteDetailText);
                resolve([siteDetailContainer, siteDetailImg]);
            });
    }
}

function generateActualSite(siteDetailContainer, siteDetailImg, requireImgLoad, webchestDb, profileData) {
    siteDetailContainer.classList.add("webchest-site-details-bg");

    return new Promise(resolve => {
        siteDetailContainer.addEventListener("click", async () => {
            let url = siteDetailImg.dataset.url;
            if (!url) return;

            if (!profileData) {
                window.location.href = sanitizeURL(url);
                return;
            }

            await updateSiteVisits(url, profileData, webchestDb);
            window.location.href = sanitizeURL(url);
        });

        const applyDominantColor = () => {
            let imgColor = extractDominantColor(siteDetailImg, [19, 31, 36]);
            let siteIndex = profileData.sites.findIndex(site => site.url == siteDetailImg.dataset.url);
            if (imgColor) {
                siteDetailContainer.style.setProperty("--site-bg-color", imgColor[0].join(", "));

                if (siteIndex != -1 && profileData.sites[siteIndex].bgColor != imgColor[0].join(", ")) {
                    profileData.sites[siteIndex].bgColor = imgColor[0].join(", ");
                    profileData.sites[siteIndex].bgColorUpdated = true;
                }
            } else if (profileData.sites[siteIndex].bgColor) {
                siteDetailContainer.style.setProperty("--site-bg-color", profileData.sites[siteIndex].bgColor);
            }
            resolve();
        };

        if (requireImgLoad) {
            siteDetailImg.onload = () => applyDominantColor();
        } else {
            applyDominantColor();
        }

        /*
        siteDetailContainer.addEventListener("click", async () => {
            let url = siteDetailImg.dataset.url;
            if (!url) return;
    
            window.open(url, "_blank");
    
            let profileCard = siteDetailContainer.parentElement?.parentElement;
            if (!profileCard || !profileCard.classList.contains("webchest-profile-card")) profileCard = null;
            if (profileCard && !profileData) profileData = JSON.parse(profileCard.dataset.profile);
            if (!profileData) return;
    
            let siteIndex = profileData.sites.findIndex(site => site.url == url);
            if (siteIndex == -1) return;
    
            let now = new Date();
            let hourKey = now.getHours().toString(), dayOfWeek = now.getDay();
    
            let visitType = (dayOfWeek == 0 || dayOfWeek == 6) ? "weekends" : "weekdays";
            profileData.sites[siteIndex].visits[visitType][hourKey] = (profileData.sites[siteIndex].visits[visitType][hourKey] || 0) + 1;
    
            if (profileCard) profileCard.dataset.profile = JSON.stringify(profileData);
            await saveDatabase(webchestDb, "webchest_os", [profileData], false);
        });
        */
    });
}

async function updateSiteVisits(url, profileData, webchestDb) {
    let siteIndex = profileData.sites.findIndex(site => site.url == url);
    if (siteIndex == -1) return;

    let now = new Date();
    let hourKey = now.getHours().toString(), dayOfWeek = now.getDay();
    let visitType = (dayOfWeek == 0 || dayOfWeek == 6) ? "weekends" : "weekdays";

    profileData.sites[siteIndex].visits[visitType][hourKey] = (profileData.sites[siteIndex].visits[visitType]?.[hourKey] || 0) + 1;
    await saveDatabase(webchestDb, "webchest_os", [profileData], false);
}

async function updateSiteColors(profiles, webchestDb) {
    let profilesToUpdate = [];
    for (let profileData of profiles) {
        let bgColorUpdated = profileData.sites.filter(x => x.bgColorUpdated);
        if (bgColorUpdated.length == 0) continue;
        bgColorUpdated.forEach(x => delete x.bgColorUpdated);
        profilesToUpdate.push(profileData);
    }
    if (profilesToUpdate.length > 0) await saveDatabase(webchestDb, "webchest_os", profilesToUpdate, false);
}

function createSuggestionGroup(data, isWebchest) {
    let suggestionGroupFound = document.getElementById(`timely-suggested-group-${data.type}`);
    if (suggestionGroupFound) return [suggestionGroupFound, suggestionGroupFound.lastElementChild];

    let suggestionGroup = document.createElement("div");
    suggestionGroup.id = `timely-suggested-group-${data.type}`;
    suggestionGroup.classList.add("timely-suggested-group", "centered-div");

    if (!isWebchest) {
        let suggestionGroupTitle = document.createElement("p");
        suggestionGroupTitle.classList.add("timely-suggested-group-title");
        suggestionGroupTitle.textContent = data.type.toUpperCase();
        suggestionGroup.appendChild(suggestionGroupTitle);
    }

    let suggestionContent = document.createElement("div");
    suggestionContent.classList.add("timely-suggested-group-content");
    suggestionGroup.appendChild(suggestionContent);

    return [suggestionGroup, suggestionContent];
}

function createNotificationBtn(imgType, imgSrc, notifText, notifUrl) {
    let notificationButton = createImgTextDiv([["timely-notification-button", "centered-div", "dimensional-button"], ["timely-notification-img"], ["timely-notification-text"]], [null, null, null], imgType, imgSrc, null, "p", notifText, notifUrl);
    let notificationDismiss = document.createElement("p");
    notificationDismiss.classList.add("timely-notification-dismiss", "centered-div");
    notificationDismiss.textContent = "X";

    notificationButton.appendChild(notificationDismiss);
    return [notificationButton, notificationDismiss];
}

function createAssignmentBtn(btnText, assignment, lookaheadData, newKey, seenKey, db, suggestionGroup, suggestionContent) {
    let [assignmentButton, assignmentDismiss] = createNotificationBtn("img", "assets/images/assignment.svg", btnText + assignment.title, assignment.url);
    assignmentDismiss.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();

        lookaheadData[seenKey].push(assignment.id);
        lookaheadData[newKey] = lookaheadData[newKey].filter(y => y.id != assignment.id);
        await saveDatabase(db, "lookahead_os", [lookaheadData], true);

        assignmentButton.remove();
        if (!suggestionContent.children.length) suggestionGroup.remove();
    });

    if (!suggestionGroup) [suggestionGroup, suggestionContent] = createSuggestionGroup({ type: "notifications" }, false);
    suggestionContent.appendChild(assignmentButton);

    return [suggestionGroup, suggestionContent];
}

function loadTimelySuggestions(parent, isWebchest, titleText, suggestionsData) {
    let container = document.createElement("div");
    container.id = "timely-suggested-container";
    container.classList.add("glass-container", "flex-centered-row");

    let headerContainer = document.createElement("div");
    let header = createImgTextDiv([["flex-centered-row"], [], []], ["timely-suggested-header", null, "timely-suggested-title"], "svg", createIntelligentSvg("28"), null, "h3", titleText, null);

    let now = new Date();
    let currentHour = now.getHours();
    let hourWindow = [((currentHour - 1) + 24) % 24, currentHour, (currentHour + 1) % 24].map(x => x.toString());
    let dayOfWeek = now.getDay();
    let visitType = (dayOfWeek == 0 || dayOfWeek == 6) ? "weekends" : "weekdays";

    let timeText = document.createElement("p");
    timeText.id = "timely-suggested-time";
    timeText.textContent = `${visitType.charAt(0).toUpperCase() + visitType.slice(1)} | ${now.toLocaleString('en-US', { hour: 'numeric', hour12: true })}`;

    headerContainer.append(header, timeText);
    container.appendChild(headerContainer);

    let groupContainer = document.createElement("div");
    groupContainer.id = "timely-suggested-group-container";
    groupContainer.classList.add("flex-centered-row");
    if (!isWebchest) groupContainer.classList.add("thin-horizontal-scrollbar");

    let timerInterval;

    suggestionsData.forEach(data => {
        let suggestionGroup, suggestionContent;

        switch (data.type) {
            case "notifications":
                if (data.content[0].settings.reminders.dailyEnabled && (data.content[0].settings.reminders.am.time != null || data.content[0].settings.reminders.pm.time != null)) {
                    let now = new Date(), nowDecimal = dateToDecimal(now), nowNum = parseInt(getConcatDateStr(now));
                    let reminderButton, reminderKey, reminderDismiss;

                    if (data.content[0].settings.reminders.am.time != null && nowDecimal - data.content[0].settings.reminders.am.time >= 0 && nowDecimal < 12 && nowNum > data.content[0].settings.reminders.am.dismissedAt) {
                        reminderKey = "am";
                        [reminderButton, reminderDismiss] = createNotificationBtn("img", "assets/images/book.svg", "List some to-do tasks for today", "todo.html");
                    } else if (data.content[0].settings.reminders.pm.time != null && nowDecimal - data.content[0].settings.reminders.pm.time >= 0 && nowDecimal < 24 && nowNum > data.content[0].settings.reminders.pm.dismissedAt) {
                        reminderKey = "pm";
                        [reminderButton, reminderDismiss] = createNotificationBtn("img", "assets/images/book.svg", "Review your to-do tasks for today", "todo.html");
                    }

                    if (reminderButton) {
                        reminderDismiss.addEventListener("click", async event => {
                            event.preventDefault();
                            event.stopPropagation();

                            data.content[0].settings.reminders[reminderKey].dismissedAt = nowNum;
                            await saveDatabase(data.db[0], "todo_os", [data.content[0]], true);

                            reminderButton.remove();
                            if (!suggestionContent.children.length) suggestionGroup.remove();
                        });

                        [suggestionGroup, suggestionContent] = createSuggestionGroup(data, isWebchest);
                        suggestionContent.appendChild(reminderButton);
                    }
                }

                if (data.content[1].newAssignments?.length > 0) {
                    data.content[1].newAssignments.forEach(x => {
                        [suggestionGroup, suggestionContent] = createAssignmentBtn("Assignment posted: ", x, data.content[1], "newAssignments", "seenAssignments", data.db[1], suggestionGroup, suggestionContent);
                    });
                }
                if (data.content[1].newGraded?.length > 0) {
                    data.content[1].newGraded.forEach(x => {
                        [suggestionGroup, suggestionContent] = createAssignmentBtn("Assignment graded: ", x, data.content[1], "newGraded", "seenGraded", data.db[1], suggestionGroup, suggestionContent);
                    });
                }

                break;

            case "sites":
                let sitesMap = new Map();

                data.content.forEach(profile => {
                    if (!profile.sites || profile.sites.length == 0) return;

                    profile.sites.forEach(site => {
                        let visits = hourWindow.reduce((acc, hour) => acc + (site.visits?.[visitType]?.[hour] || 0), 0);

                        if (visits > 0) {
                            let siteKey = site.url;
                            if (sitesMap.has(siteKey)) {
                                let existingSite = sitesMap.get(siteKey);
                                existingSite.visits += visits;
                            } else {
                                sitesMap.set(siteKey, {
                                    url: site.url,
                                    displayText: site.displayText,
                                    visits: visits,
                                    parentProfile: profile,
                                });
                            }
                        }
                    });
                });

                let suggestedSites = Array.from(sitesMap.values()).sort((a, b) => b.visits - a.visits).slice(0, 3);

                if (suggestedSites.length > 0) {
                    [suggestionGroup, suggestionContent] = createSuggestionGroup(data, isWebchest);
                    suggestionContent.id = "timely-suggested-sites";
                    suggestionContent.style.display = "grid";
                    suggestionContent.style.gridTemplateColumns = `repeat(${suggestedSites.length}, 7.2em)`;
                    suggestionContent.style.columnGap = "20px";

                    suggestedSites.forEach(site => {
                        let siteDetail = generateSiteDetail(site.url, site.displayText, "site-sync", data.db, site.parentProfile)[0];
                        siteDetail.classList.add("timely-site-suggestion");
                        suggestionContent.appendChild(siteDetail);
                    });
                }

                break;

            case "focus timer":
                switch (data.content.state) {
                    case "paused":
                        if (data.content.timeRemaining > 0) {
                            [suggestionGroup, suggestionContent] = createSuggestionGroup(data, isWebchest);
                            suggestionContent.appendChild(createBorderedTimer(["timely-suggested-timer", "timely-suggested-timer-text"], data.content.timeRemaining, data.content.timeSet, data.content.settings.showSeconds, "timely-suggested-timer-svg", ["timely-suggested-timer-border-elapsed", "timely-suggested-timer-border-remaining"], "5", "255, 150, 0", false));
                        }
                        break;

                    case "timing":
                        if (data.content.endAt != -1) {
                            let timeDelta = Math.round((data.content.endAt - new Date().getTime()) / 1000);
                            if (timeDelta > 0) {
                                [suggestionGroup, suggestionContent] = createSuggestionGroup(data, isWebchest);
                                suggestionContent.appendChild(createBorderedTimer(["timely-suggested-timer", "timely-suggested-timer-text"], timeDelta, data.content.timeSet, data.content.settings.showSeconds, "timely-suggested-timer-svg", ["timely-suggested-timer-border-elapsed", "timely-suggested-timer-border-remaining"], "5", "28, 176, 246", true));
                                timerInterval = setInterval(() => {
                                    timeDelta--;

                                    if (timeDelta == 0) {
                                        clearInterval(timerInterval);
                                        document.getElementById("timely-suggested-timer").remove();
                                        suggestionGroup?.remove();
                                    } else {
                                        document.getElementById("timely-suggested-timer-text").textContent = parseHMS(secondsToHMS(timeDelta), data.content.settings.showSeconds);
                                    }
                                }, 1000);
                            }
                        }
                        break;
                }

                break;
        }

        if (suggestionGroup) groupContainer.appendChild(suggestionGroup);
    });

    if (groupContainer.children.length > 0) {
        groupContainer.style.height = "120px";
        container.appendChild(groupContainer);
    } else {
        container.innerHTML += "<p>No suggestions available for the current time.</p>";
    }

    if (!isWebchest) {
        parent.appendChild(container);
    } else {
        container.classList.add("flex-split-row-grow");
        parent.prepend(container);
    }

    return timerInterval;
}

/*
function generateColorPicker(colors, columns, selectedColor, callback) {
    let pickerTable = document.createElement("table");
    pickerTable.classList.add("color-picker-table");
    pickerTable.addEventListener("click", e => e.stopPropagation());

    let currentRow;

    currentRow = pickerTable.insertRow();
    let titleCell = currentRow.insertCell();
    titleCell.colSpan = columns;
    titleCell.classList.add("color-picker-title");
    titleCell.textContent = "PICK COLOR";

    colors.forEach((color, index) => {
        if (index % columns == 0) {
            currentRow = pickerTable.insertRow();
        }

        let cell = currentRow.insertCell();
        cell.style.setProperty("--cell-rgb", color == "" ? "transparent" : color);
        cell.classList.add("color-picker-cell");
        if (color == selectedColor) cell.classList.add("color-picker-cell-selected");

        cell.addEventListener("click", event => {
            event.stopPropagation();

            pickerTable.querySelector(".color-picker-cell-selected")?.classList.remove("color-picker-cell-selected");
            cell.classList.add("color-picker-cell-selected");

            if (callback != null) callback(color);
        });
    });

    return pickerTable;
}
*/

function generateColorPicker(selectedColor, callback) {
    let pickerInput = document.createElement("input");
    pickerInput.type = "color";
    pickerInput.classList.add("color-picker-input");
    pickerInput.value = rgbToHex(selectedColor);

    pickerInput.addEventListener("input", event => {
        let newRgbColor = hexToRgb(event.target.value);
        if (callback) callback(newRgbColor);
    });

    return pickerInput;
}

function generatePieChart(segments, totalVal, fillerColor) {
    let gradientStops = [], currPercent = 0;

    if (segments.length > 0) {
        for (let segment of segments) {
            let addPercent = segment.value / totalVal * 100;
            let nextPercent = Math.min(currPercent + addPercent, 100);
            gradientStops.push(`${segment.color} ${currPercent}% ${nextPercent}%`);
            currPercent = nextPercent;
        }
    }
    if (currPercent < 100) {
        gradientStops.push((fillerColor ? `rgb(${fillerColor})` : "transparent") + ` ${currPercent}% 100%`);
    }

    return `conic-gradient(${gradientStops.join(", ")})`;
}

function generateDaySummary(filteredEntries, dateStr, summaryType, forceSunRecalc) {
    let dayBarContainer = document.getElementById("day-bar-container");
    dayBarContainer.innerHTML = "";

    let dayBar = document.createElement("div");
    dayBar.id = "day-bar";

    let now = new Date();
    let currentHour = dateToDecimal(now), currentDate = getConcatDateStr(now);

    const generateDayElement = (time, className, label) => {
        let dayElement = document.createElement("div");
        dayElement.classList.add(className);
        if (label) {
            dayElement.classList.add("hover-label");
            dayElement.dataset.label = label;
            dayElement.dataset.position = "top";
        }

        let percentagePos = (time / 24) * 100;
        dayElement.style.left = `calc(${percentagePos}% - 2px)`;
        return dayElement;
    }

    if (filteredEntries?.length > 0) {
        let categories = [{ name: "Tasks", color: "#49bff9" }, { name: "Personal", color: "#46f7e7" }, { name: "School", color: "#da954b" }, { name: "Work", color: "#9dc386" }, { name: "Hobby", color: "#d08370" }, { name: "Vacation", color: "#a6c5e3" }];
        filteredEntries.forEach(entry => {
            let dayElement = generateDayElement(entry.time, "day-bar-etch", `${decimalToTime(entry.time, "str")}\n${entry.name}`);
            dayElement.style.backgroundColor = !entry.done ? `rgb(${getTodoColor(entry.time, parseInt(dateStr), currentHour, parseInt(currentDate))})` : `#58CC02`;
            dayElement.style.setProperty("--category-color", categories.find(x => x.name == entry.category).color);
            dayBar.appendChild(dayElement);
        });
    }

    if (currentDate == dateStr) {
        dayBar.appendChild(generateDayElement(currentHour, "day-bar-arrow", null));
    }

    let dayBarAxis = document.createElement("div");
    dayBarAxis.id = "day-bar-axis-container";
    let moonAxis = document.createElement("div");
    moonAxis.classList.add("day-bar-moon-axis");
    let sunAxis = document.createElement("div");
    sunAxis.classList.add("day-bar-sun-axis");
    let sixAxis = document.createElement("div");
    sixAxis.classList.add("day-bar-six-axis");
    let minorAxis = document.createElement("div");
    minorAxis.classList.add("day-bar-minor-axis");
    dayBarAxis.append(
        moonAxis,
        ...Array.from({ length: 5 }, () => minorAxis.cloneNode()),
        sixAxis.cloneNode(),
        ...Array.from({ length: 5 }, () => minorAxis.cloneNode()),
        sunAxis,
        ...Array.from({ length: 5 }, () => minorAxis.cloneNode()),
        sixAxis.cloneNode(),
        ...Array.from({ length: 5 }, () => minorAxis.cloneNode()),
        moonAxis.cloneNode()
    );

    let dayBarIcons = document.createElement("div");
    dayBarIcons.id = "day-bar-icon-container";
    let moonImg = document.createElement("img");
    moonImg.classList.add("day-bar-icon");
    moonImg.draggable = false;
    moonImg.src = "assets/images/moon.svg";
    let sunImg = document.createElement("img");
    sunImg.classList.add("day-bar-icon");
    sunImg.draggable = false;
    sunImg.src = "assets/images/sun.svg";
    dayBarIcons.append(moonImg, sunImg, moonImg.cloneNode());

    let dayBarLabels = document.createElement("div");
    dayBarLabels.id = "day-bar-labels";
    dayBarLabels.classList.add("flex-column");
    dayBarLabels.append(dayBarAxis, dayBarIcons);

    let sunTimes = calculateSunRiseSet(dateStr, forceSunRecalc, currentDate == dateStr);
    if (sunTimes.riseTime && sunTimes.setTime) {
        let risePercent = sunTimes.riseTime / 1440 * 100;
        let setPercent = sunTimes.setTime / 1440 * 100;
        let dayPercent = setPercent - risePercent;
        let solarNoon = risePercent + 5 + (setPercent - risePercent - 10) / 2;

        dayBar.style.background = `linear-gradient(to right, #100150 0%, #100150 ${(risePercent - 1) / 2}%, #fe1e73 ${risePercent - 1}%, #fca474 ${risePercent}%, #74bcfc ${risePercent + 0.1 * dayPercent}%, #0874fc ${solarNoon - 0.1 * dayPercent}%, #0874fc ${solarNoon + 0.1 * dayPercent}%, #74bcfc ${setPercent - 0.1 * dayPercent}%, #fca474 ${setPercent}%, #fe1e73 ${setPercent + 1}%, #100150 ${setPercent + 1 + (100 - setPercent + 1) / 2}%, #100150 100%)`;
    }

    dayBarContainer.append(dayBar, dayBarLabels);


    let summaryContainer = document.getElementById("todo-summary-container");

    let overdue, nextHour, nextQuarter, done, allToday, percentComplete = "";

    if (filteredEntries?.length > 0) {
        let dateNum = parseInt(dateStr);

        if (currentDate == dateNum) {
            overdue = filteredEntries.filter(x => !x.done && x.time < currentHour).length;
            nextHour = filteredEntries.filter(x => !x.done && x.time >= currentHour && x.time <= currentHour + 1).length;
            nextQuarter = filteredEntries.filter(x => !x.done && x.time > currentHour + 1 && x.time <= currentHour + 6).length;
        } else {
            nextHour = 0;
            nextQuarter = 0;
            overdue = dateNum < currentDate ? filteredEntries.filter(x => !x.done).length : 0;
        }
        done = filteredEntries.filter(x => x.done).length;

        allToday = `<span style="color: #58CC02;">${done}</span> / ${filteredEntries.length}`;
        percentComplete = `${Math.floor(done / filteredEntries.length * 100)}% `;
    } else {
        overdue = 0;
        nextHour = 0;
        nextQuarter = 0;
        done = 0;
        allToday = "0";
    }

    switch (summaryType) {
        case "large":
            summaryContainer.innerHTML = "";
            summaryContainer.style.height = "fit-content";
            summaryContainer.style.flexDirection = "row";
            summaryContainer.style.columnGap = "15px";
            summaryContainer.style.padding = "10px 20px";

            let verticalDiv = document.createElement("div");
            verticalDiv.classList.add("vertical-divider");

            summaryContainer.append(
                generateStatGroup(["todo-summary-group-large"], "#ff7272", [overdue.toString(), "todo-summary-stat-val-large"], ["Overdue", "todo-summary-stat-label"]),
                verticalDiv,
                generateStatGroup(["todo-summary-group-large"], "#ffbd72", [nextHour.toString(), "todo-summary-stat-val-large"], ["Next hour", "todo-summary-stat-label"]),
                verticalDiv.cloneNode(),
                generateStatGroup(["todo-summary-group-large"], "#fff172", [nextQuarter.toString(), "todo-summary-stat-val-large"], ["Next 1/4 day", "todo-summary-stat-label"]),
                verticalDiv.cloneNode(),
                generateStatGroup(["todo-summary-group-large"], "#afafaf", [allToday, "todo-summary-stat-val-large"], [`${percentComplete}Done`, "todo-summary-stat-label"])
            );

            break;

        case "compact":
            summaryContainer.style.padding = "10px 20px";
            summaryContainer.style.height = "144px";

            const generateSummaryText = () => {
                summaryContainer.innerHTML = "";
                summaryContainer.classList.remove("centered-div");

                let statDiv = document.createElement("div");
                statDiv.style.display = "flex";
                statDiv.style.flexDirection = "column";
                statDiv.style.rowGap = "5px";
                statDiv.style.animation = "fade-in 0.5s linear forwards";

                statDiv.append(
                    generateStatGroup(["todo-summary-group-compact", "flex-centered-row"], "#ff7272", [overdue.toString(), "todo-summary-stat-val-compact"], ["Overdue", "todo-summary-stat-label"]),
                    generateStatGroup(["todo-summary-group-compact", "flex-centered-row"], "#ffbd72", [nextHour.toString(), "todo-summary-stat-val-compact"], ["Next hour", "todo-summary-stat-label"]),
                    generateStatGroup(["todo-summary-group-compact", "flex-centered-row"], "#fff172", [nextQuarter.toString(), "todo-summary-stat-val-compact"], ["Next 1/4 day", "todo-summary-stat-label"]),
                    generateStatGroup(["todo-summary-group-compact", "flex-centered-row"], "#afafaf", [allToday, "todo-summary-stat-val-compact"], [`${percentComplete}Done`, "todo-summary-stat-label"])
                );
                summaryContainer.appendChild(statDiv);
            }

            const generateSummaryPie = animate => {
                summaryContainer.innerHTML = "";
                summaryContainer.classList.add("centered-div");

                let summaryPie = document.createElement("div");
                summaryPie.id = "todo-summary-pie";

                if (filteredEntries.length > 0) {
                    let segments = [
                        { color: "#58CC02", value: done },
                        { color: "#ff7272", value: overdue },
                        { color: "#ffbd72", value: nextHour },
                        { color: "#fff172", value: nextQuarter },
                    ].filter(segment => segment.value > 0);
                    summaryPie.style.backgroundImage = generatePieChart(segments, filteredEntries.length, "114, 220, 255");
                }

                let summaryText = document.createElement("div");
                summaryText.id = "todo-summary-pie-text";
                summaryText.classList.add("centered-div");
                summaryText.innerHTML = `<p style='font-family: "Din Round Bold"; font-size: 28px;'>${filteredEntries.length}</p><p style='font-size: 16px; color: #b4b4b4;'>TASK${filteredEntries.length != 1 ? "S" : ""}</p>`

                summaryPie.appendChild(summaryText);
                if (animate) summaryPie.style.animation = "fade-in 0.5s linear forwards";
                summaryContainer.appendChild(summaryPie);
            }

            generateSummaryPie(false);

            summaryContainer.addEventListener("mouseenter", () => {
                generateSummaryText();
            });
            summaryContainer.addEventListener("mouseleave", () => {
                generateSummaryPie(true);
            });

            break;
    }
}

function getTodoColor(taskTimeDecimal, taskDateInteger, currentTimeDecimal, currentDateInteger) {
    if (taskDateInteger < currentDateInteger) return "255, 114, 114";
    if (taskDateInteger > currentDateInteger) return "114, 220, 255";
    return taskTimeDecimal < currentTimeDecimal ? "255, 114, 114" : taskTimeDecimal - currentTimeDecimal <= 1 ? "255, 189, 114" : taskTimeDecimal - currentTimeDecimal <= 6 ? "255, 241, 114" : "114, 220, 255";
}

function enableDropdown(panelId, contentId) {
    let collapsed = true;

    let panelHeader = document.getElementById(panelId);
    let arrow = createArrowSvg("28", "right");
    arrow.classList.add("right-panel-arrow");

    let content = document.getElementById(contentId);

    arrow.addEventListener("click", () => {
        collapsed = !collapsed;

        if (collapsed) {
            arrow.querySelector("path").setAttribute("d", "M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z");
            content.style.display = "none";
        } else {
            arrow.querySelector("path").setAttribute("d", "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z");
            content.style.display = "flex";
        }
    });

    panelHeader.prepend(arrow);
}

function createOverlay(windowId) {
    let overlay = document.createElement("div");
    overlay.classList.add("content-overlay", "centered-div");

    let window = document.createElement("div");
    window.id = windowId;
    window.classList.add("content-overlay-window", "glass-container", "flex-column");

    return [overlay, window];
}

function createBorderedTimer(timerIds, timeRemaining, timeSet, showSeconds, svgId, borderIds, strokeWidth, borderColor, animate) {
    let timerDisplay = document.createElement("div");
    timerDisplay.id = timerIds[0];
    timerDisplay.classList.add("centered-div");

    let timeText = document.createElement("p");
    timeText.id = timerIds[1];
    timeText.classList.add("centered-div");
    timeText.textContent = parseHMS(secondsToHMS(timeRemaining), showSeconds);

    let svg = createSvgElement("svg", {
        id: svgId,
        viewBox: "0 0 100 100",
        fill: "none",
    });

    let borderProps = {
        cx: "50%",
        cy: "50%",
        r: "45",
        "stroke-width": strokeWidth,
    };
    let borderElapsed = createSvgElement("circle", {
        id: borderIds[0],
        ...borderProps,
        stroke: `rgba(${borderColor}, 0.3)`,
    });
    let borderRemaining = createSvgElement("circle", {
        id: borderIds[1],
        ...borderProps,
        stroke: `rgb(${borderColor})`,
        "stroke-dasharray": "283",
        "stroke-dashoffset": ((1 - timeRemaining / timeSet) * 283).toString(),
    });
    
    borderRemaining.style.transform = "rotate(-90deg)";
    borderRemaining.style.transformOrigin = "center center";
    if (animate) {
        borderRemaining.style.setProperty("--timer-border-remaining", (1 - timeRemaining / timeSet) * 283);
        borderRemaining.style.animation = `timer-border-fill ${timeRemaining}s linear forwards`;
    }

    svg.append(borderElapsed, borderRemaining);
    timerDisplay.append(timeText, svg);

    return timerDisplay;
}

async function checkTimerBreak(timerDb, checkTimeout) {
    if (!timerDb) timerDb = await openDatabase(["timer_db", 4], ["timer_os", "key"], ["timeSet", "timeRemaining", "endAt", "state", "sessionData", "settings"]);

    let timerData = await readDatabase(timerDb, "timer_os", "main");
    if (!timerData || (timerData.endAt == -1 && timerData.sessionData.breakStarted == -1)) return;

    let now = new Date();

    if (timerData.endAt != -1) {
        let timeDiff = now.getTime() - timerData.endAt;
        if (timeDiff < 0) {
            if (checkTimeout) {
                setTimeout(() => {
                    displayBreakOverlay(timerData, timerDb, null);
                }, Math.abs(timeDiff));
            }
        } else {
            displayBreakOverlay(timerData, timerDb, null);
        }
    } else if (timerData.sessionData.breakStarted != -1) {
        let timeDiff = Math.round((now.getTime() - timerData.sessionData.breakStarted) / 1000);
        if (timeDiff <= 300) {
            displayBreakOverlay(timerData, timerDb, timeDiff);
        } else {
            await updateBreakStats(timerData, timerDb);
        }
    }
}

function displayBreakOverlay(timerData, timerDb, timeDiff) {
    let breakOverlay = document.createElement("div");
    breakOverlay.id = "timer-break-overlay";
    breakOverlay.classList.add("content-overlay", "centered-div");
    breakOverlay.addEventListener("click", event => {
        event.stopPropagation();
    });

    let breakWindow = document.createElement("div");
    breakWindow.id = "timer-break-window";
    breakWindow.classList.add("content-overlay-window", "glass-container", "flex-column");

    let breakTopRow = document.createElement("div");
    breakTopRow.id = "timer-break-top-row";
    breakTopRow.classList.add("flex-split-row");

    let breakTitle = document.createElement("h3");
    breakTitle.id = "timer-break-title";
    breakTitle.textContent = "Time for a break!";

    breakTopRow.appendChild(breakTitle);

    if (!timeDiff) {
        let breakStartButton = document.createElement("div");
        breakStartButton.id = "timer-break-start";
        breakStartButton.classList.add("centered-div", "dimensional-button");
        let breakStartImg = document.createElement("img");
        breakStartImg.id = "timer-break-start-img";
        breakStartImg.src = "assets/images/play.svg";
        let breakStartText = document.createElement("p");
        breakStartText.textContent = "Start break";
        breakStartButton.append(breakStartImg, breakStartText);
        breakStartButton.addEventListener("click", async () => {
            timerData.endAt = -1;
            timerData.sessionData.breakStarted = new Date().getTime();
            await saveDatabase(timerDb, "timer_os", [timerData], false);

            breakStartButton.remove();
            setupBreakTimer(300, timerData, timerDb, breakTopRow, breakOverlay);
        });

        breakTopRow.appendChild(breakStartButton);
    } else {
        setupBreakTimer(300 - timeDiff, timerData, timerDb, breakTopRow, breakOverlay);
    }

    let breakStats = calculateBreakStats(timerData);

    let breakStatsContainer = document.createElement("div");
    breakStatsContainer.id = "timer-break-stats";
    breakStatsContainer.classList.add("flex-column");
    let breakStatsTitle = document.createElement("div");
    breakStatsTitle.id = "timer-break-stats-title";
    breakStatsTitle.innerHTML = "<h3>Focus session stats</h3>";
    let breakStatsLegend = document.createElement("div");
    breakStatsLegend.innerHTML = generateModifiedStat("Current", "One more break", "88, 204, 2");
    breakStatsTitle.appendChild(breakStatsLegend);
    let breakStatsGroup = document.createElement("div");
    breakStatsGroup.id = "timer-break-stats-groups";
    breakStatsGroup.classList.add("flex-centered-row");
    let verticalDiv = document.createElement("div");
    verticalDiv.classList.add("vertical-divider");
    breakStatsGroup.append(
        generateStatGroup(["timer-break-stat-group"], "#ffffff", [generateModifiedStat(timerData.sessionData.totalSessions, timerData.sessionData.totalSessions + 1, "88, 204, 2"), "timer-break-stat-val"], ["Sessions to date", "timer-break-stat-label"]),
        verticalDiv,
        generateStatGroup(["timer-break-stat-group"], "#ffffff", [generateModifiedStat(breakStats.weeklyAvg.toFixed(2), (breakStats.weeklyAvg + 1/7).toFixed(2), "88, 204, 2"), "timer-break-stat-val"], ["7-day rolling average", "timer-break-stat-label"]),
        verticalDiv.cloneNode(),
        generateStatGroup(["timer-break-stat-group"], "#ffffff", [generateModifiedStat((breakStats.weekVsMonth > 0 ? "+" : "") + `${breakStats.weekVsMonth}%`, (breakStats.newWeekVsMonth > 0 ? "+" : "") + `${breakStats.newWeekVsMonth}%`, "88, 204, 2"), "timer-break-stat-val"], ["7-day vs 28-day average", "timer-break-stat-label"]),
    );
    breakStatsContainer.append(breakStatsTitle, breakStatsGroup);

    breakWindow.append(breakTopRow, breakStatsContainer);
    breakOverlay.appendChild(breakWindow);
    document.body.appendChild(breakOverlay);

    if (!IS_LOCAL && Notification.permission == "granted") {
        try {
            new Notification("Time for a break!", { body: "Your focus timer has ended." });
        } catch {
            console.log("Failed to show timer break notification");
        }
    }
}

function setupBreakTimer(breakRemaining, timerData, timerDb, breakTopRow, breakOverlay) {
    const BREAK_TOTAL = 300;

    let breakTimer = createBorderedTimer(["timer-break-timer", "timer-break-timer-text"], breakRemaining, BREAK_TOTAL, true, "timer-break-timer-svg", ["timer-break-border-elapsed", "timer-break-border-remaining"], "5", "88, 204, 2", true);
    breakTopRow.appendChild(breakTimer);

    let breakInterval = setInterval(async () => {
        breakRemaining--;

        if (breakRemaining == 0) {
            clearInterval(breakInterval);
            breakOverlay.remove();
            await updateBreakStats(timerData, timerDb);
        } else {
            document.getElementById("timer-break-timer-text").textContent = parseHMS(secondsToHMS(breakRemaining), true);
        }
    }, 1000);
}

function calculateBreakStats(timerData) {
    let nowStr = getConcatDateStr(new Date());
    let today = Object.keys(timerData.sessionData.recentSessions).filter(x => nowStr == x).map(x => timerData.sessionData.recentSessions[x]).reduce((a, b) => a + b, 0);
    let weeklyAvg = Object.keys(timerData.sessionData.recentSessions).filter(x => getDaysBetween(nowStr, x, "str") < 7).map(x => timerData.sessionData.recentSessions[x]).reduce((a, b) => a + b, 0) / 7;
    let monthlyAvg = Object.keys(timerData.sessionData.recentSessions).filter(x => getDaysBetween(nowStr, x, "str") < 28).map(x => timerData.sessionData.recentSessions[x]).reduce((a, b) => a + b, 0) / 28;
    let weekVsMonth = Math.round((weeklyAvg - monthlyAvg) / monthlyAvg * 100), newWeekVsMonth = Math.round((weeklyAvg + 1 / 7 - monthlyAvg - 1 / 28) / (monthlyAvg + 1 / 28) * 100);
    return {today, weeklyAvg, weekVsMonth, newWeekVsMonth};
}

async function updateBreakStats(timerData, timerDb) {
    timerData.sessionData.breakStarted = -1;
    timerData.sessionData.totalSessions++;
    let nowStr = getConcatDateStr(new Date());
    timerData.sessionData.recentSessions[nowStr] = (timerData.sessionData.recentSessions[nowStr] ?? 0) + 1;
    await saveDatabase(timerDb, "timer_os", [timerData], false);
}