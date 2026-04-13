let todoDb, todoData;
const CATEGORIES = [{ name: "Tasks", image: "category.svg", color: "#49bff9" }, { name: "Personal", image: "person.svg", color: "#46f7e7" }, { name: "School", image: "school.svg", color: "#da954b" }, { name: "Work", image: "work.svg", color: "#9dc386" }, { name: "Hobby", image: "hobby.svg", color: "#d08370" }, { name: "Vacation", image: "sail.svg", color: "#a6c5e3" }];

async function initTodo() {
    todoDb = await openDatabase(["todo_db", 2], ["todo_os", "key"], ["streak", "entries", "settings"]);
    todoData = await readDatabase(todoDb, "todo_os", "main");

    let now = new Date();

    if (!todoData) {
        todoData = {
            key: "main",
            streak: {
                current: 0,
                longest: 0,
                lastDate: 0,
            },
            entries: {},
            settings: {
                reminders: {
                    dailyEnabled: false,
                    am: { time: null, dismissedAt: 0 },
                    pm: { time: null, dismissedAt: 0 },
                },
                filters: { categories: CATEGORIES.map(x => x.name), progress: ["Not started", "In progress", "Completed"] },
            },
        };

        await saveDatabase(todoDb, "todo_os", [todoData], true);
        generateDaySummary([], getConcatDateStr(now), "large", false);
    } else {
        loadDailyEntries(todoData, null);

        let yearAgo = parseInt(getConcatDateStr(adjustDate(new Date(), -365)));
        let oldFiltered = Object.keys(todoData.entries).filter(x => parseInt(x) < yearAgo);
        if (oldFiltered.length > 0) {
            oldFiltered.forEach(x => delete todoData.entries[x]);
            await saveDatabase(todoDb, "todo_os", [todoData], false);
        }
    }

    document.getElementById("todo-current-date").textContent = now.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    document.getElementById("todo-date-left").addEventListener("click", () => {
        incrementTodoDate(-1);
    });
    document.getElementById("todo-date-right").addEventListener("click", () => {
        incrementTodoDate(1);
    });

    updateTodoStreak("load");
    createCircularBorders();
    generateStreakCalendar(now.getMonth(), now.getFullYear(), now.getDate());

    document.getElementById("todo-add-button").addEventListener("click", () => {
        generateTodoEntry("add", null, null, null, null);
    });

    initSettings("page-settings", "row", [{ name: "Settings", type: "close-button", classList: ["settings-title", "settings-img-button"] }, { name: "Daily reminders", type: "toggle", classList: ["settings-name", "todo-daily-reminders"], key: "reminders.dailyEnabled" }, { name: "Write time", type: "time", classList: ["settings-name", ["settings-text-input-container", "flex-centered-row"]], amPm: "AM", key: "reminders.am" }, { name: "Review time", type: "time", classList: ["settings-name", ["settings-text-input-container", "flex-centered-row"]], amPm: "PM", key: "reminders.pm" }, { type: "text-button", text: "Clear data", classList: ["danger-button", "dimensional-button"] }], todoDb, "todo_os", todoData);
    initSettings("todo-filter-button", "column", [{ name: "Filter Tasks", type: "close-button", classList: ["popup-pane-title", "settings-img-button"], func: () => incrementTodoDate(0) }, { name: "Categories", type: "multiselect", classList: ["settings-name", "todo-filter-select"], key: "filters.categories", options: CATEGORIES.map(x => ({ name: x.name, color: x.color })) }, { name: "Progress", type: "multiselect", classList: ["settings-name", "todo-filter-select"], key: "filters.progress", options: [{ name: "Not started", color: "#b4b4b4" }, { name: "In progress", color: "rgb(255, 241, 114)" }, { name: "Completed", color: "#58CC02" }] }], todoDb, "todo_os", todoData);
    document.getElementById("todo-insights-button").addEventListener("click", () => generateInsightsOverlay());

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState == "visible" && new Date().getDate() != now.getDate()) {
            window.location.reload();
        }
    });

    // let notif = new Notification("Test");
}

function loadDailyEntries(todoData, date) {
    let now = new Date();
    let nowDecimal = dateToDecimal(now), nowStr = getConcatDateStr(now);
    let dateStr = date ? date : nowStr;

    document.getElementById("todo-list-items").innerHTML = "";
    let statusText = document.getElementById("todo-list-status");
    statusText.innerHTML = "";

    let filteredEntries = todoData.entries[dateStr];
    if (filteredEntries?.length > 0) {
        filteredEntries = filteredEntries.filter(entry => todoData.settings.filters.categories.includes(entry.category) && todoData.settings.filters.progress.includes(getProgressStatus(entry)));
        
        if (filteredEntries.length > 0) {
            filteredEntries.sort((a, b) => {
                if (a.time != b.time) return a.time - b.time;
                return a.name.localeCompare(b.name);
            });
            filteredEntries.forEach(entry => {
                generateTodoEntry("static", entry, null, nowDecimal, nowStr, dateStr);
            });
        }
    }

    updateListStatus(filteredEntries?.length, dateStr);
    generateDaySummary(todoData.entries[dateStr], dateStr, "large", false);
}

function incrementTodoDate(increment) {
    let currentDate = new Date(document.getElementById("todo-current-date").textContent);
    
    if (increment != 0) {
        let oldMonth = currentDate.getMonth(), oldYear = currentDate.getFullYear();
        let moyr = document.getElementById("todo-streak-calendar-moyr");
        let moyrMonth = moyr.dataset.month, moyrYear = moyr.dataset.year;

        currentDate.setDate(currentDate.getDate() + increment);
        let currentMonth = currentDate.getMonth(), currentYear = currentDate.getFullYear();

        document.getElementById("todo-current-date").textContent = currentDate.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        if (currentMonth != oldMonth || currentYear != oldYear || currentMonth != moyrMonth || currentYear != moyrYear) {
            generateStreakCalendar(currentDate.getMonth(), currentDate.getFullYear(), currentDate.getDate());
        } else {
            highlightStreakCalendar(null, currentDate.getDate().toString(), null);
        }
    }

    loadDailyEntries(todoData, getConcatDateStr(currentDate));
}

