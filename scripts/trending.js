let trendingDb, trendingData = [];

async function initTrending() {
    trendingDb = await openDatabase(["trending_db", 1], ["trending_os", "type"], ["fetchAt", "data"]);

    let trendingTypes = ["movies", "books", "music"], toSave = false;
    for (let type of trendingTypes) {
        let trendingObj = await readDatabase(trendingDb, "trending_os", type);
        if (!trendingObj) {
            trendingObj = {
                type,
                fetchAt: 0,
                data: null,
                favorites: [],
            };
            toSave = true;
        }
        trendingData.push(trendingObj);
    }
    if (toSave) await saveDatabase(trendingDb, "trending_os", trendingData, true);

    let now = new Date();

    getTrendingMovies(now);
    getNYTBestsellers(now);
    getSpotifyTop(now);
}

async function getTrendingMovies(now) {
    let data;

    if (now.getTime() > trendingData[0].fetchAt) {
        try {
            let resp = await fetch(`https://popular-movies-data.stevenlu.com/movies.json`);
            data = await resp.json();

            if (data?.length > 0) {
                trendingData[0].data = data;
                let tomorrow = adjustDate(new Date(), 1);
                trendingData[0].fetchAt = tomorrow.getTime();
                await saveDatabase(trendingDb, "trending_os", [trendingData[0]], false);
            }
        } catch {
            console.log("Trending movies error");
            data = trendingData[0].data;
        }
    } else {
        data = trendingData[0].data;
    }

    if (!data?.length) return;
    data = data.filter((a => s => s.imdb_id && !a.has(s.imdb_id) && a.add(s.imdb_id))(new Set()));

    let [favoriteList, , listContent] = createListLayout("Viewing list", 0, null, null, null);
    let list = createList("trending-movies-list");
    data.forEach((movie, i) => {
        createListItem(i + 1, null, movie.poster_url, movie.title, movie.genres?.length > 0 ? movie.genres.slice(0, 3).map(x => capitalizeWords(x, "_")).join(", ") + (movie.genres.length > 3 ? ` & ${movie.genres.length - 3} more` : "") : "", `${movie.title} movie`, null, movie.imdb_id, 0, list);
    });

    listContent.appendChild(list);
    document.getElementById("trending-movies").append(favoriteList, listContent);
}

