function extractDominantColor(imgElement, rejectSimilarity) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');

    canvas.width = 16;
    canvas.height = 16;

    context.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    try {
        let imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;

        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < imageData.length; i += 16) {
            if (imageData[i + 3] < 128) continue;

            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
            count++;
        }

        if (count > 0) {
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);

            let brightness = r * 0.299 + g * 0.587 + b * 0.114;
            let bgSimilarity = colorSimilarity(r, g, b, ...rejectSimilarity);

            if (brightness < 70 || bgSimilarity < 60) {
                brightness = 240 * 0.299 + 240 * 0.587 + 240 * 0.114;
                return [[240, 240, 240], brightness];
            }

            return [[r, g, b], brightness];
        } else {
            return null;
        }
    } catch {
        return null;
    }
}

function colorSimilarity(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
    );
}

function rgbToHex(rgb) {
    if (!rgb || rgb == "") return "#ffffff";
    let parts = rgb.split(',').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return "#ffffff";
    let [r, g, b] = parts;
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

function getColorForTextLength(length, minLength, maxLength, opacity, darkPercent) {
    let r = 255, g = 0, b = 0;

    if (length <= minLength) {
        [r, g, b] = [255, 0, 0];
    } else if (length >= maxLength) {
        [r, g, b] = [128, 0, 128];
    } else {
        let ratio = (length - minLength) / (maxLength - minLength);
        [r, g, b] = ratio < 0.2 ? [255, Math.round(165 * (ratio / 0.2)), 0] : ratio < 0.4 ? [255, Math.round(165 + 90 * ((ratio - 0.2) / 0.2)), 0] : ratio < 0.6 ? [Math.round(255 * (1 - (ratio - 0.4) / 0.2)), 255, 0] : ratio < 0.8 ? [0, Math.round(255 * (1 - (ratio - 0.6) / 0.2)), Math.round(255 * ((ratio - 0.6) / 0.2))] : [Math.round(128 * ((ratio - 0.8) / 0.2)), 0, Math.round(255 - 127 * ((ratio - 0.8) / 0.2))];
    }

    return {
        light: `rgba(${r}, ${g}, ${b}, ${opacity})`,
        dark: `rgba(${Math.round(r * darkPercent)}, ${Math.round(g * darkPercent)}, ${Math.round(b * darkPercent)}, ${opacity})`
    };
}