function incrementTodoMonth(direction, label, month, year, increment) {
    let arrowContainer = document.createElement("div");
    arrowContainer.classList.add("todo-streak-calendar-month-arrow", "circular-button", "centered-div");
    arrowContainer.classList.add("hover-label");
    arrowContainer.dataset.label = label;
    arrowContainer.dataset.position = "bottom";
    arrowContainer.dataset.strokeColor = "rgb(28, 176, 246)";
    arrowContainer.addEventListener("click", () => {
        let newMonth = ((month + increment) % 12 + 12) % 12;
        let newYear = year + Math.floor((month + increment) / 12);
        let selectedDate = new Date(document.getElementById("todo-current-date").textContent);
        if (selectedDate.getMonth() == newMonth && selectedDate.getFullYear() == newYear) {
            generateStreakCalendar(newMonth, newYear, selectedDate.getDate());
        } else {
            generateStreakCalendar(newMonth, newYear, null);
        }
    });

    let arrowSvg = createArrowSvg("26", direction);
    arrowContainer.appendChild(arrowSvg);

    return arrowContainer;
}

function generateTodoEntry(mode, entry, insertIndex, currentHour, nowStr, dateStr) {
    let entryElement = document.createElement("div");
    entryElement.classList.add("todo-entry", "flex-column");
    let entryRow = document.createElement("div");
    entryRow.classList.add("todo-entry-row", "flex-centered-row");

    let entryName, entryDue, entryCategory, entryHour, entryMinute, entryAmPm, confirmButton, cancelButton, deleteButton, rescheduleButton;
    let dueContainer = document.createElement("div"), categoryContainer = document.createElement("div"), stepContainer, buttonContainer = document.createElement("div");

    let categoryImg = document.createElement("img");

    switch (mode) {
        case "static":
            if (parseInt(dateStr) <= parseInt(nowStr)) {
                let entryCheck = document.createElement("div");
                if (!entry.steps?.length) {
                    entryCheck.classList.add("todo-entry-check");
                    if (entry.done) entryCheck.classList.add("todo-entry-check-done");
                    entryCheck.addEventListener("click", async () => {
                        entry.done = !entry.done;
                        updateTodoStreak("increment");
                        await saveDatabase(todoDb, "todo_os", [todoData], true);

                        entryCheck.classList.toggle("todo-entry-check-done");
                        dueContainer.style.color = entry.done ? "#58CC02" : `rgb(${getTodoColor(entry.time, parseInt(dateStr), currentHour, parseInt(nowStr))})`;
                        entryName.classList.toggle("todo-entry-name-done", entry.done);
                        entryElement.remove();
                        updateTodoCards(entry, getTodoIndex(entry, dateStr), dateStr, true, true, true);
                    });
                } else {
                    entryCheck.classList.add("todo-entry-progress");
                    let doneDeg = entry.steps.filter(x => x.done).length / entry.steps.length * 360;
                    entryCheck.style.backgroundImage = `conic-gradient(#58CC02 ${doneDeg}deg, #b4b4b4 ${doneDeg}deg 360deg)`;
                }
                entryRow.appendChild(entryCheck);
            }

            entryName = document.createElement("p");
            entryName.textContent = entry.name;
            entryName.classList.toggle("todo-entry-name-done", entry.done);

            entryDue = document.createElement("p");
            entryDue.textContent = decimalToTime(entry.time, "str");

            dueContainer.style.color = entry.done ? "#58CC02" : `rgb(${getTodoColor(entry.time, parseInt(dateStr), currentHour, parseInt(nowStr))})`;
            dueContainer.appendChild(entryDue);

            entryCategory = document.createElement("p");
            entryCategory.textContent = entry.category;
            categoryImg.src = `assets/images/${CATEGORIES.find(x => x.name == entry.category).image}`;

            let moreSvg = createMoreSvg("28");
            moreSvg.classList.add("todo-entry-button");
            moreSvg.addEventListener("click", () => {
                entryElement.remove();
                generateTodoEntry("edit", entry, getTodoIndex(entry, dateStr), currentHour, nowStr, dateStr);
            });
            buttonContainer.appendChild(moreSvg);

            stepContainer = document.createElement("div");

            break;

        case "add":
        case "edit":
            entryName = document.createElement("textarea");
            entryName.placeholder = "Task name";

            entryDue = document.createElement("div");
            entryHour = createNumericalInput(["todo-entry-time-input"], "12", 1, 12, null);
            entryMinute = createNumericalInput(["todo-entry-time-input"], "34", 0, 59, 2);
            entryAmPm = document.createElement("select");
            entryAmPm.options.add(new Option("AM", "AM"));
            entryAmPm.options.add(new Option("PM", "PM"));
            entryDue.append(entryHour, ":", entryMinute);
            dueContainer.append(entryDue, entryAmPm);

            entryCategory = document.createElement("select");
            CATEGORIES.forEach(category => {
                entryCategory.options.add(new Option(category.name, category.name));
            });
            entryCategory.addEventListener("change", () => {
                categoryImg.src = `assets/images/${CATEGORIES.find(x => x.name == entryCategory.value).image}`;
            });

            confirmButton = createImgButton(["todo-entry-button"], "img", "assets/images/checkmark.svg", "0, 187, 0", { text: "Save", position: "bottom" });
            cancelButton = createImgButton(["todo-entry-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Discard", position: "bottom" });
            buttonContainer.append(confirmButton, cancelButton);

            break;
    }

    switch (mode) {
        case "add":
            dateStr = getConcatDateStr(new Date(document.getElementById("todo-current-date").textContent));

            entryElement.classList.add("todo-entry-addtemp");
            categoryImg.src = "assets/images/category.svg";

            confirmButton.addEventListener("click", async () => {
                if (!validateTodoEntry(entryName, entryHour, entryMinute, null, dateStr, true)) return;

                let newEntry = {
                    name: entryName.value,
                    time: timeToDecimal(entryHour.value, entryMinute.value, entryAmPm.value),
                    category: entryCategory.value,
                    done: false,
                };
                let newIndex = null;

                if (!todoData.entries[dateStr]) todoData.entries[dateStr] = [];
                todoData.entries[dateStr].push(newEntry);
                if (todoData.entries[dateStr].length > 1) {
                    todoData.entries[dateStr].sort((a, b) => {
                        if (a.time != b.time) return a.time - b.time;
                        return a.name.localeCompare(b.name);
                    });
                    newIndex = getTodoIndex(newEntry, dateStr);
                }

                await saveDatabase(todoDb, "todo_os", [todoData], true);

                entryElement.remove();
                updateTodoCards(newEntry, newIndex, dateStr, true, true, false);
            });

            cancelButton.addEventListener("click", () => {
                entryElement.remove();
            });

            break;

        case "edit":
            entryName.value = entry.name;

            let timeStr = decimalToTime(entry.time, "arr");
            entryHour.value = timeStr[0];
            entryMinute.value = timeStr[1];
            entryAmPm.value = timeStr[2];

            entryCategory.value = entry.category;
            categoryImg.src = `assets/images/${CATEGORIES.find(x => x.name == entry.category).image}`;

            confirmButton.addEventListener("click", async () => {
                let stepEntries = Array.from(entryElement.querySelectorAll(".todo-entry-step-input"));

                if (!validateTodoEntry(entryName, entryHour, entryMinute, stepEntries, dateStr, false)) return;

                entry.name = entryName.value;
                entry.time = timeToDecimal(entryHour.value, entryMinute.value, entryAmPm.value);
                entry.category = entryCategory.value;
                if (stepEntries.length > 0) {
                    let existingSteps = entry.steps || [];
                    entry.steps = stepEntries.map(x => {
                        return {
                            name: x.value,
                            done: existingSteps.find(y => y.name == x.value)?.done ?? false,
                        }
                    });
                    
                    entry.done = entry.steps.every(x => x.done);
                    updateTodoStreak("increment");
                } else {
                    delete entry.steps;
                }
                todoData.entries[dateStr].sort((a, b) => {
                    if (a.time != b.time) return a.time - b.time;
                    return a.name.localeCompare(b.name);
                });

                await saveDatabase(todoDb, "todo_os", [todoData], true);

                entryElement.remove();
                updateTodoCards(entry, getTodoIndex(entry, dateStr), dateStr, true, !!entry.steps?.length, !!entry.steps?.length);
            });

            cancelButton.addEventListener("click", () => {
                entryElement.remove();
                updateTodoCards(entry, insertIndex, dateStr, false, false, false);
            });

            rescheduleButton = createImgButton(["todo-entry-button"], "img", "assets/images/reschedule.svg", "28, 176, 246", { text: "Reschedule", position: "bottom" });
            rescheduleButton.addEventListener("click", async () => {
                let rescheduleContainer = buttonContainer.querySelector(".todo-entry-reschedule-container");
                let rescheduleInput;
                
                if (!rescheduleContainer) {
                    rescheduleContainer = document.createElement("div");
                    rescheduleContainer.classList.add("todo-entry-reschedule-container");
                    rescheduleInput = createNumericalInput(["todo-entry-reschedule-input"], "1-21", -21, 21, null);

                    rescheduleContainer.appendChild(rescheduleInput);
                    buttonContainer.prepend(rescheduleContainer);
                } else {
                    rescheduleInput = rescheduleContainer.querySelector("input");
                    if (rescheduleInput.value == "") return alert("Please provide a valid number of days to reschedule this task.");

                    let deferredDateStr = getConcatDateStr(adjustDate(getDateFromStr(dateStr), parseInt(rescheduleInput.value)));

                    if (!todoData.entries[deferredDateStr]) {
                        todoData.entries[deferredDateStr] = [];
                    } else if (todoData.entries[deferredDateStr].find(x => x.name.toLowerCase() == entry.name.toLowerCase())) {
                        return alert(`An entry with the name "${entry.name}" already exists on ${currentDate.toLocaleDateString()}. Please choose a different name or date.`);
                    }

                    let deferredEntry = { ...entry };
                    deferredEntry.done = false;
                    todoData.entries[deferredDateStr].push(deferredEntry);
                    todoData.entries[deferredDateStr].sort((a, b) => {
                        if (a.time != b.time) return a.time - b.time;
                        return a.name.localeCompare(b.name);
                    });
                    todoData.entries[dateStr].splice(todoData.entries[dateStr].indexOf(entry), 1);
                    if (todoData.entries[dateStr].length == 0) delete todoData.entries[dateStr];
                    updateTodoStreak("increment");

                    await saveDatabase(todoDb, "todo_os", [todoData], true);

                    entryElement.remove();
                    updateTodoCards(null, null, dateStr, true, true, true);
                    highlightStreakCalendar(null, null, deferredDateStr);
                }
            });

            deleteButton = createImgButton(["todo-entry-button"], "img", "assets/images/delete.svg", "234, 51, 35", { text: "Delete", position: "bottom" });
            deleteButton.addEventListener("click", async () => {
                let deleteConfirm = confirm("Are you sure you want to delete this task? This action cannot be undone.");
                if (!deleteConfirm) return;

                todoData.entries[dateStr].splice(todoData.entries[dateStr].indexOf(entry), 1);
                if (todoData.entries[dateStr].length == 0) delete todoData.entries[dateStr];
                updateTodoStreak("increment");

                await saveDatabase(todoDb, "todo_os", [todoData], true);

                entryElement.remove();
                updateTodoCards(null, null, dateStr, true, true, true);
            });

            buttonContainer.prepend(rescheduleButton, deleteButton);

            stepContainer = document.createElement("div");

            break;
    }

    entryName.classList.add("todo-entry-name");
    dueContainer.classList.add("todo-entry-due", "glass-container", "flex-centered-row");
    categoryContainer.classList.add("todo-entry-category", "glass-container", "flex-centered-row");
    buttonContainer.classList.add("todo-entry-buttons", "flex-centered-row");

    let timeImg = createTimeSvg("20");
    dueContainer.prepend(timeImg);

    categoryContainer.append(categoryImg, entryCategory);

    let entrySubtext = document.createElement("div");
    entrySubtext.classList.add("todo-entry-subtext", "flex-centered-row");
    entrySubtext.append(dueContainer, categoryContainer);

    let entryDetails = document.createElement("div");
    entryDetails.classList.add("todo-entry-details", "flex-column");
    entryDetails.append(entryName, entrySubtext);

    entryRow.append(entryDetails, buttonContainer);
    entryElement.appendChild(entryRow);

    if (stepContainer) {
        stepContainer.classList.add("todo-entry-step-container", "glass-container", "flex-centered-row");
        stepContainer.innerHTML = `<p>${entry.steps?.length ? `${entry.steps.filter(x => x.done).length}/${entry.steps.length}` : 0} steps</p>`;

        let stepList;
        switch (mode) {
            case "static":
                if (entry.steps?.length > 0) {
                    let stepArrow = createArrowSvg("22", "right"), stepsOpen = false;
                    stepArrow.classList.add("todo-entry-step-arrow");
                    stepArrow.addEventListener("click", () => {
                        stepsOpen = !stepsOpen;

                        if (stepsOpen) {
                            stepArrow.querySelector("path").setAttribute("d", "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z");
                            stepList = document.createElement("div");
                            stepList.classList.add("todo-entry-step-list", "glass-container", "flex-column");

                            entry.steps.forEach(step => {
                                let stepItem = document.createElement("div");
                                stepItem.classList.add("todo-entry-step-item", "flex-centered-row");
                                stepItem.innerHTML = `<p>${sanitizeInnerHTML(step.name)}</p>`;

                                if (parseInt(dateStr) <= parseInt(nowStr)) {
                                    let stepDone = document.createElement("div");
                                    stepDone.classList.add("todo-entry-step-check");
                                    if (step.done) stepDone.classList.add("todo-entry-step-done");
                                    stepDone.addEventListener("click", async () => {
                                        step.done = !step.done;

                                        let allDone = entry.steps.every(x => x.done), doneChanged = entry.done != allDone;
                                        entry.done = allDone;
                                        updateTodoStreak("increment");

                                        await saveDatabase(todoDb, "todo_os", [todoData], true);

                                        stepDone.classList.toggle("todo-entry-step-done");
                                        stepContainer.querySelector("p").textContent = `${entry.steps.filter(x => x.done).length}/${entry.steps.length} steps`;

                                        let doneDeg = entry.steps.filter(x => x.done).length / entry.steps.length * 360;
                                        entryElement.querySelector(".todo-entry-progress").style.backgroundImage = `conic-gradient(#58CC02 ${doneDeg}deg, #b4b4b4 ${doneDeg}deg 360deg)`;

                                        if (doneChanged) {
                                            dueContainer.style.color = entry.done ? "#58CC02" : `rgb(${getTodoColor(entry.time, parseInt(dateStr), currentHour, parseInt(nowStr))})`;
                                            entryName.classList.toggle("todo-entry-name-done", entry.done);
                                            entryElement.remove();
                                            updateTodoCards(entry, getTodoIndex(entry, dateStr), dateStr, true, true, true);
                                        }
                                    });
                                    stepItem.prepend(stepDone);
                                }
                                
                                stepList.appendChild(stepItem);
                            });

                            entryElement.appendChild(stepList);
                        } else {
                            stepArrow.querySelector("path").setAttribute("d", "M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z");
                            stepList.remove();
                        }
                    });

                    stepContainer.prepend(stepArrow);
                }
                break;

            case "edit":
                stepList = document.createElement("div");
                stepList.classList.add("todo-entry-step-list", "glass-container", "flex-column");

                const createStepItem = fillVal => {
                    let stepItem = document.createElement("div");
                    stepItem.classList.add("todo-entry-step-item", "flex-centered-row");

                    let stepInput = document.createElement("textarea");
                    stepInput.classList.add("todo-entry-step-input");
                    stepInput.placeholder = "Step name";
                    if (fillVal) stepInput.value = fillVal;
                    let stepRemove = createImgButton(["todo-entry-step-remove"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Remove", position: "bottom" });
                    stepRemove.addEventListener("click", () => {
                        stepItem.remove();
                        stepContainer.innerHTML = `<p>${entry.steps.filter(x => x.done).length}/${stepList.children.length - 1} steps</p>`;
                    });

                    stepItem.append(stepInput, stepRemove);
                    return [stepItem, stepInput];
                }

                if (entry.steps?.length > 0) {
                    entry.steps.forEach(step => {
                        let stepItem = createStepItem(step.name)[0];
                        stepList.appendChild(stepItem);
                    });
                }

                let addStep = createImgTextDiv([["todo-entry-step-add-button", "centered-div", "dimensional-button", "blue-button"], [], []], [null, null, null], "img", "assets/images/add.svg", null, "p", "Add step", null);
                addStep.addEventListener("click", () => {
                    let [stepItem, stepInput] = createStepItem(null);
                    stepList.insertBefore(stepItem, addStep);
                    stepInput.focus();
                    stepContainer.innerHTML = `<p>${entry.steps.filter(x => x.done).length}/${stepList.children.length - 1} steps</p>`;
                });

                stepList.appendChild(addStep);
                entryElement.appendChild(stepList);

                break;
        }

        entrySubtext.appendChild(stepContainer);
    }

    let container = document.getElementById("todo-list-items");
    if (insertIndex != null) {
        container.insertBefore(entryElement, container.children[insertIndex]);
    } else {
        container.appendChild(entryElement);
    }

    if (mode == "add" || mode == "edit") entryName.focus();
}

function validateTodoEntry(entryName, entryHour, entryMinute, stepEntries, dateStr, forceUnique) {
    if (entryName.value == "") {
        alert("Please enter a task name.");
        return false;
    }
    if (entryHour.value == "" || entryMinute.value == "") {
        alert("Please enter a valid due time for the task.");
        return false;
    }
    if (stepEntries?.length > 0) {
        let stepValues = stepEntries.map(x => x.value);
        if (stepValues.includes("") || new Set(stepValues).size != stepEntries.length) {
            alert("All steps must be non-empty and unique.");
            return false;
        }
    }
    if (forceUnique) {
        if (todoData.entries[dateStr]?.length > 0 && todoData.entries[dateStr]?.findIndex(x => x.name.toLowerCase() == entryName.value.toLowerCase()) != -1) {
            alert("This task name is already in use today. Please use another task name.");
            return false;
        }
    }
    return true;
}

function updateTodoCards(entry, index, dateStr, updateSummary, updateCalendar, updateStreakRating) {
    let now = new Date();
    if (entry != null && todoData.settings.filters.categories.includes(entry.category) && todoData.settings.filters.progress.includes(getProgressStatus(entry))) {
        generateTodoEntry("static", entry, index, dateToDecimal(now), getConcatDateStr(now), dateStr);
    }
    if (updateSummary) {
        updateListStatus(document.getElementById("todo-list-items").children.length, dateStr);
        generateDaySummary(todoData.entries[dateStr], dateStr, "large", false);
    }
    if (updateCalendar || updateStreakRating) {
        let calendarDiv = document.getElementById("todo-streak-calendar");
        if (updateCalendar) highlightStreakCalendar(calendarDiv, null, dateStr);
        if (updateStreakRating) calculateDonePercent(calendarDiv);
    }
}

function generateStreakCalendar(month, year, selectedDate) {
    let calendarDiv = document.getElementById("todo-streak-calendar");
    calendarDiv.innerHTML = "";

    let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    let table = document.createElement("table");
    table.id = "todo-streak-calendar-table";

    let headerRow = table.insertRow();
    let monthYearCell = headerRow.insertCell();
    monthYearCell.colSpan = 7;
    
    let moyrContainer = document.createElement("div");
    moyrContainer.id = "todo-streak-calendar-moyr-container";
    moyrContainer.classList.add("flex-centered-row");

    let prevMonthArrow = incrementTodoMonth("left", "Prev month", month, year, -1);
    let nextMonthArrow = incrementTodoMonth("right", "Next month", month, year, 1);
    createCircularBorders([prevMonthArrow, nextMonthArrow]);
    let arrowContainer = document.createElement("div");
    arrowContainer.id = "todo-streak-calendar-arrow-container";
    arrowContainer.classList.add("flex-centered-row");
    arrowContainer.append(prevMonthArrow, nextMonthArrow);

    let monthYearText = document.createElement("p");
    monthYearText.id = "todo-streak-calendar-moyr";
    monthYearText.classList.add("flex-split-row-grow");
    monthYearText.textContent = `${monthNames[month]} ${year}`;
    monthYearText.dataset.month = month;
    monthYearText.dataset.year = year;

    let daysHeaderRow = table.insertRow();
    dayNames.forEach(dayName => {
        let cell = daysHeaderRow.insertCell();
        cell.textContent = dayName;
        cell.classList.add("todo-streak-calendar-day-name");
    });

    let now = new Date();
    let firstDayOfMonth = new Date(year, month, 1).getDay();
    let daysInMonth = new Date(year, month + 1, 0).getDate();
    let today = [now.getFullYear(), now.getMonth(), now.getDate()];

    let dateCounter = 1, doneCounter = 0, daysPassed;
    for (let i = 0; i < 6; i++) {
        if (dateCounter > daysInMonth) break;

        let weekRow = table.insertRow();
        for (let j = 0; j < 7; j++) {
            let cell = weekRow.insertCell();
            cell.classList.add("todo-streak-calendar-day-cell");

            if (i == 0 && j < firstDayOfMonth || dateCounter > daysInMonth) {
                cell.classList.add("todo-streak-calendar-day-empty");
            } else {
                cell.textContent = dateCounter;
                cell.dataset.date = dateCounter;
                let currentDateOfCell = new Date(year, month, dateCounter);
                let formattedDateKey = getConcatDateStr(currentDateOfCell);

                if (todoData.entries?.[formattedDateKey]?.length > 0) {
                    if (todoData.entries[formattedDateKey].some(x => x.done)) {
                        if (!daysPassed) doneCounter++;
                        cell.classList.add("todo-streak-calendar-day-has-entries-done");
                    } else {
                        cell.classList.add("todo-streak-calendar-day-has-entries");
                    }
                }
                if (year == today[0] && month == today[1] && dateCounter == today[2]) {
                    daysPassed = dateCounter;
                    cell.classList.add("todo-streak-calendar-today");
                }
                if (selectedDate && dateCounter == selectedDate) {
                    cell.classList.add("todo-streak-calendar-selected-day");
                }

                cell.addEventListener("click", () => {
                    document.getElementById("todo-current-date").textContent = currentDateOfCell.toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    });
                    loadDailyEntries(todoData, formattedDateKey);
                    highlightStreakCalendar(calendarDiv, cell.textContent, null);
                });

                dateCounter++;
            }
        }
    }

    if (!daysPassed) daysPassed = daysInMonth;
    donePercent = doneCounter / daysPassed * 100;
    let monthRating = document.createElement("p");
    monthRating.id = "todo-streak-calendar-rating";
    formatStreakRating(monthRating, doneCounter, daysPassed);

    moyrContainer.append(arrowContainer, monthYearText, monthRating);
    monthYearCell.appendChild(moyrContainer);
    calendarDiv.appendChild(table);
}

