import { TextureLoader, ShaderMaterial, Vector2 } from 'https://esm.sh/three@0.182.0';
import { century, equationOfTime, declination } from 'https://esm.sh/solar-calculator?exports=century,equationOfTime,declination';
import Globe from 'https://esm.sh/globe.gl@2.45.0?deps=three@0.182.0';

let inspectorContent = document.getElementById("globe-inspector-content"), lockIndicator = document.getElementById("globe-lock-indicator");
let geojson = {
    countries: null,
    cities: null,
};
let globeSettings = {
    settings: {
        showDayNight: true,
        showCountries: false,
        showCities: false,
        autoLock: true,
    },
};
let currTimeInterval, selectedElem = null;
let globeDb, globeData;

const world = new Globe(document.getElementById("globe-elem"), { animateIn: false });

export async function initGlobe() {
    world.width((window.innerWidth - 85) / 2).height(window.innerHeight - 82).globeCurvatureResolution(6).enablePointerInteraction(false);

    const renderer = world.renderer();
    renderer.preserveDrawingBuffer = false;
    renderer.powerPreference = "low-power";

    const dayNightShader = {
        vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragmentShader: `
        #define PI 3.141592653589793
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec2 sunPosition;
        uniform vec2 globeRotation;
        uniform bool useNightTexture;
        varying vec3 vNormal;
        varying vec2 vUv;

        float toRad(in float a) {
          return a * PI / 180.0;
        }

        vec3 Polar2Cartesian(in vec2 c) { // [lng, lat]
          float theta = toRad(90.0 - c.x);
          float phi = toRad(90.0 - c.y);
          return vec3( // x,y,z
            sin(phi) * cos(theta),
            cos(phi),
            sin(phi) * sin(theta)
          );
        }

        void main() {
          float invLon = toRad(globeRotation.x);
          float invLat = -toRad(globeRotation.y);
          mat3 rotX = mat3(
            1, 0, 0,
            0, cos(invLat), -sin(invLat),
            0, sin(invLat), cos(invLat)
          );
          mat3 rotY = mat3(
            cos(invLon), 0, sin(invLon),
            0, 1, 0,
            -sin(invLon), 0, cos(invLon)
          );
          vec3 rotatedSunDirection = rotX * rotY * Polar2Cartesian(sunPosition);
          float intensity = dot(normalize(vNormal), normalize(rotatedSunDirection));
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          float blendFactor = smoothstep(-0.1, 0.1, intensity);
          gl_FragColor = useNightTexture ? mix(nightColor, dayColor, blendFactor) : dayColor;
        }
        `
    };

    let dtObj = new Date();

    let dayTextureType = navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome") ? "tif" : "webp";
    const [dayTexture, nightTexture] = await Promise.all([
        new TextureLoader().loadAsync(`https://cdn.jsdelivr.net/gh/WOZARDLOZARD/world-data@refs/heads/main/blue-marble/${dayTextureType}/world.topo.bathy.2004${(dtObj.getMonth() + 1).toString().padStart(2, "0")}.3x5400x2700_geo.${dayTextureType}`),
        new TextureLoader().loadAsync("https://cdn.jsdelivr.net/gh/WOZARDLOZARD/world-data@refs/heads/main/blue-marble/8k_earth_nightmap.jpg")
    ]);
    const material = new ShaderMaterial({
        uniforms: {
            dayTexture: { value: dayTexture },
            nightTexture: { value: nightTexture },
            sunPosition: { value: new Vector2() },
            globeRotation: { value: new Vector2() },
            useNightTexture: { value: true }
        },
        vertexShader: dayNightShader.vertexShader,
        fragmentShader: dayNightShader.fragmentShader
    });
    world.globeMaterial(material).onZoom(({ lng, lat }) => material.uniforms.globeRotation.value.set(lng, lat));

    world.labelAltitude(0.002).labelLat(d => d.geometry.coordinates[1]).labelLng(d => d.geometry.coordinates[0]).labelText(({ properties: d }) => ["CN", "HK", "IN"].includes(d.country_code) ? d.ascii_name?.[0] : d.ascii_name ?? d.name).labelLabel(({ properties: d }) => ["CN", "HK", "IN"].includes(d.country_code) ? d.ascii_name : null).labelDotOrientation(({ properties: d }) => d.label_pos ?? "bottom").labelSize(0.2).labelResolution(0.5).labelsTransitionDuration(0).onLabelClick(clicked => { selectedElem = [clicked, "city"]; setLayerColor("label"); getClickedData(clicked, "city"); if (globeSettings.settings.autoLock) pauseScene(); });
    world.polygonAltitude(0.01).polygonStrokeColor(null).polygonSideColor(() => "#ffffff").polygonLabel(({ properties: d }) => `${d.ADMIN}${d.ISO_A2 != "-99" ? ` (${d.ISO_A2})` : ""}`).polygonsTransitionDuration(0).onPolygonClick(clicked => { selectedElem = [clicked, "country"]; setLayerColor("polygon"); getClickedData(clicked, "country"); if (globeSettings.settings.autoLock) pauseScene(); });
    setLayerColor("label");
    setLayerColor("polygon");

    const updateSunPos = dtObj => {
        let dt = +dtObj, t = century(dt), day = dtObj.setUTCHours(0, 0, 0, 0);
        let longitude = (day - dt) / 864e5 * 360 - 180;
        material.uniforms.sunPosition.value.set(longitude - equationOfTime(t) / 4, declination(t));
    };

    updateSunPos(dtObj);


    const updateGlobe = async () => {
        material.uniforms.useNightTexture.value = globeSettings.settings.showDayNight;

        if (globeSettings.settings.showCountries) {
            world.polygonsData(await getGeoJSON("countries")).labelAltitude(0.02);
        } else {
            if (selectedElem?.[1] == "country") {
                selectedElem = null;
                resetInspector();
                lockIndicator.style.display = "none";
            }
            world.polygonsData([]).labelAltitude(0.002);
        }

        if (globeSettings.settings.showCities) {
            world.labelsData(await getGeoJSON("cities"));
        } else {
            if (selectedElem?.[1] == "city") {
                selectedElem = null;
                resetInspector();
                lockIndicator.style.display = "none";
            }
            world.labelsData([]);
        }

        world.resumeAnimation();
        switch (lockIndicator.style.display) {
            case "block":
                pauseScene();
                break;
            case "none":
                world.enablePointerInteraction(globeSettings.settings.showCountries || globeSettings.settings.showCities);
                break;
        }
    };

    globeDb = await openDatabase(["globe_db", 1], ["globe_os", "key"], ["pinnedLocations"]);
    globeData = await readDatabase(globeDb, "globe_os", "main");
    if (!globeData) {
        globeData = {
            key: "main",
            pinnedLocations: { country: [], city: [] },
        };
        await saveDatabase(globeDb, "globe_os", [globeData], true);
    }

    initSettings("globe-settings", "row", [{ name: "Settings", type: "close-button", classList: ["settings-title", "settings-img-button"], func: updateGlobe }, { name: "Show day/night", type: "toggle", classList: ["settings-name", "globe-daynight-toggle"], key: "showDayNight" }, { name: "Show countries", type: "toggle", classList: ["settings-name", "globe-countries-toggle"], key: "showCountries" }, { name: "Show major cities", type: "toggle", classList: ["settings-name", "globe-cities-toggle"], key: "showCities" }, { name: "Lock globe upon selection", type: "toggle", classList: ["settings-name", "globe-autolock-toggle"], key: "autoLock" }, { type: "text-button", text: "Reset globe", classList: ["danger-button", "dimensional-button"], func: () => world.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 0) }], null, null, globeSettings);
    resetInspector();

    lockIndicator.addEventListener("click", () => {
        world.resumeAnimation().enablePointerInteraction(globeSettings.settings.showCountries || globeSettings.settings.showCities);
        lockIndicator.style.display = "none";
    });

    window.addEventListener("blur", () => {
        world.pauseAnimation();
    });
    window.addEventListener("focus", () => {
        if (lockIndicator.style.display == "none") world.resumeAnimation();
    });
}

