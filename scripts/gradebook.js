let gradebookDb, gradebookData;

async function initGradebook() {
    gradebookDb = await openDatabase(["gradebook_db", 1], ["gradebook_os", "key"], ["courses"]);
    gradebookData = await readDatabase(gradebookDb, "gradebook_os", "main");

    if (!gradebookData) {
        gradebookData = {
            key: "main",
            courses: {},
        };
        await saveDatabase(gradebookDb, "gradebook_os", [gradebookData], true);
    }

    let courseResp = await fetch(`${API_KEYS.canvas[0]}/api/v1/dashboard/dashboard_cards`, { headers: { "Authorization": `Bearer ${API_KEYS.canvas[1]}` } });
    let courseData = await courseResp.json();
    courseData = courseData.filter(x => x.originalName).sort((a, b) => a.originalName.localeCompare(b.originalName));

    let gradebookContent = document.getElementById("gradebook-content");
    let viewSelect = document.getElementById("gradebook-view-select").lastElementChild;
    viewSelect.addEventListener("change", () => {
        switch (viewSelect.value) {
            case "summary":
                generateGradebookSummary(gradebookContent, courseData, false, null);
                break;

            default:
                generateGradebookDetailed(gradebookContent, viewSelect.value, viewSelect.options[viewSelect.selectedIndex].text);
                break;
        }
    });

    generateGradebookSummary(gradebookContent, courseData, true, viewSelect);
}

async function generateGradebookSummary(gradebookContent, courseData, isFirst, viewSelect) {
    gradebookContent.innerHTML = "";
    gradebookContent.classList.remove("gradebook-course-detailed", "flex-column");
    gradebookContent.classList.add("gradebook-course-card-container");
    document.getElementById("gradebook-sort-select").style.display = "none";

    /*
    if (isFirst) {
        let currentCourseIds = new Set(courseData.map(x => x.id.toString()));
        Object.keys(gradebookData.courses).forEach(storedId => {
            if (!currentCourseIds.has(storedId)) delete gradebookData.courses[storedId];
        });
    }
    */

    const fetchAssignments = async courseId => {
        let assignmentData;

        try {
            let assignmentResp = await fetch(`${API_KEYS.canvas[0]}/api/v1/courses/${courseId}/assignments?include[]=submission&include[]=score_statistics&per_page=1000`, { headers: { "Authorization": `Bearer ${API_KEYS.canvas[1]}` } });
            assignmentData = await assignmentResp.json();
        } catch {
            assignmentData = null;
        }
        
        cacheCourseAssignments(courseId, assignmentData);
    }
    let fetchPromises = [];

    for (let i = 0; i < courseData.length; i++) {
        let courseId = courseData[i].id.toString();

        if (isFirst) {
            viewSelect.options.add(new Option(courseData[i].originalName, courseId));
            fetchPromises.push(fetchAssignments(courseId));
        }

        let courseCard = document.createElement("div");
        courseCard.classList.add("gradebook-course-card", "glass-container");
        let courseImg = document.createElement("div");
        courseImg.classList.add("gradebook-course-card-img");
        courseImg.style.backgroundImage = `url("${courseData[i].image}")`;
        courseImg.style.setProperty("--course-card-color", getColorForTextLength(parseInt(courseId), 10000, 30000, 0.4, 0.6).dark);
        let courseText = document.createElement("div");
        courseText.classList.add("gradebook-course-card-text", "flex-split-row");
        let courseName = document.createElement("a");
        courseName.classList.add("gradebook-course-card-name", "flex-split-row-grow");
        courseName.textContent = courseData[i].originalName;
        courseName.href = `${API_KEYS.canvas[0]}${courseData[i].href}/grades`;
        let courseScore = document.createElement("p");
        courseScore.id = `gradebook-course-card-score-${i}`;
        courseScore.classList.add("gradebook-course-card-score");
        courseScore.textContent = !isFirst ? getOverallCourseStats(gradebookData.courses[courseId])[0] : "Loading...";
        courseText.append(courseName, courseScore);
        courseCard.append(courseImg, courseText);
        gradebookContent.appendChild(courseCard);
    }

    if (isFirst && fetchPromises.length > 0) {
        await Promise.all(fetchPromises);
        for (let i = 0; i < courseData.length; i++) {
            let courseScore = document.getElementById(`gradebook-course-card-score-${i}`);
            courseScore.textContent = getOverallCourseStats(gradebookData.courses[courseData[i].id.toString()])[0];
        }
        await saveDatabase(gradebookDb, "gradebook_os", [gradebookData], false);
    }
}

