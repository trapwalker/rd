
var LocalCookieStorage = (function(){
    function LocalCookieStorage(){
        // Список параметров и их значений по умолчанию
        var defOptions = {
            flagDebug: false,
            chatVisible: true,
            chatActiveID: 0,
            zoom: 18,
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
            levelZoomForVisibleLabel: 17,
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


        //this.param_def_list = {
        //    flagDebug: false,
        //    chatVisible: true,
        //    chatActiveID: 0,
        //    zoom: 18,
        //    // Новые опции
        //    historyArray: [],
        //    optionsChatPush: true,
        //    optionsChatRPC: true,
        //    optionsChatAnswer: true,
        //    optionsChatSystemLog: true,
        //    optionsMarkerContact: true,
        //    optionsMarkerUpdate: true,
        //    optionsMapTileVisible: true,
        //    optionsFCRotate: true,
        //    optionsRMVisible: true,
        //    optionsSelectAnybody: false,
        //    levelZoomForVisibleLabel: 17,
        //    optionsShowID: false,
        //    optionsShowDebugLine: true,
        //    optionsFriendlyFireEnabled: true,
        //    radarVisible: false
        //};
        //this.param_value_list = defOptions;


        this.load();
    }

    // Сохранение всех параметров в Cookie
    LocalCookieStorage.prototype.save = function() {
        this.setCookie('flagDebug', (this.flagDebug ? 1 : 0));
        this.setCookie('chatVisible', (chat.getVisible() ? 1 : 0));
        this.setCookie('chatActiveID', chat._activeChatID);
        this.setCookie('zoom', mapManager.getZoom());
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
        //this.setCookie('radarVisible', (controllers.fireControl.getVisible() ? 1 : 0));


        //for (var key in this.param_value_list)
        //    if (this.param_def_list.hasOwnProperty(key) && this.param_value_list.hasOwnProperty(key))
        //        if (this.param_def_list[key] == this.param_value_list[key])
        //            this.deleteCookie(key);
        //        else
        //            this.setCookie(key, this.param_value_list[key]);
        //    else
        //        console.warn('Ошибка имени параметра локального хранилища настроек!');
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


        //for (var key in this.param_value_list)
        //    if (this.param_value_list.hasOwnProperty(key)) {
        //        var value = this.getCookie(key);
        //        if (value !== undefined)
        //            this.param_value_list = value;
        //    }
    };

    // Функции для работы с cookie (возвращает cookie с именем name, если есть, если нет, то undefined)
    LocalCookieStorage.prototype.getCookie = function (name) {
        var matches = document.cookie.match(new RegExp(
                "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    };

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
    };

    // удаляет cookie с именем name
    LocalCookieStorage.prototype.deleteCookie = function (name) {
        this.setCookie(name, "", { expires: -1 })
    };

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

    return LocalCookieStorage;
})();


var SettingsManager = (function() {
    function SettingsManager(){
        this.jq_pages = null;
        this.jq_headers = null;
        this.jq_description = null;
        this.jq_description_header = null;

        this.jq_btn_cancel = null;
        this.jq_btn_apply = null;

        this.load(); // Загрузка из куков, затем с сервера, затем из дефаулта
    }

    // Список всех-всех настроек, их имён, описаний, типов, их значений по-умолчанию и их значений
    SettingsManager.prototype.options = {
        general_gain: {
            name: "general_gain",
            page: "audio",
            text_name: "Общая громкость",
            text_description: "Настройка общей громкости",
            jq_div: null,
            type: "scale",  // Значит значение от 0 до 1.
            default: 1.0,
            value: 1.0,
            currentValue: 1.0,
            set_callback: function(new_value) {if (audioManager) audioManager.set_general_gain(new_value); },
        },
        auto_fire_gain: {
            name: "auto_fire_gain",
            page: "audio",
            text_name: "Громкость автоматической стрельбы",
            text_description: "Настройка громкости автоматической стрельбы",
            jq_div: null,
            type: "scale",  // Значит значение от 0 до 1.
            default: 1.0,
            value: 1.0,
            currentValue: 1.0,
            set_callback: function(new_value) {},
        },
        discharge_fire_gain: {
            name: "discharge_fire_gain",
            page: "audio",
            text_name: "Громкость залповой стрельбы",
            text_description: "Настройка громкости залповой стрельбы",
            jq_div: null,
            type: "scale",  // Значит значение от 0 до 1.
            default: 1.0,
            value: 1.0,
            currentValue: 1.0,
            set_callback: function(new_value) {},
        },
        bang_gain: {
            name: "bang_gain",
            page: "audio",
            text_name: "Громкость взрывов",
            text_description: "Настройка громкости взрывов",
            jq_div: null,
            type: "scale",  // Значит значение от 0 до 1.
            default: 1.0,
            value: 1.0,
            currentValue: 1.0,
            set_callback: function(new_value) {},
        },
        engine_gain: {
            name: "engine_gain",
            page: "audio",
            text_name: "Громкость двигателя",
            text_description: "Настройка громкости двигателя",
            jq_div: null,
            type: "scale",  // Значит значение от 0 до 1.
            default: 1.0,
            value: 1.0,
            currentValue: 1.0,
            set_callback: function(new_value) {},
        },
        interface_gain: {
            name: "interface_gain",
            page: "audio",
            text_name: "Громкость интерфейса",
            text_description: "Настройка громкости интерфейса",
            jq_div: null,
            type: "scale",  // Значит значение от 0 до 1.
            default: 1.0,
            value: 1.0,
            currentValue: 1.0,
            set_callback: function(new_value) {},
        },

        particles: {
            name: "particles",
            page: "graphics",
            text_name: "Частицы",
            text_description: "Количество частиц",
            jq_div: null,
            type: "list",
            default: 3,
            value: 0,
            currentValue: 0,
            //currentIndex: 0,
            list_values: [{text: "Мало", value: 1}, {text: "Средне", value: 2}, {text: "Много", value: 3}],
            set_callback: function(new_value) {},
            //load: function(value) {}, // todo: для всех списков: искать данное значение в спике значений и установить currentValue и currentIndex
        },

    };

    SettingsManager.prototype.redraw = function(jq_main_div) {
        //console.log("SettingsManager.prototype.redraw", this);
        // Сначала повесить клики на
        this.jq_headers = jq_main_div.find(".settings-window-header-block");
        this.jq_pages = jq_main_div.find(".settings-window-page-block");
        this.jq_description = jq_main_div.find(".settings-window-description");
        this.jq_description_header = jq_main_div.find(".settings-window-header");

        this.jq_btn_cancel = jq_main_div.find(".settings-window-page-btn.settings-cancel").first();
        this.jq_btn_apply = jq_main_div.find(".settings-window-page-btn.settings-apply").first();

        var even_background = true;
        for (var opt_name in this.options)
            if (this.options.hasOwnProperty(opt_name)){
                var option = this.options[opt_name];
                var page = this.jq_pages.find(".settings_page_" + option.page).first();
                var jq_option = $('<div class="settings-elem ' + option.type + '" onmouseenter="settingsManager._handler_mouse_over(`' + opt_name + '`)" onmouseleave="settingsManager._handler_mouse_over()"></div>');
                option.jq_div = jq_option;

                var background_class_name = even_background ? "trainer-light-back" : "trainer-dark-back";

                switch (option.type){
                    case "scale":
                        this.draw_scale_options(option, jq_option, background_class_name);
                        break;
                    case "list":
                        this.draw_list_options(option, jq_option, background_class_name);
                        break;
                    default:
                        console.warn("Not found options type: ", option.type);
                }
                page.append(jq_option);

                even_background = ! even_background;
            }

        this.jq_headers.find(".settings-window-menu-item")[0].click();

        this.btn_set_enable_disable();
    };

    SettingsManager.prototype.apply_options = function() {
        for (var opt_name in this.options)
            if (this.options.hasOwnProperty(opt_name)) {
                var option = this.options[opt_name];
                if (option.value != option.currentValue)
                    option.value = option.currentValue;
            }

        this.save_to_cookie();
    };

    SettingsManager.prototype.cancel_options = function() {
        for (var opt_name in this.options)
            if (this.options.hasOwnProperty(opt_name)) {
                var option = this.options[opt_name];
                if (option.value != option.currentValue) {
                    option.currentValue = option.value;
                    this["refresh_" + option.type + "_options"](option);
                    if (typeof option.set_callback === "function") option.set_callback(option.currentValue);
                }
            }
    };

    SettingsManager.prototype.test_diffrents = function() {
        for (var opt_name in this.options)
            if (this.options.hasOwnProperty(opt_name)) {
                var option = this.options[opt_name];
                if (option.value != option.currentValue)
                    return true;
            }
        return false;
    };

    SettingsManager.prototype.btn_set_enable_disable = function() {
        //console.log("SettingsManager.prototype.btn_set_enable_disable", this.test_diffrents());
        if (this.test_diffrents()) { // Кнопки доступны
            this.jq_btn_cancel.removeClass("disable");
            this.jq_btn_apply.removeClass("disable");
        }
        else {  // Кнопки не доступны
            this.jq_btn_cancel.addClass("disable");
            this.jq_btn_apply.addClass("disable");
        }
    };

    SettingsManager.prototype.load = function() {
        var cookie_str = LocalCookieStorage.prototype.getCookie("rd_settings"); // todo: Забрать из куков
        var server_str = ""; // todo: Забрать из html
        var cookie_obj = {};
        var server_obj = {};
        try {
            var cl = cookie_str.split("|");
            for (var i=0; i < cl.length; i++) {
                var record = cl[i].split("=");
                cookie_obj[record[0]] = record[1];
            }
        } catch (e) {
            cookie_obj = {};
        }

        try {
            server_obj = JSON.parse(server_str);
        } catch (e) {
            server_obj = {};
        }

        for (var opt_name in this.options)
            if (this.options.hasOwnProperty(opt_name)) {
                var option = this.options[opt_name];
                //option.value = option.currentValue = cookie_obj[opt_name] || server_obj[opt_name] || option.default;  // плохо работает с нулями
                var value = option.default;
                if (server_obj.hasOwnProperty(opt_name)) value = server_obj[opt_name];
                if (cookie_obj.hasOwnProperty(opt_name)) value = cookie_obj[opt_name];
                option.value = option.currentValue = value;
            }
        return false;
    };

    SettingsManager.prototype.save_to_cookie = function() {
        var cookie_str = "";
        for (var opt_name in this.options)
            if (this.options.hasOwnProperty(opt_name))
                cookie_str = cookie_str + opt_name + "=" + this.options[opt_name].value + "|";
        LocalCookieStorage.prototype.setCookie("rd_settings", cookie_str);
    };

    // Общие обработчики
    SettingsManager.prototype._handler_click_header = function(click_element) {
        var jq_elem = $(click_element);
        this.jq_headers.find(".settings-window-menu-item").removeClass("active");
        jq_elem.addClass("active");
        this.jq_pages.find(".settings-window-page").css("display", "none");
        this.jq_pages.find("." + jq_elem.data("page_class")).first().css("display", "block");
    };

    SettingsManager.prototype._handler_mouse_over = function(opt_name) {
        //console.log("SettingsManager.prototype._handler_mouse_enter", opt_name, this.options[opt_name].text_description);
        if (locationManager.in_location_flag) {
            //
            if (opt_name)
                console.log(opt_name, " ===>>>> ", this.options[opt_name].text_description);
            else {
            }
        }
        else {
            if (opt_name) {
                this.jq_description_header.css("display", "block");
                this.jq_description.text(this.options[opt_name].text_description);
            }
            else {
                this.jq_description_header.css("display", "none");
                this.jq_description.text("");
            }
        }
    };

    SettingsManager.prototype._handler_click_apply = function() {this.apply_options(); this.btn_set_enable_disable(); };

    SettingsManager.prototype._handler_click_cancel = function() {
        this.cancel_options();
        // закрыть окно
        windowTemplateManager.closeUniqueWindow("settings");
    };

    SettingsManager.prototype._handler_click_ok = function() {
        this.apply_options();
        // закрыть окно
        windowTemplateManager.closeUniqueWindow("settings");
    };


    // работа с типом scale
    SettingsManager.prototype.draw_scale_options = function(option, jq_option, background_class_name) {
        //console.log("SettingsManager.prototype.draw_scale_options", option);
        // Добавить название
        jq_option.append('<div class="name scale ' + background_class_name + '">' + option.text_name + '</div>');
        var jq_value_wrap = $('<div class="value scale ' + background_class_name + '"></div>');
        var jq_scale = $('<div class="settings-scale" onclick="settingsManager._handler_scale_click(this, event, `' + option.name + '`);" ' +
            'onmousemove="settingsManager._handler_scale_mousemove(this, event, `' + option.name + '`);"></div>');
        jq_scale.append('<div class="settings-scale-hover"></div>');
        jq_value_wrap.append(jq_scale);
        jq_option.append(jq_value_wrap);

        this.refresh_scale_options(option, jq_option);
    };

    SettingsManager.prototype.refresh_scale_options = function(option) {
        //console.log("SettingsManager.prototype.refresh_scale_options", option);
        option.jq_div.find(".settings-scale-hover").first()
            .css("width", (option.currentValue * 100.).toFixed(0) + "%");
    };

    SettingsManager.prototype._handler_scale_click = function(element, event, opt_name) {
        //console.log("SettingsManager.prototype._handler_click_scale", element, event, opt_name);
        // Обновить значение опции
        var option = this.options[opt_name];
        option.currentValue = (event.offsetX / $(element).width()).toFixed(2);
        this.refresh_scale_options(option);
        if (typeof option.set_callback === "function") option.set_callback(option.currentValue);
        this.btn_set_enable_disable();
    };

    SettingsManager.prototype._handler_scale_mousemove = function(element, event, opt_name) {
        //console.log("SettingsManager.prototype._handler_click_scale", element, event, opt_name);
        if (event.buttons == 1) this._handler_scale_click(element, event, opt_name);
    };


    // работа с типом list
    SettingsManager.prototype.draw_list_options = function(option, jq_option, background_class_name) {
        //console.log("SettingsManager.prototype.draw_list_options", option);
        jq_option.append('<div class="name list ' + background_class_name + '">' + option.text_name + '</div>');
        var jq_value_wrap = $('<div class="value list ' + background_class_name + '"></div>');
        var jq_list = $('<div class="settings-list sublayers-clickable" onclick="settingsManager._handler_list_click(`' + option.name + '`, 1)";></div>');
        var jq_btn_1 = $('<div class="settings-list-btn left sublayers-clickable" onclick="settingsManager._handler_list_click(`' + option.name + '`, -1);"></div>');
        var jq_btn_2 = $('<div class="settings-list-btn right sublayers-clickable" onclick="settingsManager._handler_list_click(`' + option.name + '`, 1);"></div>');

        jq_value_wrap.append(jq_btn_1);
        jq_value_wrap.append(jq_list);
        jq_value_wrap.append(jq_btn_2);

        jq_option.append(jq_value_wrap);

        this.refresh_list_options(option);
    };

    SettingsManager.prototype.refresh_list_options = function(option, index) {
        //console.log("SettingsManager.prototype.refresh_list_options", option);
        var curr_index = index;
        if (!curr_index)
            for (var i = 0; i < option.list_values.length; i++)
                if (option.list_values[i].value == option.currentValue)
                    curr_index = i;
        if (!curr_index) curr_index = 0;

        option.jq_div.find(".settings-list").first().text(option.list_values[curr_index].text);
    };

    SettingsManager.prototype._handler_list_click = function(opt_name, dvalue) {
        //console.log("SettingsManager.prototype._handler_click_scale", element, event, opt_name);
        // Обновить значение опции
        var option = this.options[opt_name];

        var old_index = 0;
        for (var i = 0; i < option.list_values.length; i++)
            if (option.list_values[i].value == option.currentValue)
                old_index = i;

        var curr_index = old_index + dvalue;
        if (curr_index < 0) curr_index = 0;
        if (curr_index >= option.list_values.length) curr_index = option.list_values.length - 1;
        if (curr_index != old_index) {
            option.currentValue = option.list_values[curr_index].value;
            this.refresh_list_options(option, curr_index);
            if (typeof option.set_callback === "function") option.set_callback(option.currentValue);
        }
        this.btn_set_enable_disable();
    };

    return SettingsManager;
})();

var settingsManager = new SettingsManager();