function getClickedData(clickedElem, clickedType) {
    if (currTimeInterval) clearInterval(currTimeInterval);
    let properties = clickedElem?.properties;
    if (!properties) return;

    inspectorContent.innerHTML = "";
    
    let clickedHeader = document.createElement("div");
    clickedHeader.id = "globe-inspector-header";
    clickedHeader.classList.add("flex-split-row");
    let clickedName = document.createElement("h4");
    clickedName.id = "globe-inspector-title";

    let clickedButtons = document.createElement("div");
    clickedButtons.id = "globe-inspector-buttons";
    clickedButtons.classList.add("flex-centered-row");

    let clickedSimple = { geometry: clickedElem.geometry, properties: properties };
    const getPinIdx = () => {
        switch (clickedType) {
            case "country":
                return globeData.pinnedLocations[clickedType].findIndex(x => x.properties.ADMIN == properties.ADMIN);
            case "city":
                return globeData.pinnedLocations[clickedType].findIndex(x => x.properties.ascii_name == properties.ascii_name);
        }
    }
    let pinType = getPinIdx() == -1 ? "Pin" : "Unpin";
    let clickedPin = createImgButton(["content-overlay-window-button"], "img", `assets/images/${pinType.toLowerCase()}.svg`, "28, 176, 246", { text: pinType, position: "bottom" });
    clickedPin.addEventListener("click", () => {
        let pinIdx = getPinIdx();
        if (pinIdx == -1) {
            globeData.pinnedLocations[clickedType].push(clickedSimple);
            clickedPin.firstElementChild.src = "assets/images/unpin.svg";
        } else {
            globeData.pinnedLocations[clickedType].splice(pinIdx, 1);
            clickedPin.firstElementChild.src = "assets/images/pin.svg";
        }
        saveDatabase(globeDb, "globe_os", [globeData], true);
    });

    let clickedClear = createImgButton(["content-overlay-window-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Close", position: "bottom" });
    clickedClear.addEventListener("click", () => {
        resetInspector();
        let initialType = selectedElem?.[1];
        selectedElem = null;
        if (!globeSettings.settings.showCountries) {
            world.polygonsData([]).labelAltitude(0.002);
        } else if (initialType == "country") {
            setLayerColor("polygon");
        }
        if (!globeSettings.settings.showCities) {
            world.labelsData([]);
        } else if (initialType == "city") {
            setLayerColor("label");
        }
        world.pointOfView({ altitude: 2.5 }, 0);
        world.resumeAnimation().enablePointerInteraction(globeSettings.settings.showCountries || globeSettings.settings.showCities);
        lockIndicator.style.display = "none";
    });

    clickedButtons.append(clickedPin, clickedClear);
    clickedHeader.append(clickedName, clickedButtons);

    let clickedInfo = document.createElement("div");
    clickedInfo.id = "globe-inspector-info";
    clickedInfo.classList.add("flex-column");

    inspectorContent.append(clickedHeader, clickedInfo);

    const generateClickedInfo = (title, value, allowHTML = false) => {
        let infoContainer = document.createElement("div");
        infoContainer.classList.add("globe-inspector-card", "glass-container");
        let bgColors = getColorForTextLength(title.length, 5, 25, 0.3, 0.1);
        infoContainer.style.backgroundImage = `linear-gradient(to top right, ${bgColors.dark}, ${bgColors.light})`;

        let cardTitle = document.createElement("p");
        cardTitle.classList.add("globe-inspector-card-title");
        cardTitle.textContent = title;

        let cardValue = document.createElement(!allowHTML ? "p" : "div");
        cardValue.classList.add("globe-inspector-card-value");
        if (!allowHTML) {
            cardValue.textContent = value;
        } else {
            cardValue.innerHTML = value;
        }

        infoContainer.append(cardTitle, cardValue);
        clickedInfo.appendChild(infoContainer);
    };

    switch (clickedType) {
        case "country":
            clickedName.textContent = getPlaceTitle(properties, "country");
            
            generateClickedInfo("FORMAL NAME", properties.FORMAL_EN);
            generateClickedInfo("CODES", `<div class="globe-inspector-tag-row flex-centered-row"><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #58CC02;"><p>ISO A2</p><p>${sanitizeInnerHTML(properties.ISO_A2)}</p></div><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #43C000;"><p>ISO A3</p><p>${sanitizeInnerHTML(properties.ISO_A3)}</p></div><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #1CB0F6;"><p>UN A3</p><p>${sanitizeInnerHTML(properties.UN_A3)}</p></div></div>`.replace(/-0*99/g, "N/A"), true);
            generateClickedInfo("GEOGRAPHY", `<div class="globe-inspector-tag-row flex-centered-row"><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #B66E28;"><p>Continent</p><p>${sanitizeInnerHTML(properties.CONTINENT)}</p></div><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #F49000;"><p>Subregion</p><p>${sanitizeInnerHTML(properties.SUBREGION)}</p></div></div>`, true);
            generateClickedInfo("POPULATION", `${properties.POP_EST?.toLocaleString()} (${properties.POP_YEAR})`);
            generateClickedInfo("MEDIAN GDP", `${properties.GDP_MD?.toLocaleString()} (${properties.GDP_YEAR})`);
            generateClickedInfo("ECONOMIC DEVELOPMENT", properties.ECONOMY);
            generateClickedInfo("INCOME GROUP", properties.INCOME_GRP);
            generateClickedInfo("READ MORE", `<div class="globe-inspector-tag-row flex-centered-row"><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #2B70C9;"><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(properties.ADMIN.replaceAll(" ", "_"))}">Wikipedia</a></div><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #777777;"><a href="https://www.wikidata.org/wiki/${properties.WIKIDATAID}">Wikidata</a></div></div>`, true);

            let citiesDropdown = document.createElement("div");
            citiesDropdown.id = "globe-inspector-cities-dropdown";
            citiesDropdown.classList.add("flex-centered-row");
            citiesDropdown.innerHTML = "<h4>Major cities</h4>";
            let citiesContent = document.createElement("div");
            citiesContent.id = "globe-inspector-cities-content";
            citiesContent.style.display = "none";
            inspectorContent.append(citiesDropdown, citiesContent);
            enableDropdown("globe-inspector-cities-dropdown", "globe-inspector-cities-content");

            document.getElementById("globe-inspector-cities-dropdown").firstElementChild.addEventListener("click", async () => {
                let citiesInCountry = (await getGeoJSON("cities")).filter(x => x.properties?.country_code == properties.ISO_A2).toSorted((a, b) => a.properties.name.localeCompare(b.properties.name));
                let citiesList = document.createElement(citiesInCountry?.length > 0 ? "ul" : "p");
                citiesList.id = "globe-inspector-cities-list";
                if (citiesInCountry?.length > 0) {
                    citiesInCountry.forEach(city => {
                        let cityItem = document.createElement("li");
                        cityItem.classList.add("globe-inspector-cities-list-item", "link-like");
                        cityItem.textContent = city.properties.name;
                        cityItem.addEventListener("click", () => loadSelected(city, "city"));
                        citiesList.appendChild(cityItem);
                    });
                } else {
                    citiesList.textContent = "No major cities located in this country.";
                }
                document.getElementById("globe-inspector-cities-content").appendChild(citiesList);
            }, { once: true });

            break;

        case "city":
            clickedName.innerHTML = `${sanitizeInnerHTML(properties.name)}, <span id="globe-inspector-country-link" class="link-like">${sanitizeInnerHTML(properties.cou_name_en)}</span>`;

            document.getElementById("globe-inspector-country-link").addEventListener("click", async () => {
                let countryFound = (await getGeoJSON("countries")).find(x => x.properties?.ISO_A2 == properties.country_code);
                if (countryFound) loadSelected(countryFound, "country");
            });

            let now = new Date();
            let dateOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: properties.timezone };

            generateClickedInfo("CURRENT TIME", `<p id="globe-inspector-curr-time">${sanitizeInnerHTML(now.toLocaleString("en-US", dateOptions))}</p>`, true);
            generateClickedInfo("TIMEZONE", `<div class="globe-inspector-tag-row flex-centered-row"><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #1CB0F6;"><p>IANA</p><p>${sanitizeInnerHTML(properties.timezone)}</p></div><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #58CC02;"><p>Abbrev</p><p>${sanitizeInnerHTML(Intl.DateTimeFormat("en-US", { timeZone: properties.timezone, timeZoneName: "short" }).formatToParts(now).find(x => x.type == "timeZoneName")?.value ?? "")}</p></div><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #FF4B4B;"><p>UTC</p><p>${sanitizeInnerHTML(Intl.DateTimeFormat("en-US", { timeZone: properties.timezone, timeZoneName: "longOffset" }).formatToParts(now).find(x => x.type == "timeZoneName")?.value?.slice(3) || "00:00")}</p></div></div>`, true);
            generateClickedInfo("COORDINATES", `<div class="globe-inspector-tag-row flex-centered-row"><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #F49000;"><p>Latitude</p><p>${sanitizeInnerHTML(clickedElem.geometry.coordinates[1].toFixed(3))}</p></div><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #F49000;"><p>Longitude</p><p>${sanitizeInnerHTML(clickedElem.geometry.coordinates[0].toFixed(3))}</p></div></div>`, true);
            generateClickedInfo("POPULATION", properties.population?.toLocaleString());
            generateClickedInfo("READ MORE", `<div class="globe-inspector-tag-row flex-centered-row"><div class="globe-inspector-tag flex-centered-row" style="--tag-color: #2B70C9;"><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(properties.name.replaceAll(" ", "_"))}">Wikipedia</a></div></div>`, true);

            let currTime = document.getElementById("globe-inspector-curr-time");
            currTimeInterval = setInterval(() => {
                now.setSeconds(now.getSeconds() + 1);
                currTime.textContent = now.toLocaleString("en-US", dateOptions);
            }, 1000);

            break;
    }
}