function highlightStreakCalendar(calendarDiv, selectedDate, bgDate) {
    if (!calendarDiv) calendarDiv = document.getElementById("todo-streak-calendar");

    if (selectedDate) {
        calendarDiv.querySelector(".todo-streak-calendar-selected-day")?.classList.remove("todo-streak-calendar-selected-day");
        calendarDiv.querySelector(`.todo-streak-calendar-day-cell[data-date="${selectedDate}"]`)?.classList.add("todo-streak-calendar-selected-day");
    }

    if (bgDate) {
        let moyr = document.getElementById("todo-streak-calendar-moyr");

        if ((parseInt(moyr.dataset.month) + 1).toString().padStart(2, "0") == bgDate.slice(4, 6) && moyr.dataset.year == bgDate.slice(0, 4)) {
            if (todoData.entries?.[bgDate]?.length > 0) {
                let cell = calendarDiv.querySelector(`.todo-streak-calendar-day-cell[data-date="${parseInt(bgDate.slice(6))}"]`);
                if (cell) {
                    let hasDoneEntries = todoData.entries[bgDate].some(x => x.done);
                    cell.classList.toggle("todo-streak-calendar-day-has-entries-done", hasDoneEntries);
                    cell.classList.toggle("todo-streak-calendar-day-has-entries", !hasDoneEntries);
                }
            } else {
                calendarDiv.querySelector(`.todo-streak-calendar-day-cell[data-date="${parseInt(bgDate.slice(6))}"]`)?.classList.remove("todo-streak-calendar-day-has-entries", "todo-streak-calendar-day-has-entries-done");
            }
        }
    }
}

