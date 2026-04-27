async function getCanvasCalendar(keysData) {
    let now = new Date(), year = now.getFullYear();
    let checkpoints = [new Date(year, 0, 1), new Date(year, 4, 1), new Date(year, 8, 1)];
    let closestDate = checkpoints.filter(d => d <= now).sort((a, b) => b - a)[0];
    let url = `${IS_LOCAL ? API_KEYS.canvas[0] : keysData.canvas[0]}/api/v1/planner/items?order=asc&per_page=100&start_date=${closestDate.toISOString().slice(0, 10)}`;

    /*
    let courseResp = await fetch(`${IS_LOCAL ? API_KEYS.canvas[0] : keysData.canvas[0]}/api/v1/courses`, { headers: { "Authorization": `Bearer ${IS_LOCAL ? API_KEYS.canvas[1] : keysData.canvas[1]}` } });
    let courseData = await courseResp.json();
    if (!courseData?.length) return null;

    let calendarResp = await fetch(`${IS_LOCAL ? API_KEYS.canvas[0] : keysData.canvas[0]}/api/v1/calendar_events?type=assignment&${courseData.map(x => `context_codes%5B%5D=course_${x.id}`).join("&")}`, { headers: { "Authorization": `Bearer ${IS_LOCAL ? API_KEYS.canvas[1] : keysData.canvas[1]}` } });
    */

    let allPlannerData = [];
    while (url) {
        let plannerData = await fetchJSON(url, { headers: { "Authorization": `Bearer ${IS_LOCAL ? API_KEYS.canvas[1] : keysData.canvas[1]}` } }, true);
        if (!plannerData?.json?.length) break;
        allPlannerData = allPlannerData.concat(plannerData.json);

        let linkHeader = plannerData.headers["Link"];
        url = null;
        if (linkHeader) {
            let matches = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (matches && matches[1]) {
                url = matches[1];
            }
        }
    }

    let returnData = allPlannerData.filter(x => (x.plannable_type == "assignment" || x.plannable_type == "quiz") && x.plannable).map(x => {
        return {
            id: x.plannable.id,
            dueDate: new Date(x.plannable.due_at || x.plannable_date),
            title: x.plannable.title,
            course: [x.context_name, `${IS_LOCAL ? API_KEYS.canvas[0] : keysData.canvas[0]}/courses/${x.course_id}`],
            url: `${IS_LOCAL ? API_KEYS.canvas[0] : keysData.canvas[0]}${x.html_url}`,
            submitted: x.submissions?.submitted ?? false,
            graded: x.submissions?.graded ?? false,
        }
    });

    return returnData;
}

function generateLookaheadStatic(imageParams, text, borderColor, appendDest) {
    let img;
    switch (imageParams.type) {
        case "img":
            img = document.createElement("img");
            img.src = imageParams.val;
            img.draggable = false;
            break;

        case "emoji":
            img = document.createElement("p");
            img.textContent = imageParams.val;
            break;
    }
    img.classList.add("lookahead-complete-img");
    img.style.marginTop = "20px";

    let txt = document.createElement("p");
    txt.textContent = text;
    txt.classList.add("lookahead-status-text");
    txt.style.marginBottom = "20px";

    let content = appendDest.querySelector(".lookahead-container");

    content.style.padding = "0px";
    content.style.backgroundImage = "linear-gradient(136deg, rgba(0, 0, 0, 0) 10%, rgb(32, 47, 54) 10%, rgb(32, 47, 54) 40%, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0) 53%, rgb(32, 47, 54) 53%, rgb(32, 47, 54) 71%, rgba(0, 0, 0, 0) 71%), none";
    if (borderColor) {
        content.style.borderColor = `rgba(${borderColor}, 0.75)`;
    }

    content.appendChild(img);
    content.appendChild(txt);
}

