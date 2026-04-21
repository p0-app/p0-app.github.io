window.onload = () => {
    initCalculator();
    checkTimerBreak(null, true);
    checkDbBackup("button");
}



let calculatorDb, calculatorData;
let calculatorDisplay = document.getElementById("calculator-display-container"), calculatorVal = document.getElementById("calculator-display-curr"), prevVal = document.getElementById("calculator-display-prev");
let calculatorResult;
let calculatorSecond = false, calculatorUnits = null;

const inputKeyData = [
    { id: "calculator-2nd", key: "Tab" },
    { id: "calculator-raddeg", func: () => toggleRadDeg() },
    { id: "calculator-left", get key() { return !calculatorSecond ? "ArrowLeft" : "ArrowUp"; } },
    { id: "calculator-right", get key() { return !calculatorSecond ? "ArrowRight" : "ArrowDown"; } },
    { id: "calculator-del", key: "Backspace" },
    { id: "calculator-clr", key: "Backspace", shiftKey: true },
    { id: "calculator-math", func: () => toggleMathMenu() },
    { id: "calculator-eqn-solve", func: () => { appendCalculatorGroupSpan("solve(", true, true, "calculator-parentheses-container", "solve", true, "calculator-expression-content"); toggleMathMenu(); } },
    { id: "calculator-derivative", func: () => { appendCalculatorGroupSpan("derivative(", true, true, "calculator-parentheses-container", "diff", true, "calculator-expression-content"); toggleMathMenu(); } },
    { text: "(", key: "(" }, { text: ")", key: ")" },
    { text: "ln", key: "l" }, { text: "log", func: () => !calculatorSecond ? appendCalculatorGroupSpan("log(", true, false, "calculator-parentheses-container", "basic-log10", true, null) : appendCalculatorGroupSpan("log(", true, true, "calculator-parentheses-container", "nlog", true, "calculator-nlog-content") },
    { id: "calculator-e-exp", func: () => { appendCalculatorSpan("e", true); appendCalculatorGroupSpan(null, false, false, "calculator-exponent-container", null, null, "calculator-exponent-content") } },
    { id: "calculator-10-exp", func: () => { appendCalculatorSpan("1", true); appendCalculatorSpan("0"); appendCalculatorGroupSpan(null, false, false, "calculator-exponent-container", null, null, "calculator-exponent-content") } },
    { text: "sin", key: "s" }, { text: "cos", key: "c" }, { text: "tan", key: "t" },
    { text: "sinh", func: () => appendCalculatorGroupSpan(!calculatorSecond ? "sinh(" : "sinh<sup>-1</sup>(", true, false, "calculator-parentheses-container", `trig-${!calculatorSecond ? "sinh" : "asinh"}`, true, null) }, { text: "cosh", func: () => appendCalculatorGroupSpan(!calculatorSecond ? "cosh(" : "cosh<sup>-1</sup>(", true, false, "calculator-parentheses-container", `trig-${!calculatorSecond ? "cosh" : "acosh"}`, true, null) }, { text: "tanh", func: () => appendCalculatorGroupSpan(!calculatorSecond ? "tanh(" : "tanh<sup>-1</sup>(", true, false, "calculator-parentheses-container", `trig-${!calculatorSecond ? "tanh" : "atanh"}`, true, null) },
    { text: "EE", key: "E" },
    { id: "calculator-sqrt", key: "√" }, { id: "calculator-nrt", func: () => appendCalculatorGroupSpan("√", true, true, "calculator-nrt-container", null, null, "calculator-nrt-content") },
    { id: "calculator-exponent", key: "^" },
    { text: "π/i/e", func: () => insertSymbol() }, { key: "p" }, { key: "i" }, { key: "e" },
    { text: "÷", key: "/" }, { text: "×", key: "*" }, { text: "-", key: "-" }, { text: "+", key: "+" }, { text: ".", key: "." },
    { id: "calculator-units-basen", func: () => toggleUnits() },
    { id: "calculator-convert", key: "Enter", shiftKey: true }, { text: "=", key: "Enter" }
];
const inputKeyNames = new Set(inputKeyData.flatMap(x => x.key ? [x.key] : []));
const endsWithValChar = /[0-9πeixyz)]$/, startsWithValChar = /^[0-9πeixyz(√]/, startsWithFunc = /^(a)?(sin|cos|tan|sinh|cosh|tanh|log|ln)\(/;
const unitsList = {
    "Angle": [{ name: "deg (Degree)", factor: 1 }, { name: "rad (Radian)", factor: 180 / Math.PI }, { name: "grad (Gradian)", factor: 0.9 }],
    "Area": [{ name: "acr (Acre)", factor: 4046.8564224 }, { name: "ha (Hectare)", factor: 10000 }, { name: "in² (Square inch)", factor: 0.00064516 }, { name: "ft² (Square foot)", factor: 0.09290304 }, { name: "yd² (Square yard)", factor: 0.83612736 }, { name: "mi² (Square mile)", factor: 2589988.110336 }, { name: "mm² (Square millimeter)", factor: 0.000001 }, { name: "cm² (Square centimeter)", factor: 0.0001 }, { name: "m² (Square meter)", factor: 1 }, { name: "km² (Square kilometer)", factor: 1000000 }],
    "Data": [{ name: "Bit", factor: 1 / 8 }, { name: "B (Byte)", factor: 1 }, { name: "kB (Kilobyte)", factor: 1000 }, { name: "KiB (Kibibyte)", factor: 1024 }, { name: "MB (Megabyte)", factor: 1000000 }, { name: "MiB (Mebibyte)", factor: 1048576 }, { name: "GB (Gigabyte)", factor: 1000000000 }, { name: "GiB (Gibibyte)", factor: 1073741824 }, { name: "TB (Terabyte)", factor: 1000000000000 }, { name: "TiB (Tebibyte)", factor: 1099511627776 }, { name: "PB (Petabyte)", factor: 1000000000000000 }, { name: "PiB (Pebibyte)", factor: 1125899906842624 }],
    "Energy": [{ name: "BTU (British thermal unit)", factor: 1055.05585 }, { name: "cal (Calorie)", factor: 4.184 }, { name: "kcal (Kilocalorie)", factor: 4184 }, { name: "eV (Electronvolt)", factor: 1.602176634e-19 }, { name: "ft lb (Foot pound)", factor: 1.3558179483314004 }, { name: "J (Joule)", factor: 1 }, { name: "kJ (Kilojoule)", factor: 1000 }, { name: "kWh (Kilowatt hour)", factor: 3600000 }],
    "Force": [{ name: "N (Newton)", factor: 1 }, { name: "kN (Kilonewton)", factor: 1000 }, { name: "MN (Meganewton)", factor: 1000000 }, { name: "lbf (Pound-force)", factor: 4.4482216152605 }],
    "Fuel economy": [{ name: "mi/gal (Mile per gallon)", factor: 1 }, { name: "gal/100mi (Gallon per 100 miles)", factor: 100 }, { name: "km/L (Kilometer per liter)", factor: 2.35214583, exponent: -1 }, { name: "L/100km (Liter per 100 kilometers)", factor: 235.214583, exponent: -1 }],
    "Length": [{ name: "nm (Nanometer)", factor: 1e-9 }, { name: "μm (Micrometer)", factor: 1e-6 }, { name: "mm (Millimeter)", factor: 1e-3 }, { name: "cm (Centimeter)", factor: 1e-2 }, { name: "m (Meter)", factor: 1 }, { name: "km (Kilometer)", factor: 1e3 }, { name: "in (Inch)", factor: 0.0254 }, { name: "ft (Foot)", factor: 0.3048 }, { name: "yd (Yard)", factor: 0.9144 }, { name: "mi (Mile)", factor: 1609.344 }],
    "Mass & Weight": [{ name: "μg (Microgram)", factor: 1e-6 }, { name: "mg (Milligram)", factor: 1e-3 }, { name: "g (Gram)", factor: 1 }, { name: "kg (Kilogram)", factor: 1e3 }, { name: "oz (Ounce)", factor: 28.349523125 }, { name: "lb (Pound)", factor: 453.59237 }],
    "Power": [{ name: "hp (Horsepower)", factor: 745.699872 }, { name: "W (Watt)", factor: 1 }, { name: "kW (Kilowatt)", factor: 1000 }],
    "Pressure": [{ name: "atm (Atmosphere)", factor: 101325 }, { name: "bar (Bar)", factor: 100000 }, { name: "mmHg (Millimeter of mercury)", factor: 133.322368 }, { name: "N/mm² (Newton per square millimeter)", factor: 1000000 }, { name: "Pa (Pascal)", factor: 1 }, { name: "kPa (Kilopascal)", factor: 1000 }, { name: "MPa (Megapascal)", factor: 1000000 }, { name: "GPa (Gigapascal)", factor: 1000000000 }, { name: "PSI (Pound per square inch)", factor: 6894.757293168 }],
    "Speed & Pace": [{ name: "m/s (Meter per second)", factor: 1 }, { name: "km/h (Kilometer per hour)", factor: 1 / 3.6 }, { name: "ft/s (Foot per second)", factor: 0.3048 }, { name: "mi/h (Miles per hour)", factor: 0.44704 }, { name: "kt (Knot)", factor: 0.514444 }, { name: "min/km (Minutes per kilometer)", factor: 1000 / 60, exponent: -1 }],
    "Temperature": [{ name: "°C (Celsius)", factor: 1, offset: 0 }, { name: "°F (Fahrenheit)", factor: 5 / 9, offset: -32 }, { name: "K (Kelvin)", factor: 1, offset: -273.15 }],
    "Time": [{ name: "ns (Nanosecond)", factor: 1e-9 }, { name: "μs (Microsecond)", factor: 1e-6 }, { name: "ms (Millisecond)", factor: 1e-3 }, { name: "s (Second)", factor: 1 }, { name: "min (Minute)", factor: 60 }, { name: "h (Hour)", factor: 3600 }, { name: "day (Day)", factor: 86400 }, { name: "wk (Week)", factor: 604800 }, { name: "mo (Month, 30 days)", factor: 2592000 }, { name: "yr (Year, 365 days)", factor: 31536000 }],
    "Volume": [{ name: "mL (Milliliter)", factor: 1e-6 }, { name: "L (Liter)", factor: 1e-3 }, { name: "mm³ (Cubic millimeter)", factor: 1e-9 }, { name: "cm³ (Cubic centimeter)", factor: 1e-6 }, { name: "m³ (Cubic meter)", factor: 1 }, { name: "in³ (Cubic inch)", factor: 0.000016387064 }, { name: "ft³ (Cubic foot)", factor: 0.028316846592 }, { name: "yd³ (Cubic yard)", factor: 0.764554857984 }, { name: "gal (US gallon)", factor: 0.003785411784 }, { name: "qt (US quart)", factor: 0.000946352946 }, { name: "pt (US pint)", factor: 0.000473176473 }, { name: "cup (US cup)", factor: 0.000236588236 }, { name: "fl oz (US fluid ounce)", factor: 0.0000295735295625 }],
};

async function initCalculator() {
    calculatorDb = await openDatabase(["calculator_db", 1], ["calculator_os", "key"], ["mode", "history", "variables"]);
    calculatorData = await readDatabase(calculatorDb, "calculator_os", "main");

    if (!calculatorData) {
        calculatorData = {
            key: "main",
            mode: "rad",
            history: [],
            variables: [],
        };

        await saveDatabase(calculatorDb, "calculator_os", [calculatorData], true);
    }

    formatRadDegSelected();

    let calculatorMain = document.getElementById("calculator-main-container");
    let calculatorButtons = document.getElementById("calculator-button-container");
    calculatorButtons.querySelectorAll("td").forEach(td => {
        if (td.dataset.label) td.classList.add("hover-label");
        if (td.dataset.labelExtended) td.classList.add("hover-label-extended");
        td.dataset.position = "bottom";
    });
    window.addEventListener("click", event => {
        if (calculatorMain.contains(event.target)) {
            if (!calculatorDisplay.classList.contains("calculator-display-container-active")) {
                calculatorDisplay.classList.add("calculator-display-container-active");
                calculatorVal.lastElementChild?.classList.add("calculator-input-pos");
                document.addEventListener("keydown", handleCalculatorInput);
            }

            if (calculatorButtons.contains(event.target)) {
                let button = event.target.closest(".calculator-menu-button, .calculator-button, .calculator-button-wide");
                if (button) {
                    if (/^\d$/.test(button.textContent)) {
                        handleCalculatorInput({ key: button.textContent });
                    } else {
                        let inputFound = !button.classList.contains("calculator-has-2nd") ? inputKeyData.find(x => x.id == button.id || x.text == button.textContent) : inputKeyData.find(x => x.text == button.children[0].textContent || x.id == button.id);
                        if (inputFound) {
                            if (inputFound.key) {
                                handleCalculatorInput({ key: inputFound.key, shiftKey: inputFound.shiftKey });
                            } else if (inputFound.func) {
                                inputFound.func();
                            }
                        }
                    }
                }
            }
        } else {
            if (calculatorDisplay.classList.contains("calculator-display-container-active")) {
                calculatorDisplay.classList.remove("calculator-display-container-active");
                calculatorDisplay.querySelector(".calculator-input-pos")?.classList.remove("calculator-input-pos");
                document.removeEventListener("keydown", handleCalculatorInput);
            }
        }
    });

    updateRecents("load");
    enableDropdown("calculator-recent-dropdown", "calculator-recent-content");
    enableDropdown("calculator-variables-dropdown", "calculator-variables-content");
    populateUnits("calculator-units-from");
    populateUnits("calculator-units-to", "");

    document.getElementById("calculator-units-from").addEventListener("input", e => {
        calculatorUnits[0] = e.target.value;
        calculatorUnits[1] = "";
        populateUnits("calculator-units-to", Object.keys(unitsList).find(x => unitsList[x].find(y => y.name == e.target.selectedOptions[0].text)));
    });
    document.getElementById("calculator-units-to").addEventListener("input", e => {
        calculatorUnits[1] = e.target.value;
    });
}

function handleCalculatorInput(event) {
    if (!isNaN(parseInt(event.key))) {
        appendCalculatorSpan(event.key, true);
        reformatCalculatorInput();
    } else {
        let inputPos;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Backspace", "x", "y", "z", "="].includes(event.key)) {
            inputPos = calculatorVal.querySelector(".calculator-input-pos");
        }

        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && inputPos) {
            event.preventDefault?.();
            
            switch (event.key) {
                case "ArrowLeft":
                    if (inputPos.classList.contains("calculator-group-container")) {
                        let groupContent = inputPos.querySelector(".calculator-group-content:last-of-type");
                        if (groupContent?.lastElementChild) {
                            groupContent.lastElementChild.classList.add("calculator-input-pos");
                            groupContent.lastElementChild.scrollIntoView();
                            inputPos.classList.remove("calculator-input-pos");
                        }
                    } else if (inputPos.previousElementSibling) {
                        inputPos.previousElementSibling.classList.add("calculator-input-pos");
                        inputPos.previousElementSibling.scrollIntoView();
                        inputPos.classList.remove("calculator-input-pos");
                    } else {
                        let groupContainer = inputPos.closest(".calculator-group-container");
                        if (groupContainer) {
                            if (groupContainer.classList.contains("calculator-prefix-container") && !inputPos.classList.contains("calculator-prefix-startpos")) {
                                let lastPrefix = groupContainer.firstElementChild.lastElementChild;
                                if (lastPrefix) {
                                    lastPrefix.classList.add("calculator-input-pos");
                                    lastPrefix.scrollIntoView();
                                    inputPos.classList.remove("calculator-input-pos");
                                }
                            } else if (groupContainer.previousElementSibling) {
                                groupContainer.previousElementSibling.classList.add("calculator-input-pos");
                                groupContainer.previousElementSibling.scrollIntoView();
                                inputPos.classList.remove("calculator-input-pos");
                            }
                        }
                    }
                    break;

                case "ArrowRight":
                    if (inputPos.nextElementSibling) {
                        if (inputPos.nextElementSibling.classList.contains("calculator-group-container")) {
                            let groupStart = inputPos.nextElementSibling.querySelector(".calculator-group-startpos");
                            if (groupStart) {
                                groupStart.classList.add("calculator-input-pos");
                                groupStart.scrollIntoView();
                                inputPos.classList.remove("calculator-input-pos");
                            }
                        } else {
                            inputPos.nextElementSibling.classList.add("calculator-input-pos");
                            inputPos.nextElementSibling.scrollIntoView();
                            inputPos.classList.remove("calculator-input-pos");
                        }
                    } else if (inputPos.parentElement) {
                        if (inputPos.parentElement.classList.contains("calculator-prefix")) {
                            let lastGroupStart = inputPos.parentElement.parentElement.lastElementChild.firstElementChild;
                            if (lastGroupStart) {
                                lastGroupStart.classList.add("calculator-input-pos");
                                lastGroupStart.scrollIntoView();
                                inputPos.classList.remove("calculator-input-pos");
                            }
                        } else {
                            let groupContainer = inputPos.parentElement.closest(".calculator-group-container");
                            if (groupContainer) {
                                groupContainer.classList.add("calculator-input-pos");
                                groupContainer.scrollIntoView();
                                inputPos.classList.remove("calculator-input-pos");
                            }
                        }
                    }
                    break;

                case "ArrowUp":
                    if (inputPos != calculatorVal.firstElementChild) {
                        calculatorVal.firstElementChild.classList.add("calculator-input-pos");
                        calculatorVal.firstElementChild.scrollIntoView();
                        inputPos.classList.remove("calculator-input-pos");
                    }
                    break;

                case "ArrowDown":
                    if (!inputPos != calculatorVal.lastElementChild) {
                        calculatorVal.lastElementChild.classList.add("calculator-input-pos");
                        calculatorVal.lastElementChild.scrollIntoView();
                        inputPos.classList.remove("calculator-input-pos");
                    }
                    break;
            }
        } else if (["x", "y", "z"].includes(event.key) && inputPos) {
            if (inputPos.parentElement) {
                if (inputPos.closest(".calculator-expression-content") || (inputPos.parentElement.parentElement && ["solve", "diff"].includes(inputPos.parentElement.parentElement.dataset.group))) {
                    appendCalculatorSpan(event.key);
                }
            }
        } else if (event.key == "=" && inputPos) {
            if (inputPos.parentElement?.parentElement?.dataset.group == "solve") {
                appendCalculatorSpan(" = ");
            }
        } else if (inputKeyNames.has(event.key)) {
            switch (event.key) {
                case "Backspace":
                    if (!event.shiftKey) {
                        if (!inputPos || inputPos.id == "calculator-input-startpos") break;
                        if (inputPos.classList.contains("calculator-group-startpos")) {
                            let groupContainer = inputPos.closest(".calculator-group-container");
                            if (groupContainer) {
                                groupContainer.previousElementSibling?.classList.add("calculator-input-pos");
                                groupContainer.previousElementSibling?.scrollIntoView();
                                groupContainer.remove();
                            }
                        } else {
                            if (inputPos.previousElementSibling) {
                                inputPos.previousElementSibling.classList.add("calculator-input-pos");
                                inputPos.previousElementSibling.scrollIntoView();
                            } else if (inputPos.nextElementSibling) {
                                inputPos.nextElementSibling.classList.add("calculator-input-pos");
                                inputPos.nextElementSibling.scrollIntoView();
                            }
                            inputPos.parentElement.removeChild(inputPos);
                        }
                    } else {
                        calculatorVal.innerHTML = "";
                        createStartPos();
                    }
                    if (calculatorVal.textContent == "") {
                        prevVal.innerHTML = "";
                        appendCalculatorSpan("0");
                    }
                    break;

                case "Tab":
                    event.preventDefault?.();
                    toggle2nd();
                    break;

                case "(":
                case ")":
                    appendCalculatorSpan(event.key, true);
                    break;

                case ".":
                    appendCalculatorSpan(event.key);
                    break;

                case "+":
                    appendCalculatorSpan(" + ");
                    break;

                case "-":
                    appendCalculatorSpan(" - ", true);
                    break;

                case "*":
                    appendCalculatorSpan(" ⋅ ");
                    break;

                case "/":
                    appendCalculatorSpan(" ÷ ");
                    break;

                case "s":
                    appendCalculatorGroupSpan(!calculatorSecond ? "sin(" : "sin<sup>-1</sup>(", true, false, "calculator-parentheses-container", `trig-${!calculatorSecond ? "sin" : "asin"}`, true, null);
                    break;

                case "c":
                    if (!event.ctrlKey && !event.metaKey) appendCalculatorGroupSpan(!calculatorSecond ? "cos(" : "cos<sup>-1</sup>(", true, false, "calculator-parentheses-container", `trig-${!calculatorSecond ? "cos" : "acos"}`, true, null);
                    break;

                case "t":
                    appendCalculatorGroupSpan(!calculatorSecond ? "tan(" : "tan<sup>-1</sup>(", true, false, "calculator-parentheses-container", `trig-${!calculatorSecond ? "tan" : "atan"}`, true, null);
                    break;

                case "l":
                    appendCalculatorGroupSpan("ln(", true, false, "calculator-parentheses-container", "basic-log", true, null);
                    break;

                case "E":
                    appendCalculatorSpan("E", false, "calculator-ee");
                    break;

                case "√":
                    appendCalculatorGroupSpan("√", true, false, "calculator-sqrt-container", null, null, "calculator-sqrt-content");
                    break;

                case "^":
                    appendCalculatorGroupSpan(null, false, false, "calculator-exponent-container", null, null, "calculator-exponent-content");
                    break;

                case "p":
                    appendCalculatorSpan("π", true);
                    break;

                case "e":
                case "i":
                    appendCalculatorSpan(event.key, true);
                    break;

                case "Enter":
                    if (!event.shiftKey) {
                        if (calculatorVal.textContent == "0") break;
                        if (calculatorVal.textContent.includes("Error")) {
                            calculatorVal.innerHTML = "";
                            createStartPos();
                            appendCalculatorSpan("Error", false, "calculator-result-err");
                        } else {
                            if (calculatorVal.children.length > 2 || (calculatorUnits && calculatorUnits[0] != "" && calculatorUnits[1] != "") || (!calculatorVal.lastElementChild.classList.contains("calculator-result-exact") && !calculatorVal.lastElementChild.classList.contains("calculator-result-decimal") && !calculatorVal.lastElementChild.classList.contains("calculator-result-decimal-sci"))) {
                                let evalStr;
                                try {
                                    evalStr = getEvalStr(calculatorVal);
                                    if (calculatorUnits && calculatorUnits[0] != "" && calculatorUnits[1] != "") {
                                        let fromUnits = calculatorUnits[0].split(" "), toUnits = calculatorUnits[1].split(" ");
                                        evalStr = `((${evalStr}${fromUnits[1] ? ` + ${fromUnits[1]}`: ""})${fromUnits[2] ? `^(${fromUnits[2]})` : ""} * ${fromUnits[0]} / ${toUnits[0]}${toUnits[1] ? ` - ${toUnits[1]}` : ""})${toUnits[2] ? `^(${toUnits[2]})` : ""}`;
                                    }

                                    calculatorResult = nerdamer(evalStr).evaluate().expand();
                                    prevVal.textContent = evalStr;
                                    updateRecents("add", { expression: evalStr, expressionHtml: calculatorVal.innerHTML.replaceAll("calculator-input-pos", "").replaceAll(/<span id="calculator-input-startpos"(.*?)><\/span>/g, ""), resultExact: calculatorResult.toString(), resultDecimal: formatSigDigs(calculatorResult.text("decimals"), 5) });
                                    calculatorVal.innerHTML = "";
                                    createStartPos();
                                    appendCalculatorSpan(replaceCalculatorSymbols(calculatorResult.toDecimal()), false, "calculator-result-decimal");
                                } catch (err) {
                                    console.log(err);
                                    calculatorVal.innerHTML = "";
                                    prevVal.textContent = evalStr;
                                    createStartPos();
                                    appendCalculatorSpan("Error", false, "calculator-result-err");
                                }
                            }
                        }
                    } else {
                        toggleExactDecimal();
                    }
                    break;
            }

            reformatCalculatorInput();
        }
    }
}