function updateTodoStreak(mode) {
    let now = new Date();
    let nowStr = getConcatDateStr(now), daysDiff = getDaysBetween(nowStr, todoData.streak.lastDate.toString().padStart(8, "0"), "str");
    let streakElement = document.getElementById("todo-streak-today-container"), streakText;

    const setStreakFilledStyles = (streakImg, streakText, streakElement) => {
        streakImg.src = "assets/images/streak-filled.svg";
        streakText.style.backgroundImage = "linear-gradient(69.74deg, rgb(32, 198, 138) -2.32%, rgb(25, 82, 192) 76.76%)";
        streakText.style.backgroundClip = "text";
        streakText.style.color = "transparent";
        streakElement.style.backgroundImage = "linear-gradient(136deg, #ff9600 10%, #ffc26c 10%, #ffc26c 25%, #ff9600 25%, #ff9600 48%, #ffc26c 48%, #ffc26c 80%, #ff9600 80%), none";
    }
    const setStreakEmptyStyles = (streakImg, streakText, streakElement) => {
        streakImg.src = "assets/images/streak-empty.svg";
        streakText.style.color = "#ff7272";
        streakText.style.background = "none";
        streakElement.style.backgroundImage = "linear-gradient(136deg, rgba(0, 0, 0, 0) 10%, rgb(32, 47, 54) 10%, rgb(32, 47, 54) 25%, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 0) 48%, rgb(32, 47, 54) 48%, rgb(32, 47, 54) 80%, rgba(0, 0, 0, 0) 80%), none";
    }

    switch (mode) {
        case "load":
            let streakImg = document.createElement("img");
            streakImg.id = "todo-streak-img";
            streakImg.draggable = false;
            streakText = document.createElement("p");
            streakText.id = "todo-streak-value";

            if (daysDiff >= 1) {
                setStreakEmptyStyles(streakImg, streakText, streakElement);

                if (daysDiff > 1) {
                    todoData.streak.current = 0;
                    todoData.streak.lastDate = 0;
                }
            } else {
                setStreakFilledStyles(streakImg, streakText, streakElement);
            }

            streakText.textContent = todoData.streak.current;
            streakElement.append(streakImg, streakText);

            streakElement.classList.add("hover-label");
            streakElement.dataset.position = "left";

            break;

        case "increment":
            if (todoData.entries[nowStr]?.length > 0 && todoData.entries[nowStr]?.some(x => x.done)) {
                if (daysDiff > 0) {
                    todoData.streak.current++;
                    todoData.streak.lastDate = parseInt(nowStr);
                    if (todoData.streak.longest < todoData.streak.current) todoData.streak.longest = todoData.streak.current;

                    streakText = document.getElementById("todo-streak-value");
                    streakText.textContent = todoData.streak.current;

                    setStreakFilledStyles(document.getElementById("todo-streak-img"), streakText, streakElement);
                }
            } else {
                if (daysDiff == 0) {
                    todoData.streak.current--;
                    todoData.streak.lastDate = parseInt(getConcatDateStr(adjustDate(getDateFromStr(nowStr), -1)));

                    streakText = document.getElementById("todo-streak-value");
                    streakText.textContent = todoData.streak.current;

                    setStreakEmptyStyles(document.getElementById("todo-streak-img"), streakText, streakElement);
                }
            }

            break;
    }

    streakElement.dataset.label = `Current done streak: ${todoData.streak.current} days\nLongest done streak: ${todoData.streak.longest} days`;
}

