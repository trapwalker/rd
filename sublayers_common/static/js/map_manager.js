/*
* Синглтон для работы с картой
* В данный модуль писать все методы и функции для работы с картой
*/

//Максимальный и минимальный зумы карты
var ConstMaxMapZoom = 18;
var ConstMinMapZoom = 10;
var ConstDurationAnimation = 500;
var last_right_click_on_map = {x: 12517154, y:27028830};

function onMouseUpMap(mouseEventObject) {
    if (mapCanvasManager && mapCanvasManager._mouse_focus_widget) {
        mapCanvasManager._mouse_focus_widget.click_handler(mouseEventObject);
    }
    else {
        //clientManager.sendGoto(mapManager.project(mouseEventObject.latlng, mapManager.getMaxZoom()));
        // todo: учесть зум
        //console.log(summVector(mapManager.getTopLeftCoords(mapManager.getZoom()), new Point(mouseEventObject.clientX, mouseEventObject.clientY)));
        var click_point = new Point(mouseEventObject.clientX, mouseEventObject.clientY);
        clientManager.sendGoto(summVector(mapManager.getTopLeftCoords(mapManager.getZoom()), mulScalVector(click_point, Math.pow(2., (ConstMaxMapZoom - mapManager.getZoom())))));
    }
}



function onMouseMoveMap(mouseEventObject) {
    mapCanvasManager.set_mouse_look(true);
    mapCanvasManager._on_mouse_hover(mouseEventObject)
}

function onMouseOutMap(mouseEventObject){
    mapCanvasManager.set_mouse_look(false);
}

var pressedKey;
var pressedArrowUp;
var pressedArrowDown;
var pressedArrowLeft;
var pressedArrowRight;
var pressedTurnLeft = false;
var pressedTurnRight = false;

var crazy_timer = null;

function sendRandGoTo(){
    var pos = user.userCar.getCurrentCoord(clock.getCurrentTime());
    rx = Math.random() * 100. - 50. + pos.x;
    ry = Math.random() * 100. - 50. + pos.y;
    clientManager.sendGoto(new Point(rx, ry));
}

function onKeyDownMap(event) {
    //console.log('onKeyDownMap', event.keyCode);
    switch (event.keyCode) {
        case 27:
            windowTemplateManager.closeActiveWindow();
            break;
        case 13:
            chat.get_current_input().focus();
            break;
        case 37:
            if (! user.userCar) return;
            if (!pressedArrowLeft) {
                pressedArrowLeft = true;
                var turn = 0;
                if (pressedArrowLeft) turn++;
                if (pressedArrowRight) turn--;
                clientManager.sendTurn(turn);
            }
            break;
        case 38:
            if (! user.userCar) return;
            if (!pressedArrowUp) {
                clientManager.sendSetSpeed(user.userCar.v_forward);
                if (wCruiseControl) wCruiseControl.startKeyboardControl();
                pressedArrowUp = true;
            }
            break;
        case 39:
            if (! user.userCar) return;
            if (!pressedArrowRight) {
                pressedArrowRight = true;
                var turn = 0;
                if (pressedArrowLeft) turn++;
                if (pressedArrowRight) turn--;
                clientManager.sendTurn(turn);
            }
            break;
        case 40:
            if (! user.userCar) return;
            if (!pressedArrowDown) {
                clientManager.sendSetSpeed(user.userCar.v_backward);
                if (wCruiseControl) wCruiseControl.startKeyboardControl();
                pressedArrowDown = true;
            }
            break;
        case 72:
            clientManager.sendRocket();
            break;
        case 84: // T // Crazy Click Timer
            //if (crazy_timer){
            //    clearInterval(crazy_timer);
            //    crazy_timer = null;
            //}
            //else{
            //    crazy_timer = setInterval(sendRandGoTo, 100);
            //}
            clientManager.sendTeleportCoord(last_right_click_on_map.x, last_right_click_on_map.y);

            break;
        case 87:  // W
            clientManager.sendFireDischarge('front');
            break;
        case 65:  // A
            clientManager.sendFireDischarge('left');
            break;
        case 83:  // S
            clientManager.sendFireDischarge('back');
            break;
        case 68:  // D
            clientManager.sendFireDischarge('right');
            break;
        case 69:  // E
            /*
            clientManager.sendFireAutoEnable('front', true);
            clientManager.sendFireAutoEnable('back', true);
            clientManager.sendFireAutoEnable('right', true);
            clientManager.sendFireAutoEnable('left', true);
            */
            break;
        case 81:  // Q
            if (wFireController && wFireController.allFire)
                wFireController.allFire.click();
            break;
        case 90:  // Z
            //console.log('Was pressed: Z');
            break;
        case 49:  // 1
            if (! user.userCar) return;
            clientManager.sendActivateQuickItem(1, user.userCar.ID);
            wFireController.signalQuickConsumerPanel(1);
            break;
        case 50:  // 2
            if (! user.userCar) return;
            clientManager.sendActivateQuickItem(2, user.userCar.ID);
            wFireController.signalQuickConsumerPanel(2);
            break;
        case 51:  // 3
            if (! user.userCar) return;
            clientManager.sendActivateQuickItem(3, user.userCar.ID);
            wFireController.signalQuickConsumerPanel(3);
            break;
        case 52:  // 4
            if (! user.userCar) return;
            clientManager.sendActivateQuickItem(4, user.userCar.ID);
            wFireController.signalQuickConsumerPanel(4);
            break;
        case 32:  // Space / Пробел
            clientManager.sendStopCar();
            break;
        //LM=77 N O=79 P=80   Q=81
    }
}

