var LocalCookieStorage = (function(){
    function LocalCookieStorage(){
        var defOptions = {
            flagDebug: true,
            chatVisible: true,
            chatActiveID: 0,
            zoom: 6,
            // Новые опции
            optionsChatPush: true,
            optionsChatRPC: true,
            optionsChatAnswer: true,
            optionsChatSystemLog: true,
            optionsMarkerContact: true,
            optionsMarkerUpdate: true,
            optionsMapTileVisible: true,
            optionsFCRotate: true,
            optionsRMVisible: true,
            optionsSelectAnybody: false,
            levelZoomForVisibleLabel: 5,
            optionsShowID: false,
            optionsShowDebugLine: true,
            optionsFriendlyFireEnabled: true,
            radarVisible: false
        };


        this.flagDebug = defOptions.flagDebug;
        this.chatVisible = defOptions.chatVisible;
        this.chatActiveID = defOptions.chatActiveID;
        this.zoom = defOptions.zoom;
        this.historyArray = [];

        // Присвоить новые опции
        this.optionsChatPush = defOptions.optionsChatPush;
        this.optionsChatRPC = defOptions.optionsChatRPC;
        this.optionsChatAnswer = defOptions.optionsChatAnswer;
        this.optionsChatSystemLog = defOptions.optionsChatSystemLog;
        this.optionsMarkerContact = defOptions.optionsMarkerContact;
        this.optionsMarkerUpdate = defOptions.optionsMarkerUpdate;
        this.optionsMapTileVisible = defOptions.optionsMapTileVisible;
        this.optionsFCRotate = defOptions.optionsFCRotate;
        this.optionsRMVisible = defOptions.optionsRMVisible;
        this.optionsSelectAnybody = defOptions.optionsSelectAnybody;
        this.levelZoomForVisibleLabel = defOptions.levelZoomForVisibleLabel;
        this.optionsShowID = defOptions.optionsShowID;
        this.optionsFriendlyFireEnabled = defOptions.optionsFriendlyFireEnabled;
        this.optionsShowDebugLine = defOptions.optionsShowDebugLine;
        this.radarVisible = defOptions.radarVisible;

        // Состояние тягания карты. dragging можно делать только когда машинка мертва
        this.optionsDraggingMap = false;


        this.load();
    }

    // Сохранение всех параметров в Cookie
    LocalCookieStorage.prototype.save = function(){
        this.setCookie('flagDebug', (this.flagDebug ? 1 : 0));
        this.setCookie('chatVisible', (chat.getVisible() ? 1 : 0));
        this.setCookie('chatActiveID', chat._activeChatID);
        this.setCookie('zoom', myMap.getZoom());
        this.setCookie('chatHistory', JSON.stringify(chat._history));

        // Новые куки
        this.setCookie('optionsChatPush', (this.optionsChatPush ? 1 : 0));
        this.setCookie('optionsChatRPC', (this.optionsChatRPC ? 1 : 0));
        this.setCookie('optionsChatAnswer', (this.optionsChatAnswer ? 1 : 0));
        this.setCookie('optionsChatSystemLog', (this.optionsChatSystemLog ? 1 : 0));
        this.setCookie('optionsMarkerContact', (this.optionsMarkerContact ? 1 : 0));
        this.setCookie('optionsMarkerUpdate', (this.optionsMarkerUpdate ? 1 : 0));
        this.setCookie('optionsMapTileVisible', (this.optionsMapTileVisible ? 1 : 0));
        this.setCookie('optionsFCRotate', (this.optionsFCRotate ? 1 : 0));
        this.setCookie('optionsRMVisible', (this.optionsRMVisible ? 1 : 0));
        this.setCookie('optionsSelectAnybody', (this.optionsSelectAnybody ? 1 : 0));
        this.setCookie('levelZoomForVisibleLabel', this.levelZoomForVisibleLabel);
        this.setCookie('optionsShowID', (this.optionsShowID ? 1 : 0));
        this.setCookie('optionsFriendlyFireEnabled', (this.optionsFriendlyFireEnabled ? 1 : 0));
        this.setCookie('optionsShowDebugLine', (this.optionsShowDebugLine ? 1 : 0));
        this.setCookie('radarVisible', (controllers.fireControl.getVisible() ? 1 : 0));
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

        // Новые куки !
        // optionsChatPush
        var optionsChatPush = this.getCookie('optionsChatPush');
        if (optionsChatPush !== undefined)
            this.optionsChatPush = (optionsChatPush == 1);
        //
        var optionsChatRPC = this.getCookie('optionsChatRPC');
        if (optionsChatRPC !== undefined)
            this.optionsChatRPC = (optionsChatRPC == 1);
        //
        var optionsChatAnswer = this.getCookie('optionsChatAnswer');
        if (optionsChatAnswer !== undefined)
            this.optionsChatAnswer = (optionsChatAnswer == 1);
        //
        var optionsChatSystemLog = this.getCookie('optionsChatSystemLog');
        if (optionsChatSystemLog !== undefined)
            this.optionsChatSystemLog = (optionsChatSystemLog == 1);
        //
        var optionsMarkerContact = this.getCookie('optionsMarkerContact');
        if (optionsMarkerContact !== undefined)
            this.optionsMarkerContact = (optionsMarkerContact == 1);
        //
        var optionsMarkerUpdate = this.getCookie('optionsMarkerUpdate');
        if (optionsMarkerUpdate !== undefined)
            this.optionsMarkerUpdate = (optionsMarkerUpdate == 1);
        //
        var optionsMapTileVisible = this.getCookie('optionsMapTileVisible');
        if (optionsMapTileVisible !== undefined)
            this.optionsMapTileVisible = (optionsMapTileVisible == 1);
        //
        var optionsFCRotate = this.getCookie('optionsFCRotate');
        if (optionsFCRotate !== undefined)
            this.optionsFCRotate = (optionsFCRotate == 1);
        //
        var optionsRMVisible = this.getCookie('optionsRMVisible');
        if (optionsRMVisible !== undefined)
            this.optionsRMVisible = (optionsRMVisible == 1);
        // optionsSelectAnybody
        var optionsSelectAnybody = this.getCookie('optionsSelectAnybody');
        if (optionsSelectAnybody !== undefined)
            this.optionsSelectAnybody = (optionsSelectAnybody == 1);

        // levelZoomForVisibleLabel
        var levelZoomForVisibleLabel = this.getCookie('levelZoomForVisibleLabel');
        if (levelZoomForVisibleLabel !== undefined)
            this.levelZoomForVisibleLabel = levelZoomForVisibleLabel;

        // optionsSelectAnybody
        var optionsShowID = this.getCookie('optionsShowID');
        if (optionsShowID !== undefined)
            this.optionsShowID = (optionsShowID == 1);

        // optionsShowDebugLine
        var optionsShowDebugLine = this.getCookie('optionsShowDebugLine');
        if (optionsShowDebugLine !== undefined)
            this.optionsShowDebugLine = (optionsShowDebugLine == 1);

        // optionsFriendlyFireEnabled
        var optionsFriendlyFireEnabled = this.getCookie('optionsFriendlyFireEnabled');
        if (optionsFriendlyFireEnabled !== undefined)
            this.optionsFriendlyFireEnabled = (optionsFriendlyFireEnabled == 1);

        // прочесть параметр Видимости чата и установить его
        var radarVisible = this.getCookie('radarVisible');
        if (radarVisible !== undefined)
            this.radarVisible = (radarVisible == 1);
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


    // Функции геттеры для считывания состояния
    // flagDebug
    LocalCookieStorage.prototype.debugMode = function(){
        return this.flagDebug;
    };

    // optionsChatPush
    LocalCookieStorage.prototype.enableLogPushMessage = function(){
        return this.flagDebug && this.optionsChatPush;
    };

    // optionsChatRPC
    LocalCookieStorage.prototype.enableLogRPCMessage = function(){
        return this.flagDebug && this.optionsChatRPC;
    };

    // optionsChatAnswer
    LocalCookieStorage.prototype.enableLogAnswerMessage = function(){
        return this.flagDebug && this.optionsChatAnswer;
    };

    // optionsChatSystemLog
    LocalCookieStorage.prototype.enableLogSystemMessage = function(){
        return this.flagDebug && this.optionsChatSystemLog;
    };

    // optionsMarkerContact
    LocalCookieStorage.prototype.enableMarkerContact = function(){
        return this.flagDebug && this.optionsMarkerContact;
    };

    // optionsMarkerUpdate
    LocalCookieStorage.prototype.enableMarkerUpdate = function(){
        return this.flagDebug && this.optionsMarkerUpdate;
    };

    // optionsMapTileVisible
    LocalCookieStorage.prototype.visibleTileLayer = function(){
        return this.optionsMapTileVisible;
    };

    // optionsFCRotate
    LocalCookieStorage.prototype.enableFCRotate = function(){
        return this.optionsFCRotate;
    };

    // optionsRMVisible
    LocalCookieStorage.prototype.enableRadialMenu = function(){
        return this.optionsRMVisible && (!this.optionsDraggingMap);
    };

    // levelZoomForVisibleLabel
    LocalCookieStorage.prototype.visibleLabel = function(){
        return (myMap.getZoom() > this.levelZoomForVisibleLabel);
    };

    // optionsShowDebugLine
    LocalCookieStorage.prototype.enableShowDebugLine = function(){
        return this.flagDebug && this.optionsShowDebugLine;
    };

    return LocalCookieStorage;
})();
