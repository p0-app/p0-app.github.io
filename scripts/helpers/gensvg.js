function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
    }
    return el;
}

function createTimeSvg(size) {
    const svg = createSvgElement("svg", {
        width: size,
        height: size,
        viewBox: "0 0 16 16",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg"
    });

    const g = createSvgElement("g", { opacity: "1" });

    const path1 = createSvgElement("path", {
        d: "M1 8C1 4.13401 4.13401 0.999999 8 0.999999C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8Z",
        stroke: "currentColor",
        "stroke-width": "2"
    });

    const path2 = createSvgElement("path", {
        "fill-rule": "evenodd",
        "clip-rule": "evenodd",
        d: "M8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6Z",
        fill: "currentColor"
    });

    const path3 = createSvgElement("path", {
        "fill-rule": "evenodd",
        "clip-rule": "evenodd",
        d: "M4.79155 6.09591C4.41476 5.71261 4.41664 5.09746 4.79576 4.71647V4.71647C5.18084 4.3295 5.80777 4.33141 6.19047 4.72073L7.94687 6.50744C8.32366 6.89074 8.32179 7.50589 7.94266 7.88688V7.88688C7.55759 8.27385 6.93065 8.27194 6.54795 7.88263L4.79155 6.09591Z",
        fill: "currentColor"
    });

    g.append(path1, path2, path3);
    svg.appendChild(g);

    return svg;
}

function createMoreSvg(size) {
    const svg = createSvgElement("svg", {
        width: size,
        height: size,
        viewBox: "0 -960 960 960",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg"
    });

    const path = createSvgElement("path", {
        d: "M240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400Z"
    });

    svg.appendChild(path);
    return svg;
}

function createPaletteSvg(size) {
    const svg = createSvgElement("svg", {
        width: size,
        height: size,
        viewBox: "0 -960 960 960",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg"
    });

    const path = createSvgElement("path", {
        d: "M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-220 40q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120-160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm200 0q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120 160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z",
    });

    svg.appendChild(path);
    return svg;
}

function createArrowSvg(size, direction) {
    const svg = createSvgElement("svg", {
        width: size,
        height: size,
        viewBox: "0 -960 960 960",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg"
    });

    let path;
    switch (direction) {
        case "left":
            path = createSvgElement("path", {
                d: "M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z",
            });
            break;

        case "right":
            path = createSvgElement("path", {
                d: "M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z",
            });
            break;

        case "up":
            path = createSvgElement("path", {
                d: "M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z",
            });
            break;

        case "down":
            path = createSvgElement("path", {
                d: "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z",
            });
            break;
    }

    svg.appendChild(path);
    return svg;
}

function createSelectAllSvg(size) {
    const svg = createSvgElement("svg", {
        width: size,
        height: size,
        viewBox: "0 -960 960 960",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg"
    });

    const path = createSvgElement("path", {
        d: "M268-240 42-466l57-56 170 170 56 56-57 56Zm226 0L268-466l56-57 170 170 368-368 56 57-424 424Zm0-226-57-56 198-198 57 56-198 198Z"
    });

    svg.appendChild(path);
    return svg;
}

function createIntelligentSvg(size) {
    const svg = createSvgElement("svg", {
        width: size,
        height: size,
        viewBox: "0 0 16 16",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg"
    });

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const linearGradientElement = createSvgElement("linearGradient", {
        id: "sparkleGradient",
        x1: "0%",
        y1: "0%",
        x2: "100%",
        y2: "100%"
    });
    const stopElement1 = createSvgElement("stop", {
        offset: "25%",
        style: "stop-color:rgb(66, 133, 244);stop-opacity:1"
    });
    const stopElement2 = createSvgElement("stop", {
        offset: "60%",
        style: "stop-color:rgb(155, 114, 203);stop-opacity:1"
    });
    const stopElement3 = createSvgElement("stop", {
        offset: "100%",
        style: "stop-color:rgb(217, 101, 112);stop-opacity:1"
    });
    linearGradientElement.appendChild(stopElement1);
    linearGradientElement.appendChild(stopElement2);
    linearGradientElement.appendChild(stopElement3);
    defs.appendChild(linearGradientElement);

    const path = createSvgElement("path", {
        d: "m6.273 2.893-.998 2.995c-.1.3-.336.536-.636.637l-2.995.998a.503.503 0 0 0 0 .954l2.995.998c.3.1.536.336.636.637l.998 2.995a.503.503 0 0 0 .955 0l.998-2.995c.1-.3.336-.536.636-.637l2.995-.998a.503.503 0 0 0 0-.954l-2.995-.998c-.3-.1-.536-.336-.636-.637l-.998-2.995a.503.503 0 0 0-.955 0ZM12.547 1.172l-.231.693c-.1.3-.336.536-.636.636l-.694.231c-.229.077-.229.401 0 .477l.694.231c.3.1.536.336.636.637l.23.693c.077.229.402.229.478 0l.231-.693c.1-.3.336-.536.636-.637l.693-.23c.23-.077.23-.401 0-.478l-.693-.23c-.3-.1-.536-.337-.636-.637l-.231-.693a.251.251 0 0 0-.477 0ZM12.547 11.23l-.231.693c-.1.3-.336.536-.636.636l-.694.232c-.229.076-.229.4 0 .477l.694.23c.3.1.536.337.636.637l.23.693c.077.23.402.23.478 0l.231-.693c.1-.3.336-.536.636-.636l.693-.231c.23-.077.23-.401 0-.477l-.693-.232c-.3-.1-.536-.335-.636-.636l-.231-.693a.251.251 0 0 0-.477 0Z",
        fill: "url(#sparkleGradient)"
    });

    svg.appendChild(defs);
    svg.appendChild(path);
    return svg;
}

function createCircularBorders(appendDests) {
    if (!appendDests) appendDests = document.getElementsByClassName("circular-button");
    for (let appendDest of appendDests) {
        const svg = createSvgElement("svg", {
            viewBox: "0 0 60 60",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg",
        });
        svg.classList.add("circular-button-border");

        const path1 = createSvgElement("path", { d: "M56.75,26V25.5a27.49,27.49,0,0,0-54.25,0V26", "stroke-width": appendDest.dataset?.strokeWidth ?? "3", stroke: appendDest.dataset?.strokeColor ?? "#b4b4b4" }), path2 = createSvgElement("path", { d: "M56.75,34v.49a27.49,27.49,0,0,1-54.25,0V34", "stroke-width": appendDest.dataset?.strokeWidth ?? "3", stroke: appendDest.dataset?.strokeColor ?? "#b4b4b4" });
        path1.classList.add("circular-button-path");
        path2.classList.add("circular-button-path");

        svg.append(path1, path2);
        appendDest.appendChild(svg);
    }
}