function generateCalendarList(events, now, separateDates, listType, lookaheadDb, lookaheadData, appendDest) {
    let eventsFiltered = !lookaheadData?.settings?.hiddenEvents?.show && lookaheadData?.settings?.hiddenEvents?.ids?.length > 0 ? events.filter(x => !lookaheadData.settings.hiddenEvents.ids.includes(x.id)) : events;

    let content = appendDest.querySelector(".lookahead-container");
    let borderColor;

    content.style.padding = "20px";
    content.style.removeProperty("background-image");

    switch (listType) {
        case "fiveday":
            let fiveDayOpen;
            if (eventsFiltered.length > 0) fiveDayOpen = eventsFiltered.filter(x => !x.submitted && !x.graded);
            if (fiveDayOpen?.length > 0) {
                let minTimeDiff = Math.min(...fiveDayOpen.map(x => (x.dueDate.getTime() - now.getTime()) / 3.6e6));
                borderColor = minTimeDiff < 0 ? "216, 0, 0" : minTimeDiff <= 2 ? "207, 110, 0" : minTimeDiff <= 24 ? "241, 182, 1" : "0, 153, 209";
            } else {
                borderColor = "88, 204, 2";
            }
            break;

        case "horizon":
            borderColor = "0, 153, 209";
            break;
    }

    content.style.borderColor = `rgba(${borderColor}, 0.75)`;
    document.getElementById(`${listType}-lookahead-title`).style.backgroundColor = `rgba(${borderColor}, 0.75)`;

    if (eventsFiltered.length == 0) {
        content.textContent = "Nothing to show in the current visibility state.";
        return;
    }

    let eventGroups = !separateDates 
        ? [eventsFiltered] 
        : Object.values(
            eventsFiltered.reduce((acc, event) => {
                const key = event.dueDate.toDateString();
                (acc[key] = acc[key] || []).push(event);
                return acc;
            }, {})
        );

    eventGroups.forEach((eventGroup, i) => {
        if (separateDates) {
            let dayDiff = getDaysBetween(eventGroup[0].dueDate, now, "obj");

            let dateHeader = document.createElement("p");
            dateHeader.classList.add("lookahead-list-date");
            dateHeader.textContent = eventGroup[0].dueDate.toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }) + " (" + (dayDiff == -1 ? "Yesterday" : dayDiff == 0 ? "Today" : dayDiff == 1 ? "Tomorrow" : dayDiff > 0 ? `in ${dayDiff} days` : `${Math.abs(dayDiff)} days before`) + ")";
            if (i > 0) dateHeader.style.marginTop = "10px";
            content.appendChild(dateHeader);
        }

        eventGroup.forEach(x => {
            let eventCard = document.createElement("div");
            eventCard.classList.add("lookahead-list-card", "glass-container", "flex-column");

            let timeContainer, cardColor;

            if (x.submitted || x.graded) {
                cardColor = "88, 204, 2";
                timeContainer = createImgTextDiv([["lookahead-list-time-container", "flex-centered-row"], [], ["lookahead-list-time-text"]], [null, null, null], "img", "assets/images/checkmark.svg", null, "p", x.graded ? "GRADED" : "SUBMITTED", null);
            } else {
                timeContainer = document.createElement("div");
                timeContainer.classList.add("lookahead-list-time-container", "flex-centered-row");

                timeContainer.appendChild(createTimeSvg("16"));

                let timeText = document.createElement("p");
                timeText.classList.add("lookahead-list-time-text");

                let timeDiff = (x.dueDate.getTime() - now.getTime()) / 3.6e6;
                if (timeDiff <= 24) {
                    timeText.textContent = timeDiff < 0 ? "OVERDUE" : ((timeDiff >= 2 ? `${Math.round(timeDiff)} HR` : timeDiff >= 1 ? `${Math.floor(timeDiff)} HR${Math.round((timeDiff - Math.floor(timeDiff)) * 60) > 0 ? ` ${Math.round((timeDiff - Math.floor(timeDiff)) * 60)} MIN` : ""}` : `${Math.round(timeDiff * 60)} MIN`) + ` • ${x.dueDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`);
                    cardColor = timeDiff < 0 ? "216, 0, 0" : timeDiff <= 2 ? "207, 110, 0" : "241, 182, 1";
                    timeContainer.style.color = `rgb(${cardColor})`;
                } else {
                    timeText.textContent = x.dueDate.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true
                    });
                    cardColor = "28, 176, 246";
                }
                timeContainer.appendChild(timeText);
            }

            eventCard.style.backgroundColor = `rgba(${cardColor}, 0.4)`;

            let eventTitle = document.createElement("a");
            eventTitle.classList.add("lookahead-list-title");
            eventTitle.textContent = x.title;
            eventTitle.href = sanitizeURL(x.url);

            let courseName = document.createElement("a");
            courseName.classList.add("lookahead-list-course");
            courseName.textContent = x.course[0];
            courseName.href = sanitizeURL(x.course[1]);

            let cardHide = document.createElement("p");
            cardHide.classList.add("lookahead-list-hide", "centered-div");
            if (lookaheadData.settings.hiddenEvents.ids.includes(x.id)) cardHide.classList.add("lookahead-list-hidden");
            cardHide.textContent = "X";
            cardHide.addEventListener("click", async () => {
                if (!lookaheadData.settings.hiddenEvents.ids.includes(x.id)) {
                    lookaheadData.settings.hiddenEvents.ids.push(x.id);
                } else {
                    lookaheadData.settings.hiddenEvents.ids.splice(lookaheadData.settings.hiddenEvents.ids.indexOf(x.id), 1);
                }
                cardHide.classList.toggle("lookahead-list-hidden");

                await saveDatabase(lookaheadDb, "lookahead_os", [lookaheadData], false);
                if (!lookaheadData.settings.hiddenEvents.show) generateLookaheadCards(events, lookaheadDb, lookaheadData, appendDest.id);
            });

            eventCard.append(timeContainer, eventTitle, courseName, cardHide);
            content.appendChild(eventCard);
        });
    });
}

