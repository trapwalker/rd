var SettingsManager = (function() {
    function SettingsManager(){
        this.jq_pages = null;
        this.jq_headers = null;
        this.jq_description = null;
        this.jq_description_header = null;

        this.current_page_name = "";  // Определяет текущую выбранную страницу для восстановления и для default кнопки

        this.jq_btn_cancel = null;
        this.jq_btn_apply = null;

        this.load(); // Загрузка из куков, затем с сервера, затем из дефаулта

        this.page_descriptions = {
            settings_page_graphics: "Настройки графики",
            settings_page_audio: "Настройки звука",
            settings_page_control: "Настройки управления",
            settings_page_other: "Другие настройки",
        };
    }

    // Список всех-всех настроек, их имён, описаний, типов, их значений по-умолчанию и их значений
    SettingsManager.prototype.options = {
        /* Настройка звуков */
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
            set_callback: function(new_value) {if (audioManager) audioManager._settings_auto_fire_gain = new_value;},
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
            set_callback: function(new_value) {if (audioManager) audioManager._settings_discharge_fire_gain = new_value;},
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
            set_callback: function(new_value) {if (audioManager) audioManager._settings_bang_gain = new_value;},
        },
        engine_gain: {
            name: "engine_gain",
            page: "audio",
            text_name: "Громкость автомобиля",
            text_description: "Настройка громкости двигателя и сигнала заднего хода",
            jq_div: null,
            type: "scale",  // Значит значение от 0 до 1.
            default: 1.0,
            value: 1.0,
            currentValue: 1.0,
            set_callback: function(new_value) {if (audioManager) audioManager._settings_engine_gain = new_value;},
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
            set_callback: function(new_value) {if (audioManager) audioManager._settings_interface_gain = new_value;},
        },
        /* Настройка графики */
        particles_tracer: {
            name: "particles_tracer",
            page: "graphics",
            text_name: "Количество трасеров",
            text_description: "Количество трасеров",
            jq_div: null,
            type: "list",
            default: 0.2,
            value: 0,
            currentValue: 0,
            list_values: [{text: "Мало", value: 0.2}, {text: "Средне", value: 0.05}, {text: "Много", value: 0.01}],
            set_callback: function(new_value) {if (fireEffectManager) fireEffectManager._settings_particles_tracer = new_value;},
        },
        particles_tail: {
            name: "particles_tail",
            page: "graphics",
            text_name: "Шлейфы",
            text_description: "Длина шлейфов",
            jq_div: null,
            type: "list",
            default: 1.0,
            value: 0,
            currentValue: 0,
            list_values: [{text: "Нет", value: 0}, {text: "Короткие", value: 0.5}, {text: "Обычные", value: 1.0}],
            set_callback: function(new_value) {if (mapCanvasManager) mapCanvasManager._settings_particles_tail = new_value;},
        },
        canvas_noise: {
            name: "canvas_noise",
            page: "graphics",
            text_name: "Шум",
            text_description: "Настройка шума карты",
            jq_div: null,
            type: "list",
            default: 1,
            value: 0,
            currentValue: 0,
            list_values: [{text: "Нет", value: 0}, {text: "Есть", value: 1}],
            set_callback: function(new_value) {
                if (wMapNoise) wMapNoise.activated = new_value == 1;
                if (wRadiationNoise) wRadiationNoise.activated = new_value == 1;
            },
        },
        map_tile_draw: {
            name: "map_tile_draw",
            page: "graphics",
            text_name: "Отображение тайлов карты",
            text_description: "Отображение тайлов карты",
            jq_div: null,
            type: "list",
            default: 1,
            value: 0,
            currentValue: 0,
            list_values: [{text: "Скрыть", value: 0}, {text: "Отображать", value: 1}],
            set_callback: function(new_value) {
                if (mapManager) mapManager.set_layer_visibility("tiles", new_value == 1);
            },
        },
        map_tile_preload: {
            name: "map_tile_preload",
            page: "graphics",
            text_name: "Предзагрузка тайлов карты",
            text_description: "Предзагрузка тайлов карты",
            jq_div: null,
            type: "list",
            default: 8,
            value: 0,
            currentValue: 0,
            list_values: [{text: "Текущий масштаб", value: 0}, {text: "Один масштаб", value: 1}, {text: "Два масштаба", value: 2}, {text: "Вся пирамида", value: 8}],
            set_callback: function(new_value) {
                if (mapManager) mapManager.set_pyramid_size("tiles", new_value);
            },
        },
        /* Настройка управления */
        move_forvard: {
            name: "move_forvard",
            page: "control",
            text_name: "Разгон",
            text_description: "Разгон",
            jq_div: null,
            type: "control",
            default: 38,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "move_forvard");},
        },
        move_backward: {
            name: "move_backward",
            page: "control",
            text_name: "Торможение",
            text_description: "Торможение",
            jq_div: null,
            type: "control",
            default: 40,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "move_backward");},
        },
        move_left: {
            name: "move_left",
            page: "control",
            text_name: "Лево",
            text_description: "Лево",
            jq_div: null,
            type: "control",
            default: 37,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "move_left");},
        },
        move_right: {
            name: "move_right",
            page: "control",
            text_name: "Право",
            text_description: "Право",
            jq_div: null,
            type: "control",
            default: 39,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "move_right");},
        },
        stop: {
            name: "stop",
            page: "control",
            text_name: "Остановка",
            text_description: "Остановка автомобиля",
            jq_div: null,
            type: "control",
            default: 32,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "stop");},
        },
        reverse: {
            name: "reverse",
            page: "control",
            text_name: "Задняя передача",
            text_description: "Задняя передача",
            jq_div: null,
            type: "control",
            default: 82,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "reverse");},
        },
        toggle_auto_fire: {
            name: "toggle_auto_fire",
            page: "control",
            text_name: "Вкл/Выкл автоматическую стрельбу",
            text_description: "Вкл/Выкл автоматическую стрельбу",
            jq_div: null,
            type: "control",
            default: 81,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "toggle_auto_fire");},
        },
        toggle_fire_widget: {
            name: "toggle_fire_widget",
            page: "control",
            text_name: "Вкл/Выкл боевой режим",
            text_description: "Вкл/Выкл боевой режим",
            jq_div: null,
            type: "control",
            default: 69,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "toggle_fire_widget");},
        },
        fire_disc_front: {
            name: "fire_disc_front",
            page: "control",
            text_name: "Фронтальный залп",
            text_description: "Фронтальный залп",
            jq_div: null,
            type: "control",
            default: 87,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "fire_disc_front");},
        },
        fire_disc_right: {
            name: "fire_disc_right",
            page: "control",
            text_name: "Залп правым боротом",
            text_description: "fire_disc_right",
            jq_div: null,
            type: "control",
            default: 68,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "fire_disc_right");},
        },
        fire_disc_back: {
            name: "fire_disc_back",
            page: "control",
            text_name: "Залп задом",
            text_description: "Залп задом",
            jq_div: null,
            type: "control",
            default: 83,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "fire_disc_back");},
        },
        fire_disc_left: {
            name: "fire_disc_left",
            page: "control",
            text_name: "Залп левым боротом",
            text_description: "Залп левым боротом",
            jq_div: null,
            type: "control",
            default: 65,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "fire_disc_left");},
        },
        quick_panel_1: {
            name: "quick_panel_1",
            page: "control",
            text_name: "Кнопка быстрого запуска 1",
            text_description: "Кнопка быстрого запуска 1",
            jq_div: null,
            type: "control",
            default: 49,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "quick_panel_1");},
        },
        quick_panel_2: {
            name: "quick_panel_2",
            page: "control",
            text_name: "Кнопка быстрого запуска 2",
            text_description: "Кнопка быстрого запуска 2",
            jq_div: null,
            type: "control",
            default: 50,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "quick_panel_2");},
        },
        quick_panel_3: {
            name: "quick_panel_3",
            page: "control",
            text_name: "Кнопка быстрого запуска 3",
            text_description: "Кнопка быстрого запуска 3",
            jq_div: null,
            type: "control",
            default: 51,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "quick_panel_3");},
        },
        quick_panel_4: {
            name: "quick_panel_4",
            page: "control",
            text_name: "Кнопка быстрого запуска 4",
            text_description: "Кнопка быстрого запуска 4",
            jq_div: null,
            type: "control",
            default: 52,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "quick_panel_4");},
        },

        // Горячие клавиши зума
        zoom_in: {
            name: "zoom_in",
            page: "control",
            text_name: "Увеличить масштаб",
            text_description: "Увеличить масштаб",
            jq_div: null,
            type: "control",
            default: 187,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "zoom_in");},
        },
        zoom_out: {
            name: "zoom_out",
            page: "control",
            text_name: "Уменьшить масштаб",
            text_description: "Уменьшить масштаб",
            jq_div: null,
            type: "control",
            default: 189,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "zoom_out");},
        },
        zoom_roll_up: {
            name: "zoom_roll_up",
            page: "control",
            text_name: "Свернуть виджеты",
            text_description: "Свернуть виджеты",
            jq_div: null,
            type: "control",
            default: 219,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "zoom_roll_up");},
        },
        zoom_expand: {
            name: "zoom_expand",
            page: "control",
            text_name: "Развернуть виджеты",
            text_description: "Развернуть виджеты",
            jq_div: null,
            type: "control",
            default: 221,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "zoom_expand");},
        },

        // Горячие клавиши окон
        open_character_info: {
            name: "open_character_info",
            page: "control",
            text_name: "Информация о себе",
            text_description: "Информация о себе",
            jq_div: null,
            type: "control",
            default: 67,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "open_character_info");},
        },
        open_vehicle_info: {
            name: "open_vehicle_info",
            page: "control",
            text_name: "Информация о ТС",
            text_description: "Информация о ТС",
            jq_div: null,
            type: "control",
            default: 86,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "open_vehicle_info");},
        },
        open_inventory: {
            name: "open_inventory",
            page: "control",
            text_name: "Инвентарь",
            text_description: "Инвентарь",
            jq_div: null,
            type: "control",
            default: 73,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "open_inventory");},
        },
        open_logbook_info: {
            name: "open_logbook_info",
            page: "control",
            text_name: "Журнал",
            text_description: "Журнал",
            jq_div: null,
            type: "control",
            default: 74,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "open_logbook_info");},
        },
        open_party_info: {
            name: "open_party_info",
            page: "control",
            text_name: "Окно настроек группы",
            text_description: "Окно настроек группы",
            jq_div: null,
            type: "control",
            default: 80,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "open_party_info");},
        },
        open_radio: {
            name: "open_radio",
            page: "control",
            text_name: "Радио",
            text_description: "Радио",
            jq_div: null,
            type: "control",
            default: 0,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "open_radio");},
        },
        open_options: {
            name: "open_options",
            page: "control",
            text_name: "Настройки",
            text_description: "Настройки",
            jq_div: null,
            type: "control",
            default: 79,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "open_options");},
        },

        /* Вкладка Другое */
        save_current_zoom: {
            name: "save_current_zoom",
            page: "other",
            text_name: "Сохранять масштаб",
            text_description: "Сохранение масштаба между игровыми сессиями",
            jq_div: null,
            type: "list",
            default: 1,
            value: 0,
            currentValue: 0,
            list_values: [{text: "Да", value: 1}, {text: "Нет", value: 0}],
            set_callback: function(new_value) {},
        },
        zoom_step_value: {
            name: "zoom_step_value",
            page: "other",
            text_name: "Скорость масштабирования",
            text_description: "Скорость масштабирования колсёсиком мышки",
            jq_div: null,
            type: "list",
            default: 0.2,
            value: 0,
            currentValue: 0,
            list_values: [{text: "Медленно", value: 0.2}, {text: "Нормально", value: 0.5}, {text: "Быстро", value: 1}, {text: "Очень быстро", value: 2}],
            set_callback: function(new_value) {if (mapManager)mapManager.zoom_wheel_step = new_value;},
        },
    };

    // Функции для работы с cookie (возвращает cookie с именем name, если есть, если нет, то undefined)
    SettingsManager.prototype.getCookie = function (name) {
        var matches = document.cookie.match(new RegExp(
                "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    };

    // устанавливает cookie c именем name и значением value
    // options - объект с свойствами cookie (expires, path, domain, secure)
    SettingsManager.prototype.setCookie = function (name, value, options) {
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
    SettingsManager.prototype.deleteCookie = function (name) {
        this.setCookie(name, "", { expires: -1 })
    };

    SettingsManager.prototype.unload_client = function () {
        // Сохранение разных значений
        // Зум
        this.setCookie("current_zoom", mapManager.getZoom().toFixed(2));
    };

    SettingsManager.prototype.redraw = function(jq_main_div) {
        //console.log("SettingsManager.prototype.redraw");
        // Сначала повесить клики на
        this.jq_headers = jq_main_div.find(".settings-window-header-block");
        this.jq_pages = jq_main_div.find(".settings-window-page-block");
        this.jq_description = jq_main_div.find(".settings-window-description");
        this.jq_description_header = jq_main_div.find(".settings-window-header");

        for (var page_key in this.page_descriptions)
            if (this.page_descriptions.hasOwnProperty(page_key))
                this.jq_pages.find("." + page_key).empty();

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
                    case "control":
                        this.draw_control_options(option, jq_option, background_class_name);
                        break;
                    default:
                        console.warn("Not found options type: ", option.type);
                }
                page.append(jq_option);

                even_background = ! even_background;
            }

        // Включение первой или запоминание выбранной вкладки
        if (!this.current_page_name)
            this.jq_headers.find(".settings-window-menu-item")[0].click();
        else {
            var elems = this.jq_headers.find(".settings-window-menu-item");
            for (var i = 0; i < elems.length; i++) {
                if ($(elems[i]).data("page_class") == this.current_page_name)
                    $(elems[i]).click();
            }
        }

        this.btn_set_enable_disable();
    };


    SettingsManager.prototype.activate_in_city = function() {
        locationManager.location_menu.viewRightPanel(this.page_descriptions[this.current_page_name]);
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

    SettingsManager.prototype.default_options = function() {
        for (var opt_name in this.options)
            if (this.options.hasOwnProperty(opt_name)) {
                var option = this.options[opt_name];
                if (option.default != option.currentValue && ("settings_page_" + option.page) == this.current_page_name) {
                    option.currentValue = option.default;
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
            if (locationManager.in_location_flag) {
                locationManager.setBtnState(1, '</br>Применить', true);
                locationManager.setBtnState(2, '</br>Отменить', true);
            }
            else {
                this.jq_btn_cancel.removeClass("disable");
                this.jq_btn_apply.removeClass("disable");
            }
        }
        else {  // Кнопки не доступны
            if (locationManager.in_location_flag) {
                locationManager.setBtnState(1, '</br>Применить', false);
                locationManager.setBtnState(2, '</br>Отменить', false);
            }
            else {
                this.jq_btn_cancel.addClass("disable");
                this.jq_btn_apply.addClass("disable");
            }
        }


         if (locationManager.in_location_flag && locationManager.active_screen_name == "menu_screen")
            locationManager.setBtnState(3, '</br>По умолчанию', true);
    };

    SettingsManager.prototype.load = function() {
        var cookie_str = this.getCookie("rd_settings"); // todo: Забрать из куков
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
        this.setCookie("rd_settings", cookie_str);
    };

    // Общие обработчики
    SettingsManager.prototype._handler_click_header = function(click_element) {
        var jq_elem = $(click_element);
        this.jq_headers.find(".settings-window-menu-item").removeClass("active");
        jq_elem.addClass("active");
        this.jq_pages.find(".settings-window-page").css("display", "none");
        this.jq_pages.find("." + jq_elem.data("page_class")).first().css("display", "block");
        this.current_page_name = jq_elem.data("page_class");

        if (locationManager.in_location_flag)
            locationManager.location_menu.viewRightPanel(this.page_descriptions[this.current_page_name]);
        else
            this.jq_description.text(this.page_descriptions[this.current_page_name]);
    };

    SettingsManager.prototype._handler_mouse_over = function(opt_name) {
        //console.log("SettingsManager.prototype._handler_mouse_enter", opt_name, this.options[opt_name].text_description);
        if (locationManager.in_location_flag) {
            if (opt_name)
                locationManager.location_menu.viewRightPanel(this.options[opt_name].text_description);
            else
                locationManager.location_menu.viewRightPanel(this.page_descriptions[this.current_page_name]);
        }
        else {
            if (opt_name)
                this.jq_description.text(this.options[opt_name].text_description);
            else
                this.jq_description.text(this.page_descriptions[this.current_page_name]);
        }
    };

    SettingsManager.prototype._handler_click_apply = function() {this.apply_options(); this.btn_set_enable_disable();};

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

    SettingsManager.prototype._handler_click_default = function() {this.default_options(); this.btn_set_enable_disable();};

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


    // работа с типом control
    SettingsManager.prototype.draw_control_options = function(option, jq_option, background_class_name) {
        //console.log("SettingsManager.prototype.draw_control_options", option);
        jq_option.append('<div class="name control ' + background_class_name + '">' + option.text_name + '</div>');
        var jq_value_wrap = $('<div class="value control ' + background_class_name + '"></div>');
        var jq_value = $('<input class="settings-control sublayers-clickable" ' +
            'onkeyup="settingsManager._handler_list_keyup(`' + option.name + '`, event)" ' +
            'onkeypress="settingsManager._handler_list_keypress(`' + option.name + '`, event)"' +
            //'onkeydown="settingsManager._handler_list_keydown(`' + option.name + '`, event)" ' +
            ';>');

        jq_value_wrap.append(jq_value);
        jq_option.append(jq_value_wrap);
        this.refresh_control_options(option);
    };

    SettingsManager.prototype.refresh_control_options = function(current_option) {
        //console.log("SettingsManager.prototype.refresh_control_options", option);
        current_option.jq_div.find("input").val(convertKeyCodeToString(current_option.currentValue));

        // сделать проверку на занятость текущей кнопки
        for (var opt_name in this.options)
            if (this.options.hasOwnProperty(opt_name) && this.options[opt_name].type == "control" && opt_name != current_option.name){
                var option = this.options[opt_name];
                if (option.currentValue == current_option.currentValue) {
                    // инициировать процедуру изменения опции
                    option.currentValue = 0;
                    option.jq_div.find("input").val(convertKeyCodeToString(option.currentValue));
                    if (typeof option.set_callback === "function") option.set_callback(option.currentValue);
                }
            }
    };

     SettingsManager.prototype._handler_list_keypress = function(opt_name, event) {
        //console.log("SettingsManager.prototype._handler_list_keypress", event.keyCode, opt_name);
        stopEvent(event);
        var option = this.options[opt_name];
        option.jq_div.find("input").val("");
        return false;
    };

    SettingsManager.prototype._handler_list_keydown = function(opt_name, event) {
        console.log("SettingsManager.prototype._handler_list_keydown", event.keyCode, opt_name);
        // Обновить значение опции
        stopEvent(event);
        var option = this.options[opt_name];
        var s = convertKeyCodeToString(event.keyCode);
        if (!s) return false;
        option.jq_div.find("input").val(s).focus();
        return false;
    };

    SettingsManager.prototype._handler_list_keyup = function(opt_name, event) {
        //console.log("SettingsManager.prototype._handler_list_keyup", event.keyCode, opt_name);
        // Обновить значение опции
        stopEvent(event);
        var code = event.keyCode;
        var option = this.options[opt_name];
        var s = convertKeyCodeToString(code);
        if (s == null) return;
        if (s == "") code = 0;
        option.jq_div.find("input").val(s).focus();

        if (option.currentValue != code) {
            option.currentValue = code;
            this.refresh_control_options(option);
            if (typeof option.set_callback === "function") option.set_callback(option.currentValue);
        }

        this.btn_set_enable_disable();
    };


    return SettingsManager;
})();

var settingsManager = new SettingsManager();