window.onload = () => {
    initRss();
    checkDbBackup("button");
}



let rssDb, rssData;

async function initRss() {
    rssDb = await openDatabase(["rss_db", 1], ["rss_os", "key"], ["feeds", "aiOutput"]);
    rssData = await readDatabase(rssDb, "rss_os", "main");

    let rssContent = document.getElementById("rss-content");

    if (!rssData) {
        rssData = {
            key: "main",
            feeds: {},
            aiOutput: {},
        };
        await saveDatabase(rssDb, "rss_os", [rssData], true);
    } else {
        let rssNames = Object.keys(rssData.feeds).toSorted((a, b) => a.localeCompare(b));
        let nowMs = new Date().getTime();
        if (rssNames.length > 0) {
            for (let rssName of rssNames) {
                rssContent.appendChild(generateRssEntry(rssName, nowMs));
            }
        }
    }

    document.getElementById("rss-add-feed-button").addEventListener("click", () => {
        let [addRssOverlay, addRssWindow] = createOverlay("rss-add-window");

        let addRssTitle = document.createElement("h3");
        addRssTitle.id = "rss-add-title";
        addRssTitle.classList.add("content-overlay-window-title");
        addRssTitle.textContent = "Add RSS Feed";

        let addRssInput = document.createElement("div");
        addRssInput.id = "rss-add-input-row";
        addRssInput.classList.add("flex-centered-row");

        let inputContainer = document.createElement("div");
        inputContainer.id = "rss-add-input-container";
        let [nameInput, nameField] = createLabeledInput(
            ["content-overlay-input-group", "flex-column"],
            "Feed name",
            "content-overlay-input-label",
            "rss-add-name-input",
            "content-overlay-field",
            "This is what the feed titles will show"
        );
        let [urlInput, urlField] = createLabeledInput(
            ["content-overlay-input-group", "flex-column"],
            "Feed URL",
            "content-overlay-input-label",
            "rss-add-url-input",
            "content-overlay-field",
            "https://example.rss, https://example.xml"
        );
        let imgInput = document.createElement("div");
        imgInput.classList.add("content-overlay-input-group", "flex-column");
        let imgLabel = document.createElement("h4");
        imgLabel.classList.add("content-overlay-input-label");
        imgLabel.textContent = "Thumbnail element selector";
        let imgInputRow = document.createElement("div");
        imgInputRow.classList.add("flex-centered-row");
        imgInputRow.style.columnGap = "10px";
        let imgField = document.createElement("input");
        imgField.id = "rss-add-img-input";
        imgField.classList.add("content-overlay-field", "flex-split-row-grow");
        imgField.placeholder = "media:content, .image, [data-type=\"image\"]";
        let imgAttrSelect = document.createElement("select");
        imgAttrSelect.classList.add("rss-add-select");
        [["\"url\" attribute", "url-attr"], ["\"src\" attribute", "src-attr"], ["Text extraction", "url-text"]].forEach(x => {
            imgAttrSelect.options.add(new Option(x[0], x[1]));
        });
        imgInputRow.append(imgField, imgAttrSelect);
        imgInput.append(imgLabel, imgInputRow);
        let optionalInputs = document.createElement("div");
        optionalInputs.classList.add("content-overlay-input-group", "flex-column");
        let optionalLabel = document.createElement("h4");
        optionalLabel.classList.add("content-overlay-input-label");
        optionalLabel.textContent = "Optional element selectors";
        let authorField = document.createElement("input");
        authorField.id = "rss-add-author-input";
        authorField.classList.add("content-overlay-field");
        authorField.placeholder = "(optional) Author – media:author, dc:creator, .author";
        let tagField = document.createElement("input");
        tagField.id = "rss-add-tag-input";
        tagField.classList.add("content-overlay-field");
        tagField.placeholder = "(optional) Tags – media:tags, category, .tag, [domain=\"taxonomy\"]";
        let descriptionRow = document.createElement("div");
        descriptionRow.classList.add("flex-centered-row");
        descriptionRow.style.columnGap = "10px";
        let descriptionField = document.createElement("input");
        descriptionField.id = "rss-add-description-input";
        descriptionField.classList.add("content-overlay-field", "flex-split-row-grow");
        descriptionField.placeholder = "(optional) Description – description, content:encoded";
        let descriptionSelect = document.createElement("select");
        descriptionSelect.classList.add("rss-add-select");
        [["Text content", "text-content"], ["\"p\" element", "p-elem"]].forEach(x => {
            descriptionSelect.options.add(new Option(x[0], x[1]));
        });
        descriptionRow.append(descriptionField, descriptionSelect);
        optionalInputs.append(optionalLabel, authorField, tagField, descriptionRow);
        inputContainer.append(nameInput, urlInput, imgInput, optionalInputs);

        let submitButton = createImgButton(["content-overlay-window-button"], "img", "assets/images/checkmark.svg", "0, 187, 0", { text: "Add Feed", position: "bottom" });

        addRssInput.append(inputContainer, submitButton);

        let closeButton = createImgButton(["content-overlay-window-close", "content-overlay-window-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Discard & Close", position: "bottom" });

        let addRssPreview = document.createElement("div");
        let addRssPreviewHeader = document.createElement("div");
        addRssPreviewHeader.classList.add("flex-split-row");
        let addRssPreviewTitle = document.createElement("h4");
        addRssPreviewTitle.id = "rss-add-preview-title";
        addRssPreviewTitle.classList.add("content-overlay-input-label");
        addRssPreviewTitle.textContent = "Feed preview";
        let addRssPreviewPrint = document.createElement("div");
        addRssPreviewPrint.classList.add("rss-add-print", "flex-centered-row");
        addRssPreviewPrint.innerHTML = "<p>Pretty-print</p>";
        let addRssPreviewPrintToggle = document.createElement("label");
        addRssPreviewPrintToggle.classList.add("toggle", "settings-toggle");
        let [toggle, slider] = createToggle("rss-add-print-toggle", false);
        addRssPreviewPrintToggle.append(toggle, slider);
        addRssPreviewPrint.appendChild(addRssPreviewPrintToggle);
        let addRssPreviewContent = document.createElement("p");
        addRssPreviewContent.id = "rss-add-preview-content";
        addRssPreviewContent.classList.add("glass-container");
        addRssPreviewContent.textContent = "Fill in the \"Feed URL\" field to see a preview of its XML structure here.";
        addRssPreviewHeader.append(addRssPreviewTitle, addRssPreviewPrint);
        addRssPreview.append(addRssPreviewHeader, addRssPreviewContent);

        let previewText;

        const updatePreviewContent = isPrettyPrint => {
            if (!previewText) return;

            addRssPreviewContent.scrollTop = 0;

            if (!isPrettyPrint) {
                addRssPreviewContent.textContent = previewText;
                addRssPreviewContent.style.whiteSpace = "normal";
                return;
            }

            try {
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(previewText, "application/xml");

                if (!xmlDoc.querySelector("parsererror")) {
                    let xsltDoc = parser.parseFromString(`<?xml version="1.0" encoding="UTF-8"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:output method="xml" indent="yes" encoding="UTF-8"/><xsl:template match="@*|node()"><xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy></xsl:template></xsl:stylesheet>`, "application/xml");
                    let xsltProcessor = new XSLTProcessor();
                    xsltProcessor.importStylesheet(xsltDoc);
                    let resultDoc = xsltProcessor.transformToDocument(xmlDoc);
                    let prettyXml = new XMLSerializer().serializeToString(resultDoc);

                    addRssPreviewContent.textContent = prettyXml;
                    addRssPreviewContent.style.whiteSpace = "pre-wrap";
                } else {
                    addRssPreviewContent.textContent = previewText;
                    addRssPreviewContent.style.whiteSpace = "normal";
                }
            } catch {
                addRssPreviewContent.textContent = previewText;
                addRssPreviewContent.style.whiteSpace = "normal";
            }
        }

        urlField.addEventListener("focusout", async () => {
            let urlValue = urlField.value.trim();

            if (urlValue.length == 0) {
                previewText = null;
                addRssPreviewContent.textContent = "Fill in the \"Feed URL\" field to see a preview of its XML structure here.";
                return;
            }

            try {
                new URL(urlValue);
                let previewResp = await fetch(urlValue);
                previewText = await previewResp.text();
                updatePreviewContent(toggle.checked);
            } catch {
                previewText = null;
                addRssPreviewContent.textContent = "Could not generate XML structure preview. Please validate the feed URL.";
            }
        });

        toggle.addEventListener("input", () => {
            updatePreviewContent(toggle.checked);
        });

        submitButton.addEventListener("click", async () => {
            let nameValue = nameField.value.trim(), urlValue = urlField.value.trim(), imgValue = imgField.value.trim(), authorValue = authorField.value.trim(), tagValue = tagField.value.trim(), descriptionValue = descriptionField.value.trim();

            if (nameValue.length == 0 || nameValue.length > 30) {
                return alert("Feed name must be between 1 and 30 non-whitespace characters.");
            }
            if (urlValue.length == 0 || imgValue.length == 0) {
                return alert("Please fill out the URL and thumbnail fields.");
            }

            try {
                new URL(urlValue);
            } catch {
                return alert("Invalid RSS feed URL. Please enter a complete URL including http:// or https://");
            }
            if (rssData.feeds[nameValue]) return alert("This RSS feed has already been added. Please provide a different feed.");

            let rssItems = await fetchRssItems(null, urlValue, { query: imgValue, mode: imgAttrSelect.value }, authorValue, tagValue, { query: descriptionValue, mode: descriptionSelect.value });
            if (!rssItems) return alert("This URL does not point to a valid RSS feed. Please provide a different URL.");

            rssData.feeds[nameValue] = { url: urlValue, imgSelector: { query: imgValue, mode: imgAttrSelect.value }, authorSelector: authorValue, tagSelector: tagValue, descriptionSelector: { query: descriptionValue, mode: descriptionSelect.value }, items: rssItems, updatedAt: new Date().getTime() };
            await saveDatabase(rssDb, "rss_os", [rssData], true);

            addRssOverlay.remove();

            let insertIndex = Object.keys(rssData.feeds).toSorted((a, b) => a.localeCompare(b)).indexOf(nameValue);
            rssContent.insertBefore(generateRssEntry(nameValue, new Date().getTime()), insertIndex < rssContent.children.length ? rssContent.children[insertIndex] : null);
        });

        closeButton.addEventListener("click", () => {
            addRssOverlay.remove();
        });

        addRssWindow.append(addRssTitle, addRssInput, addRssPreview, closeButton);
        addRssOverlay.appendChild(addRssWindow);
        document.body.appendChild(addRssOverlay);
    });

    document.getElementById("rss-refresh-all").addEventListener("click", async () => {
        let rssNames = Object.keys(rssData.feeds), toSave = false, nowMs = new Date().getTime();

        for (let rssName of rssNames) {
            let rssItems = await fetchRssItems(rssName);
            if (rssItems) {
                toSave = true;
                rssData.feeds[rssName].items = rssItems;
                rssData.feeds[rssName].updatedAt = nowMs;
                generateRssEntry(rssName, nowMs);
            }
        }

        if (toSave) {
            rssData.aiOutput = {};
            await saveDatabase(rssDb, "rss_os", [rssData], true);
        }
    });

    let aiButtonsContainer = document.getElementById("rss-ai-buttons-container");
    let aiHeader = createImgTextDiv([["flex-centered-row"], [], []], ["rss-ai-header", null, null], "svg", createIntelligentSvg("26"), null, "h4", "AI", null);
    aiButtonsContainer.appendChild(aiHeader);
    let aiTools = [
        {
            name: "Key developments",
            systemInstruction: { parts: [{
                text: "You are an AI news explainer. Given a list of recent RSS articles, identify the most important developments and explain clearly why they matter to a busy general reader. Focus on real-world implications: who is affected, what might change in the short and medium term, and what signals to watch for. Do not simply restate each headline; instead, synthesize and prioritize a small number of key developments. Use plain, neutral language and avoid speculation or advice. In the response, surround section headers with triple asterisks (***) and emphasized portions within paragraphs with double asterisks (**). IMPORTANT: You MUST use the provided Google Search grounding tool to verify implications and check for the latest updates on what to watch for."
            }] },
            taskPrompt: "Task: From this article set, highlight 3 to 6 major developments and, for each one, explain in 2 to 4 sentences why it matters for a general reader (who is affected, what may change, and what to watch next). Keep the total response under 600 words."
        },
        {
            name: "Sentiment analysis",
            systemInstruction: { parts: [{
                text: "You are an analyst that performs high-level sentiment analysis over news coverage. Work only from the provided article list. Focus on overall sentiment trends, not per-article micro-judgments. Use neutral, careful language and avoid exaggeration. In the response, surround section headers with triple asterisks (***) and emphasized portions within paragraphs with double asterisks (**). IMPORTANT: You MUST use the Google Search grounding tool to understand the broader context and public reception of these stories to inform your sentiment analysis."
            }] },
            taskPrompt: "Task: Analyze the overall sentiment of this news set. In 3 to 5 short paragraphs, (1) briefly describe the main topics, (2) characterize the overall sentiment as mostly positive, negative, mixed, or neutral, and (3) highlight a few notable positive or negative outliers by article number. Keep the response under 450 words."
        },
        {
            name: "Coverage balance",
            systemInstruction: { parts: [{
                text: "You are a media coverage analyst. Given a list of recent RSS articles, assess how balanced the overall news mix is across broad topic areas (for example: politics and policy, economy and business, technology and AI, science and health, environment and climate, society and culture, and other). Work only from the provided article list. Classify coverage into these broad buckets, describe which areas dominate, and briefly note any important gaps or blind spots that a general reader should be aware of. Use careful, neutral language and avoid judgmental or partisan framing. In the response, surround section headers with triple asterisks (***) and emphasized portions within paragraphs with double asterisks (**). IMPORTANT: You MUST use the provided Google Search grounding tool to understand the broader news agenda and to validate whether apparently under-covered areas are in fact significant in the wider news environment."
            }] },
            taskPrompt: "Task: (1) characterize the balance of coverage across broad categories (e.g., which domains are most and least represented) using approximate counts or percentages by category, and (2) briefly suggest 2 to 4 notable gaps, blind spots, or perspectives that may be missing, phrased for a general reader. Keep the response under 500 words."
        },
        {
            name: "Focus: {{Topic}}",
            systemInstruction: { parts: [{
                text: "You are an expert analyst specializing in {{Topic}}. Given a list of recent RSS articles, explain their significance and practical relevance for the topic of {{Topic}}. Work only from the provided article list. For each article or grouped theme, identify relevant subfields or perspectives, summarize the core point, describe who is affected (such as professionals, organizations, policymakers, or the public), outline likely short- and medium-term impacts, and list 1-3 concrete signals to monitor (such as new research, policy changes, standards updates, advisories, or key datasets). Use neutral, factual language and avoid speculation or advice. In the response, surround section headers with triple asterisks (***) and emphasized portions within paragraphs with double asterisks (**). IMPORTANT: You MUST use the provided Google Search grounding tool to verify claims or recent changes before asserting implications or signals to watch."
            }] },
            taskPrompt: "Task: From this article set, produce: (1) concise entries for the 4-8 most relevant articles or themes for {{Topic}} - for each entry include: (a) relevant subfield(s) or perspectives, (b) a 2-3 sentence summary of significance, (c) a one-line practical implication (who is affected and what may change), and (d) one short 'What to watch' signal (1-2 items). (2) A prioritized summary of the top 3 cross-cutting implications for {{Topic}} (2-3 short bullets). Keep the total response under 600 words.",
            customInputs: ["{{Topic}}"]
        }
    ];
    const focusButton = aiButton => {
        let activeButton = aiButtonsContainer.querySelector(".rss-ai-button-active");
        if (activeButton) activeButton.classList.remove("rss-ai-button-active");
        aiButton.classList.add("rss-ai-button-active");
    };
    const showAiResponse = (mode, toolData, aiButton) => {
        let responseContainer = document.getElementById("rss-ai-response-container");
        responseContainer.style.display = "block";

        switch (mode) {
            case "loading":
                responseContainer.innerHTML = '<div class="flex-column" style="row-gap: 8px;"><p>Generating AI response...</p><div class="loading-skeleton rss-ai-loading"></div><div class="loading-skeleton rss-ai-loading"></div></div>';
                break;

            case "error":
                responseContainer.innerHTML = "An error occurred when generating an AI response. Please try again later.";
                break;

            case "response":
                responseContainer.innerHTML = toolData?.responseHTML ?? "An error occurred when generating an AI response. Please try again later.";
                focusButton(aiButton);
                break;
        }
    };
    for (let aiTool of aiTools) {
        let aiButton = document.createElement("button");
        aiButton.classList.add("rss-ai-button", "intelligent-container");
        if (!aiTool.customInputs?.length) {
            aiButton.textContent = aiTool.name;
        } else {
            let parts = aiTool.name.split(/(\{\{.*?\}\})/);
            for (let part of parts) {
                if (part.startsWith("{{") && part.endsWith("}}")) {
                    let input = document.createElement("input");
                    input.type = "text";
                    input.classList.add("rss-ai-custom-input");
                    input.placeholder = part.slice(2, -2);
                    if (rssData.aiOutput[aiTool.name]?.customInputs?.[part]) input.value = rssData.aiOutput[aiTool.name].customInputs[part];
                    input.addEventListener("click", e => e.stopPropagation());
                    input.addEventListener("keydown", e => { if (e.key == " ") { e.preventDefault(); input.value += " "; } });
                    aiButton.appendChild(input);
                } else if (part) {
                    aiButton.appendChild(document.createTextNode(part));
                }
            }
        }
        aiButton.addEventListener("click", async () => {
            if (aiButton.classList.contains("rss-ai-button-active")) {
                aiButton.classList.remove("rss-ai-button-active");
                let responseContainer = document.getElementById("rss-ai-response-container");
                responseContainer.innerHTML = "";
                responseContainer.style.display = "none";
                return;
            }
            if (rssData.aiOutput[aiTool.name]) {
                let canUseCache = true;
                if (aiTool.customInputs?.length > 0) {
                    let inputValues = aiButton.querySelectorAll("input");
                    for (let input of inputValues) {
                        if (rssData.aiOutput[aiTool.name].customInputs?.[`{{${input.placeholder}}}`]?.toLowerCase() != input.value.trim().toLowerCase()) {
                            canUseCache = false;
                            break;
                        }
                    }
                }
                if (canUseCache) {
                    showAiResponse("response", rssData.aiOutput[aiTool.name], aiButton);
                    return;
                }
            }

            let systemInstruction = aiTool.systemInstruction, taskPrompt = aiTool.taskPrompt, replacementMap = {};
            if (aiTool.customInputs?.length > 0) {
                let inputValues = aiButton.querySelectorAll("input"), placeholderPattern = [];
                for (let input of inputValues) {
                    if (!input.value.trim()) return alert("Please fill in all custom input fields for this AI tool.");
                    replacementMap[`{{${input.placeholder}}}`] = input.value.trim();
                    placeholderPattern.push(`\\{\\{${input.placeholder}\\}\\}`);
                }
                let regex = new RegExp(placeholderPattern.join("|"), "g");

                systemInstruction = { parts: [{ text: systemInstruction.parts[0].text.replace(regex, match => replacementMap[match]) }] };
                taskPrompt = taskPrompt.replace(regex, match => replacementMap[match]);
            }

            let allFeeds = Object.entries(rssData.feeds);
            if (!allFeeds?.length) return alert("Please add a RSS feed to provide data for AI tools.");

            let allItems = allFeeds.flatMap(([feedName, feed]) =>
                (feed.items ?? [])
                    .filter(item => item.title)
                    .map(item => ({
                        feedName,
                        title: item.title,
                        pubDate: item.pubDate ?? 0,
                        description: item.description,
                    }))
            );

            allItems = allItems.toSorted((a, b) => b.pubDate - a.pubDate).filter(item => allItems[0].pubDate - item.pubDate <= 7 * 8.64e7).slice(0, 80);
            if (allItems.length == 0) return alert("There is currently no RSS feed data available for AI tools. Try refreshing the feeds.");

            allItems = allItems.map((item, idx) => `${idx + 1}. [${item.feedName}] ${trimString(item.title, 140)} | Published: ${item.pubDate > 0 ? new Date(item.pubDate).toISOString().split("T")[0] : "N/A"} | Summary: ${item.description ? trimString(extractSentences(item.description, 1).replace(/(\r\n|\n|\r)/gm, " "), 800) : "N/A"}`).join("\n");

            focusButton(aiButton);
            aiButtonsContainer.querySelectorAll("button, input").forEach(x => x.disabled = true);
            showAiResponse("loading");

            let geminiData;
            try {
                let geminiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
                    method: "POST",
                    headers: { "x-goog-api-key": API_KEYS.gemini, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        system_instruction: systemInstruction,
                        contents: [{
                            parts: [{ text: `${allItems}\n\n${taskPrompt}` }]
                        }],
                        generation_config: {
                            temperature: 0.3
                        },
                        tools: [{ google_search: {} }]
                    })
                });
                geminiData = await geminiResp.json();
            } catch (err) {
                console.log(err);
            }

            aiButtonsContainer.querySelectorAll("button, input").forEach(x => x.disabled = false);

            if (!geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                showAiResponse("error");
                return;
            }

            let responseHTML = sanitizeInnerHTML(geminiData.candidates[0].content.parts[0].text);
            if (geminiData.candidates[0].groundingMetadata && geminiData.candidates[0].groundingMetadata.groundingSupports?.length > 0 && geminiData.candidates[0].groundingMetadata.groundingChunks?.length > 0) {
                let filteredSupports = geminiData.candidates[0].groundingMetadata.groundingSupports.filter(x => x.segment?.text != undefined && x.groundingChunkIndices?.length > 0);
                for (let support of filteredSupports) {
                    let citationLinks = support.groundingChunkIndices.filter(x => geminiData.candidates[0].groundingMetadata.groundingChunks[x]?.web?.uri).map(x => `<a href="${sanitizeURL(geminiData.candidates[0].groundingMetadata.groundingChunks[x].web.uri)}">${x + 1}</a>`);
                    if (citationLinks.length > 0) responseHTML = responseHTML.replace(sanitizeInnerHTML(support.segment.text), `${support.segment.text}<span class="rss-ai-response-citations">${citationLinks.join(", ")}</span>`);
                }
            }
            geminiData.responseHTML = responseHTML.replace(/\*\*\*([\s\S]*?)\*\*\*|\*\*([\s\S]*?)\*\*/g, (m, h, e) => h ? `<span class="rss-ai-response-header">${h}</span>` : e ? `<span class="rss-ai-response-emphasis">${e}</span>` : m);

            if (aiTool.customInputs?.length > 0) geminiData.customInputs = replacementMap;

            rssData.aiOutput[aiTool.name] = geminiData;
            await saveDatabase(rssDb, "rss_os", [rssData], true);

            showAiResponse("response", geminiData, aiButton);
        });
        aiButtonsContainer.appendChild(aiButton);
    }

    createCircularBorders();
}

