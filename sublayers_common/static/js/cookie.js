var SettingsManager = (function() {
    function SettingsManager(){
        this.jq_pages = null;
        this.jq_headers = null;
        this.jq_description = null;
        this.jq_description_header = null;

        this.current_page_name = "";  // Определяет текущую выбранную страницу для восстановления и для default кнопки

        this.jq_btn_cancel = null;
        this.jq_btn_apply = null;

        this.cht_bGod = this.getCookie("cht_bGod") == "1" ? 1 : 0; // Определяет можно ли телепортироваться и загружать тайлы

        this.load(); // Загрузка из куков, затем с сервера, затем из дефаулта

        this.page_descriptions = {
            settings_page_graphics: _("setman_page_descriptions_graphics"),
            settings_page_audio: _("setman_page_descriptions_audio"),
            settings_page_control: _("setman_page_descriptions_control"),
            settings_page_other: _("setman_page_descriptions_other"),
        };


        // Если включён авто-бот
        setTimeout(function () {
            if (settingsManager.options["auto_simple_bot"].value)
                settingsManager.options["auto_simple_bot"].set_callback(true);
        }, 2000);

        this._game_color_return_to_def_from_green = this.getCookie("_game_color_return_to_def_from_green") == "1";  // Для восстановления фильтра карты при переключениях режима отображения карты
    }

    // Список всех-всех настроек, их имён, описаний, типов, их значений по-умолчанию и их значений
    SettingsManager.prototype.options = {
        /* Настройка звуков */
        general_gain: {
            name: "general_gain",
            page: "audio",
            text_name: _("setman_opt_general_gain_text_name"),
            text_description: _("setman_opt_general_gain_text_description"),
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
            text_name: _("setman_opt_auto_fire_gain_text_name"),
            text_description: _("setman_opt_auto_fire_gain_text_description"),
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
            text_name: _("setman_opt_discharge_fire_gain_text_name"),
            text_description: _("setman_opt_discharge_fire_gain_text_description"),
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
            text_name: _("setman_opt_bang_gain_text_name"),
            text_description: _("setman_opt_bang_gain_text_description"),
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
            text_name: _("setman_opt_engine_gain_text_name"),
            text_description: _("setman_opt_engine_gain_text_description"),
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
            text_name: _("setman_opt_interface_gain_text_name"),
            text_description: _("setman_opt_interface_gain_text_description"),
            jq_div: null,
            type: "scale",  // Значит значение от 0 до 1.
            default: 1.0,
            value: 1.0,
            currentValue: 1.0,
            set_callback: function(new_value) {if (audioManager) audioManager._settings_interface_gain = new_value;},
        },
        /* Настройка графики */
        game_color: {
            name: "game_color",
            page: "graphics",
            text_name: _("setman_opt_game_color_text_name"),
            text_description: _("setman_opt_game_color_text_description"),
            jq_div: null,
            type: "list",
            default: "none",
            value: 0,
            currentValue: 0,
            list_values: [
                {
                    text: _("setman_opt_game_color_list_1"),
                    value: "none"
                },
                // {
                //     text: "Ч/Б",
                //     value: "grayscale(100%);"
                // },
                // {
                //     text: "Ч/Б (контр)",
                //     value: "grayscale(100%) brightness(1.25) contrast(125%);"
                // },
                {
                    text: _("setman_opt_game_color_list_2"),
                    value: "sepia(100%);"
                },
                // {
                //     text: "Сепия (контр)",
                //     value: "sepia(100%) brightness(1.25) contrast(125%);"
                // },
                // {
                //     text: "Красная",
                //     value: "url(#red);"
                // },
                // {
                //     text: "Оранжевая",
                //     value: "url(#orange);"
                // },
                {
                    text: _("setman_opt_game_color_list_3"),
                    value: "url(#yellow);"
                },
                {
                    text: _("setman_opt_game_color_list_4"),
                    value: "url(#green);"
                },
                {
                    text: _("setman_opt_game_color_list_5"),
                    value: "url(#cyan);"
                },
                {
                    text: _("setman_opt_game_color_list_6"),
                    value: "url(#blue);"
                }
                // ,{
                //     text: "Фиолетовая",
                //     value: "url(#purple);"
                // }
            ],
            set_callback: function(new_value, from_first_load) {
                $("#bodydiv").attr("style", "filter: " + new_value);
                if (!from_first_load) settingsManager._game_color_return_to_def_from_green = false;
            },
        },
        particles_tracer: {
            name: "particles_tracer",
            page: "graphics",
            text_name: _("setman_opt_particles_tracer_text_name"),
            text_description: _("setman_opt_particles_tracer_text_description"),
            jq_div: null,
            type: "list",
            default: 0.2,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_opt_particles_tracer_list_1"), value: 0.2}, {text: _("setman_opt_particles_tracer_list_2"), value: 0.05}, {text: _("setman_opt_particles_tracer_list_3"), value: 0.01}],
            set_callback: function(new_value) {if (fireEffectManager) fireEffectManager._settings_particles_tracer = new_value;},
        },
        particles_tail: {
            name: "particles_tail",
            page: "graphics",
            text_name: _("setman_opt_particles_tail_text_name"),
            text_description: _("setman_opt_particles_tail_text_description"),
            jq_div: null,
            type: "list",
            default: 1.0,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_opt_particles_tail_list_1"), value: 0}, {text: _("setman_opt_particles_tail_list_2"), value: 0.5}, {text: _("setman_opt_particles_tail_list_3"), value: 1.0}],
            set_callback: function(new_value) {if (mapCanvasManager) mapCanvasManager._settings_particles_tail = new_value;},
        },
        canvas_noise: {
            name: "canvas_noise",
            page: "graphics",
            text_name: _("setman_opt_canvas_noise_text_name"),
            text_description: _("setman_opt_canvas_noise_text_description"),
            jq_div: null,
            type: "list",
            default: 1,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_com_no"), value: 0}, {text: _("setman_com_have"), value: 1}],
            set_callback: function(new_value) {
                if (wMapNoise) wMapNoise.activated = new_value == 1;
                if (wRadiationNoise) wRadiationNoise.activated = new_value == 1;
            },
        },
        map_tile_draw_back: {
            name: "map_tile_draw_back",
            page: "graphics",
            text_name: _("setman_opt_map_tile_draw_back_text_name"),
            text_description: _("setman_opt_map_tile_draw_back_text_description"),
            jq_div: null,
            type: "list",
            default: "merged",
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_opt_map_tile_draw_back_list_1"), value: "back"}, {text: _("setman_opt_map_tile_draw_back_list_2"), value: "front"}, {text: _("setman_opt_map_tile_draw_back_list_3"), value: "merged"}],
            set_callback: function(new_value) {
                if (!mapManager) return;
                mapManager.set_tileprovider_visibility("back", new_value == "back");
                mapManager.set_tileprovider_visibility("front", new_value == "front");
                mapManager.set_tileprovider_visibility("merged", new_value == "merged");

                // Включать перекраску на зелёную по умолчанию при значении "front"
                if (new_value == "front" && settingsManager.options.game_color.currentValue == settingsManager.options.game_color.default) {
                    settingsManager.options.game_color.currentValue = settingsManager.options.game_color.list_values[3].value;
                    settingsManager.refresh_list_options(settingsManager.options.game_color);
                    settingsManager.options.game_color.set_callback("url(#green);");
                    settingsManager._game_color_return_to_def_from_green = true;
                }
                // Если включили, то при необходимости вернуться к палитре по умолчанию
                if (new_value != "front" && settingsManager._game_color_return_to_def_from_green) {
                    settingsManager.options.game_color.currentValue = settingsManager.options.game_color.list_values[0].value;
                    settingsManager.refresh_list_options(settingsManager.options.game_color);
                    settingsManager.options.game_color.set_callback(settingsManager.options.game_color.default);
                    settingsManager._game_color_return_to_def_from_green = false;
                }
            },
        },
        map_tile_preload: {
            name: "map_tile_preload",
            page: "graphics",
            text_name: _("setman_opt_map_tile_preload_text_name"),
            text_description: _("setman_opt_map_tile_preload_text_description"),
            jq_div: null,
            type: "list",
            default: 8,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_opt_map_tile_preload_list_1"), value: 0}, {text: _("setman_opt_map_tile_preload_list_2"), value: 1}, {text: _("setman_opt_map_tile_preload_list_3"), value: 2}, {text: _("setman_opt_map_tile_preload_list_4"), value: 8}],
            set_callback: function(new_value) {
                if (mapManager) mapManager.set_pyramid_size("tiles", new_value);
            },
        },
        location_effects: {
            name: "location_effects",
            page: "graphics",
            text_name: _("setman_opt_location_effects_text_name"),
            text_description:_("setman_opt_location_effects_text_description"),
            jq_div: null,
            type: "list",
            default: 1,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_com_no"), value: 0}, {text: _("setman_com_have"), value: 1}],
            set_callback: function(new_value) {},
            init: function() {settingsManager.options.location_effects.value = settingsManager.options.location_effects.currentValue = parseInt(settingsManager.options.location_effects.currentValue);}
        },
        show_nickname: {
            name: "show_nickname",
            page: "graphics",
            text_name: _("setman_opt_show_nickname_text_name"),
            text_description: _("setman_opt_show_nickname_text_description"),
            jq_div: null,
            type: "list",
            default: 750,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_opt_show_nickname_list_1"), value: 0}, {text: _("setman_opt_show_nickname_list_2"), value: 750}],
            set_callback: function(new_value) {
                WCanvasNicknameMarker.prototype.light_time = new_value;
            },
            init: function() {
                if (window.WCanvasNicknameMarker)
                    WCanvasNicknameMarker.prototype.light_time = settingsManager.options.show_nickname.value = settingsManager.options.show_nickname.currentValue = parseInt(settingsManager.options.show_nickname.currentValue);
                else
                    setTimeout(settingsManager.options.show_nickname.init, 10);

            }
        },
        /* Настройка управления */
        move_forvard: {
            name: "move_forvard",
            page: "control",
            text_name: _("setman_opt_move_forvard_text_name"),
            text_description: _("setman_opt_move_forvard_text_description"),
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
            text_name: _("setman_opt_move_backward_text_name"),
            text_description: _("setman_opt_move_backward_text_description"),
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
            text_name: _("setman_opt_move_left_text_name"),
            text_description: _("setman_opt_move_left_text_description"),
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
            text_name: _("setman_opt_move_right_text_name"),
            text_description: _("setman_opt_move_right_text_description"),
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
            text_name: _("setman_opt_stop_text_name"),
            text_description: _("setman_opt_stop_text_description"),
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
            text_name: _("setman_opt_reverse_text_name"),
            text_description: _("setman_opt_reverse_text_description"),
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
            text_name: _("setman_opt_toggle_auto_fire_text_name"),
            text_description: _("setman_opt_toggle_auto_fire_text_description"),
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
            text_name: _("setman_opt_toggle_fire_widget_text_name"),
            text_description: _("setman_opt_toggle_fire_widget_text_description"),
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
            text_name: _("setman_opt_fire_disc_front_text_name"),
            text_description: _("setman_opt_fire_disc_front_text_description"),
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
            text_name: _("setman_opt_fire_disc_right_text_name"),
            text_description: _("setman_opt_fire_disc_right_text_description"),
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
            text_name: _("setman_opt_fire_disc_back_text_name"),
            text_description: _("setman_opt_fire_disc_back_text_description"),
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
            text_name: _("setman_opt_fire_disc_left_text_name"),
            text_description: _("setman_opt_fire_disc_left_text_description"),
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
            text_name: _("setman_opt_quick_panel_1_text_name"),
            text_description: _("setman_opt_quick_panel_1_text_description"),
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
            text_name: _("setman_opt_quick_panel_2_text_name"),
            text_description: _("setman_opt_quick_panel_2_text_description"),
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
            text_name: _("setman_opt_quick_panel_3_text_name"),
            text_description: _("setman_opt_quick_panel_3_text_description"),
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
            text_name: _("setman_opt_quick_panel_4_text_name"),
            text_description: _("setman_opt_quick_panel_4_text_description"),
            jq_div: null,
            type: "control",
            default: 52,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "quick_panel_4");},
        },
        get_loot: {
            name: "get_loot",
            page: "control",
            text_name: _("setman_opt_get_loot_text_name"),
            text_description: _("setman_opt_get_loot_text_description"),
            jq_div: null,
            type: "control",
            default: 70,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "get_loot");},
        },

        // Горячие клавиши зума
        zoom_in: {
            name: "zoom_in",
            page: "control",
            text_name: _("setman_opt_zoom_in_text_name"),
            text_description: _("setman_opt_zoom_in_text_description"),
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
            text_name: _("setman_opt_zoom_out_text_name"),
            text_description: _("setman_opt_zoom_out_text_description"),
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
            text_name: _("setman_opt_zoom_roll_up_text_name"),
            text_description: _("setman_opt_zoom_roll_up_text_description"),
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
            text_name: _("setman_opt_zoom_expand_text_name"),
            text_description: _("setman_opt_zoom_expand_text_description"),
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
            text_name: _("setman_opt_open_character_info_text_name"),
            text_description: _("setman_opt_open_character_info_text_description"),
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
            text_name: _("setman_opt_open_vehicle_info_text_name"),
            text_description: _("setman_opt_open_vehicle_info_text_description"),
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
            text_name: _("setman_opt_open_inventory_text_name"),
            text_description: _("setman_opt_open_inventory_text_description"),
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
            text_name: _("setman_opt_open_logbook_info_text_name"),
            text_description: _("setman_opt_open_logbook_info_text_description"),
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
            text_name: _("setman_opt_open_party_info_text_name"),
            text_description: _("setman_opt_open_party_info_text_description"),
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
            text_name: _("setman_opt_open_radio_text_name"),
            text_description: _("setman_opt_open_radio_text_description"),
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
            text_name: _("setman_opt_open_options_text_name"),
            text_description: _("setman_opt_open_options_text_description"),
            jq_div: null,
            type: "control",
            default: 79,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "open_options");},
        },

        // Горячие клавиши админских возможностей (показываются только при cht_bGod = 1)
        use_teleport: {
            admin_mode: true,
            name: "use_teleport",
            page: "control",
            text_name: _("setman_opt_use_teleport_text_name"),
            text_description: _("setman_opt_use_teleport_text_description"),
            jq_div: null,
            type: "control",
            default: 84,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "use_teleport");},
        },
        save_tiles: {
            admin_mode: true,
            name: "save_tiles",
            page: "control",
            text_name: _("setman_opt_save_tiles_text_name"),
            text_description: _("setman_opt_save_tiles_text_description"),
            jq_div: null,
            type: "control",
            default: 72,
            value: 0,
            currentValue: 0,
            set_callback: function(new_value) {controlManager.bind_code(new_value, "save_tiles");},
        },

        /* Вкладка Другое */
        localization: {
            name: "localization",
            page: "other",
            text_name: _("setman_opt_localization_text_name"),
            text_description: _("setman_opt_localization_text_description"),
            jq_div: null,
            type: "list",
            default: 'en',
            value: 0,
            currentValue: 0,
            list_values: [{text: "Русский", value: "ru"}, {text: "English", value: "en"}],
            set_callback: function(new_value) {changeLanguage(new_value);},
            init: function() {
                var lang = settingsManager.getCookie("lang") || "en";
                settingsManager.options.localization.value = settingsManager.options.localization.currentValue = lang;
            },
        },
        save_current_zoom: {
            name: "save_current_zoom",
            page: "other",
            text_name: _("setman_opt_save_current_zoom_text_name"),
            text_description: _("setman_opt_save_current_zoom_text_description"),
            jq_div: null,
            type: "list",
            default: 1,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_com_yes"), value: 1}, {text: _("setman_com_no"), value: 0}],
            set_callback: function(new_value) {},
        },
        zoom_step_value: {
            name: "zoom_step_value",
            page: "other",
            text_name: _("setman_opt_zoom_step_value_text_name"),
            text_description: _("setman_opt_zoom_step_value_text_description"),
            jq_div: null,
            type: "list",
            default: 0.2,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_opt_zoom_step_value_list_1"), value: 0.2}, {text: _("setman_opt_zoom_step_value_list_2"), value: 0.5}, {text: _("setman_opt_zoom_step_value_list_3"), value: 1}, {text: _("setman_opt_zoom_step_value_list_4"), value: 2}],
            set_callback: function(new_value) {if (mapManager)mapManager.zoom_wheel_step = new_value;},
            init: function() {
                if (window.mapManager)
                    mapManager.zoom_wheel_step =
                        settingsManager.options.zoom_step_value.value =
                        settingsManager.options.zoom_step_value.currentValue =
                        parseFloat(settingsManager.options.zoom_step_value.currentValue) ||
                        settingsManager.options.zoom_step_value.default;
                else
                    setTimeout(settingsManager.options.zoom_step_value.init, 10);

            }
        },
        rotate_fire_sectors: {
            name: "rotate_fire_sectors",
            page: "other",
            text_name: _("setman_opt_rotate_fire_sectors_text_name"),
            text_description: _("setman_opt_rotate_fire_sectors_text_description"),
            jq_div: null,
            type: "list",
            default: 1,
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_com_yes"), value: "1"}, {text: _("setman_com_no"), value: ""}],
            set_callback: function (new_value) {
                if (wFireController) {
                    wFireController.setting_rotate_sectors = new_value == 1;
                    wFireController.change();
                }
            },
        },
        map_route_accuracy: {
            name: "map_route_accuracy",
            page: "other",
            text_name: _("setman_opt_map_route_accuracy_text_name"),
            text_description: _("setman_opt_map_route_accuracy_text_description"),
            jq_div: null,
            type: "list",
            default: "15",
            value: 0,
            currentValue: 0,
            list_values: [{text: "10", value: 10}, {text: "15", value: 15}, {text: "25", value: 25}, {text: "35", value: 35}, {text: "50", value: 50}],
            set_callback: function(new_value) {
                if (mapManager && mapManager.current_route) mapManager.current_route.set_accuracy();
            },
            init: function() {settingsManager.options.map_route_accuracy.value = settingsManager.options.map_route_accuracy.currentValue = parseInt(settingsManager.options.map_route_accuracy.currentValue);}
        },
        map_route_time: {
            name: "map_route_time",
            page: "other",
            text_name: _("setman_opt_map_route_time_text_name"),
            text_description: _("setman_opt_map_route_time_text_description"),
            jq_div: null,
            type: "list",
            default: "last",
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_com_no"), value: ""}, {text: _("setman_opt_map_route_time_list_1"), value: "last"}, {text: _("setman_opt_map_route_time_list_2"), value: "all"}],
            set_callback: function(new_value) {},
        },
        auto_off_autofire_in_city: {
            name: "auto_off_autofire_in_city",
            page: "other",
            text_name: _("setman_opt_auto_off_autofire_in_city_text_name"),
            text_description: _("setman_opt_auto_off_autofire_in_city_text_description"),
            jq_div: null,
            type: "list",
            default: "1",
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_com_yes"), value: "1"}, {text: _("setman_com_no"), value: ""}],
            set_callback: function(new_value) {},
        },
        /*Дебаг-инфо*/
        fps_rate: {
            admin_mode: true,
            name: "fps_rate",
            page: "other",
            text_name: _("setman_opt_fps_rate_text_name"),
            text_description: _("setman_opt_fps_rate_text_description"),
            jq_div: null,
            type: "list",
            default: 0,
            value: 0,
            currentValue: 0,
            list_values: [{text: "1", value: 1}, {text: "2", value: 2}, {text: "10", value: 10}, {text: "auto", value: 0}],
            set_callback: function (new_value) {
                timeManager.timerStop();
                timeManager.timerStart(new_value);
            },
        },
        auto_resurrection: {
            admin_mode: true,
            name: "auto_resurrection",
            page: "other",
            text_name: _("setman_opt_auto_resurrection_text_name"),
            text_description: _("setman_opt_auto_resurrection_text_description"),
            jq_div: null,
            type: "list",
            default: "",
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_com_yes"), value: "1"}, {text: _("setman_com_no"), value: ""}],
            set_callback: function (new_value) {},
        },
        auto_simple_bot: {
            admin_mode: true,
            name: "auto_simple_bot",
            page: "other",
            text_name: _("setman_opt_auto_simple_bot_text_name"),
            text_description: _("setman_opt_auto_simple_bot_text_description"),
            jq_div: null,
            type: "list",
            default: "",
            value: 0,
            currentValue: 0,
            list_values: [{text: _("setman_com_yes"), value: "1"}, {text: _("setman_com_no"), value: ""}],
            bot_reaction_handler: null,
            bot_reaction: function () {
                settingsManager.options["auto_simple_bot"].bot_reaction_handler = null;
                if (!settingsManager.options["auto_simple_bot"].currentValue) return;
                settingsManager.options["auto_simple_bot"].bot_reaction_handler =
                    setTimeout(settingsManager.options["auto_simple_bot"].bot_reaction, 2000);

                if (!user.userCar) return;
                // Рандомно выбрать цель движения
                if (Math.random() > 0.5 || user.userCar.getCurrentSpeed(clock.getCurrentTime()) < 5) {
                    var curr_pos = user.userCar.getCurrentCoord(clock.getCurrentTime());
                    var random_point = polarPoint(Math.random() * 300, Math.random() * Math.PI * 2.);
                    mapManager.goto_handler(null, summVector(curr_pos, random_point));
                }
                // Рандомно стрельнуть
                if (Math.random() > 0.7) {
                    controlManager.actions.fire_disc_front.up();
                }

                 // Юзнуть подбор лута
                if (Math.random() > 0.7)
                    controlManager.actions.get_loot.up();

                // Юзнуть аптечку если нужно
                if (user.userCar.getCurrentHP(clock.getCurrentTime()) < 20)
                    controlManager.actions.quick_panel_4.up();

                // Поставить мину
                if (Math.random() > 0.9)
                    controlManager.actions.quick_panel_1.up();

                // Поставить туррель
                if (Math.random() > 0.9)
                    controlManager.actions.quick_panel_2.up();

                // Запустить ракету
                if (Math.random() > 0.9)
                    controlManager.actions.quick_panel_3.up();

            },
            set_callback: function (new_value) {
                if (new_value) {
                    if (settingsManager.options["auto_simple_bot"].bot_reaction_handler) {
                        clearTimeout(settingsManager.options["auto_simple_bot"].bot_reaction_handler);
                        settingsManager.options["auto_simple_bot"].bot_reaction_handler = null;
                    }
                    settingsManager.options["auto_simple_bot"].bot_reaction();
                }
                else {
                    clearTimeout(settingsManager.options["auto_simple_bot"].bot_reaction_handler);
                    settingsManager.options["auto_simple_bot"].bot_reaction_handler = null;
                }
            },
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
        // Админский режим
        this.setCookie("cht_bGod", this.cht_bGod ? "1" : "0");
        // Сохранить значение "восстановления палитры"
        this.setCookie("_game_color_return_to_def_from_green", this._game_color_return_to_def_from_green ? "1" : "0");
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
                if (!option.admin_mode || this.cht_bGod) {
                    var page = this.jq_pages.find(".settings_page_" + option.page).first();
                    var jq_option = $('<div class="settings-elem ' + option.type + '" onmouseenter="settingsManager._handler_mouse_over(`' + opt_name + '`)" onmouseleave="settingsManager._handler_mouse_over()"></div>');
                    option.jq_div = jq_option;

                    var background_class_name = even_background ? "trainer-light-back" : "trainer-dark-back";

                    switch (option.type) {
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

                    even_background = !even_background;
                }
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

    SettingsManager.prototype._in_city = function () {
        return locationManager.in_location_flag && locationManager.location_menu &&
            locationManager.isActivePlace(locationManager.location_menu) &&
            (locationManager.location_menu.selected_page_name == 'Settings');
    };

    SettingsManager.prototype.activate_in_city = function() {
        //console.trace('SettingsManager.prototype.activate_in_city');
        if (this._in_city())
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

        var in_town = this._in_city();

        if (this.test_diffrents()) { // Кнопки доступны
            if (in_town) {
                locationManager.setBtnState(1, '</br>' + _("msetw_btn_apply"), true);
                locationManager.setBtnState(2, '</br>' + _("msetw_btn_cancel"), true);
            }
            else {
                this.jq_btn_cancel.removeClass("disable");
                this.jq_btn_apply.removeClass("disable");
            }
        }
        else {  // Кнопки не доступны
            if (in_town) {
                locationManager.setBtnState(1, '</br>' + _("msetw_btn_apply"), false);
                locationManager.setBtnState(2, '</br>' + _("msetw_btn_cancel"), false);
            }
            else {
                this.jq_btn_cancel.addClass("disable");
                this.jq_btn_apply.addClass("disable");
            }
        }

         if (in_town)
            locationManager.setBtnState(3, '</br>' + _("msetw_btn_default"), true);
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
                if (typeof(option.init) === 'function') setTimeout(option.init, 0);
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

        if (this._in_city())
            locationManager.location_menu.viewRightPanel(this.page_descriptions[this.current_page_name]);
        else
            if (this.jq_description)
                this.jq_description.text(this.page_descriptions[this.current_page_name]);
    };

    SettingsManager.prototype._handler_mouse_over = function(opt_name) {
        //console.log("SettingsManager.prototype._handler_mouse_enter", opt_name, this.options[opt_name].text_description);
        if (this._in_city()) {
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
        if(option.jq_div)
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
        if (curr_index < 0) curr_index = option.list_values.length - 1;
        if (curr_index >= option.list_values.length) curr_index = curr_index % option.list_values.length;
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
            'onkeyup="settingsManager._handler_control_keyup(`' + option.name + '`, event)" ' +
            'onkeypress="settingsManager._handler_control_keypress(`' + option.name + '`, event)"' +
            //'onkeydown="settingsManager._handler_control_keydown(`' + option.name + '`, event)" ' +
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
                if (option.currentValue == current_option.currentValue && option.currentValue != 0) {
                    // инициировать процедуру изменения опции
                    option.currentValue = 0;
                    option.jq_div.find("input").val(convertKeyCodeToString(option.currentValue));
                    if (typeof option.set_callback === "function") option.set_callback(option.currentValue);
                }
            }
    };

     SettingsManager.prototype._handler_control_keypress = function(opt_name, event) {
        //console.log("SettingsManager.prototype._handler_control_keypress", event.keyCode, opt_name);
        stopEvent(event);
        var option = this.options[opt_name];
        option.jq_div.find("input").val("");
        return false;
    };

    SettingsManager.prototype._handler_control_keydown = function(opt_name, event) {
        console.log("SettingsManager.prototype._handler_control_keydown", event.keyCode, opt_name);
        // Обновить значение опции
        stopEvent(event);
        var option = this.options[opt_name];
        var s = convertKeyCodeToString(event.keyCode);
        if (!s) return false;
        option.jq_div.find("input").val(s).focus();
        return false;
    };

    SettingsManager.prototype._handler_control_keyup = function(opt_name, event) {
        //console.log("SettingsManager.prototype._handler_control_keyup", event.keyCode, opt_name);
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