function calculateDonePercent(calendarDiv) {
    let doneCounter = 0, daysPassed = 0, counting = true;
    let cells = calendarDiv.querySelectorAll(".todo-streak-calendar-day-cell:not(.todo-streak-calendar-day-empty)");
    cells.forEach(cell => {
        if (counting) {
            if (cell.classList.contains("todo-streak-calendar-day-has-entries-done")) {
                doneCounter++;
            }
            daysPassed++;

            if (cell.classList.contains("todo-streak-calendar-today")) counting = false;
        }
    });

    formatStreakRating(document.getElementById("todo-streak-calendar-rating"), doneCounter, daysPassed);
}

function formatStreakRating(ratingElement, doneCounter, daysPassed) {
    if (doneCounter > 0) {
        let donePercent = Math.round(doneCounter / daysPassed * 100);
        ratingElement.textContent = `${donePercent}%`;
        ratingElement.style.backgroundColor = donePercent == 100 ? "#fbe56d" : donePercent >= 70 ? "#ff9600" : donePercent >= 50 ? "#F1B601" : "#D80000";
        ratingElement.style.color = donePercent == 100 ? "#cd7900" : donePercent < 50 ? "#ffffff" : "#000000";
    } else {
        ratingElement.textContent = "N/A";
        ratingElement.style.backgroundColor = "rgb(55, 70, 79)";
        ratingElement.style.color = "#000000";
    }
}

