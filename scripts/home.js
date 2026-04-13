const dataFunctions = [{ func: getWeather, cacheKey: "weather" }, { func: getStocks, cacheKey: "stocks" }, { func: getNews, cacheKey: "news" }, { func: getQuote, cacheKey: null }, { func: getHistory, cacheKey: "history" }];
let widgetDb, widgetData;
let widgetCycleTimeout, widgetCyclePaused = false, widgetIdx = 0;

function initHome(webchestDb, allProfiles, todoDb, todoData, lookaheadDb, lookaheadData, timerData) {
    let searchDetailsOpen = localStorage.getItem("searchDetailsOpen") == "true";
    let homeContainer = document.getElementById("home-more-container");
    let timerInterval;

    if (searchDetailsOpen) {
        timerInterval = loadTimelySuggestions(document.getElementById("home-more-container"), false, "Timely Suggestions", [{ type: "notifications", content: [todoData, lookaheadData], db: [todoDb, lookaheadDb] }, { type: "sites", content: allProfiles, db: webchestDb }, { type: "focus timer", content: timerData }]);
        homeContainer.style.opacity = "1";
    }

    let moreImg = createArrowSvg("35", searchDetailsOpen ? "up" : "down");

    let moreButton = document.getElementById("search-more-button");
    moreButton.dataset.label = searchDetailsOpen ? "Less" : "More";
    moreButton.appendChild(moreImg);
    moreButton.addEventListener("click", () => {
        searchDetailsOpen = !searchDetailsOpen;
        localStorage.setItem("searchDetailsOpen", searchDetailsOpen.toString());

        homeContainer.classList.toggle("home-more-container-opening", searchDetailsOpen);
        homeContainer.classList.toggle("home-more-container-closing", !searchDetailsOpen);

        if (searchDetailsOpen) {
            timerInterval = loadTimelySuggestions(homeContainer, false, "Timely Suggestions", [{ type: "notifications", content: [todoData, lookaheadData], db: [todoDb, lookaheadDb] }, { type: "sites", content: allProfiles, db: webchestDb }, { type: "focus timer", content: timerData }]);
        } else {
            if (timerInterval) clearInterval(timerInterval);
            homeContainer.addEventListener("animationend", () => document.getElementById("timely-suggested-container")?.remove(), { once: true });
        }

        moreImg.querySelector("path").setAttribute("d", searchDetailsOpen ? "M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z" : "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z");
        moreButton.dataset.label = searchDetailsOpen ? "Less" : "More";
    });
}

async function initWidgets(keysData) {
    widgetDb = await openDatabase(["widget_db", 1], ["widget_os", "key"], ["cachedData"]);
    widgetData = await readDatabase(widgetDb, "widget_os", "main");
    if (!widgetData) {
        widgetData = {
            key: "main",
            cachedData: {
                "weather": { duration: 1800000, lastFetch: 0, data: null },
                "stocks": { duration: 60000, lastFetch: 0, data: null },
                "news": { duration: 10800000, lastFetch: 0, data: null },
                "history": { duration: 28800000, lastFetch: 0, data: null },
            },
        };

        await saveDatabase(widgetDb, "widget_os", [widgetData], false);
    }

    let widgetsVisible = localStorage.getItem("homeWidgetsVisible");
    if (widgetsVisible == null || widgetsVisible == "true") {
        document.getElementById("widget-container").style.visibility = "visible";
        document.getElementById("widget-cycle-container").style.visibility = "visible";
        cycleWidgets(keysData);
    } else {
        widgetCyclePaused = true;
    }

    document.getElementById("widget-visibility").addEventListener("click", () => {
        widgetCyclePaused = !widgetCyclePaused;

        if (widgetCyclePaused) {
            if (widgetCycleTimeout) clearTimeout(widgetCycleTimeout);
            document.getElementById("widget-container").style.visibility = "hidden";
            document.getElementById("widget-cycle-container").style.visibility = "hidden";
        } else {
            document.getElementById("widget-container").style.visibility = "visible";
            document.getElementById("widget-cycle-container").style.visibility = "visible";
            widgetIdx = widgetIdx < dataFunctions.length - 1 ? widgetIdx + 1 : 0;
            cycleWidgets(keysData);
        }

        localStorage.setItem("homeWidgetsVisible", (!widgetCyclePaused).toString());
    });

    window.addEventListener("blur", () => {
        if (localStorage.getItem("homeWidgetsVisible") != "true") return;
        widgetCyclePaused = true;
        if (widgetCycleTimeout) clearTimeout(widgetCycleTimeout);
    });
    window.addEventListener("focus", () => {
        if (localStorage.getItem("homeWidgetsVisible") != "true") return;
        if (widgetCyclePaused) {
            widgetCyclePaused = false;
            widgetIdx = widgetIdx < dataFunctions.length - 1 ? widgetIdx + 1 : 0;
            cycleWidgets(keysData);
        }
    });
}

