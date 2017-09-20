
var locale_lang = 'en';
var locale_object = null;

function set_current_locale() {
    var client_locale = require('electron').remote.getCurrentWindow()._client_language;
    if (client_locale == "ru" || client_locale == "russian") {
        locale_object = locales["ru"];
        locale_lang = "ru";
        return;
    }
    locale_object = locales["en"];
    locale_lang = "en";
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


/*  Место для перевода первой страницы распространяемого клиента игры */

var locales = {
    "en": {
        "locale": "en",
        // Заполнение консоли: consoleWPI  # con_pre
        "con_pre_1": "Loading.",
        "con_pre_2": "Download source identified.",
        "con_pre_3": "Deciphering the boot sector.",
        "con_pre_4": "Done.",
        "con_pre_5": "Signal localize.",
        "con_pre_6": "Location determined.",
        "con_pre_7": "Satellite phishing.",
        "con_pre_8": "Satellite connection is established.",
        "con_pre_9": " Nuke Commander  v.",
        "con_pre_10": "     Nukeoil corp. 2084.     ",
        "con_pre_11": "Server status: ",
        "con_pre_12": "Drivers found: ",
        "con_pre_13": "Latest news: ",
        "con_pre_14": "Data loading: ",
        "con_pre_15": "Select server:",
        "con_pre_16": "ping:",
        "con_pre_17": "not available",
        "con_pre_18": "ms",
        "con_pre_19": "server "
    },
    "ru": {
        "locale": "ru",
        // Заполнение консоли: consoleWPI  # con_pre
        "con_pre_1": "Загрузка системы.",
        "con_pre_2": "Источник загрузки идентифицирован.",
        "con_pre_3": "Дешифровка загрузочного сектора.",
        "con_pre_4": "Успешно.",
        "con_pre_5": "Локализация сигнала.",
        "con_pre_6": "Местоположение определено.",
        "con_pre_7": "Фишинг спутников.",
        "con_pre_8": "Соединение со спутником установлено.",
        "con_pre_9": "Нюк Коммандер  вер.",
        "con_pre_10": "Корпорация (К) Нукойл 2084 г.",
        "con_pre_11": "Статус сервера: ",
        "con_pre_12": "Пользователей обнаружено: ",
        "con_pre_13": "Последняя новость: ",
        "con_pre_14": "Загрузка данных: ",
        "con_pre_15": "Выберите сервер:",
        "con_pre_16": "пинг:",
        "con_pre_17": "недоступен",
        "con_pre_18": "мс",
        "con_pre_19": "сервер "
    }
};