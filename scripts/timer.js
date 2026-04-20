let timerDb, timerData, timerInterval;

async function initTimer() {
    timerDb = await openDatabase(["timer_db", 4], ["timer_os", "key"], ["timeSet", "timeRemaining", "endAt", "state", "sessionData", "settings"]);
    timerData = await readDatabase(timerDb, "timer_os", "main");

    if (!timerData) {
        timerData = {
            key: "main",
            timeSet: 0,
            timeRemaining: 0,
            endAt: -1,
            state: "paused",
            sessionData: {
                breakStarted: -1,
                recentSessions: {},
                totalSessions: 0,
            },
            settings: {
                displayMode: "Compact",
                showSeconds: true,
            },
        };

        await saveDatabase(timerDb, "timer_os", [timerData], true);
    } else {
        checkTimerBreak(timerDb, false);
    }

    if (timerData.state == "timing") {
        let now = new Date();
        let timeDelta = Math.round((timerData.endAt - now.getTime()) / 1000);
        if (timeDelta > 0) {
            timerData.timeRemaining = timeDelta;
            generateTimerDisplay(true);
            resumeTimer();
        } else {
            timerData.timeRemaining = 0;
            pauseTimer();
            await saveDatabase(timerDb, "timer_os", [timerData], false);
            generateTimerDisplay(true);
        }
    } else {
        generateTimerDisplay(true);
    }

    document.getElementById("timer-start-control").addEventListener("click", async () => {
        switch (timerData.state) {
            case "paused":
                if (timerData.timeRemaining > 0) {
                    startTimer();
                    generateTimerDisplay(false);
                }
                break;

            case "timing":
                pauseTimer();
                await saveDatabase(timerDb, "timer_os", [timerData], false);
                generateTimerDisplay(false);
                break;
        }
    });

    document.getElementById("timer-end-control").addEventListener("click", async () => {
        pauseTimer();
        timerData.timeRemaining = 0;
        timerData.endAt = new Date().getTime();
        await saveDatabase(timerDb, "timer_os", [timerData], false);
        generateTimerDisplay(true);
        displayBreakOverlay(timerData, timerDb, null);
    });

    document.getElementById("timer-rewind-control").addEventListener("click", async () => {
        pauseTimer();
        timerData.timeRemaining = timerData.timeSet;
        
        await saveDatabase(timerDb, "timer_os", [timerData], false);

        updateTimeText({ updateRewind: true });
        regenBorder(null);
    });

    document.getElementById("quick-timer-list").querySelectorAll(".quick-timer-item").forEach(x => {
        x.addEventListener("click", async () => {
            timerData.timeSet = parseInt(x.dataset.time);
            timerData.timeRemaining = timerData.timeSet;
            generateTimerDisplay(true);
            await saveDatabase(timerDb, "timer_os", [timerData], true);
        });
    });

    enableTimeEditing();
    enableDropdown("timer-page-stat-dropdown", "timer-page-stat-content");
    populateFocusStats();
    initSettings("page-settings", "row", [{ name: "Settings", type: "close-button", classList: ["settings-title", "settings-img-button"], func: showHideHMS }, { name: "Display mode", type: "select", classList: ["settings-name", null], key: "displayMode", options: ["Compact", "Full"] }, { name: "Show seconds", type: "toggle", classList: ["settings-name", "timer-show-seconds"], key: "showSeconds" }], timerDb, "timer_os", timerData);
    createCircularBorders();
}

function generateTimerDisplay(updateTime) {
    let mainContainer = document.getElementById("timer-main-container");
    let display = document.getElementById("timer-display");
    let borderElapsed = document.getElementById("timer-progress-border-elapsed"), borderRemaining = document.getElementById("timer-progress-border-remaining");
    let controlButtons = mainContainer.querySelectorAll(".timer-control");
    let rgbCode;

    switch (timerData.state) {
        case "paused":
            rgbCode = "255, 150, 0";
            document.getElementById("timer-start-control").dataset.label = "Start timer";
            document.getElementById("timer-start-control-icon").src = "assets/images/play.svg";
            document.getElementById("timer-end-control").style.display = "none";

            if (!document.getElementById("timer-add-container")) {
                let addTimeContainer = document.createElement("div");
                addTimeContainer.id = "timer-add-container";
                addTimeContainer.classList.add("centered-div");
                addTimeContainer.append(generateAddTimeButton(60), generateAddTimeButton(300), generateAddTimeButton(600));
                display.appendChild(addTimeContainer);
            }

            break;

        case "timing":
            rgbCode = "28, 176, 246";
            document.getElementById("timer-start-control").dataset.label = "Pause timer";
            document.getElementById("timer-start-control-icon").src = "assets/images/pause.svg";
            document.getElementById("timer-end-control").style.display = "flex";

            document.getElementById("timer-add-container")?.remove();

            break;
    }

    if (updateTime) {
        updateTimeText({ updateRewind: true });
        regenBorder(borderRemaining);
    }

    showHideHMS();

    mainContainer.style.backgroundColor = `rgba(${rgbCode}, 0.1)`;
    controlButtons.forEach(x => x.style.setProperty("--timer-control-bg", rgbCode));
    borderElapsed.style.stroke = `rgba(${rgbCode}, 0.3)`;
    borderRemaining.style.stroke = `rgb(${rgbCode})`;
}