function getProgressStatus(entry) {
    let progressStatus;
    if (entry.steps?.length > 0) {
        let doneSteps = entry.steps.filter(step => step.done).length;
        progressStatus = doneSteps == 0 ? "Not started" : doneSteps == entry.steps.length ? "Completed" : "In progress";
    } else {
        progressStatus = entry.done ? "Completed" : "Not started";
    }
    return progressStatus;
}

function getTodoIndex(entry, dateStr) {
    return todoData.entries[dateStr].filter(x => todoData.settings.filters.categories.includes(x.category) && todoData.settings.filters.progress.includes(getProgressStatus(x))).indexOf(entry);
}

function updateListStatus(shownCount, dateStr) {
    let statusText = document.getElementById("todo-list-status");
    statusText.style.display = "none";
    statusText.innerHTML = "";

    if (!todoData.entries[dateStr]?.length) {
        statusText.style.display = "flex";
        statusText.innerHTML = "<img src='assets/images/info.svg'><p>No tasks planned for this day yet. Use the Add Task button to get started.</p>";
    } else {
        if (shownCount != todoData.entries[dateStr].length) {
            statusText.style.display = "flex";
            statusText.innerHTML = `<img src='assets/images/info.svg'><p>${todoData.entries[dateStr].length - shownCount} tasks hidden by filters.</p>`;
            let clearButton = document.createElement("p");
            clearButton.classList.add("todo-list-status-button", "dimensional-button");
            clearButton.textContent = "Clear filters";
            clearButton.addEventListener("click", async () => {
                todoData.settings.filters = { categories: CATEGORIES.map(x => x.name), progress: ["Not started", "In progress", "Completed"] };
                await saveDatabase(todoDb, "todo_os", [todoData], true);
                loadDailyEntries(todoData, dateStr);
            });
            statusText.appendChild(clearButton);
        }
    }
}