function appendCalculatorSpan(text, clearZero, className) {
    if (clearZero && calculatorVal.textContent == "0") calculatorVal.lastElementChild.remove();
    let span = document.createElement("span");
    span.innerHTML = text;
    if (className) span.classList.add(className);
    let inputPos = calculatorVal.querySelector(".calculator-input-pos");
    if (inputPos) {
        inputPos.parentElement.insertBefore(span, inputPos.nextElementSibling);
        inputPos.classList.remove("calculator-input-pos");
    } else {
        calculatorVal.appendChild(span);
    }
    span.classList.add("calculator-input-pos");
    span.scrollIntoView();
}

function appendCalculatorGroupSpan(text, clearZero, hasPrefix, containerClass, groupName, hasTextClass, contentClass) {
    if (clearZero && calculatorVal.textContent == "0") calculatorVal.lastElementChild.remove();
    let container = document.createElement("span");
    container.classList.add(containerClass, "calculator-group-container");
    if (groupName) container.dataset.group = groupName;

    let inputPos = calculatorVal.querySelector(".calculator-input-pos");

    if (hasPrefix) {
        container.classList.add("calculator-prefix-container");
        let degreeGroup = document.createElement("span");
        degreeGroup.classList.add("calculator-prefix", "calculator-group-content");
        let degreePlaceholder = document.createElement("span");
        degreePlaceholder.classList.add("calculator-group-startpos", "calculator-prefix-startpos", "calculator-input-pos");
        degreeGroup.appendChild(degreePlaceholder);
        container.appendChild(degreeGroup);
    }

    if (text) {
        let textSpan = document.createElement("span");
        if (hasTextClass) textSpan.classList.add("calculator-group-text");
        textSpan.innerHTML = text;
        container.appendChild(textSpan);
    }

    let contentGroup = document.createElement("span");
    if (contentClass) contentGroup.classList.add(contentClass);
    contentGroup.classList.add("calculator-group-content");
    let contentPlaceholder = document.createElement("span");
    contentPlaceholder.classList.add("calculator-group-startpos");
    if (!hasPrefix) contentPlaceholder.classList.add("calculator-input-pos");
    contentGroup.appendChild(contentPlaceholder);
    container.appendChild(contentGroup);

    if (inputPos) {
        inputPos.parentElement.insertBefore(container, inputPos.nextElementSibling);
        inputPos.classList.remove("calculator-input-pos");
    } else {
        calculatorVal.appendChild(container);
    }

    container.scrollIntoView();
}

