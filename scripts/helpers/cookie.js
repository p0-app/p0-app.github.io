async function getCookie(name) {
    if (IS_LOCAL) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key == name) {
                return decodeURIComponent(value);
            }
        }
    } else {
        try {
            const cookie = await cookieStore.get(name);
            return cookie?.value;
        } catch (err) {
            console.log(err);
        }
    }

    return null;
}

async function setCookie(name, value, lifespan) {
    let expires = new Date();
    expires.setTime(expires.getTime() + lifespan * 3.6e6);
    if (IS_LOCAL) {
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/`;
    } else {
        try {
            await cookieStore.set({
                name, value,
                expires: expires.getTime(),
                partitioned: true,
                sameSite: "strict",
            });
        } catch (err) {
            console.log(err);
        }
    }
}

function deleteCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}