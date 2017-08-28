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
    // TODO: Тут нужно проверить не является ли str объектом и если так, то вернуть по ключу из него en или ru строку в соответствии с текущей локалью клиента
    if (locale_object && locale_object.hasOwnProperty(str)) {
        return locale_object[str];
    }
    if (locale_object)
        console.warn('Not found translate in [' + locale_object.locale + '] for: ' + str);
    else
        console.warn('locale_object not loaded');
    return str;
}