async function getNYTBestsellers(now) {
    let data;

    if (now.getTime() > trendingData[1].fetchAt) {
        try {
            let resp = await fetch(`https://api.nytimes.com/svc/books/v3/lists/overview.json?api-key=${API_KEYS.nyt}`);
            data = await resp.json();

            if (data?.results?.lists?.length > 0) {
                trendingData[1].data = data;
                trendingData[1].fetchAt = new Date(`${data.results?.published_date} 00:00:00`).getTime();
                await saveDatabase(trendingDb, "trending_os", [trendingData[1]], false);
            }
        } catch {
            console.log("NYT bestseller error");
            data = trendingData[1].data;
        }
    } else {
        data = trendingData[1].data;
    }

    if (!data?.results?.lists?.length) return;
    data.results.lists = data.results.lists.filter(x => x.books?.length);

    let [favoriteList, listSelector, listContent] = createListLayout("Reading list", 1, data.results.lists, x => x.display_name, x => x.list_name_encoded);
    listSelector.addEventListener("input", event => {
        loadList(event.target.value);
    });

    function loadList(encodedName) {
        let listFound = data.results.lists.find(x => x.list_name_encoded == encodedName);
        if (!listFound) return;

        const bookHighlights = (currVal, book, highlightObj, idx, type, text) => {
            if (currVal > highlightObj.max) {
                highlightObj.items = [book];
                highlightObj.max = currVal;
            } else if (currVal == highlightObj.max) {
                highlightObj.items.push(book);
            }

            if (idx == listFound.books.length - 1) {
                if (highlightObj.items.length > 0) allHighlights.push({ type, text: text.replace("${items}", highlightObj.items.map(x => x.title).join(", ")).replace("${max}", highlightObj.max) });
            }
        }

        let consecutiveWeeks = { items: [], max: 3 }, greatestGain = { items: [], max: 5 }, allHighlights = [];
        let list = createList("trending-books-list");
        listFound.books.forEach((book, idx) => {
            let rankDelta = book.rank_last_week == 0 ? 0 : book.rank - book.rank_last_week;
            book.title = capitalizeWords(book.title, " ", true);
            createListItem(book.rank, rankDelta, book.book_image, book.title, book.author, `${book.title} ${book.author}`, book.description, `${book.title} ${book.author}`.toLowerCase(), 1, list);

            bookHighlights(book.weeks_on_list, book, consecutiveWeeks, idx, "LONGEST STREAK", "${items} has been on this list the longest, at ${max} weeks straight.");
            bookHighlights(rankDelta * -1, book, greatestGain, idx, "GREATEST GAINER", "${items} is the biggest gainer on this list, up ${max} spots.");
        });
        listContent.appendChild(list);

        let highestNew = listFound.books.find(x => x.weeks_on_list == 1);
        if (highestNew) allHighlights.push({ type: "HIGHEST NEW ENTRY", text: `${highestNew.title} is the highest new entry on this list, at #${highestNew.rank}.` });
        
        if (allHighlights.length > 0) createHighlights("trending-books-highlights", allHighlights, "type", "text", listContent);
    }

    loadList(data.results.lists[0].list_name_encoded);

    document.getElementById("trending-books").append(favoriteList, listSelector, listContent);
}

async function getSpotifyTop(now) {
    let data;

    if (now.getTime() > trendingData[2].fetchAt) {
        try {
            let resp = await fetch(`https://charts-spotify-com-service.spotify.com/public/v0/charts`);
            data = await resp.json();

            if (data?.chartEntryViewResponses?.length > 0) {
                trendingData[2].data = data;
                let friday = adjustDate(new Date(), ((12 - now.getDay()) % 7 || 7));
                friday.setHours(0, 0, 0, 0);
                trendingData[2].fetchAt = friday.getTime();
                await saveDatabase(trendingDb, "trending_os", [trendingData[2]], false);
            }
        } catch (err) {
            console.log("Spotify top error");
            data = trendingData[2].data;
        }
    } else {
        data = trendingData[2].data;
    }

    if (!data?.chartEntryViewResponses?.length) return;
    let filteredCharts = data.chartEntryViewResponses.filter(x => x.displayChart?.chartMetadata?.dimensions?.chartType && x.displayChart?.chartMetadata?.readableTitle);
    if (!filteredCharts.length) return;

    let [favoriteList, listSelector, listContent] = createListLayout("Listening list", 2, filteredCharts, x => x.displayChart.chartMetadata.readableTitle, x => x.displayChart.chartMetadata.dimensions.chartType);
    listSelector.addEventListener("input", event => {
        loadList(event.target.value);
    });

    function loadList(chartType) {
        let listFound = filteredCharts.find(x => x.displayChart.chartMetadata.dimensions.chartType == chartType);
        if (!listFound) return;

        const chartTypeAccessors = {
            "TOP_TRACK": entry => ({
                image: entry.trackMetadata.displayImageUri,
                name: entry.trackMetadata.trackName,
                author: entry.trackMetadata.artists[0].name + (entry.trackMetadata.artists.length > 1 ? ` & ${entry.trackMetadata.artists.length - 1} more` : ""),
                id: entry.trackMetadata.trackUri,
            }),
            "TOP_ALBUM": entry => ({
                image: entry.albumMetadata.displayImageUri,
                name: entry.albumMetadata.albumName,
                author: entry.albumMetadata.artists[0].name + (entry.albumMetadata.artists.length > 1 ? ` & ${entry.albumMetadata.artists.length - 1} more` : ""),
                id: entry.albumMetadata.albumUri,
            }),
            "TOP_ARTIST": entry => ({
                image: entry.artistMetadata.displayImageUri,
                name: entry.artistMetadata.artistName,
                author: "",
                id: entry.artistMetadata.artistUri,
            })
        };

        let list = createList("trending-music-list");
        listFound.entries.forEach(entry => {
            let { image, name, author, id } = chartTypeAccessors[chartType](entry);
            createListItem(entry.chartEntryData.currentRank, entry.chartEntryData.previousRank == -1 ? 0 : entry.chartEntryData.currentRank - entry.chartEntryData.previousRank, image, name, author, `${name} ${author.split(" & ")[0]}`, null, id, 2, list);
        });
        listContent.appendChild(list);

        if (listFound.highlights?.length > 0) {
            createHighlights("trending-music-highlights", listFound.highlights, "type", "text", listContent);
        }
    }

    loadList(filteredCharts[0].displayChart.chartMetadata.dimensions.chartType);

    document.getElementById("trending-music").append(favoriteList, listSelector, listContent);
}

