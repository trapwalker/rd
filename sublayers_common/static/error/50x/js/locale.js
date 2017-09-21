var locale_lang = 'en';
var locale_object = null;

function getCookie(name) {
  var matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

function set_current_locale() {
    //var client_locale = require('electron').remote.getCurrentWindow()._client_language;
    var client_locale = getCookie('lang');
    if ((client_locale != "ru") && (client_locale != "en")) client_locale = "en";
    locale_object = locales[client_locale];
    locale_lang = client_locale;
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
        "con_pre_8": "Error: satellite is not found.",
        "con_pre_9": "Press F5 to retry...",
        "con_pre_10": "Try again later."
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
        "con_pre_8": "Ошибка: спутник не найден.",
        "con_pre_9": "Нажмите F5 для повтора...",
        "con_pre_10": "Попробуйте позже."
    }
};