function loadSelected(data, type) {
    getClickedData(data, type);

    let initialType = selectedElem?.[1];
    selectedElem = [data, type];

    switch (type) {
        case "country":
            if (globeSettings.settings.showCountries) {
                setLayerColor("polygon");
            } else {
                world.polygonsData([data]).labelAltitude(0.02);
            }
            if (!globeSettings.settings.showCities) {
                world.labelsData([]);
            } else if (initialType == "city") {
                setLayerColor("label");
            }
            world.pointOfView({ lat: data.properties.LABEL_Y, lng: data.properties.LABEL_X, altitude: 1 }, 0);
            break;

        case "city":
            if (globeSettings.settings.showCities) {
                setLayerColor("label");
            } else {
                world.labelsData([data]);
            }
            if (!globeSettings.settings.showCountries) {
                world.polygonsData([]).labelAltitude(0.002);
            } else if (initialType == "country") {
                setLayerColor("polygon");
            }
            world.pointOfView({ lat: data.geometry.coordinates[1], lng: data.geometry.coordinates[0], altitude: 0.3 }, 0);
            break;
    }

    world.resumeAnimation();
    if (globeSettings.settings.autoLock) pauseScene(2);
}

async function getGeoJSON(key) {
    if (geojson[key]) return geojson[key];

    switch (key) {
        case "countries":
            geojson[key] = (await fetch("https://cdn.jsdelivr.net/gh/WOZARDLOZARD/world-data@refs/heads/main/countries/ne_110m_admin_0_countries.geojson").then(res => res.json())).features.filter(d => d.properties.ISO_A2 != "AQ");
            break;

        case "cities":
            geojson[key] = (await fetch("https://cdn.jsdelivr.net/gh/WOZARDLOZARD/world-data@refs/heads/main/cities/cities-over-1mil.geojson").then(res => res.json())).features;
            break;
    }

    return geojson[key];
}

