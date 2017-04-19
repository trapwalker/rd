/*
* Синглтон для работы с картой
* В данный модуль писать все методы и функции для работы с картой
*/

// Максимальный и минимальный зумы карты
var ConstMaxMapZoom = 18;
var ConstMinMapZoom = 10;
var ConstDurationAnimation = 500;
var last_right_click_on_map = {x: 12517154, y:27028830};

// Для отслеживания состояний нажатия стрелок
var pressedArrowUp;
var pressedArrowDown;
var pressedArrowLeft;
var pressedArrowRight;

function onMouseUpMap(mouseEventObject) {
    if (mapCanvasManager && mapCanvasManager._mouse_focus_widget)
        mapCanvasManager._mouse_focus_widget.click_handler(mouseEventObject);
    else {
        var click_point = new Point(mouseEventObject.clientX, mouseEventObject.clientY);
        clientManager.sendGoto(summVector(mapManager.getTopLeftCoords(mapManager.getZoom()),
                                          mulScalVector(click_point, Math.pow(2., (ConstMaxMapZoom - mapManager.getZoom())))));
    }
}

function onMouseMoveMap(mouseEventObject) {
    mapCanvasManager.set_mouse_look(true);
    mapCanvasManager._on_mouse_hover(mouseEventObject)
}

function onMouseOutMap(mouseEventObject){
    mapCanvasManager.set_mouse_look(false);
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
            if (!user.userCar) return;
            if (!pressedArrowLeft) {
                pressedArrowLeft = true;
                var turn = 0;
                if (pressedArrowLeft) turn++;
                if (pressedArrowRight) turn--;
                clientManager.sendTurn(turn);
            }
            break;
        case 38:
            if (!user.userCar) return;
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
            break;
        case 84:
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
            break;
        case 81:  // Q
            if (wFireController && wFireController.allFire)
                wFireController.allFire.click();
            break;
        case 90:  // Z
            break;
        case 49: // 1
        case 50: // 2
        case 51: // 3
        case 52: // 4
            if (! user.userCar) return;
            var key = event.keyCode - 48;
            clientManager.sendActivateQuickItem(key, user.userCar.ID);
            wFireController.signalQuickConsumerPanel(key);
            break;
        case 32:  // Space / Пробел
            clientManager.sendStopCar();
            break;
    }
}

