var locale_object = null;

function loadLocale(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    var path = window.location.pathname == "/" ? "/site_api/" : "/api/";
    xobj.open('GET', path + 'locale', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            locale_object = JSON.parse(xobj.responseText);
            console.log(locale_object.locale);
            callback();
        }
        if (xobj.readyState == 4 && xobj.status == "404") {
            console.warn('Локализация не найдена!');
        }
    };
    xobj.send(null);
}

function _(str) {
    if (locale_object && locale_object.locale) {
        if ((str instanceof Object) && str.hasOwnProperty(locale_object.locale)) return str[locale_object.locale];
        if (locale_object.hasOwnProperty(str)) return locale_object[str];
        console.warn('Not found translate in [' + locale_object.locale + '] for: ' + str);
    }
    else
        console.warn('locale_object not loaded');
    return str;
}


function changeLanguage(lang) {
    function setCookie(name, value, options) {
        options = options || {};

        var expires = options.expires;

        if (typeof expires == "number" && expires) {
            var d = new Date();
            d.setTime(d.getTime() + expires * 1000);
            expires = options.expires = d;
        }
        if (expires && expires.toUTCString) {
            options.expires = expires.toUTCString();
        }

        value = encodeURIComponent(value);

        var updatedCookie = name + "=" + value;

        for (var propName in options) {
            updatedCookie += "; " + propName;
            var propValue = options[propName];
            if (propValue !== true) {
                updatedCookie += "=" + propValue;
            }
        }

        document.cookie = updatedCookie;
    };
    setCookie('lang', lang, {expires: 365 * 24 * 60 * 60, path: "/"});
    window.location.reload();
}