function generateLookaheadCards(canvasData, lookaheadDb, lookaheadData, listId) {
    let upcomingEvents;
    let now = new Date();

    switch (lookaheadData?.settings?.showSubmitted) {
        case "Before due":
        case undefined:
            upcomingEvents = canvasData.filter(x => (!x.submitted && !x.graded) || (x.dueDate.getTime() > now.getTime()));
            break;
        case "All":
            upcomingEvents = canvasData;
            break;
        case "None":
            upcomingEvents = canvasData.filter(x => !x.submitted && !x.graded);
            break;
    }

    let fiveDayEvents = [], horizonEvents = [];
    let fiveDayContainer, horizonContainer;

    function generateFiveDay() {
        fiveDayContainer = document.getElementById("fiveday-events");
        if (fiveDayEvents.length == 0) {
            document.getElementById("fiveday-lookahead-title").style.backgroundColor = "rgba(88, 204, 2, 0.75)";
            generateLookaheadStatic({ type: "img", val: "assets/images/all-done.svg" }, "No assignments due for the next 5 days!", "88, 204, 2", fiveDayContainer);
        } else {
            generateCalendarList(fiveDayEvents, now, true, "fiveday", lookaheadDb, lookaheadData, fiveDayContainer);
        }
    }

    function generateHorizon() {
        horizonContainer = document.getElementById("horizon-events");
        if (horizonEvents.length == 0) {
            document.getElementById("horizon-lookahead-title").style.backgroundColor = "rgba(88, 204, 2, 0.75)";
            generateLookaheadStatic({ type: "img", val: "assets/images/confetti.webp" }, "No assignments on the horizon!", "88, 204, 2", horizonContainer);
        } else {
            generateCalendarList(horizonEvents, now, true, "horizon", lookaheadDb, lookaheadData, horizonContainer);
        }
    }

    switch (listId) {
        case undefined:
        case null:
            upcomingEvents.forEach(event => {
                if (event.dueDate.getTime() - now.getTime() <= 5 * 8.64e7) {
                    fiveDayEvents.push(event);
                } else {
                    horizonEvents.push(event);
                }
            });

            document.querySelectorAll(".lookahead-container").forEach(el => el.innerHTML = "");
            generateFiveDay();
            generateHorizon();

            break;

        case "fiveday-events":
            fiveDayEvents = canvasData;
            document.getElementById("fiveday-lookahead-container").innerHTML = "";
            generateFiveDay();

            break;

        case "horizon-events":
            horizonEvents = canvasData;
            document.getElementById("horizon-lookahead-container").innerHTML = "";
            generateHorizon();

            break;
    }
}