function reformatCalculatorInput() {
    if (!calculatorVal.textContent.includes("-")) return;

    let spans = Array.from(calculatorVal.querySelectorAll("span"));

    spans.forEach((span, i) => {
        if (span.children.length == 0 && span.textContent.trim() == "-") {
            let prevSpan = i > 0 ? spans[i - 1] : null;
            let prevText = prevSpan ? prevSpan.textContent.trim() : null;

            if (prevText && endsWithValChar.test(prevText)) {
                if (span.textContent != " - ") span.textContent = " - ";
            } else {
                if (span.textContent != "-") span.textContent = "-";
            }
        }
    });
}

function getEvalStr(element, inDiff = false) {
    let result = "";
    let children = Array.from(element.childNodes);

    for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === Node.ELEMENT_NODE) {
            if (children[i].id == "calculator-input-startpos" || children[i].classList.contains("calculator-group-startpos")) continue;

            if (children[i].classList.contains("calculator-exponent-container")) {
                result += `^(${getEvalStr(children[i].querySelector(".calculator-exponent-content"), inDiff)})`;
            } else if (children[i].classList.contains("calculator-sqrt-container")) {
                result += `sqrt(${getEvalStr(children[i].querySelector(".calculator-sqrt-content"), inDiff)})`;
            } else if (children[i].classList.contains("calculator-nrt-container")) {
                result += `(${getEvalStr(children[i].querySelector(".calculator-nrt-content"), inDiff)})^(1/(${getEvalStr(children[i].querySelector(".calculator-prefix"), inDiff)}))`;
            } else if (children[i].dataset.group) {
                if (children[i].dataset.group.startsWith("basic-")) {
                    result += `${children[i].dataset.group.split("-")[1]}(${getEvalStr(children[i].querySelector(".calculator-group-content"), inDiff)})`;
                } else if (children[i].dataset.group.startsWith("trig-")) {
                    let func = children[i].dataset.group.split("-")[1];
                    if (!func.startsWith("a")) {
                        result += `${func}(${(calculatorData.mode == "deg" && !inDiff) ? `pi/180*(${getEvalStr(children[i].querySelector(".calculator-group-content"), inDiff)})` : getEvalStr(children[i].querySelector(".calculator-group-content"), inDiff)})`;
                    } else {
                        result += `${(calculatorData.mode == "deg" && !inDiff) ? "180/pi*" : ""}${func}(${getEvalStr(children[i].querySelector(".calculator-group-content"), inDiff)})`;
                    }
                } else {
                    switch (children[i].dataset.group) {
                        case "solve":
                            result += `${children[i].dataset.group}(${getEvalStr(children[i].querySelector(".calculator-expression-content"), inDiff)},${getEvalStr(children[i].querySelector(".calculator-prefix"), inDiff)})`;
                            break;
                        case "diff":
                            result += `${children[i].dataset.group}(${getEvalStr(children[i].querySelector(".calculator-expression-content"), true)},${getEvalStr(children[i].querySelector(".calculator-prefix"), true)})`;
                            break;
                        case "nlog":
                            result += `log(${getEvalStr(children[i].querySelector(".calculator-nlog-content"), inDiff)})/log(${getEvalStr(children[i].querySelector(".calculator-prefix"), inDiff)})`;
                            break;
                    }
                }
            } else {
                result += children[i].textContent.replaceAll("⋅", "*").replaceAll("÷", "/").replaceAll("π", "pi").replaceAll("E", "*10^");
            }

            let nextChild = i + 1 < children.length ? children[i + 1] : null;
            if (nextChild && nextChild.nodeType === Node.ELEMENT_NODE) {
                let currentText = children[i].textContent.trim(), nextText = nextChild.textContent.trim();
                if ((endsWithValChar.test(currentText) && (startsWithFunc.test(nextText) || nextText.startsWith("√"))) || (children[i].classList.contains("calculator-group-container") && (startsWithValChar.test(nextText) || startsWithFunc.test(nextText) || nextChild.classList.contains("calculator-group-container")))) {
                    result += "*";
                }
            }
        }
    }

    return result;
}

