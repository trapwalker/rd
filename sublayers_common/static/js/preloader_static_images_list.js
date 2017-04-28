(function() {
    //console.log('start_preloader_static_image_list');

    //function random_str() { return "?" + (Math.random() * 10000).toFixed(0); }
    function random_str() { return ""; }

    function complete(load) {
        //console.log('finish_preloader_static_image_list =', preloaderImage.count_loading, load, preloaderImage.tasks);
        resourceLoadManager.del(preloaderImage);
    }

    resourceLoadManager.add(preloaderImage);

    var ll = [
        '/static/img/teaching/arrow_big.png',
        '/static/img/teaching/arrow_big_big.png',
        '/static/img/cursors/hyper.png' + random_str(),
        '/static/img/cursors/main.png' + random_str(),
        '/static/img/windows/temp_scroll/up.png' + random_str(),
        '/static/img/windows/temp_scroll/up_hover.png' + random_str(),
        '/static/img/windows/temp_scroll/down.png' + random_str(),
        '/static/img/windows/temp_scroll/down_hover.png' + random_str(),
        '/static/img/windows/temp_scroll/left.png' + random_str(),
        '/static/img/windows/temp_scroll/left_hover.png' + random_str(),
        '/static/img/windows/temp_scroll/right.png' + random_str(),
        '/static/img/windows/temp_scroll/right_hover.png' + random_str(),
        '/static/img/chat/chat_port.png' + random_str(),
        '/static/img/chat/chat_glass.png' + random_str(),
        '/static/img/cursors/text.png' + random_str(),
        '/static/img/chat/btn_slide_left.png' + random_str(),
        '/static/img/chat/btn_slide_left_over.png' + random_str(),
        '/static/img/chat/btn_slide_right.png' + random_str(),
        '/static/img/chat/btn_slide_right_over.png' + random_str(),
        '/static/img/chat/tab_close_btn.png' + random_str(),
        '/static/img/chat/tab_close_btn_over.png' + random_str(),
        '/static/img/chat/tab_close_btn_pressed.png' + random_str(),

        // Окна Старта/Смерти быстрой игры
        //'/static/img/modal_window_image/btn1_active.png' + random_str(),
        //'/static/img/modal_window_image/btn1_hover.png' + random_str(),
        //'/static/img/modal_window_image/btn1_press.png' + random_str(),
        //'/static/img/modal_window_image/btn2_active.png' + random_str(),
        //'/static/img/modal_window_image/btn2_hover.png' + random_str(),
        //'/static/img/modal_window_image/btn2_press.png' + random_str(),
        //'/static/img/modal_window_image/btn3_active.png' + random_str(),
        //'/static/img/modal_window_image/btn3_hover.png' + random_str(),
        //'/static/img/modal_window_image/btn3_press.png' + random_str(),
        //'/static/img/modal_window_image/btn4_active.png' + random_str(),
        //'/static/img/modal_window_image/btn4_hover.png' + random_str(),
        //'/static/img/modal_window_image/btn4_press.png' + random_str(),
        //'/static/img/modal_window_image/btn1_start_active.png' + random_str(),
        //'/static/img/modal_window_image/btn1_start_hover.png' + random_str(),
        //'/static/img/modal_window_image/btn1_start_press.png' + random_str(),
        //'/static/img/modal_window_image/btn2_start_active.png' + random_str(),
        //'/static/img/modal_window_image/btn2_start_hover.png' + random_str(),
        //'/static/img/modal_window_image/btn2_start_press.png' + random_str(),

        // Круиз контрол
        '/static/img/cruise/limit_arrow.png' + random_str(),

        '/static/img/fire_control/aim_glass.png' + random_str(),
        '/static/img/fire_widget_buttons/lup_noactive.png' + random_str(),
        '/static/img/fire_widget_buttons/lup_active.png' + random_str(),
        '/static/img/fire_widget_buttons/lup_hover.png' + random_str(),
        '/static/img/fire_widget_buttons/ldown_noactive.png' + random_str(),
        '/static/img/fire_widget_buttons/ldown_active.png' + random_str(),
        '/static/img/fire_widget_buttons/ldown_hover.png' + random_str(),
        '/static/img/fire_widget_buttons/rup_noactive.png' + random_str(),
        '/static/img/fire_widget_buttons/rup_active.png' + random_str(),
        '/static/img/fire_widget_buttons/rup_hover.png' + random_str(),
        '/static/img/fire_widget_buttons/rdown_noactive.png' + random_str(),
        '/static/img/fire_widget_buttons/rdown_active.png' + random_str(),
        '/static/img/fire_widget_buttons/rdown_hover.png' + random_str(),
        '/static/img/fire_control/aim_port.png' + random_str(),
        '/static/img/fire_control/battle_btn_on.png' + random_str(),
        '/static/img/fire_control/battle_btn_pressed.png' + random_str(),
        '/static/img/fire_control/battle_btn_off.png' + random_str(),
        '/static/img/fire_control/battle_btn_pressed.png' + random_str(),
        '/static/img/fire_control/fire_widget_indicator/indicator_off.png' + random_str(),
        '/static/img/fire_control/fire_widget_indicator/indicator_hover.png' + random_str(),
        '/static/img/fire_control/fire_widget_indicator/indicator_active.png' + random_str(),

        '/static/img/Health_Fuel/fuel_icon.png' + random_str(),
        '/static/img/Health_Fuel/fuel_health_bg_tile.png' + random_str(),
        '/static/img/Health_Fuel/scale_all.png' + random_str(),
        '/static/img/Health_Fuel/fuel_health_arrow.png' + random_str(),
        '/static/img/Health_Fuel/health_icon.png' + random_str(),
        '/static/img/Health_Fuel/fuel_health_bg_tile.png' + random_str(),
        '/static/img/Health_Fuel/scale_all.png' + random_str(),
        '/static/img/Health_Fuel/fuel_health_arrow.png' + random_str(),

        '/static/content/locations/map_locations/chat_active.png' + random_str(),
        '/static/content/locations/map_locations/chat_hover.png' + random_str(),
        '/static/content/locations/map_locations/chat_press.png' + random_str(),
        '/static/content/locations/map_locations/city_bg1.png' + random_str(),
        '/static/content/locations/map_locations/city_mask_1.png' + random_str(),
        '/static/content/locations/map_locations/city_mask_2.png' + random_str(),
        '/static/content/locations/map_locations/lbdown_active.png' + random_str(),
        '/static/content/locations/map_locations/lbdown_hover.png' + random_str(),
        '/static/content/locations/map_locations/lbdown_noactive.png' + random_str(),
        '/static/content/locations/map_locations/lbdown_press.png' + random_str(),
        '/static/content/locations/map_locations/lbup_active.png' + random_str(),
        '/static/content/locations/map_locations/lbup_hover.png' + random_str(),
        '/static/content/locations/map_locations/lbup_noactive.png' + random_str(),
        '/static/content/locations/map_locations/lbup_press.png' + random_str(),
        '/static/content/locations/map_locations/loc_active.png' + random_str(),
        '/static/content/locations/map_locations/loc_hover.png' + random_str(),
        '/static/content/locations/map_locations/loc_press.png' + random_str(),
        '/static/content/locations/map_locations/menu_active.png' + random_str(),
        '/static/content/locations/map_locations/menu_hover.png' + random_str(),
        '/static/content/locations/map_locations/menu_press.png' + random_str(),
        '/static/content/locations/map_locations/rbdown_active.png' + random_str(),
        '/static/content/locations/map_locations/rbdown_hover.png' + random_str(),
        '/static/content/locations/map_locations/rbdown_noactive.png' + random_str(),
        '/static/content/locations/map_locations/rbdown_press.png' + random_str(),
        '/static/content/locations/map_locations/rbup_active.png' + random_str(),
        '/static/content/locations/map_locations/rbup_hover.png' + random_str(),
        '/static/content/locations/map_locations/rbup_noactive.png' + random_str(),
        '/static/content/locations/map_locations/rbup_press.png' + random_str(),

        '/static/img/noise/map_noise_src.png' + random_str(),
        '/static/img/noise/map_noise_src_1.png' + random_str(),
        '/static/img/noise/1_noise.png' + random_str(),
        '/static/img/noise/1_noise_inv.png' + random_str(),
        '/static/img/noise/1_noise60.png' + random_str(),
        '/static/img/noise/2_noise.png' + random_str(),
        '/static/img/noise/2_noise_inv.png' + random_str(),
        '/static/img/noise/2_noise60.png' + random_str(),
        '/static/img/noise/3_noise.png' + random_str(),
        '/static/img/noise/3_noise_inv.png' + random_str(),
        '/static/img/noise/3_noise60.png' + random_str(),
        '/static/img/noise/4_noise.png' + random_str(),
        '/static/img/noise/4_noise_inv.png' + random_str(),
        '/static/img/noise/4_noise60.png' + random_str(),
        '/static/img/noise/n1.png' + random_str(),
        '/static/img/noise/n2.png' + random_str(),
        '/static/img/noise/n3.png' + random_str(),
        '/static/img/noise/n4.png' + random_str(),
        '/static/img/noise/2n1_white.png' + random_str(),
        '/static/img/noise/2n2_white.png' + random_str(),
        '/static/img/noise/2n3_white.png' + random_str(),
        '/static/img/noise/2n4_white.png' + random_str()
        // todo: не забыть пройтись по папке /static/content/locations/institutions
    ];


    // Предзагрузка для разных разрешений:
    if ($(window).width() < 1550 || $(window).height() > 880)
    // загрузка маленького разрешения
        ll = ll.concat([
            // Круиз контрол
            '/static/img/cruise/cruise_768/cruise_glass.png' + random_str(),
            '/static/img/cruise/cruise_768/cruise_port.png' + random_str(),
            '/static/img/cruise/cruise_768/dgigits_back_glow.png' + random_str(),
            '/static/img/cruise/cruise_768/speed_mark.png' + random_str(),
            '/static/img/cruise/cruise_768/limit_mark.png' + random_str(),
            '/static/img/cruise/cruise_768/limit_dirt.png' + random_str(),
            '/static/img/cruise/cruise_768/limit_wood.png' + random_str(),
            '/static/img/cruise/cruise_768/limit_road.png' + random_str(),
            '/static/img/cruise/cruise_768/limit_water.png' + random_str(),
            '/static/img/cruise/cruise_768/limit_slope.png' + random_str(),
            '/static/img/cruise/cruise_768/fuel_lamp_off.png' + random_str(),
            '/static/img/cruise/cruise_768/fuel_lamp_on.png' + random_str(),
            '/static/img/cruise/cruise_768/health_lamp_off.png' + random_str(),
            '/static/img/cruise/cruise_768/health_lamp_on.png' + random_str(),
            '/static/img/cruise/cruise_768/wind_lamp_off.png' + random_str(),
            '/static/img/cruise/cruise_768/wind_lamp_on.png' + random_str(),
            '/static/img/cruise/cruise_768/rad_lamp_off.png' + random_str(),
            '/static/img/cruise/cruise_768/rad_lamp_on.png' + random_str(),
            '/static/img/cruise/cruise_768/r_btn.png' + random_str(),
            '/static/img/cruise/cruise_768/r_btn_over.png' + random_str(),
            '/static/img/cruise/cruise_768/r_btn_pressed.png' + random_str(),
            '/static/img/cruise/cruise_768/stop_btn.png' + random_str(),
            '/static/img/cruise/cruise_768/stop_btn_over.png' + random_str(),
            '/static/img/cruise/cruise_768/stop_btn_pressed.png' + random_str(),

            // Зум слайдер
            '/static/img/control_zoom/zoom_768/zoom_port.png' + random_str(),
            '/static/img/control_zoom/zoom_768/zoom_glass.png' + random_str(),
            '/static/img/control_zoom/zoom_768/zoom_mark.png' + random_str(),
            '/static/img/control_zoom/zoom_768/hide_gadgets.png' + random_str(),
            '/static/img/control_zoom/zoom_768/unhide_gadgets.png' + random_str(),

            // Свернуть/Развернуть виджеты

            '/static/img/misc_button/768/down_hide_normal.png' + random_str(),
            '/static/img/misc_button/768/down_hide_hover.png' + random_str(),
            '/static/img/misc_button/768/down_hide_active.png' + random_str(),
            '/static/img/misc_button/768/up_hide_normal.png' + random_str(),
            '/static/img/misc_button/768/up_hide_hover.png' + random_str(),
            '/static/img/misc_button/768/up_hide_active.png' + random_str(),
        ]);
    else
    // Загрузка нормального разрешения
        ll = ll.concat([
            // Круиз контрол
            '/static/img/cruise/cruise_glass.png' + random_str(),
            '/static/img/cruise/cruise_port.png' + random_str(),
            '/static/img/cruise/dgigits_back_glow.png' + random_str(),
            '/static/img/cruise/speed_mark.png' + random_str(),
            '/static/img/cruise/limit_mark.png' + random_str(),
            '/static/img/cruise/limit_dirt.png' + random_str(),
            '/static/img/cruise/limit_wood.png' + random_str(),
            '/static/img/cruise/limit_road.png' + random_str(),
            '/static/img/cruise/limit_water.png' + random_str(),
            '/static/img/cruise/limit_slope.png' + random_str(),
            '/static/img/cruise/fuel_lamp_off.png' + random_str(),
            '/static/img/cruise/fuel_lamp_on.png' + random_str(),
            '/static/img/cruise/health_lamp_off.png' + random_str(),
            '/static/img/cruise/health_lamp_on.png' + random_str(),
            '/static/img/cruise/wind_lamp_off.png' + random_str(),
            '/static/img/cruise/wind_lamp_on.png' + random_str(),
            '/static/img/cruise/rad_lamp_off.png' + random_str(),
            '/static/img/cruise/rad_lamp_on.png' + random_str(),
            '/static/img/cruise/r_btn.png' + random_str(),
            '/static/img/cruise/r_btn_over.png' + random_str(),
            '/static/img/cruise/r_btn_pressed.png' + random_str(),
            '/static/img/cruise/stop_btn.png' + random_str(),
            '/static/img/cruise/stop_btn_over.png' + random_str(),
            '/static/img/cruise/stop_btn_pressed.png' + random_str(),

            // Зум слайдер
            '/static/img/control_zoom/zoom_port.png' + random_str(),
            '/static/img/control_zoom/zoom_glass.png' + random_str(),
            '/static/img/control_zoom/zoom_mark.png' + random_str(),
            '/static/img/control_zoom/hide_gadgets.png' + random_str(),
            '/static/img/control_zoom/unhide_gadgets.png' + random_str(),

            // Свернуть/Развернуть виджеты
            '/static/img/misc_button/down_hide_normal.png' + random_str(),
            '/static/img/misc_button/down_hide_hover.png' + random_str(),
            '/static/img/misc_button/down_hide_active.png' + random_str(),
            '/static/img/misc_button/up_hide_normal.png' + random_str(),
            '/static/img/misc_button/up_hide_hover.png' + random_str(),
            '/static/img/misc_button/up_hide_active.png' + random_str(),

        ]);

    preloaderImage.add_list(ll, complete, 20000);
})();