function createListLayout(favoriteName, dataIdx, listArr, displayFn, valueFn) {
    const generateAdditional = (favorite, favoriteAdditional) => {
        favoriteAdditional.innerHTML = "";
        if (favorite.additionalData.length > 0) {
            favorite.additionalData.forEach(additional => {
                let additionalItem = createImgTextDiv([["trending-favorite-additional-item", "flex-centered-row"], [], []], [null, null, null], "img", additional.icon, null, additional.url ? "a" : "p", additional.text, additional.url);
                if (additional.html) additionalItem.lastElementChild.innerHTML = additional.html;
                favoriteAdditional.appendChild(additionalItem);
            });
        }
    }

    let favoriteList = document.createElement("p");
    favoriteList.id = `trending-favorites-${dataIdx}`;
    favoriteList.classList.add("trending-favorites", "dimensional-button");
    favoriteList.textContent = `${favoriteName} (${trendingData[dataIdx].favorites?.length ?? 0})`;
    favoriteList.dataset.favoriteName = favoriteName;
    favoriteList.addEventListener("click", () => {
        let [favoriteOverlay, favoriteWindow] = createOverlay("trending-favorites-window");

        let favoriteHeader = document.createElement("div");
        favoriteHeader.classList.add("content-overlay-window-header", "flex-centered-row");
        let favoriteTitle = document.createElement("h3");
        favoriteTitle.classList.add("content-overlay-window-title");
        favoriteTitle.textContent = favoriteName;
        let favoriteRefreshAll = createImgButton(["content-overlay-window-button"], "img", "assets/images/refresh.svg", "28, 176, 246", { text: "Refresh all", position: "bottom" });
        favoriteRefreshAll.addEventListener("click", async () => {
            if (trendingData[dataIdx].favorites.length > 0) {
                let authData = await getAuthData(dataIdx);
                if (authData == 1) return;

                for (let i = 0; i < trendingData[dataIdx].favorites.length; i++) {
                    let favoriteAdditional = favoriteContent.children[i].querySelector(".trending-favorite-additional");
                    favoriteAdditional.innerHTML = "<p>Refreshing data...</p>";
                    let additionalData = await getAdditionalData(dataIdx, trendingData[dataIdx].favorites[i].id, authData);
                    if (!additionalData) break;
                    trendingData[dataIdx].favorites[i].additionalData = additionalData;
                    generateAdditional(trendingData[dataIdx].favorites[i], favoriteAdditional);
                }

                await saveDatabase(trendingDb, "trending_os", [trendingData[dataIdx]], true);
            }
        });
        favoriteHeader.append(favoriteTitle, favoriteRefreshAll);

        let favoriteContent = document.createElement("div");
        favoriteContent.id = "trending-favorites-window-content";
        favoriteContent.classList.add("flex-column");
        if (trendingData[dataIdx].favorites.length > 0) {
            trendingData[dataIdx].favorites.forEach(favorite => {
                let [favoriteItem, itemMain, itemExtended] = createItemLayout();
                itemMain.classList.add("trending-favorite-item-main");

                let itemTitle = document.createElement("div");
                itemTitle.classList.add("trending-favorite-item-title", "flex-centered-row");
                let [itemImg, textContainer] = createItemComponents(favorite.image, favorite.name, favorite.author, favorite.nameQuery);
                itemTitle.append(itemImg, textContainer);

                let favoriteAdditional = document.createElement("div");
                favoriteAdditional.classList.add("trending-favorite-additional", "flex-centered-row");
                generateAdditional(favorite, favoriteAdditional);

                let favoriteButtons = document.createElement("div");
                favoriteButtons.classList.add("trending-item-mgmt", "flex-centered-row");

                let favoriteInfo = createImgButton([], "img", "assets/images/info.svg", "28, 176, 246", { text: "More info", position: "left" });
                favoriteInfo.addEventListener("click", async event => {
                    event.stopPropagation();
                    toggleExtended(itemExtended, dataIdx, favorite.description, favorite.id);
                });

                let favoriteRefresh = createImgButton([], "img", "assets/images/refresh.svg", "28, 176, 246", { text: "Refresh data", position: "left" });
                favoriteRefresh.addEventListener("click", async event => {
                    event.stopPropagation();

                    favoriteAdditional.innerHTML = "<p>Refreshing data...</p>";

                    let additionalData = await getAdditionalData(dataIdx, favorite.id);
                    if (!additionalData) {
                        favoriteAdditional.innerHTML = "<p>Refresh failed</p>";
                    } else {
                        favorite.additionalData = additionalData;
                        await saveDatabase(trendingDb, "trending_os", [trendingData[dataIdx]], true);
                    }

                    generateAdditional(favorite, favoriteAdditional);
                });

                let favoriteRemove = createImgButton([], "img", "assets/images/delete.svg", "234, 51, 35", { text: "Remove from list", position: "left" });
                favoriteRemove.addEventListener("click", async event => {
                    event.stopPropagation();

                    trendingData[dataIdx].favorites = trendingData[dataIdx].favorites.filter(x => x.id != favorite.id);
                    await saveDatabase(trendingDb, "trending_os", [trendingData[dataIdx]], true);

                    favoriteItem.remove();
                    if (favoriteContent.children.length == 0) favoriteContent.innerHTML = "<p>No items saved to this list. Click the + button next to an item to add it.</p>";
                    let favoriteElem = document.getElementById(`trending-favorites-${dataIdx}`);
                    favoriteElem.textContent = `${favoriteElem.dataset.favoriteName} (${trendingData[dataIdx].favorites.length})`;
                });

                favoriteButtons.append(favoriteInfo, favoriteRefresh, favoriteRemove);
                itemMain.append(itemTitle, favoriteAdditional, favoriteButtons);
                favoriteItem.append(itemMain, itemExtended);
                favoriteContent.appendChild(favoriteItem);
            });
        } else {
            favoriteContent.innerHTML = "<p>No items saved to this list. Click the + button next to an item to add it.</p>";
        }

        let closeButton = createImgButton(["content-overlay-window-close", "content-overlay-window-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Close", position: "bottom" });
        closeButton.addEventListener("click", () => favoriteOverlay.remove());

        favoriteWindow.append(favoriteHeader, favoriteContent, closeButton);
        favoriteOverlay.appendChild(favoriteWindow);
        document.body.appendChild(favoriteOverlay);
    });

    let listContent = document.createElement("div");

    let listSelector;
    if (listArr) {
        listSelector = document.createElement("select");
        listSelector.classList.add("trending-select");
        listArr.forEach(list => {
            listSelector.options.add(new Option(displayFn(list), valueFn(list)));
        });
        listContent.style.setProperty("--height-reduction", "40px");
    }

    listContent.classList.add("trending-content", "flex-column");

    return [favoriteList, listSelector, listContent];
}

