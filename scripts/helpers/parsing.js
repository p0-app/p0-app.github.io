function sanitizeInnerHTML(str) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
        ":": '&#58;',
    };
    const reg = /[&<>"'/:]/ig;
    return str.replace(reg, match => map[match]);
}

function sanitizeURL(url) {
    try {
        const parsed = new URL(url, window.location.origin);
        if (["http:", "https:", "file:"].includes(parsed.protocol)) {
            return url;
        } else {
            return "";
        }
    } catch {
        return "";
    }
}

function capitalizeWords(str, splitter = " ", titleCase = false) {
    const minorWords = new Set([
        "a", "an", "the",
        "and", "but", "or", "nor", "for", "so", "yet",
        "on", "in", "at", "to", "from", "by", "up", "of", "off", "per", "as", "via", "into", "onto", "over", "with"
    ]);

    return str.split(splitter).map((word, idx) => {
        let lowerWord = word.toLowerCase();
        if (titleCase && idx != 0 && minorWords.has(lowerWord)) return lowerWord;
        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    }).join(" ");
}

function trimString(str, maxLength, cutoff = "…") {
    let cleanStr = str.trim();
    if (cleanStr.length > maxLength) {
        cleanStr = `${cleanStr.slice(0, maxLength - cutoff.length)}${cutoff}`;
    }
    return cleanStr;
}

function extractSentences(str, numSentences) {
    if (!str) return "";
    let cleanStr = str.trim();

    const sentenceRegex = /[\.?!]+(?=\s+[A-Z]|$)/g;

    let sentences = [];
    let sliceStart = 0;
    let match;

    while (sentences.length < numSentences && (match = sentenceRegex.exec(cleanStr)) != null) {
        let j = match.index - 1;
        while (j >= sliceStart && cleanStr[j] != " ") j--;

        let lastWord = cleanStr.slice(j + 1, match.index);
        if (/^[A-Z]$/.test(lastWord) || /^([A-Z]\.)+[A-Z]$/.test(lastWord)) continue;

        let checkEnd = match.index + match[0].length;
        sentences.push(cleanStr.slice(sliceStart, checkEnd));
        sliceStart = checkEnd;
    }

    if (sentences.length == 0 && cleanStr.length > 0) return cleanStr;

    if (sentences.length < numSentences && sliceStart < cleanStr.length) sentences.push(cleanStr.slice(sliceStart));
    return sentences.join("");
}

function extractURL(str) {
    if (!str) return null;
    const urlRegex = /(https?:\/\/[^\s"'<>()]+)/i;
    const match = str.match(urlRegex);
    return match ? match[0] : null;
}

function extractHTMLElem(str, tag) {
    if (!str) return null;
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    let match = str.match(regex);
    return match ? match[1] : null;
}

function removeHTMLTags(str) {
    if (!str) return null;
    return str.replace(/<\/?[^>]+>/g, '');
}

function getObjProperty(obj, path) {
    return !path.includes(".") ? obj[path] : path.split('.').reduce((o, k) => o?.[k], obj);
}

function setObjProperty(obj, path, value) {
    if (!path.includes(".")) {
        obj[path] = value;
    } else {
        let keys = path.split('.');
        let lastKey = keys.pop();
        let lastObj = keys.reduce((o, k) => o[k] ??= {}, obj);
        lastObj[lastKey] = value;
    }
}

function deleteObjProperty(obj, path) {
    if (!path.includes(".")) {
        delete obj[path];
    } else {
        let keys = path.split('.');
        let lastKey = keys.pop();
        let lastObj = keys.reduce((o, k) => o?.[k], obj);
        if (lastObj && lastKey in lastObj) {
            delete lastObj[lastKey];
        }
    }
}

async function fetchJSON(url, options = {}, includeHeaders = false, encodeURI = false) {
    try {
        let awsKeys = IS_LOCAL ? null : await loadKeys("aws");
        let resp = await fetch(IS_LOCAL ? url : `${awsKeys[0]}/proxy?url=${encodeURIComponent(url)}${includeHeaders ? "&ih=1" : ""}${encodeURI ? "&eu=1" : ""}`, IS_LOCAL ? options : { ...options, headers: { ...(options?.headers || {}), 'x-api-key': awsKeys[1] } });
        if (!resp.ok) return null;
        let json = await resp.json();

        if (IS_LOCAL) {
            return !includeHeaders ? json : { json, headers: Object.fromEntries(resp.headers) };
        } else {
            if (!json?.body) return null;
            return !includeHeaders ? JSON.parse(json.body) : { json: JSON.parse(json.body), headers: json.headers };
        }
    } catch {
        return null;
    }
}