async function getWeather(keysData) {
    let locationData = localStorage.getItem("latlong");
    if (!locationData) return null;
    locationData = locationData.split(",");

    let weatherResp = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${locationData[0]}&lon=${locationData[1]}&appid=${IS_LOCAL ? API_KEYS.weather : keysData.weather[0]}&units=metric`);
    let weatherData = await weatherResp.json();

    if (weatherData.weather?.length > 0) {
        let conditionIcon = weatherData.weather[0].icon;
        let temperature = Math.round(weatherData.main.temp);

        let windArrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
        let windDirection = Math.round(weatherData.wind.deg / 45) % 8;
        let windSpeed = Math.round(weatherData.wind.speed);

        let currentHour = new Date().getHours();
        let bgColor = currentHour < 6 ? "25, 25, 112" : currentHour < 8 ? "230, 116, 81" : currentHour < 18 ? "135, 206, 235" : currentHour < 20 ? "230, 116, 81" : "25, 25, 112";

        return [[`https://openweathermap.org/img/wn/${conditionIcon}@2x.png`, [`${temperature} °C`, `${windSpeed} km/h ${windArrows[windDirection]}`], bgColor, `https://weather.gc.ca/en/location/index.html?coords=${locationData[0]},${locationData[1]}`, false]];
    } else {
        return null;
    }
}

async function getStocks() {
    const STOCK_ITEMS = [{ symbol: "^DJI", name: "DOW" }, { symbol: "^GSPTSE", name: "TSX" }, { symbol: "^VIX", name: "VIX" }];
    let cachedIndex = -1;
    if (widgetData.cachedData.stocks.data) {
        cachedIndex = STOCK_ITEMS.findIndex(x => x.name == widgetData.cachedData.stocks.data[0][1][0].split(":")[0]);
    }
    let stockItem = cachedIndex != -1 ? STOCK_ITEMS[cachedIndex < STOCK_ITEMS.length - 1 ? cachedIndex + 1 : 0] : STOCK_ITEMS[Math.floor(Math.random() * STOCK_ITEMS.length)];

    let now = new Date();
    if (now.getMinutes() != 0 || now.getSeconds() != 0) {
        now.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
        now.setMinutes(0, 0, 0);
    }
    let nowSeconds = Math.floor(now.getTime() / 1000);

    let stockResp = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${stockItem.symbol}?period1=${nowSeconds - 86400}&period2=${nowSeconds}&lang=en-US&region=US&source=cosaic`);
    let stockData = await stockResp.json();

    let meta = stockData?.chart?.result?.[0]?.meta;
    if (meta) {
        let delta = meta.regularMarketPrice - meta.previousClose;
        let deltaSymbol = delta > 0 ? "+" : "";
        let deltaPercent = (delta / meta.previousClose * 100).toFixed(2);

        return [[delta > 0 ? "assets/images/trend-up.svg" : "assets/images/trend-down.svg", [`${stockItem.name}: ${meta.regularMarketPrice.toLocaleString("en-US")}`, `${deltaSymbol}${delta.toFixed(2)} (${deltaSymbol}${deltaPercent}%)`], delta > 0 ? "70, 157, 74" : "157, 70, 70", `https://ca.finance.yahoo.com/quote/${encodeURIComponent(stockItem.symbol)}`, false]];
    } else {
        return null;
    }
}

async function getNews() {
    const queryNYTNews = async category => {
        let newsResp = await fetch(`https://api.nytimes.com/svc/topstories/v2/${category}.json?api-key=${IS_LOCAL ? API_KEYS.nyt : keysData.nyt[0]}`);
        let newsData = await newsResp.json();
        if (newsData?.results?.length > 0) return newsData.results.map(x => [null, [x.title, x.des_facet?.length > 0 ? x.des_facet[0] : "NY Times"], "250, 95, 31", `https://google.com/search?q=${encodeURIComponent(x.title)}`, true]);
        return [];
    }

    const queryCBCNews = async () => {
        let newsResp = await fetch(`https://www.cbc.ca/webfeed/rss/rss-canada`);
        let newsText = await newsResp.text();

        let xmlDoc = new DOMParser().parseFromString(newsText, "application/xml");
        let items = xmlDoc.querySelectorAll("item"), newsData = [];
        if (items?.length > 0) {
            items.forEach(item => {
                newsData.push([null, [item.querySelector("title")?.textContent, "CBC National"], "250, 95, 31", item.querySelector("link")?.textContent, true]);
            });
        }

        newsText = null;
        xmlDoc = null;
        return newsData;
    }

    let usNews = await queryNYTNews("us");
    let worldNews = await queryNYTNews("world");
    // let scienceNews = await queryNYTNews("science");
    let cbcNews = await queryCBCNews();
    let combined = [...usNews, ...worldNews, ...cbcNews];

    return combined.length > 0 ? combined : null;
}