function createList(listId) {
    document.getElementById(listId)?.remove();
    let list = document.createElement("div");
    list.id = listId;
    list.classList.add("trending-list", "flex-column");
    return list;
}

function createListItem(rank, rankDelta, image, name, author, nameQuery, description, id, dataIdx, appendDest) {
    let [item, itemMain, itemExtended] = createItemLayout();
    
    let rankContainer = document.createElement("div");
    rankContainer.classList.add("trending-list-item-rank-container", "flex-centered-row");

    let rankText = document.createElement("h3");
    rankText.classList.add("trending-list-item-rank");
    rankText.textContent = rank;

    let rankArrow;

    if (rankDelta != null) {
        if (rankDelta == 0) {
            rankArrow = document.createElement("p");
            rankArrow.textContent = "=";
        } else {
            rankArrow = createArrowSvg("22", rankDelta < 0 ? "up" : "down");
            rankArrow.style.color = rankDelta < 0 ? "#72ff79" : "#ff7272";

            rankContainer.classList.add("hover-label");
            rankContainer.dataset.label = rankDelta < 0 ? `up ${Math.abs(rankDelta)}` : `down ${Math.abs(rankDelta)}`;
            rankContainer.dataset.position = "right";
        }
        rankArrow.classList.add("trending-list-item-rank-arrow");
    }
    rankContainer.append(rankText, ...(rankArrow ? [rankArrow] : []));

    let [itemImg, textContainer] = createItemComponents(image, name, author, nameQuery);

    let mgmtButtons = document.createElement("div");
    mgmtButtons.classList.add("trending-item-mgmt", "flex-centered-row");

    let itemInfo = createImgButton([], "img", "assets/images/info.svg", "28, 176, 246", { text: "More info", position: "left" });
    itemInfo.addEventListener("click", async event => {
        event.stopPropagation();
        toggleExtended(itemExtended, dataIdx, description, id);
    });

    let favoriteAdd = createImgButton([], "img", "assets/images/add.svg", "28, 176, 246", { text: "Add to list", position: "left" });
    favoriteAdd.addEventListener("click", async event => {
        event.stopPropagation();
        if (trendingData[dataIdx].favorites.find(x => x.id == id)) return;

        let additionalData = await getAdditionalData(dataIdx, id);
        trendingData[dataIdx].favorites.push({ id, image, name, author, nameQuery, description, additionalData });
        await saveDatabase(trendingDb, "trending_os", [trendingData[dataIdx]], true);

        let favoriteElem = document.getElementById(`trending-favorites-${dataIdx}`);
        favoriteElem.textContent = `${favoriteElem.dataset.favoriteName} (${trendingData[dataIdx].favorites.length})`;
    });

    mgmtButtons.append(itemInfo, favoriteAdd);
    itemMain.append(rankContainer, itemImg, textContainer, mgmtButtons);
    item.append(itemMain, itemExtended);
    appendDest.appendChild(item);
}

