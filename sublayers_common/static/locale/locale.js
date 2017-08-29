var locale_object = null;

function loadLocale(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', '/site_api/locale', true);
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
