(function(){
    //console.log('start_preloader_static_image_list');

    function random_str() { return (Math.random() * 10000).toFixed(0); }

    function complete(load) {
        //console.log('finish_preloader_static_image_list =', preloaderImage.count_loading, load, preloaderImage.tasks);
        resourceLoadManager.del(preloaderImage);
    }

    resourceLoadManager.add(preloaderImage);

    preloaderImage.add_list([
        '/static/img/teaching/arrow_big.png',
        '/static/img/teaching/arrow_big_big.png',
        '/static/img/cursors/hyper.png?' + random_str(),
        '/static/img/cursors/main.png?' + random_str(),
        '/static/img/cursors/main.png?' + random_str(),
        '/static/img/misc_button/btn_fullscreen_normal.png?' + random_str(),
        '/static/img/misc_button/btn_fullscreen_over.png?' + random_str(),
        '/static/img/misc_button/btn_fullscreen_pressed.png?' + random_str(),
        '/static/img/misc_button/btn_no_fullscreen_normal.png?' + random_str(),
        '/static/img/misc_button/btn_no_fullscreen_over.png?' + random_str(),
        '/static/img/misc_button/btn_no_fullscreen_pressed.png?' + random_str(),
        '/static/img/misc_button/btn_options_normal.png?' + random_str(),
        '/static/img/misc_button/btn_options_over.png?' + random_str(),
        '/static/img/misc_button/btn_options_pressed.png?' + random_str(),
        '/static/img/misc_button/btn_connection2_normal.png?' + random_str(),
        '/static/img/misc_button/btn_connection2_over.png?' + random_str(),
        '/static/img/misc_button/btn_connection2_pressed.png?' + random_str(),
        '/static/img/windows/temp_scroll/up.png?' + random_str(),
        '/static/img/windows/temp_scroll/up_hover.png?' + random_str(),
        '/static/img/windows/temp_scroll/down.png?' + random_str(),
        '/static/img/windows/temp_scroll/down_hover.png?' + random_str(),
        '/static/img/windows/temp_scroll/left.png?' + random_str(),
        '/static/img/windows/temp_scroll/left_hover.png?' + random_str(),
        '/static/img/windows/temp_scroll/right.png?' + random_str(),
        '/static/img/windows/temp_scroll/right_hover.png?' + random_str(),
        '/static/img/chat/chat_port.png?' + random_str(),
        '/static/img/chat/chat_glass.png?' + random_str(),
        '/static/img/cursors/text.png?' + random_str(),
        '/static/img/chat/btn_slide_left.png?' + random_str(),
        '/static/img/chat/btn_slide_left_over.png?' + random_str(),
        '/static/img/chat/btn_slide_right.png?' + random_str(),
        '/static/img/chat/btn_slide_right_over.png?' + random_str(),
        '/static/img/chat/tab_close_btn.png?' + random_str(),
        '/static/img/chat/tab_close_btn_over.png?' + random_str(),
        '/static/img/chat/tab_close_btn_pressed.png?' + random_str(),
        '/static/img/cruise/cruise_glass.png?' + random_str(),
        '/static/img/cruise/cruise_port.png?' + random_str(),
        '/static/img/misc_button/down_hide_normal.png?' + random_str(),
        '/static/img/misc_button/down_hide_hover.png?' + random_str(),
        '/static/img/misc_button/down_hide_active.png?' + random_str(),
        '/static/img/misc_button/up_hide_normal.png?' + random_str(),
        '/static/img/misc_button/up_hide_hover.png?' + random_str(),
        '/static/img/misc_button/up_hide_active.png?' + random_str(),
        '/static/img/cruise/dgigits_back_glow.png?' + random_str(),
        '/static/img/cruise/speed_mark.png?' + random_str(),
        '/static/img/cruise/limit_arrow.png?' + random_str(),
        '/static/img/cruise/limit_dirt.png?' + random_str(),
        '/static/img/cruise/limit_wood.png?' + random_str(),
        '/static/img/cruise/limit_road.png?' + random_str(),
        '/static/img/cruise/limit_water.png?' + random_str(),
        '/static/img/cruise/limit_slope.png?' + random_str(),
        '/static/img/cruise/r_btn.png?' + random_str(),
        '/static/img/cruise/r_btn_over.png?' + random_str(),
        '/static/img/cruise/r_btn_pressed.png?' + random_str(),
        '/static/img/cruise/stop_btn.png?' + random_str(),
        '/static/img/cruise/stop_btn_over.png?' + random_str(),
        '/static/img/cruise/stop_btn_pressed.png?' + random_str(),

        '/static/img/fire_control/aim_glass.png?' + random_str(),
        '/static/img/fire_widget_buttons/lup_noactive.png?' + random_str(),
        '/static/img/fire_widget_buttons/lup_active.png?' + random_str(),
        '/static/img/fire_widget_buttons/lup_hover.png?' + random_str(),
        '/static/img/fire_widget_buttons/ldown_noactive.png?' + random_str(),
        '/static/img/fire_widget_buttons/ldown_active.png?' + random_str(),
        '/static/img/fire_widget_buttons/ldown_hover.png?' + random_str(),
        '/static/img/fire_widget_buttons/rup_noactive.png?' + random_str(),
        '/static/img/fire_widget_buttons/rup_active.png?' + random_str(),
        '/static/img/fire_widget_buttons/rup_hover.png?' + random_str(),
        '/static/img/fire_widget_buttons/rdown_noactive.png?' + random_str(),
        '/static/img/fire_widget_buttons/rdown_active.png?' + random_str(),
        '/static/img/fire_widget_buttons/rdown_hover.png?' + random_str(),
        '/static/img/fire_control/aim_port.png?' + random_str(),
        '/static/img/fire_control/battle_btn_on.png?' + random_str(),
        '/static/img/fire_control/battle_btn_pressed.png?' + random_str(),
        '/static/img/fire_control/battle_btn_off.png?' + random_str(),
        '/static/img/fire_control/battle_btn_pressed.png?' + random_str(),
        '/static/img/fire_control/fire_widget_indicator/indicator_off.png?' + random_str(),
        '/static/img/fire_control/fire_widget_indicator/indicator_hover.png?' + random_str(),
        '/static/img/fire_control/fire_widget_indicator/indicator_active.png?' + random_str(),

        '/static/img/CruiseControl/if_spd_filler.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_arrow.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_slider_normal.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_slider_over.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_slider_pressed.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_bar.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_limit_hwy.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_limit_rd.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_limit_drt.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_limit_frst.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_digital_speed.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_stop_normal.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_stop_over.png?' + random_str(),
        '/static/img/CruiseControl/if_spd_stop_pressed.png?' + random_str(),
        '/static/img/Health_Fuel/fuel_icon.png?' + random_str(),
        '/static/img/Health_Fuel/fuel_health_bg_tile.png?' + random_str(),
        '/static/img/Health_Fuel/scale_all.png?' + random_str(),
        '/static/img/Health_Fuel/fuel_health_arrow.png?' + random_str(),
        '/static/img/Health_Fuel/health_icon.png?' + random_str(),
        '/static/img/Health_Fuel/fuel_health_bg_tile.png?' + random_str(),
        '/static/img/Health_Fuel/scale_all.png?' + random_str(),
        '/static/img/Health_Fuel/fuel_health_arrow.png?' + random_str(),

        '/static/img/control_zoom/zoom_port.png?' + random_str(),
        '/static/img/control_zoom/zoom_glass.png?' + random_str(),
        '/static/img/control_zoom/zoom_mark.png?' + random_str(),
        '/static/img/control_zoom/hide_gadgets.png?' + random_str(),
        '/static/img/misc_button/down_hide_normal.png?' + random_str(),
        '/static/img/misc_button/down_hide_hover.png?' + random_str(),
        '/static/img/misc_button/down_hide_active.png?' + random_str(),
        '/static/img/misc_button/up_hide_normal.png?' + random_str(),
        '/static/img/misc_button/up_hide_hover.png?' + random_str(),
        '/static/img/misc_button/up_hide_active.png?' + random_str(),
        '/static/img/control_zoom/unhide_gadgets.png?' + random_str(),

        '/static/content/locations/map_locations/chat_active.png?' + random_str(),
        '/static/content/locations/map_locations/chat_hover.png?' + random_str(),
        '/static/content/locations/map_locations/chat_press.png?' + random_str(),
        '/static/content/locations/map_locations/city_bg1.png?' + random_str(),
        '/static/content/locations/map_locations/city_mask_1.png?' + random_str(),
        '/static/content/locations/map_locations/city_mask_2.png?' + random_str(),
        '/static/content/locations/map_locations/lbdown_active.png?' + random_str(),
        '/static/content/locations/map_locations/lbdown_hover.png?' + random_str(),
        '/static/content/locations/map_locations/lbdown_noactive.png?' + random_str(),
        '/static/content/locations/map_locations/lbdown_press.png?' + random_str(),
        '/static/content/locations/map_locations/lbup_active.png?' + random_str(),
        '/static/content/locations/map_locations/lbup_hover.png?' + random_str(),
        '/static/content/locations/map_locations/lbup_noactive.png?' + random_str(),
        '/static/content/locations/map_locations/lbup_press.png?' + random_str(),
        '/static/content/locations/map_locations/loc_active.png?' + random_str(),
        '/static/content/locations/map_locations/loc_hover.png?' + random_str(),
        '/static/content/locations/map_locations/loc_press.png?' + random_str(),
        '/static/content/locations/map_locations/menu_active.png?' + random_str(),
        '/static/content/locations/map_locations/menu_hover.png?' + random_str(),
        '/static/content/locations/map_locations/menu_press.png?' + random_str(),
        '/static/content/locations/map_locations/rbdown_active.png?' + random_str(),
        '/static/content/locations/map_locations/rbdown_hover.png?' + random_str(),
        '/static/content/locations/map_locations/rbdown_noactive.png?' + random_str(),
        '/static/content/locations/map_locations/rbdown_press.png?' + random_str(),
        '/static/content/locations/map_locations/rbup_active.png?' + random_str(),
        '/static/content/locations/map_locations/rbup_hover.png?' + random_str(),
        '/static/content/locations/map_locations/rbup_noactive.png?' + random_str(),
        '/static/content/locations/map_locations/rbup_press.png?' + random_str(),

        '/static/img/noise/map_noise_src.png?' + random_str(),
        '/static/img/noise/map_noise_src_1.png?' + random_str(),
        '/static/img/noise/1_noise.png?' + random_str(),
        '/static/img/noise/1_noise_inv.png?' + random_str(),
        '/static/img/noise/1_noise60.png?' + random_str(),
        '/static/img/noise/2_noise.png?' + random_str(),
        '/static/img/noise/2_noise_inv.png?' + random_str(),
        '/static/img/noise/2_noise60.png?' + random_str(),
        '/static/img/noise/3_noise.png?' + random_str(),
        '/static/img/noise/3_noise_inv.png?' + random_str(),
        '/static/img/noise/3_noise60.png?' + random_str(),
        '/static/img/noise/4_noise.png?' + random_str(),
        '/static/img/noise/4_noise_inv.png?' + random_str(),
        '/static/img/noise/4_noise60.png?' + random_str(),
        '/static/img/noise/n1.png?' + random_str(),
        '/static/img/noise/n2.png?' + random_str(),
        '/static/img/noise/n3.png?' + random_str(),
        '/static/img/noise/n4.png?' + random_str(),
        '/static/img/noise/2n1_white.png?' + random_str(),
        '/static/img/noise/2n2_white.png?' + random_str(),
        '/static/img/noise/2n3_white.png?' + random_str(),
        '/static/img/noise/2n4_white.png?' + random_str()
        // todo: �� ������ �������� �� ����� /static/content/locations/institutions
    ], complete, 20000);

})();