function createItemLayout() {
    let item = document.createElement("div");
    item.classList.add("trending-list-item", "flex-column");
    let itemMain = document.createElement("div");
    itemMain.classList.add("trending-list-item-main", "flex-centered-row");
    let itemExtended = document.createElement("div");
    itemExtended.classList.add("trending-list-item-extended");
    itemExtended.style.display = "none";
    return [item, itemMain, itemExtended];
}

function createItemComponents(image, name, author, nameQuery) {
    let itemImg = document.createElement("img");
    itemImg.classList.add("trending-list-item-img");
    itemImg.loading = "lazy";
    itemImg.src = image;

    let textContainer = document.createElement("div");
    textContainer.classList.add("trending-list-item-text", "flex-column");
    let nameText = document.createElement("a");
    nameText.textContent = name;
    nameText.href = `https://www.google.com/search?q=${encodeURIComponent(nameQuery)}`;
    nameText.target = "_blank";
    textContainer.appendChild(nameText);
    textContainer.innerHTML += `<p style="color: #b4b4b4;">${sanitizeInnerHTML(author)}</p>`;

    return [itemImg, textContainer];
}

function createHighlights(highlightId, highlights, typeKey, textKey, appendDest) {
    document.getElementById(highlightId)?.remove();

    let highlightContainer = document.createElement("div");
    highlightContainer.id = highlightId;
    highlightContainer.classList.add("trending-highlight-container", "flex-column");

    let highlightTitle = createImgTextDiv([["trending-highlight-title", "flex-centered-row"], [], []], [null, null, null], "svg", createIntelligentSvg("20"), null, "h3", "Highlights", null);
    highlightContainer.appendChild(highlightTitle);

    highlights.forEach(highlight => {
        let highlightItem = document.createElement("div");
        highlightItem.classList.add("trending-highlight-item", "glass-container", "flex-column");
        highlightItem.innerHTML = `<p class="trending-highlight-type">${sanitizeInnerHTML(highlight[typeKey].replaceAll("_", " "))}</p><p class="trending-highlight-text">${sanitizeInnerHTML(highlight[textKey])}</p>`;
        let bgColors = getColorForTextLength(highlight[typeKey].length, 10, 25, 0.3, 0.1);
        highlightItem.style.backgroundImage = `linear-gradient(to top right, ${bgColors.dark}, ${bgColors.light})`;
        highlightContainer.appendChild(highlightItem);
    });

    appendDest.appendChild(highlightContainer);
}