function toggle2nd() {
    calculatorSecond = calculatorSecond ? false : true;

    document.getElementById("calculator-button-container").querySelectorAll(".calculator-has-2nd").forEach(x => {
        x.children[0].style.display = calculatorSecond ? "none" : "inline-block";
        x.children[1].style.display = calculatorSecond ? "inline-block" : "none";
        if (x.dataset.labelSecond) {
            [x.dataset.label, x.dataset.labelSecond] = [x.dataset.labelSecond, x.dataset.label];
            [x.dataset.labelExtended, x.dataset.labelExtendedSecond] = [x.dataset.labelExtendedSecond, x.dataset.labelExtended];
        }
    });

    let secondButton = document.getElementById("calculator-2nd");
    secondButton.style.backgroundColor = calculatorSecond ? "transparent" : null;
    secondButton.style.color = calculatorSecond ? "#a5e3ff" : null;
    secondButton.style.border = calculatorSecond ? "2px solid #a5e3ff" : null;
}

async function toggleRadDeg() {
    calculatorData.mode = calculatorData.mode == "rad" ? "deg" : "rad";
    await saveDatabase(calculatorDb, "calculator_os", [calculatorData], true);
    formatRadDegSelected();
}

function formatRadDegSelected() {
    let raddegSelectedContainer = document.getElementById("calculator-raddeg-selected-container");
    document.getElementById("calculator-raddeg-selected").style.left = calculatorData.mode == "rad" ? "-25%" : "50%";
    raddegSelectedContainer.children[calculatorData.mode == "rad" ? 1 : 3].style.color = "#58CC02";
    raddegSelectedContainer.children[calculatorData.mode == "rad" ? 3 : 1].style.color = "#ffffff";
}

