function radToDeg(angleRad) {
    return 180 * angleRad / Math.PI;
}

function degToRad(angleDeg) {
    return Math.PI * angleDeg / 180;
}

function formatSigDigs(numStr, numSigs) {
    const numRegex = /(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?/g;

    return numStr.replace(numRegex, match => {
        let num = Number(match);
        if (!Number.isFinite(num) || (Number.isInteger(num) && num.toString().length <= numSigs)) return match;
        return num.toPrecision(numSigs).replaceAll("e", "E");
    });
}