async function getExtendedInfo(dataIdx, description, id) {
    switch (dataIdx) {
        case 0:
            let omdbResp = await fetch(`https://www.omdbapi.com/?apikey=${API_KEYS.omdb}&plot=full&i=${id}`);
            let omdbData = await omdbResp.json();
            if (!omdbData) return `<p>No movie info found</p>`;

            let rtRating = omdbData.Ratings?.find(x => x.Source == "Rotten Tomatoes")?.Value ?? "?";
            return `<div class="flex-centered-row" style="column-gap: 8px;"><img src="assets/images/imdb.svg"><p>${sanitizeInnerHTML(omdbData.Ratings?.find(x => x.Source == "Internet Movie Database")?.Value ?? "?")}</p><img src="assets/images/${rtRating == "?" ? "rt-good.svg" : parseInt(rtRating) >= 80 ? "rt-fresh.svg" : parseInt(rtRating) >= 60 ? "rt-good.svg" : "rt-rotten.svg"}"><p>${sanitizeInnerHTML(rtRating)}</p><img src="assets/images/metacritic.svg"><p>${sanitizeInnerHTML(omdbData.Ratings?.find(x => x.Source == "Metacritic")?.Value ?? "?")}</p></div><p>${sanitizeInnerHTML(omdbData.Plot ?? "Plot unknown")}</p>`;
        
        case 1:
            return `<p>${sanitizeInnerHTML(description)}</p>`;
    }
}

async function toggleExtended(itemExtended, dataIdx, description, id) {
    if (itemExtended.style.display == "none" && !itemExtended.innerHTML) {
        let extendedInfo = await getExtendedInfo(dataIdx, description, id);
        itemExtended.innerHTML = extendedInfo;
    }

    itemExtended.style.display = itemExtended.style.display == "none" ? "block" : "none";
}