function onKeyUpMap(event) {
    //console.log('onKeyUpMap');
    switch (event.keyCode) {
        case 37:
            if (! user.userCar) return;
            pressedArrowLeft = false;
            var turn = 0;
            if (pressedArrowLeft) turn++;
            if (pressedArrowRight) turn--;
            clientManager.sendTurn(turn);
            break;
        case 38:
            if (! user.userCar) return;
            clientManager.sendSetSpeed(user.userCar.getCurrentSpeed(clock.getCurrentTime()));
            if (wCruiseControl) wCruiseControl.stopKeyboardControl();
            pressedArrowUp = false;
            break;
        case 39:
            if (! user.userCar) return;
            pressedArrowRight = false;
            var turn = 0;
            if (pressedArrowLeft) turn++;
            if (pressedArrowRight) turn--;
            clientManager.sendTurn(turn);
            break;
        case 40:
            if (! user.userCar) return;
            clientManager.sendSetSpeed(user.userCar.getCurrentSpeed(clock.getCurrentTime()));
            if (wCruiseControl) wCruiseControl.stopKeyboardControl();
            pressedArrowDown = false;
            break;
    }
}

function returnFocusToMap() {
    document.getElementById('map2div').focus();
}

var MapManager = (function(_super) {
    __extends(MapManager, _super);

    function MapManager(){
        _super.call(this);

        this.inZoomChange = false;
        this.oldZoomForCalcZoom = 0;
        this.startZoomChangeTime = 0;
        this.tileLayerPath = '';
        this.tileLayer = null;

        // добавление в визуалменеджер для своих виджетов (зум виджет например)
        this.addToVisualManager();
        //this._init();

        // Виджеты карты: виджеты-синглеты, находятся на карте, хранятся здесь для быстрого доступа
        this.widget_target_point = null; // инициализируется при получении своей машинки
        this.widget_fire_radial_grid = null; // инициализируется при получении своей машинки
        this.widget_fire_sectors = null; // инициализируется при получении своей машинки
        this.zoomSlider = null; // инициализируется после карты

        this.strategy_mode_timer = null;
    }

    MapManager.prototype._init = function () {
        this.tileLayerPath = $('#settings_map_link').text();
        this.server_min_zoom = $('#settings_server_mode').text() == 'quick' ? 15 : ConstMinMapZoom;



        // Обработчики событий карты
        pressedKey = false;

        document.getElementById('map2div').onkeydown = onKeyDownMap;
        document.getElementById('map2div').onkeyup = onKeyUpMap;

        document.getElementById('map2div').onmouseup = onMouseUpMap;

        document.getElementById('map2div').onmousemove = onMouseMoveMap;
        document.getElementById('map2div').onmouseout = onMouseOutMap;


        /*
            Карта является глобальным droppabl'ом в качестве мусорки
            P.S.
            Тут дропабл вешается именно на бодидив, а не на мап, т.к. мап и например окно инвентаря лежат в разных
            ветках дом-дерева и запрет делегирования дропа не отрабатывает корректно (одновременно отрабатывает и дроп
            на карту и дроп в ячейку инвентаря)
        */
        $('#bodydiv').droppable({
            greedy: true,
            tolerance: 'pointer',
            drop: function(event, ui) {
                // Эта проверка нужна так как таскание окон также порождает событие дропа
                if (ui.draggable.hasClass('mainCarInfoWindow-body-trunk-body-right-item')) {
                    var inventory = inventoryList.getInventory(ui.draggable.data('owner_id'));
                    if (!inventory) return;
                    var item = inventory.getItem(ui.draggable.data('pos'));
                    if (!item) return;
                    modalWindow.modalDialogAnswerShow({
                        caption: 'Inventory Operation',
                        header: 'Выбросить?',
                        body_text: 'Вы уверены, что хотите выбросить ' + item.example.title + ' на карту?',
                        callback_ok: function() {
                            clientManager.sendItemActionInventory(
                                ui.draggable.data('owner_id'), ui.draggable.data('pos'), null, null);
                        }
                    });
                }
                if (ui.draggable.hasClass('fire-controll-quick-btn-block'))
                    clientManager.sendSetQuickItem(ui.draggable.data('index'), -1);
            }
        });


        // Подключение новой карты
        this.anim_zoom = 18 // cookieStorage.zoom;
        smap =  slippymap({
            div: "map2",
            tileprovider: function (x, y, z) {return "http://185.58.205.29/map/" + z + "/" + x + "/" + y +".jpg";},
            zMin: this.server_min_zoom,
            zMax: ConstMaxMapZoom,
            lat: 32.93523932687671,
            lon: -113.0391401052475,
            zoom: this.anim_zoom,
        }).init();



        // Инициализация виджетов карты
        this.zoomSlider = new WZoomSlider(this);

        //this.add_to_canvas_manager();
    };

    MapManager.prototype.set_coord = function (options) {
        if (options.x !== undefined) {
            smap.map.position.setX(options.x, {animated: false});
        }
        if (options.y !== undefined) {
            smap.map.position.setY(options.y, {animated: false});
        }
        if (options.z !== undefined) {
            smap.map.position.setZ(options.z, {animated: false});
        }

        this.render_map();
    };

    MapManager.prototype.render_map = function () {
        smap.renderer.refresh();
    };

    MapManager.prototype.redraw = function(ctx, time, client_time) {
        this.render_map();
    };

    MapManager.prototype.add_to_canvas_manager = function () {
        function add_to_canvas_manager() {
            if (mapCanvasManager)
                mapCanvasManager.add_vobj(mapManager, 99);
            else
                setTimeout(add_to_canvas_manager, 0);
        }
        setTimeout(add_to_canvas_manager, 0);
    };

    // =============================== Model Events

    MapManager.prototype.onEnterLocation = function () {
        //console.log('MapManager.prototype.onEnterLocation');
        $('#bodydiv').droppable('disable');
    };

    MapManager.prototype.onExitLocation = function () {
        //console.log('MapManager.prototype.onExitLocation');
        $('#bodydiv').droppable('enable');
    };

    // =============================== Map Coords

    MapManager.prototype.getMapCenter = function () {
        var c = smap.center();
        return new Point(c.x, c.y);
    };

    MapManager.prototype.getMapSize = function() {
        return new Point(smap.width(), smap.height());
    };

    MapManager.prototype.getTopLeftCoords = function(zoom) {
        var c = this.getMapCenter();
        var map_size = mulScalVector(this.getMapSize(), 0.5);
        var koeff = Math.pow(2., (ConstMaxMapZoom - zoom));
        return subVector(c, mulScalVector(map_size, koeff));
    };

    // =============================== Zoom

    MapManager.prototype.getMaxZoom = function() {
        return ConstMaxMapZoom;
    };

    MapManager.prototype.getMinZoom = function() {
        return this.server_min_zoom;
    };

    MapManager.prototype.getRealZoom = function (time) {
        if ((this.inZoomChange) && (time >= this.startZoomChangeTime)) {
            // todo: пока будет считаться по линейной функции
            var path_time = (time - this.startZoomChangeTime) / (ConstDurationAnimation / 1000.0);
            if (path_time > 1.0) path_time = 1.0;
            var zoom_diff = this.anim_zoom - this.oldZoomForCalcZoom;
            return this.oldZoomForCalcZoom + zoom_diff * path_time;
        }
        else {
            return this.getZoom();
        }
    };

    MapManager.prototype.getZoom = function() {
        return smap.zoom();
    };

    MapManager.prototype.setZoom = function(zoom) {
        //console.log('MapManager.prototype.setZoom', zoom, this.server_min_zoom, ConstMaxMapZoom);
        if(zoom == this.getZoom()) return;
        if(zoom < this.server_min_zoom || zoom > ConstMaxMapZoom) return;
        smap.zoom(zoom, {animated: true});
    };

    MapManager.prototype.onZoomAnimation = function(event) {
        //console.log('MapManager.prototype.zoomAnim', event);
        if (event.zoom)
            mapManager.anim_zoom = event.zoom;

        if (mapManager.widget_fire_radial_grid)
            mapManager.widget_fire_radial_grid.setZoom(mapManager.anim_zoom);
        if (mapManager.widget_fire_sectors)
            mapManager.widget_fire_sectors.setZoom(mapManager.anim_zoom);
        if (mapManager.zoomSlider)
            mapManager.zoomSlider.setZoom(mapManager.anim_zoom);

        if (event.zoom) {
            if (event.zoom < 15) {
                // убрать сетку и секутора
                if (mapManager.widget_fire_radial_grid)
                    mapManager.widget_fire_radial_grid.setVisible(false);
                if (mapManager.widget_fire_sectors)
                    mapManager.widget_fire_sectors.setVisible(false);

                // todo: сделать это не через таймер !!!
                if (! mapManager.strategy_mode_timer) {
                    mapManager.strategy_mode_timer = setInterval(function () {
                        clientManager.sendGetStrategyModeObjects();
                    }, 5000);
                }
            }
            else {
                // показать сетку и сектора, если боевой режим
                if ((mapManager.widget_fire_radial_grid) && (wFireController))
                    mapManager.widget_fire_radial_grid.setVisible(wFireController.visible);
                if ((mapManager.widget_fire_sectors) && (wFireController))
                    mapManager.widget_fire_sectors.setVisible(wFireController.visible);
                 if (mapManager.strategy_mode_timer) {
                     clearInterval(mapManager.strategy_mode_timer);
                     mapManager.strategy_mode_timer = null;
                 }
            }
        }
    };

    MapManager.prototype.onZoomStart = function (event) {
        //console.log('MapManager.prototype.onZoomStart', map.getZoom());
        //mapManager.inZoomChange = true;
        //mapManager.oldZoomForCalcZoom = map.getZoom();
        //mapManager.startZoomChangeTime = clock.getCurrentTime();
        //
        //audioManager.play({name: 'zoom_01', gain: 0.1, priority: 0.5});
    };

    MapManager.prototype.onZoomEnd = function (event) {
        ////console.log('MapManager.prototype.onZoomEnd');
        //mapManager.inZoomChange = false;
        //visualManager.changeModelObject(mapManager);
    };

    return MapManager;
})(ClientObject);

var smap;
var mapManager = new MapManager();