function generateAddTimeButton(addSeconds) {
    let button = document.createElement("p");
    button.classList.add("timer-add-button", "centered-div", "dimensional-button");
    
    button.textContent = `+${parseHMS(secondsToHMS(addSeconds), true)}`;

    button.addEventListener("click", async () => {
        pauseTimer();
        timerData.timeSet = timerData.timeRemaining + addSeconds;
        timerData.timeRemaining = timerData.timeSet;

        await saveDatabase(timerDb, "timer_os", [timerData], true);

        updateTimeText({ updateRewind: true });
        regenBorder(null);
    });

    return button;
}

function updateTimeText(options) {
    let timeText = document.getElementById("timer-time");

    const setTimeText = hms => {
        timeText.children[0].textContent = hms[0];
        timeText.children[2].textContent = hms[1];
        timeText.children[4].textContent = hms[2];
    }

    if (!options?.lazy) {
        let remainingHms = secondsToHMS(timerData.timeRemaining).map(x => x.toString().padStart(2, "0"));
        setTimeText(remainingHms);
    } else {
        let currS = parseInt(timeText.children[4].textContent);
        if (currS - 1 > 0) {
            timeText.children[4].textContent = (currS - 1).toString().padStart(2, "0");
        } else {
            let remainingHms = secondsToHMS(timerData.timeRemaining).map(x => x.toString().padStart(2, "0"));
            setTimeText(remainingHms);
        }
    }

    if (options?.updateRewind) {
        let setHms;
        if (timerData.timeSet > 0) setHms = secondsToHMS(timerData.timeSet).map(x => x.toString().padStart(2, "0"));
        document.getElementById("timer-rewind-text").textContent = setHms ? parseHMS(setHms, true) : "No time set";
    }
}

function showHideHMS(forceHMS) {
    let timeText = document.getElementById("timer-time");

    const setDisplay = (idx, show) => {
        timeText.children[idx].style.display = show ? "block" : "none";
        timeText.children[idx + 1].style.display = show ? "block" : "none";
    }

    if (!forceHMS) {
        switch (timerData.state) {
            case "paused":
                Array.from(timeText.children).forEach(child => {
                    child.style.display = "block";
                });
                break;

            case "timing":
                setDisplay(0, timerData.timeRemaining >= 3600 || timerData.settings.displayMode == "Full");
                setDisplay(2, timerData.timeRemaining >= 60 || timerData.settings.displayMode == "Full");
                setDisplay(4, timerData.settings.showSeconds || timerData.timeRemaining < 120);
                break;
        }
    } else {
        if (forceHMS[0]) setDisplay(0, forceHMS[0] == "block");
        else if (forceHMS[1]) setDisplay(2, forceHMS[1] == "block");
        else if (forceHMS[2]) setDisplay(4, forceHMS[2] == "block");
    }
}

async function startTimer() {
    if (!IS_LOCAL && Notification.permission == "default") {
        await Notification.requestPermission();
    }

    timerData.state = "timing";
    if (timerData.timeRemaining == 0) timerData.timeRemaining = timerData.timeSet;
    timerData.endAt = new Date().getTime() + timerData.timeRemaining * 1000;
    await saveDatabase(timerDb, "timer_os", [timerData], false);
    resumeTimer();
}