async function updateLookahead(lookaheadDb, lookaheadData, keysData) {
    let canvasData;

    try {
        canvasData = await getCanvasCalendar(keysData);
    } catch {
        canvasData = null;
    }

    document.querySelectorAll(".lookahead-loading, .lookahead-status-text").forEach(el => el.remove());

    if (canvasData) {
        let toSave = false;

        if (!lookaheadData) {
            lookaheadData = {
                key: "main",
                seenAssignments: canvasData.map(x => x.id), newAssignments: [],
                seenGraded: [], newGraded: [],
                settings: { showSubmitted: "Before due", hiddenEvents: { show: false, ids: new Set() } }
            };
            toSave = true;
        } else {
            let fetchedIds = new Set(canvasData.map(x => x.id));
            let gradedIds = new Set(canvasData.filter(x => x.graded).map(x => x.id));
            lookaheadData.seenAssignments = lookaheadData.seenAssignments?.filter(x => fetchedIds.has(x)) ?? [];
            lookaheadData.newAssignments = lookaheadData.newAssignments?.filter(x => fetchedIds.has(x.id)) ?? [];
            lookaheadData.seenGraded = lookaheadData.seenGraded?.filter(x => fetchedIds.has(x) && gradedIds.has(x)) ?? [];
            lookaheadData.newGraded = lookaheadData.newGraded?.filter(x => fetchedIds.has(x.id) && gradedIds.has(x.id)) ?? [];
            if (lookaheadData.settings.hiddenEvents.ids) lookaheadData.settings.hiddenEvents.ids.forEach(id => { if (!fetchedIds.has(id)) { lookaheadData.settings.hiddenEvents.ids.splice(lookaheadData.settings.hiddenEvents.ids.indexOf(id), 1); toSave = true; } });

            const createAssignmentNotification = (newItems, newKey, seenKey, btnText) => {
                lookaheadData[newKey].push(...newItems);
                toSave = true;
                if (localStorage.getItem("searchDetailsOpen") == "true") {
                    let suggestionGroup, suggestionContent;
                    newItems.forEach(x => {
                        [suggestionGroup, suggestionContent] = createAssignmentBtn(btnText, x, lookaheadData, newKey, seenKey, lookaheadDb, suggestionGroup, suggestionContent);
                        document.getElementById("timely-suggested-group-container").prepend(suggestionGroup);
                    });
                }
            }

            let storedNewIds = new Set(lookaheadData.newAssignments.map(x => x.id));
            let newAssignments = canvasData.filter(x => !lookaheadData.seenAssignments.includes(x.id) && !storedNewIds.has(x.id));
            if (newAssignments.length > 0) {
                createAssignmentNotification(newAssignments, "newAssignments", "seenAssignments", "Assignment posted: ");
            }

            let storedGradedIds = new Set(lookaheadData.newGraded.map(x => x.id));
            let newGraded = canvasData.filter(x => x.graded && !lookaheadData.seenGraded.includes(x.id) && !storedGradedIds.has(x.id));
            if (newGraded.length > 0) {
                createAssignmentNotification(newGraded, "newGraded", "seenGraded", "Assignment graded: ");
            }
        }

        if (toSave) await saveDatabase(lookaheadDb, "lookahead_os", [lookaheadData], false);

        generateLookaheadCards(canvasData, lookaheadDb, lookaheadData);
        initSettings("lookahead-settings", "row", [{ name: "Visibility", type: "close-button", classList: ["settings-title", "settings-img-button"], func: () => generateLookaheadCards(canvasData, lookaheadDb, lookaheadData) }, { name: "Show submitted", type: "select", classList: ["settings-name", null], key: "showSubmitted", options: ["Before due", "All", "None"] }, { name: "Show hidden", type: "toggle", classList: ["settings-name", null], key: "hiddenEvents.show" }], lookaheadDb, "lookahead_os", lookaheadData);
    } else {
        generateLookaheadStatic({ type: "img", val: "assets/images/offline.svg" }, "Unable to fetch assignments.", null, document.getElementById("fiveday-events"));
        generateLookaheadStatic({ type: "img", val: "assets/images/offline.svg" }, "Unable to fetch assignments.", null, document.getElementById("horizon-events"));
    }
}