function generateInsightsOverlay() {
    let [insightOverlay, insightWindow] = createOverlay("todo-insights-window");

    let insightTitle = document.createElement("h3");
    insightTitle.classList.add("content-overlay-window-title");
    insightTitle.textContent = "Insights";
    let closeButton = createImgButton(["content-overlay-window-close", "content-overlay-window-button"], "img", "assets/images/x.svg", "234, 51, 35", { text: "Close", position: "bottom" });
    closeButton.addEventListener("click", () => insightOverlay.remove());
    insightWindow.append(insightTitle, closeButton);

    const createRow = titles => {
        let row = document.createElement("div");
        row.classList.add("todo-insights-row");

        let returnItems = [];
        titles.forEach(title => {
            let container = document.createElement("div");
            container.classList.add("todo-insights-section", "flex-column");
            let subtitle = document.createElement("h3");
            subtitle.classList.add("content-overlay-window-subtitle");
            subtitle.textContent = title;
            let content = document.createElement("div");
            content.classList.add("todo-insights-section-content");

            container.append(subtitle, content);
            row.appendChild(container);
            returnItems.push(content);
        });

        insightWindow.appendChild(row);
        return returnItems;
    }

    const createCard = (title, classList) => {
        let card = document.createElement("div");
        card.classList.add("todo-insights-card", "glass-container", "flex-column");
        let cardTitle = document.createElement("p");
        cardTitle.classList.add("todo-insights-card-title");
        cardTitle.textContent = title;
        let cardContent = document.createElement("div");
        cardContent.classList.add(...classList);
        card.append(cardTitle, cardContent);
        return [card, cardContent];
    }

    const createBarChart = (dataArr, xLabels, maxHeight, barWidth, appendDest) => {
        appendDest.style.gridTemplateColumns = `repeat(auto-fit, ${barWidth})`;
        let max = Math.max(...dataArr);

        for (let i = 0; i < dataArr.length; i++) {
            let column = document.createElement("div");
            column.classList.add("todo-insights-barchart-column", "flex-column");

            let bar = document.createElement("div");
            bar.classList.add("todo-insights-barchart-bar", "hover-label");
            bar.dataset.label = dataArr[i];
            bar.dataset.position = "top";
            bar.style.height = `${max > 0 ? (dataArr[i] / max) * maxHeight : 0}px`;

            let label = document.createElement("p");
            label.classList.add("todo-insights-barchart-label");
            label.textContent = xLabels[i];

            column.append(bar, label);
            appendDest.appendChild(column);
        }
    }

    const createInsightPie = (size, thickness, segments, totalVal, textClass) => {
        let pieContainer = document.createElement("div");
        pieContainer.classList.add("todo-insights-pie-container", "flex-centered-row");

        let pieChart = document.createElement("div");
        pieChart.classList.add("todo-insights-pie-chart");
        pieChart.style.width = `${size}px`;
        pieChart.style.height = `${size}px`;
        pieChart.style.setProperty("--cutout-size", `${size - thickness}px`);
        pieChart.style.backgroundImage = generatePieChart(segments, totalVal, null);

        let pieText = document.createElement("div");
        pieText.classList.add("todo-insights-pie-text", textClass);
        segments.forEach(segment => {
            let textItem = document.createElement("div");
            textItem.classList.add("todo-insights-pie-text-item");
            textItem.style.setProperty("--pie-color", segment.color);
            textItem.innerHTML = `<p class="todo-insights-pie-text-label">${segment.label}</p><p class="todo-insights-pie-text-value">${segment.value}</p>`;
            pieText.appendChild(textItem);
        });

        pieContainer.append(pieChart, pieText);
        return pieContainer;
    }

    let entryKeys = Object.keys(todoData.entries), entryValues = Object.values(todoData.entries), now;

    let [sevenDayContent, dayOfWeekContent] = createRow(["Past 7 Days", "Day-of-Week Breakdown"]);

    let sevenDaysAgo = parseInt(getConcatDateStr(adjustDate(new Date(), -7))), monthAgo = parseInt(getConcatDateStr(adjustDate(new Date(), -28)));
    let sevenDayFiltered = entryKeys.filter(x => parseInt(x) > sevenDaysAgo), sevenDayCount = sevenDayFiltered.reduce((acc, key) => acc + todoData.entries[key].length, 0);
    let sevenDayAvg = sevenDayCount / 7, monthAvg = entryKeys.filter(x => parseInt(x) > monthAgo).reduce((acc, key) => acc + todoData.entries[key].length, 0) / 28, weekVsMonth = Math.round((sevenDayAvg - monthAvg) / monthAvg * 100);
    let maxSevenDay = sevenDayFiltered.reduce((max, key) => Math.max(max, todoData.entries[key].length), 0);
    let maxSevenFiltered = sevenDayFiltered.filter(key => todoData.entries[key].length == maxSevenDay);
    let [sevenDayStatsCard, sevenDayStats] = createCard("STATS", ["flex-column"]);
    sevenDayStats.append(
        generateStatGroup(["todo-insights-stat-group"], "#ffffff", [sevenDayAvg.toFixed(1), "todo-insights-stat-val"], ["Average tasks per day", "todo-insights-stat-label"]),
        generateStatGroup(["todo-insights-stat-group"], "#ffffff", [maxSevenFiltered.length > 0 ? maxSevenDay.toString() : "N/A", "todo-insights-stat-val"], ["Most tasks in one day" + (maxSevenFiltered.length > 0 ? `, on ${maxSevenFiltered.join(", ")}` : ""), "todo-insights-stat-label"]),
        generateStatGroup(["todo-insights-stat-group"], "#ffffff", [(weekVsMonth > 0 ? "+" : "") + `${weekVsMonth}%`, "todo-insights-stat-val"], ["vs 28-day average", "todo-insights-stat-label"])
    );
    sevenDayContent.append(sevenDayStatsCard);

    let dayOfWeekTotals = new Array(7).fill(0);
    now = new Date();
    let currentDay = now.getDay(), lastSaturday = currentDay == 6 ? now : adjustDate(now, -1 * (currentDay + 1)), lastSaturdayInt = parseInt(getConcatDateStr(lastSaturday));
    let fourWeeksAgo = adjustDate(lastSaturday, -27), fourWeeksInt = parseInt(getConcatDateStr(fourWeeksAgo));
    entryKeys.map(x => parseInt(x)).filter(x => x >= fourWeeksInt && x <= lastSaturdayInt).forEach(dateInt => {
        dayOfWeekTotals[getDateFromStr(dateInt.toString()).getDay()] += todoData.entries[dateInt.toString()].length;
    });
    let [dayOfWeekBarChartCard, dayOfWeekBarChart] = createCard("4-WEEK DISTRIBUTION", ["todo-insights-barchart"]);
    createBarChart(dayOfWeekTotals, ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"], 55, "1.2em", dayOfWeekBarChart);

    let [dayOfWeekSplitCard, dayOfWeekSplit] = createCard("WEEKDAYS VS WEEKENDS", ["flex-centered-row"]);
    dayOfWeekSplit.appendChild(createInsightPie(55, 15, [{ color: "#72dcff", label: "Weekdays", value: dayOfWeekTotals.slice(1, -1).reduce((a, b) => a + b, 0) }, { color: "#fff172", label: "Weekends", value: dayOfWeekTotals[0] + dayOfWeekTotals[6] }], dayOfWeekTotals.reduce((a, b) => a + b, 0), "flex-column"));

    dayOfWeekContent.append(dayOfWeekBarChartCard, dayOfWeekSplitCard);

    let [historyContent] = createRow(["Historical Data"]);

    let monthlyTotals = new Array(6).fill(0), monthLabels = [];
    now = new Date();
    for (let i = 5; i >= 0; i--) {
        let monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthLabels.push(monthDate.toLocaleString("en-US", { month: "short" }));

        let monthStart = parseInt(getConcatDateStr(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)));
        let monthEnd = parseInt(getConcatDateStr(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)));

        monthlyTotals[5 - i] = entryKeys.map(x => parseInt(x)).filter(x => x >= monthStart && x <= monthEnd).reduce((acc, dateInt) => acc + todoData.entries[dateInt.toString()].length, 0);
    }
    let [monthlyTrendsCard, monthlyTrends] = createCard("6-MONTH TRENDS", ["todo-insights-barchart"]);
    createBarChart(monthlyTotals, monthLabels, 55, "1.8em", monthlyTrends);

    let [yearStatsCard, yearStats] = createCard("365-DAY STATS", ["flex-column"]);
    let entriesCreated = 0, entriesCompleted = 0;
    entryValues.forEach(arr => {
        entriesCreated += arr.length;
        entriesCompleted += arr.filter(x => x.done).length;
    });
    yearStats.append(
        generateStatGroup(["todo-insights-stat-group"], "#ffffff", [entriesCreated.toString(), "todo-insights-stat-val"], ["Total tasks created", "todo-insights-stat-label"]),
        generateStatGroup(["todo-insights-stat-group"], "#ffffff", [entriesCompleted.toString(), "todo-insights-stat-val"], ["Total tasks completed", "todo-insights-stat-label"]),
        generateStatGroup(["todo-insights-stat-group"], "#ffffff", [entryKeys.length, "todo-insights-stat-val"], ["Days with tasks planned", "todo-insights-stat-label"]),
    );

    let [heatmapCard, heatmap] = createCard("20-WEEK HEATMAP", ["todo-insights-heatmap-container", "flex-split-row", "flex-start-section"]);
    let heatmapOverflow = document.createElement("div");
    heatmapOverflow.classList.add("todo-insights-heatmap-overflow", "flex-split-row-grow");
    let heatmapTable = document.createElement("table");
    heatmapTable.id = "todo-insights-heatmap-table-main";
    heatmapTable.classList.add("todo-insights-heatmap-table");
    now = new Date();
    let heatmapWeekStart = adjustDate(now, -now.getDay());
    let twentyWeeksAgo = adjustDate(heatmapWeekStart, -(19 * 7));
    let heatmapHeader = heatmapTable.insertRow();
    let heatmapMonth = null, heatmapMonthCols = 1, heatmapCurrWeek = new Date(twentyWeeksAgo);
    for (let week = 0; week < 20; week++) {
        if (heatmapCurrWeek.getMonth() != heatmapMonth) {
            let heatmapMonthCell = heatmapHeader.insertCell();
            heatmapMonthCell.textContent = heatmapCurrWeek.toLocaleString("en-US", { month: "short" });
            heatmapMonthCell.colSpan = heatmapMonthCols;
            heatmapMonthCell.classList.add("todo-insights-heatmap-month-header");
            heatmapMonth = heatmapCurrWeek.getMonth();
            heatmapMonthCols = 1;
        } else {
            heatmapMonthCols++;
        }
        adjustDate(heatmapCurrWeek, 7);
    }
    let heatmapIntensities = ["#aceebb", "#4ac26b", "#2da44e", "#116329"];
    now = new Date();
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        let heatmapRow = heatmapTable.insertRow();
        let heatmapCellDate = adjustDate(new Date(twentyWeeksAgo), dayOfWeek);

        for (let week = 0; week < 20; week++) {
            let heatmapCell = heatmapRow.insertCell();
            heatmapCell.classList.add("todo-insights-heatmap-cell");

            if (heatmapCellDate.getTime() > now.getTime()) {
                heatmapCell.classList.add("todo-insights-heatmap-cell-future");
            } else {
                let taskCount = todoData.entries[getConcatDateStr(heatmapCellDate)]?.length || 0;

                if (taskCount > 0) {
                    let intensity = Math.min(taskCount, 4);
                    heatmapCell.style.backgroundColor = heatmapIntensities[intensity - 1];
                }

                heatmapCell.classList.add("hover-label");
                heatmapCell.dataset.label = `${heatmapCellDate.toLocaleDateString()}: ${taskCount} tasks`;
                heatmapCell.dataset.position = week < 10 ? "right" : "left";
            }

            adjustDate(heatmapCellDate, 7);
        }
    }
    heatmapOverflow.appendChild(heatmapTable);
    let heatmapDays = ["", "Su", "M", "", "W", "", "F", "Sa"];
    let heatmapDayLabels = document.createElement("table");
    heatmapDayLabels.classList.add("todo-insights-heatmap-table", "flex-split-row", "flex-start-section");
    for (let i = 0; i < 8; i++) {
        let heatmapRow = heatmapDayLabels.insertRow();
        let heatmapLabel = heatmapRow.insertCell();
        heatmapLabel.classList.add("todo-insights-heatmap-day-label");
        heatmapLabel.textContent = heatmapDays[i];
        heatmapLabel.style.height = i == 0 ? "16px" : "12px";
    }
    let heatmapLegend = document.createElement("div");
    heatmapLegend.classList.add("todo-insights-heatmap-legend", "flex-split-row", "flex-start-section");
    heatmapLegend.innerHTML = "<p>Less</p><p>More</p>";
    heatmap.append(heatmapOverflow, heatmapDayLabels, heatmapLegend);

    historyContent.append(monthlyTrendsCard, yearStatsCard, heatmapCard);

    let [categoryContent] = createRow(["Category Breakdown"]);
    let [categoryCard, categoryChart] = createCard("ALL-TIME CHART", ["flex-centered-row"]);
    let categoryMap = new Map();
    CATEGORIES.forEach(x => categoryMap.set(x.name, { label: x.name, color: x.color, value: 0 }));
    let flattenedEntries = entryValues.flat();
    flattenedEntries.forEach(entry => {
        let categoryFound = categoryMap.get(entry.category);
        if (categoryFound) categoryFound.value++;
    });
    let categorySegments = Array.from(categoryMap.values());
    categoryChart.appendChild(createInsightPie(150, 150, categorySegments, flattenedEntries.length, "flex-centered-row"));
    categoryContent.appendChild(categoryCard);
    
    insightOverlay.appendChild(insightWindow);
    document.body.appendChild(insightOverlay);

    heatmapOverflow.scrollLeft = 1000;
}