async function fetchRssItems(rssName, rssUrl, imgSelector, authorSelector, tagSelector, descriptionSelector) {
    try {
        if (rssUrl == undefined) rssUrl = rssData.feeds[rssName].url;
        let rssResp = await fetch(rssUrl);
        let rssText = await rssResp.text();

        let xmlDoc = new DOMParser().parseFromString(rssText, "application/xml");
        if (xmlDoc.querySelector("parseerror")) return null;

        let items = xmlDoc.querySelectorAll("item"), itemData = null;

        if (items?.length > 0) {
            itemData = [];
            if (imgSelector == undefined) imgSelector = rssData.feeds[rssName].imgSelector;
            if (authorSelector == undefined) authorSelector = rssData.feeds[rssName].authorSelector;
            if (tagSelector == undefined) tagSelector = rssData.feeds[rssName].tagSelector;
            if (descriptionSelector == undefined) descriptionSelector = rssData.feeds[rssName].descriptionSelector;

            items.forEach(item => {
                itemData.push({
                    title: item.querySelector("title")?.textContent,
                    url: item.querySelector("link")?.textContent,
                    pubDate: new Date(item.querySelector("pubDate")?.textContent ?? item.querySelector("date")?.textContent ?? 0).getTime(),
                    img: imgSelector.mode.endsWith("attr") ? item.querySelector(imgSelector.query.split(":").at(-1))?.getAttribute(imgSelector.mode.split("-")[0]) : extractURL(item.querySelector(imgSelector.query.split(":").at(-1))?.textContent),
                    author: authorSelector ? item.querySelector(authorSelector.split(":").at(-1))?.textContent : null,
                    tags: tagSelector ? Array.from(item.querySelectorAll(tagSelector.split(":").at(-1))).filter(x => x.textContent).map(x => x.textContent.split("/").at(-1)) : null,
                    description: descriptionSelector.query ? descriptionSelector.mode.endsWith("elem") ? extractHTMLElem(item.querySelector(descriptionSelector.query.split(":").at(-1))?.textContent, descriptionSelector.mode.split("-")[0]) : removeHTMLTags(item.querySelector(descriptionSelector.query.split(":").at(-1))?.textContent) : null,
                });
            });
            itemData.sort((a, b) => b.pubDate - a.pubDate);
        }

        rssText = null;
        xmlDoc = null;
        return itemData;
    } catch {
        return null;
    }
}