function toggleMathMenu() {
    let mathMenu = document.getElementById("calculator-math-menu");
    mathMenu.style.display = mathMenu.style.display == "none" ? "flex": "none";
}

function toggleExactDecimal() {
    if (calculatorVal.children.length == 2 && (calculatorVal.lastElementChild.classList.contains("calculator-result-exact") || calculatorVal.lastElementChild.classList.contains("calculator-result-decimal") || calculatorVal.lastElementChild.classList.contains("calculator-result-decimal-sci"))) {
        let nextClass = calculatorVal.lastElementChild.classList.contains("calculator-result-decimal") ? "calculator-result-decimal-sci" : calculatorVal.lastElementChild.classList.contains("calculator-result-decimal-sci") ? "calculator-result-exact" : "calculator-result-decimal";
        calculatorVal.innerHTML = "";
        createStartPos();
        let result = nextClass == "calculator-result-decimal" ? calculatorResult.toDecimal() : nextClass == "calculator-result-decimal-sci" ? calculatorResult.text("scientific") : calculatorResult.toString();
        appendCalculatorSpan(replaceCalculatorSymbols(result), false, nextClass);
    }
}

function insertSymbol() {
    let inputPos = calculatorVal.querySelector(".calculator-input-pos");
    if (inputPos) {
        let symbols = ["π", "i", "e"];
        let idx = symbols.indexOf(inputPos.textContent);

        if (idx != -1) {
            inputPos.textContent = symbols[idx < symbols.length - 1 ? idx + 1 : 0];
        } else {
            appendCalculatorSpan("π", true);
        }
    } else {
        appendCalculatorSpan("π", true);
    }
}

