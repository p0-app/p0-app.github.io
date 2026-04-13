function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key == name) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

function setCookie(name, value, lifespan) {
    let expires = new Date();
    expires.setTime(expires.getTime() + lifespan * 3.6e6);
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires.toUTCString()};${!window.location.href.startsWith("file://") ? " Secure;" : ""} path=/`;
}

function deleteCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}