async function getAdditionalData(dataIdx, id, authData) {
    let additionalData = [];
    switch (dataIdx) {
        case 0:
            let streamingData;
            try {
                let streamingResp = await fetch(`https://watchmode.p.rapidapi.com/title/${id}/sources`, { headers: { "x-rapidapi-key": "9d5e407706msh1037ca54a6012f2p1ad021jsn8eef606adcb3", "x-rapidapi-host": "watchmode.p.rapidapi.com" } });
                streamingData = await streamingResp.json();
            } catch {
                streamingData = null;
            }

            if (streamingData?.length > 0) {
                streamingData = streamingData.filter(x => x.region == "CA").reduce((acc, x) => {
                    let key = `<a href="${sanitizeURL(x.web_url)}">${sanitizeInnerHTML(x.name)}</a>`;
                    let value = sanitizeInnerHTML(`${x.type}` + (x.price ? ` $${x.price}` : ""));
                    if (!acc[key]) acc[key] = new Set();
                    acc[key].add(value);
                    return acc;
                }, {});
            } else {
                streamingData = null;
            }

            if (!streamingData) {
                additionalData.push({ icon: "assets/images/streaming.svg", text: "Unavailable" });
            } else {
                let displayArr = [];
                for (let [name, set] of Object.entries(streamingData)) {
                    displayArr.push(`${name} (${[...set].join(", ")})`);
                }
                additionalData.push({ icon: "assets/images/streaming.svg", text: "", html: displayArr.join("<br>") });
            }

            break;

        case 1:
            const findBib = key => {
                return Object.values(authData?.[key]?.bibs || {}).find(x => x.briefInfo?.title && id.toLowerCase().startsWith(x.briefInfo.title.toLowerCase()));
            }
            const findDetails = (entityKey, subKey, bibId) => {
                return Object.values(authData?.[entityKey]?.[subKey] || {}).find(x => x.metadataId == bibId);
            }

            let eplData;
            let holdBib = findBib("holdEntities"), checkoutBib = findBib("checkoutEntities");
            let formatMap = { "BK": "Paper", "EBOOK": "Ebook" };

            if (holdBib) {
                let holdFound = findDetails("holdEntities", "holds", holdBib.id);
                additionalData.push({ icon: "assets/images/bookshelf.svg", text: "", html: `${formatMap[holdBib.briefInfo.format] ?? "Unknown type"} – <span style="color: rgb(255, 241, 114);">On hold</span>, #${holdFound?.holdsPosition ?? "?"} on ${holdBib.availability?.totalCopies ?? "?"} copies (~${(Math.ceil(holdFound?.holdsPosition / holdBib.availability?.totalCopies)) * 3} weeks wait)` }, { icon: "assets/images/star.svg", text: holdBib.briefInfo.rating?.averageRating ? `${holdBib.briefInfo.rating.averageRating}% (${holdBib.briefInfo.rating.totalCount})` : "No ratings" });
            } else if (checkoutBib) {
                let checkoutFound = findDetails("checkoutEntities", "checkouts", checkoutBib.id);
                additionalData.push({ icon: "assets/images/bookshelf.svg", text: "", html: `${formatMap[checkoutBib.briefInfo.format] ?? "Unknown type"} – <span style="color: #58CC02;">Checked out</span>, due on ${checkoutFound.dueDate}` }, { icon: "assets/images/star.svg", text: checkoutBib.briefInfo.rating?.averageRating ? `${checkoutBib.briefInfo.rating.averageRating}% (${checkoutBib.briefInfo.rating.totalCount})` : "No ratings" });
            } else {
                try {
                    let eplResp = await fetch(`https://gateway.bibliocommons.com/v2/libraries/epl/bibs/search?locale=en-CA`, {
                        method: "POST",
                        headers: { "Accept": "application/json", "Accept-Encoding": "gzip, deflate, br", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15" },
                        body: JSON.stringify({ query: id, searchType: "keyword", "f_FORMAT": "BK|EBOOK", view: "grouped" })
                    });
                    eplData = await eplResp.json();
                } catch {
                    eplData = null;
                }

                eplData = Object.values(eplData?.entities?.bibs || {});
                if (!eplData?.length) {
                    additionalData.push({ icon: "assets/images/bookshelf.svg", text: "Availability unknown" }, { icon: "assets/images/star.svg", text: "Rating unknown" });
                } else {
                    additionalData.push({ icon: "assets/images/bookshelf.svg", text: "", html: eplData.map(x => `<p><a href="https://epl.bibliocommons.com/v2/record/${sanitizeInnerHTML(x.id)}">${formatMap[x.briefInfo.format] ?? "Book"}</a>: ${sanitizeInnerHTML(capitalizeWords(x.availability.status, "_"))} – <a href="https://epl.bibliocommons.com/v2/availability/${sanitizeInnerHTML(x.id)}">${sanitizeInnerHTML(`${x.availability.heldCopies} holds on ${x.availability.totalCopies} copies (~${(Math.ceil(x.availability.heldCopies / x.availability.totalCopies) - 1) * 3} weeks wait, ${(x.availability.heldCopies / x.availability.totalCopies).toFixed(1)} p/b)`)}</a></p>`).join("") }, { icon: "assets/images/star.svg", text: eplData[0].briefInfo.rating.averageRating ? `${eplData[0].briefInfo.rating.averageRating}% (${eplData[0].briefInfo.rating.totalCount})` : "No ratings" });
                }
            }

            break;

        case 2:
            let spotifyToken = await getSpotifyToken();
            if (spotifyToken) {
                let spotifyData;
                try {
                    let spotifyResp = await fetch(`https://api.spotify.com/v1/tracks/${id.split(":").at(-1)}`, { headers: { "Authorization": `Bearer ${spotifyToken}` } });
                    spotifyData = await spotifyResp.json();
                } catch {
                    spotifyData = null;
                }

                if (!spotifyData) {
                    additionalData.push({ icon: "assets/images/album.svg", text: "Unknown" });
                } else {
                    additionalData.push({ icon: "assets/images/album.svg", text: spotifyData.album?.name, url: spotifyData.album?.external_urls?.spotify }, { icon: "assets/images/leaderboard.svg", text: `${spotifyData.popularity}%` });
                }
            }

            break;
    }
    return additionalData;
}

async function getAuthData(dataIdx) {
    switch (dataIdx) {
        case 1:
            let holdData;
            try {
                let holdResp = await fetch(`https://gateway.bibliocommons.com/v2/libraries/epl/holds?accountId=212732056&size=25&status=&page=1&sort=&materialType=&locale=en-CA`);
                holdData = await holdResp.json();
            } catch {
                holdData = null;
            }

            if (holdData?.error) {
                let eplLogin = confirm("Not logged in to EPL account. Would you like to log in?");
                if (eplLogin) {
                    window.open("https://epl.bibliocommons.com/user/login?destination=user_dashboard", "_blank");
                    return 1;
                } else {
                    return null;
                }
            }

            let checkoutData;
            try {
                let checkoutResp = await fetch(`https://gateway.bibliocommons.com/v2/libraries/epl/checkouts?accountId=212732056&size=25&status=&page=1&sort=status&materialType=&locale=en-CA`);
                checkoutData = await checkoutResp.json();
            } catch {
                checkoutData = null;
            }

            return { holdEntities: holdData?.entities, checkoutEntities: checkoutData?.entities };

        default:
            return null;
    }
}

async function getSpotifyToken() {
    let existingToken = getCookie("spotifyToken");
    if (existingToken) return existingToken;

    try {
        let resp = await fetch(`https://accounts.spotify.com/api/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=client_credentials&client_id=${API_KEYS.spotify[0]}&client_secret=${API_KEYS.spotify[1]}`
        });
        let data = await resp.json();
        if (!data?.access_token) return null;

        setCookie("spotifyToken", data.access_token, 1);
        return data.access_token;
    } catch {
        return null;
    }
}