function onKeyUpMap(event) {
    //console.log('onKeyUpMap');
    switch (event.keyCode) {
        case 37:
            if (! user.userCar) return;
            pressedArrowLeft = false;
            pressedArrowRight = false;
            var turn = 0;
            //if (pressedArrowLeft) turn++;
            //if (pressedArrowRight) turn--;
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
            pressedArrowLeft = false;
            pressedArrowRight = false;
            var turn = 0;
            //if (pressedArrowLeft) turn++;
            //if (pressedArrowRight) turn--;
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

function onMapWheel(event) {
    event = event || window.event;
    var delta = (event.deltaY || event.detail || event.wheelDelta) / 100.;
    if (Math.abs(delta) < 1) delta *= 33; // Для mozilla
    var zoom = mapManager.newZoomForCalcZoom - delta * 0.15;
    mapManager.setZoom(zoom);
}

function returnFocusToMap() {
    document.getElementById('map2div').focus();
}

var MapManager = (function(_super) {
    __extends(MapManager, _super);

    function MapManager() {
        _super.call(this);

        this.current_zoom = 18;

        this.inZoomChange = false;
        this.need_render = true;
        this.oldZoomForCalcZoom = 18;
        this.newZoomForCalcZoom = 18;

        this.last_render_time = 0;

        this.called_reinit_canvas_map = false;

        // добавление в визуалменеджер для своих виджетов (зум виджет например)
        this.addToVisualManager();

        // Виджеты карты: виджеты-синглеты, находятся на карте, хранятся здесь для быстрого доступа
        this.widget_target_point = null; // инициализируется при получении своей машинки
        this.widget_fire_radial_grid = null; // инициализируется при получении своей машинки
        this.widget_fire_sectors = null; // инициализируется при получении своей машинки
        this.zoomSlider = null; // инициализируется после карты

        this.strategy_mode_timer = null;

        resourceLoadManager.add(this);
    }

    MapManager.prototype._init = function () {
        ConstMinMapZoom = $('#settings_server_mode').text() == 'quick' ? 15 : ConstMinMapZoom;

        // Обработчики событий карты
        document.getElementById('map2div').onkeydown = onKeyDownMap;
        document.getElementById('map2div').onkeyup = onKeyUpMap;
        document.getElementById('map2div').onmouseup = onMouseUpMap;
        document.getElementById('map2div').onmousemove = onMouseMoveMap;
        document.getElementById('map2div').onmouseenter = onMouseMoveMap;
        document.getElementById('map2div').onmouseout = onMouseOutMap;
        document.getElementById('map2div').addEventListener("wheel", onMapWheel);

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

        var pos = {
            str: $('#settings_start_coord').text(),
            x: '',
            y: ''
        };
        pos.x = parseFloat(pos.str.split('_')[0]);
        pos.y = parseFloat(pos.str.split('_')[1]);
        // Подключение новой карты
        this.current_zoom = 18; // todo: cookieStorage.zoom?
        smap =  slippymap({
            div: "map2",
            zMin: ConstMinMapZoom,
            zMax: ConstMaxMapZoom,
            x: pos.x,
            y: pos.y,
            zoom: this.current_zoom,
            loadCompleteCB: this.removeFromLoader
        }).init();

        // Инициализация виджетов карты
        this.zoomSlider = new WZoomSlider(this);

        // Подписаться на изменение канваса
        function add_to_canvas_manager() {
            if (mapCanvasManager)
                mapCanvasManager.add_vobj(mapManager, 99);
            else
                setTimeout(add_to_canvas_manager, 0);
        }
        setTimeout(add_to_canvas_manager, 0);

        // Добавиться в загрузчик
        setTimeout(this.removeFromLoader, 20000);
    };

    MapManager.prototype.removeFromLoader = function () {
        //console.trace('MapManager.prototype.removeFromLoader');
        resourceLoadManager.del(mapManager);
    };

    MapManager.prototype.set_coord = function (options) {
        if (options.x !== undefined)
            smap.map.position.setX(options.x);
        if (options.y !== undefined)
            smap.map.position.setY(options.y);
        if (options.z !== undefined) {
            this.current_zoom = options.z;
            smap.map.position.setZ(options.z);
        }
        this.need_render = true;
    };

    MapManager.prototype.redraw = function(ctx, time, client_time) {
        // console.log(this.current_zoom, this.newZoomForCalcZoom);
        if (this.inZoomChange) {
            if (Math.abs(this.current_zoom - this.newZoomForCalcZoom) > 0.002) {
                var d_zoom = this.current_zoom - this.newZoomForCalcZoom;
                var dd_zoom = d_zoom * 0.1;
                this.current_zoom = this.current_zoom - dd_zoom;
                // this.current_zoom = parseFloat(this.current_zoom.toFixed(6))
            }
            else {
                this.current_zoom = this.newZoomForCalcZoom;
                this.onZoomEnd();
            }
            this.set_coord({z: this.current_zoom});
        }

        if (client_time - this.last_render_time > 2000) // Сделать перерисовку обязательно раз в 2 секунды
            this.need_render = true;

        if (this.need_render) {
            this.need_render = false;
            smap.renderer.refresh();
            this.last_render_time = client_time;
            this.zoomSlider.setZoom(this.current_zoom);
        }
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
        return ConstMinMapZoom;
    };

    MapManager.prototype.getZoom = function() {
        return this.current_zoom;
    };

    MapManager.prototype.setZoom = function(zoom) {
        //console.log('MapManager.prototype.setZoom', zoom, ConstMinMapZoom, ConstMaxMapZoom);
        if (zoom < ConstMinMapZoom) zoom = ConstMinMapZoom;
        if (zoom > ConstMaxMapZoom) zoom = ConstMaxMapZoom;
        if (zoom == this.getZoom()) return;

        this.oldZoomForCalcZoom = this.getZoom();
        this.newZoomForCalcZoom = zoom;
        this.onZoomStart();

        //    //if (this.zoomSlider)
    //    //    this.zoomSlider.setZoom(zoom);
    //    return;
    //
    //    if (zoom < 15) {
    //        // убрать сетку и сектора
    //        if (mapManager.widget_fire_radial_grid)
    //            mapManager.widget_fire_radial_grid.setVisible(false);
    //        if (mapManager.widget_fire_sectors)
    //            mapManager.widget_fire_sectors.setVisible(false);
    //
    //        // todo: сделать это не через таймер !!!
    //        if (! mapManager.strategy_mode_timer) {
    //            mapManager.strategy_mode_timer = setInterval(function () {
    //                clientManager.sendGetStrategyModeObjects();
    //            }, 5000);
    //        }
    //    }
    //    else {
    //        // показать сетку и сектора, если боевой режим
    //        if ((mapManager.widget_fire_radial_grid) && (wFireController))
    //            mapManager.widget_fire_radial_grid.setVisible(wFireController.visible);
    //        if ((mapManager.widget_fire_sectors) && (wFireController))
    //            mapManager.widget_fire_sectors.setVisible(wFireController.visible);
    //        if (mapManager.strategy_mode_timer) {
    //             clearInterval(mapManager.strategy_mode_timer);
    //             mapManager.strategy_mode_timer = null;
    //        }
    //    }
    };

    MapManager.prototype.onZoomStart = function () {
        this.inZoomChange = true;
        audioManager.play({name: 'zoom_01', gain: 0.1, priority: 0.5});
    };

    MapManager.prototype.onZoomEnd = function () {
        this.inZoomChange = false;
    };

    MapManager.prototype.on_new_map_size = function (width, height) {
        if (! this.called_reinit_canvas_map) {
            this.called_reinit_canvas = true;
            setTimeout(function() {
                smap.new_map_size(width, height); mapManager.called_reinit_canvas = false;
                if (mapCanvasManager) mapCanvasManager.on_new_map_size();
            }, 50);
        }

        this.zoomSlider._resize_view(width, height);
        if (wCruiseControl) wCruiseControl._resize_view();
    };

    return MapManager;
})(ClientObject);

var smap;
var mapManager = new MapManager();