function generateRssEntry(rssName, nowMs) {
    let rssEntry = document.getElementById(`rss-feed-${rssName.replace(/\s/g, "")}`);
    if (!rssEntry) {
        rssEntry = document.createElement("div");
        rssEntry.id = `rss-feed-${rssName.replace(/\s/g, "")}`;
    } else {
        rssEntry.innerHTML = "";
    }

    let rssHeader = document.createElement("div");
    rssHeader.classList.add("rss-header", "flex-centered-row");

    let rssTitleContainer = document.createElement("div");
    rssTitleContainer.classList.add("rss-title-container", "flex-centered-row");
    let rssTitle = document.createElement("h3");
    rssTitle.classList.add("rss-title", "hover-label");
    rssTitle.textContent = rssName;
    rssTitle.dataset.label = rssData.feeds[rssName].url;
    rssTitle.dataset.position = "right";
    let rssUpdatedAt = document.createElement("p");
    rssUpdatedAt.classList.add("rss-updated-at");    
    rssUpdatedAt.textContent = `Last updated: ${getAgoStr(nowMs - rssData.feeds[rssName].updatedAt)}`;
    rssTitleContainer.append(rssTitle, rssUpdatedAt);
    
    let rssRefresh = createImgButton(["rss-mgmt-button"], "img", "assets/images/refresh.svg", "28, 176, 246", { text: "Refresh feed", position: "bottom" });
    rssRefresh.addEventListener("click", async () => {
        let rssItems = await fetchRssItems(rssName);
        if (rssItems) {
            let nowMs = new Date().getTime();
            rssData.feeds[rssName].items = rssItems;
            rssData.feeds[rssName].updatedAt = nowMs;
            await saveDatabase(rssDb, "rss_os", [rssData], true);
            generateRssEntry(rssName, nowMs);
        }
    });

    let rssDelete = createImgButton(["rss-mgmt-button"], "img", "assets/images/delete.svg", "234, 51, 35", { text: "Delete feed", position: "bottom" });
    rssDelete.addEventListener("click", async () => {
        delete rssData.feeds[rssName];
        await saveDatabase(rssDb, "rss_os", [rssData], true);
        rssEntry.remove();
    });

    rssHeader.append(rssTitleContainer, rssRefresh, rssDelete);

    let rssCardContainer = document.createElement("div");
    rssCardContainer.classList.add("rss-card-container", "glass-container");

    let rssCardRow = document.createElement("div");
    rssCardRow.classList.add("rss-card-row");

    if (rssData.feeds[rssName]?.items?.length > 0) {
        for (let item of rssData.feeds[rssName].items) {
            let rssCard = document.createElement("div");
            rssCard.classList.add("rss-card", "glass-container", "flex-centered-row");

            let cardMain = document.createElement("div");

            let imgContainer = document.createElement("div");
            imgContainer.classList.add("rss-card-image-container");

            if (item.img) {
                let img = document.createElement("img");
                img.classList.add("rss-card-image");
                img.loading = "lazy";
                img.draggable = false;
                img.src = sanitizeURL(item.img);
                imgContainer.appendChild(img);
            }

            let contentContainer = document.createElement("div");
            contentContainer.classList.add("rss-card-content", "flex-column");

            let title = document.createElement("a");
            title.classList.add("rss-card-title");
            let titleDisplay = item.title.replaceAll("&amp;", "&") ?? "(No title)";
            title.textContent = titleDisplay;
            title.title = titleDisplay;
            title.href = sanitizeURL(item.url);

            let metadata = document.createElement("p");
            metadata.classList.add("rss-card-metadata");
            metadata.textContent = (item.pubDate > 0 ? new Date(item.pubDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "(No date)") + (item.author ? ` • ${item.author}` : "");

            let tagsContainer = document.createElement("div");
            tagsContainer.classList.add("rss-card-tags");
            if (item.tags?.length > 0) {
                for (let tag of item.tags) {
                    let tagElement = document.createElement("span");
                    tagElement.classList.add("rss-card-tag");
                    tagElement.textContent = capitalizeWords(tag, "-");
                    tagsContainer.appendChild(tagElement);
                }
            }

            contentContainer.append(title, metadata, tagsContainer);
            cardMain.append(imgContainer, contentContainer);
            rssCard.appendChild(cardMain);

            if (item.description) {
                let cardDetails = document.createElement("div");
                cardDetails.classList.add("rss-card-details");
                let descriptionHeader = document.createElement("p");
                descriptionHeader.classList.add("rss-card-description-header");
                descriptionHeader.textContent = "SUMMARY";
                let descriptionText = document.createElement("p");
                descriptionText.classList.add("rss-card-description-text");
                descriptionText.textContent = item.description;
                cardDetails.append(descriptionHeader, descriptionText);
                rssCard.appendChild(cardDetails);
            }

            rssCardRow.appendChild(rssCard);
        }
    }

    rssCardContainer.appendChild(rssCardRow);
    rssEntry.append(rssHeader, rssCardContainer);
    return rssEntry;
}