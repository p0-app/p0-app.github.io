function dateToDecimal(date) {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function timeToDecimal(hour, minute, amPm) {
    hour = parseInt(hour, 10);
    minute = parseInt(minute, 10);

    if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

    let hour24 = hour;
    if (amPm == "PM" && hour != 12) {
        hour24 += 12;
    } else if (amPm == "AM" && hour == 12) {
        hour24 = 0;
    }

    return hour24 + minute / 60;
}

function decimalToTime(decimalTime, outputFormat) {
    if (decimalTime == null || isNaN(decimalTime) || decimalTime < 0 || decimalTime >= 24) return "--:--";

    let hours = Math.floor(decimalTime);
    let minutes = Math.round((decimalTime - hours) * 60);

    if (minutes == 60) {
        minutes = 0;
        hours += 1;
    }

    let amPm = hours >= 12 ? "PM" : "AM";
    let hours12 = hours % 12;
    if (hours12 == 0) hours12 = 12;

    switch (outputFormat) {
        case "str":
            return `${hours12.toString()}:${minutes.toString().padStart(2, '0')} ${amPm}`;

        case "arr":
            return [hours12.toString(), minutes.toString().padStart(2, '0'), amPm];
    }
}

function getConcatDateStr(date) {
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;
}

function getDateFromStr(dateStr) {
    return new Date(
        parseInt(dateStr.slice(0, 4), 10),
        parseInt(dateStr.slice(4, 6), 10) - 1,
        parseInt(dateStr.slice(6, 8), 10)
    );
}

function getDaysBetween(date1, date2, mode) {
    switch (mode) {
        case "str":
            return Math.floor((getDateFromStr(date1).getTime() - getDateFromStr(date2).getTime()) / 8.64e7);
        case "obj":
            return Math.floor((date1.getTime() - date2.getTime()) / 8.64e7);
    }
}

function adjustDate(date, delta) {
    date.setDate(date.getDate() + delta);
    return date;
}

function secondsToHMS(seconds) {
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];
}

function parseHMS(hms, showSeconds) {
    return [hms[0] > 0 ? `${hms[0]}h` : "", hms[1] > 0 ? `${hms[1]}m` : "", ((showSeconds || (3600*hms[0] + 60*hms[1] + hms[2] < 120)) && hms[2] > 0) ? `${hms[2]}s` : ""].filter(x => x != "").join(" ");
}

function getAgoStr(diffMs) {
    let timeMap = [
        { limit: 60000, text: () => "just now" },
        { limit: 3600000, text: ms => `${Math.floor(ms / 60000)} minute${Math.floor(ms / 60000) === 1 ? "" : "s"} ago` },
        { limit: 86400000, text: ms => `${Math.floor(ms / 3600000)} hour${Math.floor(ms / 3600000) === 1 ? "" : "s"} ago` },
        { limit: Infinity, text: ms => `${Math.floor(ms / 86400000)} day${Math.floor(ms / 86400000) === 1 ? "" : "s"} ago` }
    ];
    return timeMap.find(t => diffMs < t.limit).text(diffMs);
}

function calculateSunRiseSet(dateStr, forceRecalc, useCache) {
    if (!forceRecalc && useCache) {
        let cachedSunTimes = localStorage.getItem("sunTimes")?.split(",");
        if (cachedSunTimes && cachedSunTimes[2] == dateStr) return { riseTime: cachedSunTimes[0], setTime: cachedSunTimes[1] };
    }

    let locationData = localStorage.getItem("latlong");
    if (!locationData) return { riseTime: null, setTime: null };
    locationData = locationData.split(",").map(x => parseFloat(x));

    function getJD(year, month, day) {
        if (month <= 2) {
            year--;
            month += 12;
        }
        let A = Math.floor(year / 100);
        let B = 2 - A + Math.floor(A / 4);
        let JD = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
        return JD;
    }

    function calcSunRiseSetUTC(rise, JD, latitude, longitude) {
        let t = (JD - 2451545.0) / 36525.0;

        let seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * (0.001813)));
        let e0 = 23.0 + (26.0 + (seconds / 60.0)) / 60.0;
        let omega = 125.04 - 1934.136 * t;
        let epsilon = e0 + 0.00256 * Math.cos(degToRad(omega));
        let l0 = 280.46646 + t * (36000.76983 + t * (0.0003032));
        while (l0 > 360.0) l0 -= 360.0;
        while (l0 < 0.0) l0 += 360.0;
        let e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
        let m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
        let y = Math.tan(degToRad(epsilon) / 2.0);
        y *= y;
        let sin2l0 = Math.sin(2.0 * degToRad(l0));
        let sinm = Math.sin(degToRad(m));
        let cos2l0 = Math.cos(2.0 * degToRad(l0));
        let sin4l0 = Math.sin(4.0 * degToRad(l0));
        let sin2m = Math.sin(2.0 * degToRad(m));
        let Etime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
        let eqTime = radToDeg(Etime) * 4.0;

        let sin3m = Math.sin(3.0 * degToRad(m));
        let c = sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin2m * (0.019993 - 0.000101 * t) + sin3m * 0.000289;
        let o = l0 + c;
        let lambda = o - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
        let sint = Math.sin(degToRad(epsilon)) * Math.sin(degToRad(lambda));
        let solarDec = radToDeg(Math.asin(sint));
        let latRad = degToRad(latitude);
        let sdRad = degToRad(solarDec);
        let HAarg = (Math.cos(degToRad(90.833)) / (Math.cos(latRad) * Math.cos(sdRad)) - Math.tan(latRad) * Math.tan(sdRad));
        let hourAngle = Math.acos(HAarg);
        if (!rise) hourAngle = -hourAngle;
        let delta = longitude + radToDeg(hourAngle);
        let timeUTC = 720 - (4.0 * delta) - eqTime;

        return timeUTC;
    }

    let date = getDateFromStr(dateStr);
    let jday = getJD(date.getFullYear(), date.getMonth() + 1, date.getDate());

    function calculateTime(rise) {
        let timeUTC = calcSunRiseSetUTC(rise, jday, locationData[0], locationData[1]);
        let newTimeUTC = calcSunRiseSetUTC(rise, jday + timeUTC / 1440.0, locationData[0], locationData[1]);
        let timeLocal;

        if (!isNaN(newTimeUTC)) {
            timeLocal = newTimeUTC - date.getTimezoneOffset();
            if (timeLocal < 0.0 || timeLocal >= 1440.0) {
                let increment = timeLocal < 0 ? 1 : -1;
                while (timeLocal < 0.0 || timeLocal >= 1440.0) {
                    timeLocal += increment * 1440.0;
                }
            }
        }

        return timeLocal;
    }

    let riseTime = calculateTime(1), setTime = calculateTime(0);
    if (useCache) localStorage.setItem("sunTimes", `${riseTime ?? ""},${setTime ?? ""},${dateStr}`);
    return { riseTime, setTime };
}