function toggleUnits() {
    let unitsDiv = document.getElementById("calculator-units"), unitsButton = document.getElementById("calculator-units-basen");
    let displays;
    if (!calculatorUnits) {
        calculatorUnits = ["", ""];
        displays = "block";
        unitsDiv.children[0].style.display = "none";
        populateUnits("calculator-units-to", "");
        unitsButton.style.border = "2px solid #a5e3ff";
    } else {
        calculatorUnits = null;
        displays = "none";
        unitsDiv.children[0].style.display = "block";
        unitsDiv.children[1].selectedIndex = 0;
        unitsDiv.children[3].innerHTML = "";
        unitsButton.style.border = null;
    }
    for (let i = 1; i <= 3; i++) {
        unitsDiv.children[i].style.display = displays;
    }
}

function createStartPos() {
    let startPos = document.createElement("span");
    startPos.id = "calculator-input-startpos";
    calculatorVal.appendChild(startPos);
}

function replaceCalculatorSymbols(str) {
    return str.replaceAll("pi", "π").replaceAll("log(", "ln(").replaceAll("log10(", "log(");
}

async function updateRecents(mode, itemData) {
    let recentItems = document.getElementById("calculator-recent-items");

    const generateRecentItem = data => {
        let item = document.createElement("div");
        item.classList.add("calculator-recent-item", "flex-column");

        let expression = document.createElement("p");
        expression.classList.add("calculator-recent-expression");
        expression.textContent = data.expression;
        expression.addEventListener("click", event => {
            event.stopPropagation();

            if (calculatorVal.textContent == "0") {
                calculatorVal.innerHTML = "";
                createStartPos();
            }
            calculatorVal.innerHTML = calculatorVal.innerHTML + data.expressionHtml;
            if (!calculatorDisplay.classList.contains("calculator-display-container-active")) {
                calculatorDisplay.classList.add("calculator-display-container-active");
                calculatorVal.lastElementChild?.classList.add("calculator-input-pos");
                document.addEventListener("keydown", handleCalculatorInput);
            } else if (!calculatorVal.querySelector(".calculator-input-pos")) {
                calculatorVal.lastElementChild?.classList.add("calculator-input-pos");
            }
        });
        
        let result = document.createElement("p");
        result.classList.add("calculator-recent-result");
        result.textContent = `${data.resultDecimal.includes(".") ? "≈" : "="} ${data.resultDecimal}`;
        result.addEventListener("click", event => {
            event.stopPropagation();
            calculatorResult = nerdamer(data.resultExact).evaluate().expand();
            appendCalculatorSpan(data.resultExact.includes("/") ? `(${replaceCalculatorSymbols(data.resultExact)})` : replaceCalculatorSymbols(data.resultExact), true, "calculator-result-exact");
            if (!calculatorDisplay.classList.contains("calculator-display-container-active")) {
                calculatorDisplay.classList.add("calculator-display-container-active");
                calculatorVal.lastElementChild?.classList.add("calculator-input-pos");
                document.addEventListener("keydown", handleCalculatorInput);
            }
        });

        item.append(expression, result);
        recentItems.prepend(item);
    }

    switch (mode) {
        case "load":
            if (calculatorData.history.length > 0) {
                calculatorData.history.forEach(x => generateRecentItem(x));
            } else {
                recentItems.innerHTML = "<p>No recent calculations</p>";
            }

            let recentClr = document.getElementById("calculator-recent-clear");
            recentClr.appendChild(createImgButton(["right-panel-img-button"], "img", "assets/images/delete.svg", "234, 51, 35", { text: "Clear recents", position: "top" }));
            recentClr.addEventListener("click", async () => {
                let clearConfirm = confirm("Are you sure you want to clear all recent calculations?");
                if (!clearConfirm) return;

                calculatorData.history = [];
                await saveDatabase(calculatorDb, "calculator_os", [calculatorData], true);

                recentItems.innerHTML = "<p>No recent calculations</p>";
            });

            document.getElementById("calculator-recent-search").addEventListener("input", event => {
                if (calculatorData.history.length == 0) return;

                let valueTrimmed = event.target.value.replace(/\s+/g, "");
                if (valueTrimmed != "") {
                    recentItems.innerHTML = "";

                    let filtered = calculatorData.history.filter(x => x.expression.replace(/\s+/g, "").includes(valueTrimmed) || x.resultDecimal.replace(/\s+/g, "").includes(valueTrimmed));

                    if (filtered.length > 0) {
                        filtered.forEach(x => generateRecentItem(x));
                    } else {
                        recentItems.innerHTML = "<p>No recents found</p>";
                    }
                } else {
                    if (recentItems.children.length != calculatorData.history.length) {
                        recentItems.innerHTML = "";
                        calculatorData.history.forEach(x => generateRecentItem(x));
                    }
                }
            });

            break;

        case "add":
            calculatorData.history.push(itemData);
            if (calculatorData.history.length > 100) calculatorData.history.shift();
            await saveDatabase(calculatorDb, "calculator_os", [calculatorData], false);

            let searchBar = document.getElementById("calculator-recent-search");
            if (recentItems.textContent == "No recent calculations") {
                recentItems.innerHTML = "";
                generateRecentItem(itemData);
            } else {
                if (searchBar.value != "" && recentItems.children.length != calculatorData.history.length - 1) {
                    recentItems.innerHTML = "";
                    calculatorData.history.forEach(x => generateRecentItem(x));
                } else {
                    generateRecentItem(itemData);
                }
            }
            searchBar.value = "";
            recentItems.scrollTop = 0;

            break;

        case "remove":
            break;
    }
}

function populateUnits(selectId, filter) {
    let select = document.getElementById(selectId);
    select.innerHTML = "";
    let blankOption = new Option("", "", true, true);
    blankOption.disabled = true;
    select.options.add(blankOption);

    if (filter == "") return;
    let dataToProcess = filter ? { [filter]: unitsList[filter] } : unitsList;

    for (let category in dataToProcess) {
        let parent = filter ? select : document.createElement("optgroup");
        if (!filter) {
            parent.label = category;
        }

        dataToProcess[category].forEach(unit => {
            let option = new Option(unit.name, `${unit.factor} ${unit.offset ?? ""} ${unit.exponent ?? ""}`);
            parent.appendChild(option);
        });

        if (!filter) {
            select.appendChild(parent);
        }
    }
}