function generateGradebookDetailed(gradebookContent, courseId, originalName) {
    gradebookContent.innerHTML = "";
    gradebookContent.classList.remove("gradebook-course-card-container");
    gradebookContent.classList.add("gradebook-course-detailed", "flex-column");
    document.getElementById("gradebook-sort-select").style.display = "block";

    let course = gradebookData.courses[courseId], [overallScore, overallWeight] = getOverallCourseStats(course);

    let courseHeader = document.createElement("div");
    courseHeader.classList.add("flex-split-row", "flex-start-section");
    let courseName = document.createElement("a");
    courseName.id = "gradebook-course-detailed-name";
    courseName.textContent = originalName;
    courseName.href = `${API_KEYS.canvas[0]}/courses/${courseId}`;
    let courseScore = document.createElement("div");
    courseScore.innerHTML = `<p id="gradebook-course-detailed-score-header">OVERALL SCORE</p><p id="gradebook-course-detailed-score-val">${overallScore}</p>`;
    courseHeader.append(courseName, courseScore);

    let gradesWrapper = document.createElement("div");
    gradesWrapper.classList.add("gradebook-course-detailed-wrapper", "glass-container");
    
    let gradesTable = document.createElement("table");
    gradesTable.id = "gradebook-course-detailed-table";

    let thead = document.createElement("thead");
    let headerRow = document.createElement("tr");
    ["Item Name", "Due Date", "Graded Date", "Grade", "Weight %"].forEach(headerText => {
        let th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    function createBody(headerName, button) {
        let headerBody = document.createElement("tbody");
        let headerRow = document.createElement("tr");
        let headerCell = document.createElement("td");
        headerCell.classList.add("gradebook-course-detailed-table-section-row");
        headerCell.colSpan = 5;

        let headerDiv = document.createElement("div");
        headerDiv.classList.add("gradebook-course-detailed-table-section-header", "centered-div");
        headerDiv.innerHTML = `<p>${headerName}</p>`;
        if (button) {
            let buttonElem = document.createElement("p");
            buttonElem.classList.add("gradebook-course-detailed-table-section-button", "dimensional-button", "blue-button");
            buttonElem.textContent = button.name;
            buttonElem.addEventListener("click", () => button.func());
            headerDiv.appendChild(buttonElem);
        }
        headerCell.appendChild(headerDiv);

        headerRow.appendChild(headerCell);
        headerBody.appendChild(headerRow);

        let itemsBody = document.createElement("tbody");
        itemsBody.classList.add("gradebook-course-detailed-table-items");

        return [headerBody, itemsBody];
    }

    function createNumericalInput(min, max, placeholder) {
        let input = document.createElement("input");
        input.classList.add("gradebook-course-detailed-assignment-input", "gradebook-course-detailed-assignment-numerical-input");
        input.type = "number";
        input.step = "any";
        if (min) input.min = min;
        if (max) input.max = max;
        if (placeholder) input.placeholder = placeholder;
        return input;
    }

    function recalculateCourseTotals() {
        let [newOverallScore, newOverallWeight] = getOverallCourseStats(course);
        document.getElementById("gradebook-course-detailed-score-val").textContent = newOverallScore;
        document.getElementById("gradebook-course-detailed-overall-score").textContent = newOverallScore;
        document.getElementById("gradebook-course-detailed-overall-weight").textContent = newOverallWeight;
    }

    let [mainHeader, mainBody] = createBody("Posted Items", null);
    if (course.assignments.length > 0) course.assignments.forEach(assignment => {
        let row = document.createElement("tr");
        if (assignment.submission?.scoreCached) row.classList.add("gradebook-course-detailed-assignment-cached");

        let nameCell = document.createElement("td");
        nameCell.innerHTML = assignment.name ? `<a href="${sanitizeURL(assignment.html_url)}">${sanitizeInnerHTML(assignment.name)}</a>` : "Unnamed Assignment";

        let dueDateCell = document.createElement("td");
        if (assignment.due_at) {
            dueDateCell.textContent = new Date(assignment.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } else {
            dueDateCell.textContent = "-";
        }

        let gradedDateCell = document.createElement("td");
        if (assignment.graded_at) {
            gradedDateCell.textContent = new Date(assignment.graded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } else {
            gradedDateCell.textContent = "-";
        }

        let scoreCell = document.createElement("td");
        let scoreContainer = document.createElement("div");
        scoreContainer.classList.add("gradebook-course-detailed-assignment-score-container", "flex-centered-row", "centered-div");

        let scoreText = document.createElement("p");
        switch (assignment.grading_type) {
            case "pass_fail":
                if (assignment.submission?.grade != null) {
                    scoreText.textContent = assignment.submission.grade;
                }
                break;

            default:
                if (assignment.submission?.score != null) {
                    scoreText.textContent = assignment.submission.score.toString().slice(0, 4) + (assignment.points_possible > 0 ? `/${assignment.points_possible} (${(assignment.submission.score / assignment.points_possible * 100).toFixed(1)}%)` : "");
                }
                break;
        }
        if (!scoreText.textContent) scoreText.textContent = "-" + (assignment.points_possible > 0 ? `/${assignment.points_possible}` : "");
        scoreContainer.appendChild(scoreText);

        if (assignment.submission?.scoreCached) {
            let cachedIcon = document.createElement("div");
            cachedIcon.classList.add("hover-label");
            cachedIcon.innerHTML = "<img src='assets/images/info.svg'>";
            cachedIcon.dataset.label = "New score is hidden. Using cached score.";
            cachedIcon.dataset.position = "top";
            scoreContainer.appendChild(cachedIcon);
        }

        scoreCell.appendChild(scoreContainer);

        let weightCell = document.createElement("td");
        let weightInput = createNumericalInput("0", "100", "N/A");
        if (assignment.weight) weightInput.value = (assignment.weight * 100).toString();
        weightInput.addEventListener("focusout", async () => {
            if (!weightInput.validity.valid) {
                weightInput.value = assignment.weight ? (assignment.weight * 100).toString() : "";
                return;
            }
            if (weightInput.value) {
                assignment.weight = parseFloat(weightInput.value) / 100;
            } else {
                delete assignment.weight;
            }
            await saveDatabase(gradebookDb, "gradebook_os", [gradebookData], true);
            recalculateCourseTotals();
        });
        weightCell.appendChild(weightInput);

        row.append(nameCell, dueDateCell, gradedDateCell, scoreCell, weightCell);
        mainBody.appendChild(row);
    });

    function generateManualAssignment(assignment) {
        let row = document.createElement("tr");

        let nameCell = document.createElement("td");
        let nameInput = document.createElement("input");
        nameInput.classList.add("gradebook-course-detailed-assignment-input", "gradebook-course-detailed-assignment-name-input");
        nameInput.placeholder = "Enter name to save, remove name to delete";
        nameInput.value = assignment?.name ?? "";
        nameInput.addEventListener("focusout", async () => {
            if (nameInput.value) {
                if (assignment) {
                    assignment.name = nameInput.value;
                } else {
                    course.manualAssignments.push({
                        name: nameInput.value,
                        submission: { score: 0 },
                        points_possible: 0,
                    });
                    scoreInput.disabled = false;
                    possibleInput.disabled = false;
                }
            } else {
                if (assignment) {
                    course.manualAssignments.splice(course.manualAssignments.indexOf(assignment), 1);
                } else {
                    course.manualAssignments.pop();
                }
                row.remove();
            }

            await saveDatabase(gradebookDb, "gradebook_os", [gradebookData], true);
        });
        nameCell.appendChild(nameInput);

        let placeholderCell = document.createElement("td");

        async function handlePointsInput(input, objPath, multiplier, emptyBehavior) {
            if (!input.validity.valid) {
                input.value = assignment ? (getObjProperty(assignment, objPath) * multiplier).toString() : (getObjProperty(course.manualAssignments.at(-1), objPath) * multiplier).toString();
                return;
            }
            if (input.value) {
                if (assignment) {
                    setObjProperty(assignment, objPath, parseFloat(input.value) / multiplier);
                } else {
                    setObjProperty(course.manualAssignments.at(-1), objPath, parseFloat(input.value) / multiplier);
                }
            } else {
                switch (emptyBehavior) {
                    case "zero":
                        if (assignment) {
                            setObjProperty(assignment, objPath, 0);
                        } else {
                            setObjProperty(course.manualAssignments.at(-1), objPath, 0);
                        }
                        input.value = "0";
                        break;

                    case "delete":
                        if (assignment) {
                            deleteObjProperty(assignment, objPath);
                        } else {
                            deleteObjProperty(course.manualAssignments.at(-1), objPath);
                        }
                        input.value = "";
                        break;
                }
            }
            await saveDatabase(gradebookDb, "gradebook_os", [gradebookData], true);
            recalculateCourseTotals();
        }

        let scoreCell = document.createElement("td");
        let scoreContainer = document.createElement("div");
        scoreContainer.classList.add("flex-centered-row", "centered-div");
        let scoreInput = createNumericalInput("0", null, "##"), possibleInput = createNumericalInput("0", null, "##");
        if (assignment) {
            scoreInput.value = assignment.submission.score.toString();
            possibleInput.value = assignment.points_possible.toString();
        } else {
            scoreInput.value = "0";
            possibleInput.value = "0";
            scoreInput.disabled = true;
            possibleInput.disabled = true;
        }

        function setPercentage() {
            percentage.textContent = `(${possibleInput.value != "0" ? (parseFloat(scoreInput.value) / parseFloat(possibleInput.value) * 100).toFixed(1) : "-"}%)`;
        }
        scoreInput.addEventListener("focusout", () => {
            handlePointsInput(scoreInput, "submission.score", 1, "zero");
            setPercentage();
        });
        possibleInput.addEventListener("focusout", () => {
            handlePointsInput(possibleInput, "points_possible", 1, "zero");
            setPercentage();
        });
        let slash = document.createElement("p");
        slash.textContent = "/";
        let percentage = document.createElement("p");
        setPercentage();
        scoreContainer.append(scoreInput, slash, possibleInput, percentage);
        scoreCell.appendChild(scoreContainer);

        let weightCell = document.createElement("td");
        let weightInput = createNumericalInput("0", "100", "N/A");
        if (assignment) {
            weightInput.value = assignment.weight ? (assignment.weight * 100).toString() : "";
        }
        weightInput.addEventListener("focusout", () => handlePointsInput(weightInput, "weight", 100, "delete"));
        weightCell.appendChild(weightInput);

        row.append(nameCell, placeholderCell, placeholderCell.cloneNode(), scoreCell, weightCell);
        manualBody.appendChild(row);
    }

    let [manualHeader, manualBody] = createBody("Manual Items", { name: "Add item", func: generateManualAssignment });
    if (course.manualAssignments.length > 0) course.manualAssignments.forEach(assignment => generateManualAssignment(assignment));

    let overallBody = document.createElement("tbody");
    let overallRow = document.createElement("tr");
    overallRow.id = "gradebook-course-detailed-overall-row";
    let overallLabelCell = document.createElement("td");
    overallLabelCell.colSpan = 3;
    overallLabelCell.textContent = "Totals";
    overallLabelCell.id = "gradebook-course-detailed-overall-label";
    let overallScoreCell = document.createElement("td");
    overallScoreCell.id = "gradebook-course-detailed-overall-score";
    overallScoreCell.textContent = overallScore;
    let overallWeightCell = document.createElement("td");
    overallWeightCell.id = "gradebook-course-detailed-overall-weight";
    overallWeightCell.textContent = overallWeight;
    overallRow.append(overallLabelCell, overallScoreCell, overallWeightCell);
    overallBody.appendChild(overallRow);

    gradesTable.append(thead, mainHeader, mainBody, manualHeader, manualBody, overallBody);
    gradesWrapper.appendChild(gradesTable);
    gradebookContent.append(courseHeader, gradesWrapper);
}

function cacheCourseAssignments(courseId, assignmentData) {
    let currentAssignmentIds = assignmentData ? new Set(assignmentData.map(x => x.id)) : null;

    if (!gradebookData.courses[courseId]) {
        gradebookData.courses[courseId] = { assignments: [], manualAssignments: [], totals: { pointsEarned: 0, pointsPossible: 0 } };
    } else {
        if (gradebookData.courses[courseId].assignments.length > 0 && currentAssignmentIds?.size) gradebookData.courses[courseId].assignments = gradebookData.courses[courseId].assignments.filter(storedAssignment => currentAssignmentIds.has(storedAssignment.id));
        gradebookData.courses[courseId].totals.pointsEarned = 0;
        gradebookData.courses[courseId].totals.pointsPossible = 0;
    }

    let toSort = false;
    for (let assignment of (assignmentData || gradebookData.courses[courseId].assignments)) {
        let existingAssignment = gradebookData.courses[courseId].assignments.find(x => x.id == assignment.id);

        if (!existingAssignment) {
            let { id, name, html_url, due_at, graded_at, grading_type, submission, points_possible } = assignment;
            gradebookData.courses[courseId].assignments.push({ id, name, html_url, due_at: due_at ? new Date(due_at).getTime() : null, graded_at: graded_at ? new Date(graded_at).getTime() : submission?.graded_at ? new Date(submission.graded_at).getTime() : null, grading_type, submission, points_possible });
            if (assignment.submission?.score != null) {
                gradebookData.courses[courseId].totals.pointsEarned += assignment.submission.score;
                gradebookData.courses[courseId].totals.pointsPossible += assignment.points_possible ?? 0;
            }
            toSort = true;
        } else {
            if (assignment.submission?.score != null) existingAssignment.submission.score = assignment.submission.score;
            if (assignment.submission?.grade != null) existingAssignment.submission.grade = assignment.submission.grade;

            if ((assignment.submission?.score == null || assignment.submission?.grade == null) && (existingAssignment.submission.score != null || existingAssignment.submission.grade != null)) {
                existingAssignment.submission.scoreCached = true;
            } else {
                delete existingAssignment.submission.scoreCached;
            }
            if (assignment.points_possible && existingAssignment.points_possible != assignment.points_possible) existingAssignment.points_possible = assignment.points_possible;
            if (!existingAssignment.graded_at) {
                if (assignment.submission?.graded_at) {
                    existingAssignment.graded_at = new Date(assignment.submission.graded_at).getTime();
                } else if (assignment.graded_at) {
                    existingAssignment.graded_at = new Date(assignment.graded_at).getTime();
                }
            }

            if (existingAssignment.submission?.score != null) {
                gradebookData.courses[courseId].totals.pointsEarned += existingAssignment.submission.score;
                gradebookData.courses[courseId].totals.pointsPossible += existingAssignment.points_possible ?? 0;
            }
        }
    }

    if (toSort) gradebookData.courses[courseId].assignments.sort((a, b) =>
        !a.due_at && !b.due_at
            ? (!a.graded_at && !b.graded_at ? 0 : !a.graded_at ? 1 : !b.graded_at ? -1 : a.graded_at - b.graded_at)
            : !a.due_at ? 1 : !b.due_at ? -1 : a.due_at - b.due_at
    );

    if (gradebookData.courses[courseId].manualAssignments.length > 0) {
        for (let manualAssignment of gradebookData.courses[courseId].manualAssignments) {
            gradebookData.courses[courseId].totals.pointsEarned += manualAssignment.submission.score;
            gradebookData.courses[courseId].totals.pointsPossible += manualAssignment.points_possible ?? 0;
        }
    }
}

function getOverallCourseStats(course) {
    let allAssignments = course.assignments.concat(course.manualAssignments);

    if (allAssignments.every(x => !x.weight)) {
        return [`${course.totals.pointsEarned.toString().slice(0, 5)}/${course.totals.pointsPossible.toString().slice(0, 5)} (${course.totals.pointsPossible > 0 ? (course.totals.pointsEarned / course.totals.pointsPossible * 100).toFixed(1) : "-"}%)`, "-%"];
    } else {
        let [scorePercent, weightPercent] = allAssignments.reduce((acc, x) => {
            if (x.submission?.score != null) {
                if (x.points_possible > 0) acc[0] += x.submission.score / x.points_possible * (x.weight ?? 0);
                acc[1] += x.weight ?? 0;
            }
            return acc;
        }, [0, 0]);
        return [`${(scorePercent / weightPercent * 100).toFixed(1)}%`, `${(weightPercent * 100).toFixed(1)}%`];
    }
}