function setLayerColor(layer) {
    switch (layer) {
        case "label":
            world.labelColor(d => (selectedElem == null || selectedElem[1] != "city" || d != selectedElem[0]) ? "rgba(255, 165, 0, 0.75)" : "rgba(0, 145, 255, 0.75)");
            break;

        case "polygon":
            world.polygonCapColor(d => getColorForTextLength(d.properties?.ADMIN?.length ?? 1, 1, 30, (selectedElem == null || selectedElem[1] != "country" || d != selectedElem[0]) ? 0.3 : 0.9, 0).light);
            break;
    }
}

function resetInspector() {
    inspectorContent.innerHTML = "";

    const createEntryElem = (entry, type) => {
        let entryElem = document.createElement("p");
        entryElem.classList.add("globe-search-result", "link-like");
        entryElem.textContent = getPlaceTitle(entry.properties, type);
        entryElem.addEventListener("click", () => loadSelected(entry, type));
        return entryElem;
    }

    let searchActive = false;

    let searchRow = document.createElement("div");
    searchRow.id = "globe-search-row";
    searchRow.classList.add("flex-centered-row");

    let searchBar = document.createElement("input");
    searchBar.classList.add("right-panel-input");
    searchBar.type = "text";
    searchBar.placeholder = "Search for...";
    searchBar.addEventListener("input", () => {
        if (searchActive) {
            document.getElementById("globe-search-results-container")?.remove();
            searchActive = false;
        }
    });
    searchRow.appendChild(searchBar);

    const performSearch = async category => {
        if (!searchBar.value) return;
        let searchVal = searchBar.value.toLowerCase();
        let selectedData = await getGeoJSON(category.name.toLowerCase());

        let searchResults = document.getElementById("globe-search-results-container");
        if (searchResults) {
            searchResults.innerHTML = "";
        } else {
            searchResults = document.createElement("div");
            searchResults.id = "globe-search-results-container";
            searchResults.classList.add("flex-column", "glass-container", "glass-bg");
        }

        let foundEntries = selectedData.filter(({ properties: x }) => x[category.propertiesKey] && x[category.propertiesKey].toLowerCase().includes(searchVal));
        if (foundEntries.length > 0) {
            foundEntries.sort((a, b) => a.properties[category.propertiesKey].localeCompare(b.properties[category.propertiesKey]));
            foundEntries.forEach(entry => searchResults.appendChild(createEntryElem(entry, category.type)));
        } else {
            searchResults.innerHTML = `<p>No ${category.name.toLowerCase()} found.</p>`;
        }

        searchRow.appendChild(searchResults);
        searchActive = true;
    }

    inspectorContent.append(searchRow, createImgTextDiv([["flex-centered-row"], [], []], ["globe-inspector-empty", null, null], "img", "assets/images/info.svg", { label: "Option 1: Select a city or country from the globe.\nOption 2: Search for a city or country using the bar above.", position: "left" }, "p", "No location selected.", null, "text-first"));
    
    let pinnedContainer = document.createElement("div");
    pinnedContainer.id = "globe-inspector-pinned-container";
    pinnedContainer.classList.add("flex-column");
    pinnedContainer.innerHTML = '<h4 class="right-panel-subheader">Pinned locations</h4>';
    
    let dataCategories = [{ name: "Countries", propertiesKey: "ADMIN", type: "country" }, { name: "Cities", propertiesKey: "ascii_name", type: "city" }];
    let now = new Date();
    for (let category of dataCategories) {
        let buttonElem = document.createElement("p");
        buttonElem.classList.add("globe-search-button", "dimensional-button", "blue-button");
        buttonElem.textContent = category.name;
        buttonElem.addEventListener("click", () => performSearch(category));
        searchRow.appendChild(buttonElem);

        if (globeData.pinnedLocations[category.type]?.length > 0) {
            let pinnedGroup = document.createElement("div");
            pinnedGroup.classList.add("globe-inspector-pinned-group", "flex-column");
            pinnedGroup.innerHTML = `<h4>${category.name}</h4>`;
            for (let entry of globeData.pinnedLocations[category.type]) {
                let pinnedRow = document.createElement("div");
                pinnedRow.classList.add("globe-inspector-pinned-row", "flex-split-row");
                pinnedRow.appendChild(createEntryElem(entry, category.type));
                if (category.type == "city") {
                    let pinnedTime = document.createElement("p");
                    pinnedTime.textContent = now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: entry.properties.timezone });
                    pinnedRow.appendChild(pinnedTime);
                }
                pinnedGroup.appendChild(pinnedRow);
            }
            pinnedContainer.appendChild(pinnedGroup);
        }
    }

    if (!pinnedContainer.innerHTML) pinnedContainer.innerHTML = "<p>No locations pinned. Use the Pin button to pin cities and countries for quick access.</p>";
    inspectorContent.appendChild(pinnedContainer);
}

function getPlaceTitle(properties, type) {
    switch (type) {
        case "country":
            return `${properties.ISO_A2 && properties.ISO_A2 != "-99" ? `${Array.from(properties.ISO_A2.toUpperCase()).map(letter => String.fromCodePoint(letter.charCodeAt(0) + 127397)).join("")} ` : ""}${properties.ADMIN} (${properties.NAME_ZH})`;
        case "city":
            return `${properties.name}, ${properties.cou_name_en}`;
    }
}

function pauseScene(waitFrames = 1) {
    let frames = 0;
    function frameCallback() {
        frames++;
        if (frames < waitFrames) {
            requestAnimationFrame(frameCallback);
        } else {
            lockIndicator.style.display = "block";
            world.enablePointerInteraction(false).pauseAnimation();
        }
    }
    requestAnimationFrame(frameCallback);
}



window.addEventListener("load", () => {
    initGlobe();
    checkDbBackup("button");
});