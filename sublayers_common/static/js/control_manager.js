var ControlManager = (function () {
    function ControlManager() {
        this.code_map = {};

        this.bind_code(settingsManager.options["move_forvard"].value ,"move_forvard");
        this.bind_code(settingsManager.options["move_backward"].value ,"move_backward");
        this.bind_code(settingsManager.options["move_left"].value ,"move_left");
        this.bind_code(settingsManager.options["move_right"].value ,"move_right");
        this.bind_code(settingsManager.options["stop"].value ,"stop");
        this.bind_code(settingsManager.options["reverse"].value ,"reverse");
        this.bind_code(settingsManager.options["toggle_auto_fire"].value ,"toggle_auto_fire");
        this.bind_code(settingsManager.options["toggle_fire_widget"].value ,"toggle_fire_widget");
        this.bind_code(settingsManager.options["fire_disc_front"].value ,"fire_disc_front");
        this.bind_code(settingsManager.options["fire_disc_right"].value ,"fire_disc_right");
        this.bind_code(settingsManager.options["fire_disc_back"].value ,"fire_disc_back");
        this.bind_code(settingsManager.options["fire_disc_left"].value ,"fire_disc_left");
        this.bind_code(settingsManager.options["quick_panel_1"].value ,"quick_panel_1");
        this.bind_code(settingsManager.options["quick_panel_2"].value ,"quick_panel_2");
        this.bind_code(settingsManager.options["quick_panel_3"].value ,"quick_panel_3");
        this.bind_code(settingsManager.options["quick_panel_4"].value ,"quick_panel_4");
        this.bind_code(settingsManager.options["get_loot"].value ,"get_loot");

        this.bind_code(settingsManager.options["zoom_in"].value ,"zoom_in");
        this.bind_code(settingsManager.options["zoom_out"].value ,"zoom_out");
        this.bind_code(settingsManager.options["zoom_roll_up"].value ,"zoom_roll_up");
        this.bind_code(settingsManager.options["zoom_expand"].value ,"zoom_expand");

        this.bind_code(settingsManager.options["open_character_info"].value ,"open_character_info");
        this.bind_code(settingsManager.options["open_vehicle_info"].value ,"open_vehicle_info");
        this.bind_code(settingsManager.options["open_inventory"].value ,"open_inventory");
        this.bind_code(settingsManager.options["open_logbook_info"].value ,"open_logbook_info");
        this.bind_code(settingsManager.options["open_party_info"].value ,"open_party_info");
        this.bind_code(settingsManager.options["open_radio"].value ,"open_radio");
        this.bind_code(settingsManager.options["open_options"].value ,"open_options");

        this.bind_code(settingsManager.options["use_teleport"].value ,"use_teleport");
        this.bind_code(settingsManager.options["save_tiles"].value ,"save_tiles");

        // Для отслеживания состояний Зажатия Кнопок движения
        this.pressed_move_forward = false;
        this.pressed_move_backward = false;
        this.pressed_move_left = false;
        this.pressed_move_right = false;
    }

    ControlManager.prototype.actions = {
        move_forvard: {
            down: function () {
                if (!user.userCar) return;
                if (!controlManager.pressed_move_forward) {
                    clientManager.sendSetSpeed(user.userCar.v_forward);
                    if (wCruiseControl) wCruiseControl.startKeyboardControl();
                    controlManager.pressed_move_forward = true;
                }
            },
            up: function () {
                if (!user.userCar) return;
                if (wCruiseControl && wCruiseControl.keyBoardControl) {
                    clientManager.sendSetSpeed(user.userCar.getCurrentSpeed(clock.getCurrentTime()));
                    wCruiseControl.stopKeyboardControl();
                }
                controlManager.pressed_move_forward = false;
            },
        },
        move_backward: {
            down: function () {
                if (!user.userCar) return;
                if (!controlManager.pressed_move_backward) {
                    clientManager.sendSetSpeed(user.userCar.v_backward);
                    if (wCruiseControl) wCruiseControl.startKeyboardControl();
                    controlManager.pressed_move_backward = true;
                }
            },
            up: function () {
                if (!user.userCar) return;
                if (wCruiseControl && wCruiseControl.keyBoardControl) {
                    clientManager.sendSetSpeed(user.userCar.getCurrentSpeed(clock.getCurrentTime()));
                    wCruiseControl.stopKeyboardControl();
                }
                controlManager.pressed_move_backward = false;
            },
        },
        move_left: {
            down: function () {
                if (!user.userCar) return;
                if (!controlManager.pressed_move_left) {
                    controlManager.pressed_move_left = true;
                    var turn = 0;
                    if (controlManager.pressed_move_left) turn++;
                    if (controlManager.pressed_move_right) turn--;
                    clientManager.sendTurn(turn);
                }
            },
            up: function () {
                if (!user.userCar) return;
                controlManager.pressed_move_left = false;
                controlManager.pressed_move_right = false;
                var turn = 0;
                //if (controlManager.pressed_move_left) turn++;
                //if (controlManager.pressed_move_right) turn--;
                clientManager.sendTurn(turn);
            },
        },
        move_right: {
            down: function () {
                if (!user.userCar) return;
                if (!controlManager.pressed_move_right) {
                    controlManager.pressed_move_right = true;
                    var turn = 0;
                    if (controlManager.pressed_move_left) turn++;
                    if (controlManager.pressed_move_right) turn--;
                    clientManager.sendTurn(turn);
                }
            },
            up: function () {
                if (!user.userCar) return;
                controlManager.pressed_move_left = false;
                controlManager.pressed_move_right = false;
                var turn = 0;
                //if (controlManager.pressed_move_left) turn++;
                //if (controlManager.pressed_move_right) turn--;
                clientManager.sendTurn(turn);
            },
        },
        stop: {
            up: function() {clientManager.sendStopCar();},
        },
        reverse: {
            up: function() {if (wCruiseControl) wCruiseControl.reverseDiv.click();},
        },

        toggle_auto_fire: {
            up: function () {
                if (wFireController)
                    wFireController.toggleAutoShootingEnable();
            }
        },
        toggle_fire_widget: {
            up: function () {if (wFireController)wFireController.changeVisible();}
        },

        fire_disc_front: {up: function() {clientManager.sendFireDischarge('front')}},
        fire_disc_right: {up: function() {clientManager.sendFireDischarge('right')}},
        fire_disc_back: {up: function() {clientManager.sendFireDischarge('back')}},
        fire_disc_left: {up: function() {clientManager.sendFireDischarge('left')}},

        quick_panel_1: {
            up: function () {
                if (!user.userCar) return;
                clientManager.sendActivateQuickItem(1, user.userCar.ID);
                wFireController.signalQuickConsumerPanel(1);
            },
        },
        quick_panel_2: {
            up: function () {
                if (!user.userCar) return;
                clientManager.sendActivateQuickItem(2, user.userCar.ID);
                wFireController.signalQuickConsumerPanel(2);
            },
        },
        quick_panel_3: {
            up: function () {
                if (!user.userCar) return;
                clientManager.sendActivateQuickItem(3, user.userCar.ID);
                wFireController.signalQuickConsumerPanel(3);
            },
        },
        quick_panel_4: {
            up: function () {
                if (!user.userCar) return;
                clientManager.sendActivateQuickItem(4, user.userCar.ID);
                wFireController.signalQuickConsumerPanel(4);
            },
        },

        get_loot: {
            up: function () {
                if (!user.userCar || !contextPanel) return;
                contextPanel.get_loot_observer.activate();
            },
        },

        // Горячие клавиши зум-слайдера
        zoom_in: {up: function() {if (mapManager) mapManager.setZoom(mapManager.getZoom() + mapManager.zoomSlider.options.step)}},
        zoom_out: {up: function() {if (mapManager) mapManager.setZoom(mapManager.getZoom() - mapManager.zoomSlider.options.step)}},
        zoom_roll_up: {up: function() {
            if (!wCruiseControl || !mapManager || !mapManager.zoomSlider) return;
            mapManager.zoomSlider.sverAll();
        }},
        zoom_expand: {up: function() {
            if (!wCruiseControl || !mapManager || !mapManager.zoomSlider) return;
            mapManager.zoomSlider.razverAll();
        }},

        // Горячие клавиши для верхнего меню
        open_character_info: {up: function() {$("#divMainMenuBtnCharacter").click()}},
        open_vehicle_info: {up: function() {$("#divMainMenuBtnCar").click()}},
        open_inventory: {up: function() {$("#divMainMenuBtnInventory").click()}},
        open_logbook_info: {up: function() {$("#divMainMenuBtnJournal").click()}},
        open_party_info: {up: function() {$("#divMainMenuBtnParty").click()}},
        open_radio: {up: function() {$("#divMainMenuBtnRadio").click()}},
        open_options: {up: function() {$("#divMainMenuBtnOptions").click()}},

        // Горячие клавиши админских возможностей (показываются только при cht_bGod = 1)
        use_teleport: {
            up: function () {
                if (settingsManager.cht_bGod && mapCanvasManager && mapManager) {
                    var target = mapManager.getMouseCoords();
                    clientManager.sendTeleportCoord(target.x, target.y);
                }
            }
        },
        save_tiles: {
            up: function () {
                if (settingsManager.cht_bGod && mapCanvasManager && mapManager) {
                    var target = mapManager.getMouseCoords();
                    clientManager.sendTileCoord(target.x, target.y);
                }
            }
        },
    };

    ControlManager.prototype.bind_code = function(keycode, func_name) {
        if (!this.actions.hasOwnProperty(func_name)) return;
        if (keycode != 0)
            this.code_map[keycode] = func_name;
        else {
            for (var key in this.code_map)
                if (this.code_map.hasOwnProperty(key) && this.code_map[key] == func_name)
                    this.code_map[key] = null;
        }
    };

    ControlManager.prototype.on_keydown = function (keycode) {
        if (this.code_map[keycode] && this.actions[this.code_map[keycode]] && typeof this.actions[this.code_map[keycode]].down === "function")
            this.actions[this.code_map[keycode]].down();
    };

    ControlManager.prototype.on_keyup = function (keycode) {
        if (this.code_map[keycode] && this.actions[this.code_map[keycode]] && typeof this.actions[this.code_map[keycode]].up === "function")
            this.actions[this.code_map[keycode]].up();
    };

    return ControlManager;
})();

var controlManager = new ControlManager();


function onKeyDownMap(event) {
    //console.log('onKeyDownMap', event.keyCode);
    switch (event.keyCode) {
        case 27: // Esc
            windowTemplateManager.closeActiveWindow();
            break;
        case 13: // Enter
            chat.get_current_input().focus();
            break;
        //case 84:
        //    clientManager.sendTeleportCoord(last_right_click_on_map.x, last_right_click_on_map.y);
        //    break;
        default:
            controlManager.on_keydown(event.keyCode);
    }
}

function onKeyUpMap(event) {
    //console.log('onKeyUpMap');
    switch (event.keyCode) {
        default:
            controlManager.on_keyup(event.keyCode);
    }
}