function resumeTimer() {
    let borderRemaining = document.getElementById("timer-progress-border-remaining");
    if (!borderRemaining.style.animation || borderRemaining.style.animationName == "none") {
        void borderRemaining.offsetWidth;
        borderRemaining.style.animation = `timer-border-fill ${timerData.timeRemaining}s linear forwards`;
    }
    borderRemaining.style.animationPlayState = "running";

    document.getElementById("timer-right-container").classList.add("timer-right-container-hide");
    // document.getElementById("timer-title").style.opacity = "0";
    document.getElementById("timer-main-container").dataset.state = "running";

    timerInterval = setInterval(async () => {
        timerData.timeRemaining--;

        updateTimeText({ lazy: true });

        switch (timerData.timeRemaining) {
            case 0:
                pauseTimer();
                timerData.endAt = new Date().getTime();
                await saveDatabase(timerDb, "timer_os", [timerData], false);
                generateTimerDisplay(false);
                displayBreakOverlay(timerData, timerDb, null);
                break;

            case 3599:
                if (timerData.settings.displayMode != "Full") showHideHMS(["none", null, null]);
                break;

            case 119:
                showHideHMS([null, null, "block"]);
                break;

            case 59:
                if (timerData.settings.displayMode != "Full") showHideHMS([null, "none", null]);
                break;
        }
    }, 1000);
}

async function pauseTimer() {
    if (timerInterval) clearInterval(timerInterval);

    document.getElementById("timer-progress-border-remaining").style.animationPlayState = "paused";
    document.getElementById("timer-right-container").classList.remove("timer-right-container-hide");
    // document.getElementById("timer-title").style.opacity = "1";
    document.getElementById("timer-main-container").dataset.state = "paused";

    timerData.state = "paused";
    timerData.endAt = -1;
}

function regenBorder(borderRemaining) {
    if (!borderRemaining) borderRemaining = document.getElementById("timer-progress-border-remaining");
    if (timerData.timeSet > 0) {
        borderRemaining.style.setProperty("--timer-border-remaining", (1 - timerData.timeRemaining / timerData.timeSet) * 283);
        borderRemaining.style.strokeDashoffset = (1 - timerData.timeRemaining / timerData.timeSet) * 283;
    } else {
        borderRemaining.style.strokeDashoffset = 283;
    }
    borderRemaining.style.animationName = "none";
}

function enableTimeEditing() {
    let timeText = document.getElementById("timer-time");

    timeText.addEventListener("click", event => {
        event.stopPropagation();

        pauseTimer();
        generateTimerDisplay(false);

        timeText.querySelectorAll(".timer-time-val").forEach(timerVal => {
            let input = createNumericalInput(["timer-time-input"], "", 0, null, 2);
            input.id = timerVal.id;
            input.value = timerVal.textContent.trim();
            timeText.replaceChild(input, timerVal);
        });

        const handleOutsideClick = async event => {
            if (!timeText.contains(event.target)) {
                document.removeEventListener("click", handleOutsideClick);

                let h = parseInt(document.getElementById("timer-hours")?.value) || 0;
                let m = parseInt(document.getElementById("timer-minutes")?.value) || 0;
                let s = parseInt(document.getElementById("timer-seconds")?.value) || 0;
                let newSeconds = h * 3600 + m * 60 + s;

                timerData.timeSet = newSeconds;
                timerData.timeRemaining = newSeconds;

                await saveDatabase(timerDb, "timer_os", [timerData], true);

                timeText.querySelectorAll(".timer-time-input").forEach(timerInput => {
                    let span = document.createElement("span");
                    span.id = timerInput.id;
                    span.classList.add("timer-time-val");
                    timeText.replaceChild(span, timerInput);
                });

                generateTimerDisplay(true);
                enableTimeEditing();
            } else {
                event.stopPropagation();
                if (event.target.tagName == "INPUT") event.target.select();
            }
        }

        document.addEventListener("click", handleOutsideClick);
    }, { once: true });
}

function populateFocusStats() {
    let breakStats = calculateBreakStats(timerData);
    let horizontalDiv = document.createElement("hr");
    horizontalDiv.classList.add("horizontal-divider");
    document.getElementById("timer-page-stat-content").append(
        generateStatGroup(["timer-page-stat-group"], "#ffffff", [breakStats.today.toString(), "timer-page-stat-val"], ["Sessions today", "timer-page-stat-label"]),
        horizontalDiv,
        generateStatGroup(["timer-page-stat-group"], "#ffffff", [timerData.sessionData.totalSessions.toString(), "timer-page-stat-val"], ["Sessions to date", "timer-page-stat-label"]),
        horizontalDiv.cloneNode(),
        generateStatGroup(["timer-page-stat-group"], "#ffffff", [breakStats.weeklyAvg.toFixed(2), "timer-page-stat-val"], ["7-day rolling average", "timer-page-stat-label"]),
        horizontalDiv.cloneNode(),
        generateStatGroup(["timer-page-stat-group"], "#ffffff", [(breakStats.weekVsMonth > 0 ? "+" : "") + `${breakStats.weekVsMonth}%`, "timer-page-stat-val"], ["7-day vs 28-day average", "timer-page-stat-label"]),
    );
}