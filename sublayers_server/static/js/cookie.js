var LocalCookieStorage = (function(){
    function LocalCookieStorage(options){
        var defOptions = {
            flagDebug: false,
            chatVisible: false,
            chatActiveID: 0,
            zoom: 13
        };

        if(options){
            if(options.flagDebug) defOptions.flagDebug = options.flagDebug;
            if(options.chatVisible) defOptions.chatVisible = options.chatVisible;
            if(options.chatActiveID) defOptions.chatActiveID = options.chatActiveID;
            if(options.zoom) defOptions.zoom = options.zoom;
        }

        this.flagDebug = defOptions.flagDebug;
        this.chatVisible = defOptions.chatVisible;
        this.chatActiveID = defOptions.chatActiveID;
        this.zoom = defOptions.zoom;
        this.historyArray = [];

        this.load();
    }

    // Сохранение всех параметров в Cookie
    LocalCookieStorage.prototype.save = function(){
        this.setCookie('flagDebug', (flagDebug ? 1 : 0));
        this.setCookie('chatVisible', (chat.getVisible() ? 1 : 0));
        this.setCookie('chatActiveID', chat._activeChatID);
        this.setCookie('zoom', myMap.getZoom());
        this.setCookie('chatHistory', JSON.stringify(chat._history));
    };


    // Считывание всех параметров из куки всех параметров в Cookie
    LocalCookieStorage.prototype.load = function(){
        // Прочесть параметр flagDebug и установить его
        var cFlagDebug = this.getCookie('flagDebug');
        if (cFlagDebug !== undefined)
            this.flagDebug = (cFlagDebug == 1);


        // прочесть параметр Видимости чата и установить его
        var chatVisible = this.getCookie('chatVisible');
        if (chatVisible !== undefined)
            this.chatVisible = (chatVisible == 1);


        // Прочесть параметр последнего активного чата
        var chatActiveID = this.getCookie('chatActiveID');
        if(chatActiveID !== undefined)
            this.chatActiveID = chatActiveID;

        // Установить последний зум
        var zoom = this.getCookie('zoom');
        if (zoom !== undefined)
            this.zoom = zoom;

        // Считать историю чата
        var hist = this.getCookie('chatHistory');
        if (hist !== undefined) {
            var historyArray = JSON.parse(hist);
            if (historyArray) {
                this.historyArray = historyArray;
            }
        }
    };

// Функции для работы с cookie
// возвращает cookie с именем name, если есть, если нет, то undefined
    LocalCookieStorage.prototype.getCookie = function (name) {
        var matches = document.cookie.match(new RegExp(
                "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    // устанавливает cookie c именем name и значением value
// options - объект с свойствами cookie (expires, path, domain, secure)
    LocalCookieStorage.prototype.setCookie = function (name, value, options) {
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
    }


    // удаляет cookie с именем name
    LocalCookieStorage.prototype.deleteCookie = function (name) {
        this.setCookie(name, "", { expires: -1 })
    }



    return LocalCookieStorage;
})();





/*
// Читает Cookie, устанавливает параметры из неё
function setParamsFromCookie(){
    // Прочесть параметр flagDebug и установить его
    var cFlagDebug = getCookie('flagDebug');
    if (cFlagDebug !== undefined) setFlagDebug((cFlagDebug == 1));


    // прочесть параметр Видимости чата и установить его
    var chatVisible = getCookie('chatVisible');
    if (chatVisible !== undefined)
        chat.setVisible((chatVisible == 1));


    // Прочесть параметр последнего активного чата
    var chatActiveID = getCookie('chatActiveID');
    if(chatActiveID !== undefined) chat.setActiveChat(chatActiveID);


    // Установить последний зум
    var zoom = getCookie('zoom');
    if (zoom)
        if (zoom <= myMap.getMaxZoom() && zoom >= myMap.getMinZoom()) myMap.setZoom(zoom);

    // Считать историю чата, установить её
    var historyArray = JSON.parse(getCookie('chatHistory'));
    if(historyArray){
        chat.setMessagesHistory(historyArray);
    }
}
*/