function getQuote() {
    let quoteItem = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    return [[null, [quoteItem.quote, quoteItem.author], "161, 102, 47", `https://google.com/search?q=${encodeURIComponent(`${quoteItem.author} quotes`)}`, true]];
}

async function getHistory() {
    let historyResp = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${new Date().toLocaleString("en-US", { month: "2-digit", day: "2-digit" })}`);
    let historyData = await historyResp.json();

    if (historyData?.selected?.length > 0) {
        return historyData.selected.map(x => [null, [x.text, `Today in ${x.year}`], "1, 55, 106", `https://google.com/search?q=${encodeURIComponent(x.text)}`, true]);
    } else {
        return null;
    }
}

function generateWidget(image, texts, bgColor, openUrl, scrollable) {
    let widgetContainer = document.getElementById("widget-container");
    widgetContainer.innerHTML = "";

    if (image) {
        let widgetIcon = document.createElement("img");
        widgetIcon.id = "widget-icon";
        widgetIcon.src = image;
        widgetIcon.alt = "Widget icon";
        widgetContainer.appendChild(widgetIcon);
    }

    let widgetTextContainer = document.createElement("div");
    widgetTextContainer.id = "widget-text-container";
    texts.forEach((text, i) => {
        let widgetText = document.createElement("p");
        widgetText.textContent = text;
        widgetText.style.fontSize = i == 0 ? "18px" : "16px";
        widgetText.style.color = i == 0 ? "#ffffff" : "#b4b4b4";
        widgetTextContainer.appendChild(widgetText);
    });
    if (scrollable) {
        widgetTextContainer.style.alignSelf = "flex-start";
        widgetTextContainer.style.animation = "scroll-up 6s 2s linear forwards";
    }
    widgetContainer.appendChild(widgetTextContainer);

    widgetContainer.style.backgroundColor = `rgba(${bgColor}, 0.6)`;
    widgetContainer.style.borderColor = `rgb(${bgColor})`;

    if (openUrl) {
        widgetContainer.style.cursor = "pointer";
        widgetContainer.onclick = () => window.open(openUrl, "_blank");
    } else {
        widgetContainer.style.cursor = "default";
        widgetContainer.onclick = null;
    }

    widgetContainer.style.animation = "none";
    void widgetContainer.offsetWidth;
    widgetContainer.style.opacity = "0";
    widgetContainer.style.translate = "30px 0";
    widgetContainer.style.animation = "slide-from-right 1s forwards";

    let cycleElems = document.getElementById("widget-cycle-container").children;
    for (let i = 0; i < cycleElems.length; i++) {
        cycleElems[i].classList.toggle("widget-cycle-active", i == widgetIdx);
    }
}

async function cycleWidgets(keysData) {
    try {
        let data, nowMs = new Date().getTime();
        if (dataFunctions[widgetIdx].cacheKey != null) {
            if (widgetData.cachedData[dataFunctions[widgetIdx].cacheKey].data && nowMs - widgetData.cachedData[dataFunctions[widgetIdx].cacheKey].lastFetch <= widgetData.cachedData[dataFunctions[widgetIdx].cacheKey].duration) {
                data = widgetData.cachedData[dataFunctions[widgetIdx].cacheKey].data;
            } else {
                data = await dataFunctions[widgetIdx].func(keysData);
                widgetData.cachedData[dataFunctions[widgetIdx].cacheKey].data = data;
                widgetData.cachedData[dataFunctions[widgetIdx].cacheKey].lastFetch = nowMs;
                await saveDatabase(widgetDb, "widget_os", [widgetData], false);
            }
        } else {
            data = dataFunctions[widgetIdx].func(keysData);
        }

        if (data != null) {
            let randomElement = data.length > 1 ? data[Math.floor(Math.random() * data.length)] : data[0];
            generateWidget(...randomElement);
        } else {
            console.log("Widget generation error");
        }

        if (!widgetCyclePaused) {
            widgetCycleTimeout = setTimeout(() => {
                widgetIdx = widgetIdx < dataFunctions.length - 1 ? widgetIdx + 1 : 0;
                cycleWidgets(keysData);
            }, 10000);
        }
    } catch (err) {
        console.log("Widget generation error");
        console.log(err);
    }
}

async function estimateLocation(todoData, dateStr, nowMs) {
    let existingLocation = localStorage.getItem("latlong")?.split(",");
    if (existingLocation && existingLocation.length == 3 && nowMs - parseInt(existingLocation[2]) <= 7.2e6) return;

    let locationData;

    try {
        let locationResp = await fetch(`https://ipapi.co/latlong/`);
        locationData = await locationResp.text();
    } catch {
        locationData = null;
    }
    if (!locationData) return;

    localStorage.setItem("latlong", `${locationData},${nowMs}`);

    locationData = locationData.split(",");
    if (!existingLocation || locationData[0] != existingLocation[0] || locationData[1] != existingLocation[1]) {
        generateDaySummary(todoData?.entries[dateStr] || [], dateStr, "compact", true);
    }
}