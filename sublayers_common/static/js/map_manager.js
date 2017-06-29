/*
* Синглтон для работы с картой
* В данный модуль писать все методы и функции для работы с картой
*/

// Максимальный и минимальный зумы карты
var ConstMaxMapZoom = 18;
var ConstMinMapZoom = 10.01;
var ConstDurationAnimation = 500;
var last_right_click_on_map = {x: 12517154, y:27028830};

function onMouseUpMap(mouseEventObject) {
    if (mapCanvasManager && mapCanvasManager._mouse_focus_widget)
        mapCanvasManager._mouse_focus_widget.click_handler(mouseEventObject);
    else {
        var click_point = new Point(mouseEventObject.clientX, mouseEventObject.clientY);
        clientManager.sendGoto(summVector(mapManager.getTopLeftCoords(mapManager.getZoom()),
                                          mulScalVector(click_point, mapManager.getZoomKoeff())));
    }
}

function onMouseMoveMap(mouseEventObject) {
    mapCanvasManager.set_mouse_look(true);
    mapCanvasManager._on_mouse_hover(mouseEventObject)
}

function onMouseOutMap(mouseEventObject){
    mapCanvasManager.set_mouse_look(false);
}

function onMapWheel(event) {
    event = event || window.event;
    var delta = (event.deltaY || event.detail || event.wheelDelta) / 100.;
    if (Math.abs(delta) < 1) delta *= 33; // Для mozilla
    var zoom = mapManager.newZoomForCalcZoom - delta * mapManager.zoom_wheel_step;
    mapManager.setZoom(zoom);
}

function returnFocusToMap() {
    document.getElementById('map2div').focus();
}

var MapManager = (function(_super) {
    __extends(MapManager, _super);

    function MapManager() {
        _super.call(this);

        this.zoom_wheel_step = settingsManager.options.zoom_step_value.value;

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
        ConstMinMapZoom = $('#settings_server_mode').text() == 'quick' ? 15.01 : ConstMinMapZoom;

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
        this.current_zoom = settingsManager.options.save_current_zoom.value == 1 ? (settingsManager.getCookie("current_zoom") || 18) : ConstMaxMapZoom;
        this.current_zoom = Math.max(ConstMinMapZoom, Math.min(ConstMaxMapZoom, this.current_zoom));
        this.newZoomForCalcZoom = this.oldZoomForCalcZoom = this.current_zoom;
        smap =  slippymap({
            div: "map2",
            zMin: ConstMinMapZoom,
            zMax: ConstMaxMapZoom,
            preload_pyramid_lvl: settingsManager.options.map_tile_preload.value,
            x: pos.x,
            y: pos.y,
            zoom: this.current_zoom,
            loadCompleteCB: this.removeFromLoader
        }).init();

        //this.set_layer_visibility("tiles", settingsManager.options.map_tile_draw.value == 1);
        this.set_tileprovider_visibility("back", settingsManager.options.map_tile_draw_back.value == "back");
        this.set_tileprovider_visibility("front", settingsManager.options.map_tile_draw_back.value == "front");
        this.set_tileprovider_visibility("merged", settingsManager.options.map_tile_draw_back.value == "merged");

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

    MapManager.prototype.set_layer_visibility = function(layer_name, visibility) {
        var layer = null;
        for (var i=0; i < smap.renderer.layers.length; i++)
            if (smap.renderer.layers[i].id == layer_name)
                layer = smap.renderer.layers[i];
        if (layer && layer.visibility != visibility) layer.visibility = visibility;
    };

    MapManager.prototype.set_tileprovider_visibility = function(prov_name, visibility) {
        smap.set_visible_tileprovider(prov_name, visibility);
    };

    MapManager.prototype.set_pyramid_size = function(value) {
        if (value >= 8) value = this.getMaxZoom() - mapManager.getMinZoom();
        smap.map.preload_pyramid_lvl = value;
    };

    MapManager.prototype.getTopLeftCoords = function(zoom) {
        var c = this.getMapCenter();
        var map_size = mulScalVector(this.getMapSize(), 0.5);
        return subVector(c, mulScalVector(map_size, this.getZoomKoeff()));
        // Старый вариант - рабочий, но немного расходится с картой
        //return subVector(c, mulScalVector(map_size, Math.pow(2., (ConstMaxMapZoom - zoom))));
    };

    MapManager.prototype.getMouseCoords = function() {
        return summVector(this.getTopLeftCoords(this.getZoom()), mulScalVector(mapCanvasManager._mouse_client, this.getZoomKoeff()));
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

    MapManager.prototype.setZoom = function(zoom, need) {
        //console.log('MapManager.prototype.setZoom', zoom, ConstMinMapZoom, ConstMaxMapZoom);
        if (zoom < ConstMinMapZoom) zoom = ConstMinMapZoom;
        if (zoom > ConstMaxMapZoom) zoom = ConstMaxMapZoom;
        if ((zoom == this.getZoom()) && !need) return;

        this.oldZoomForCalcZoom = this.getZoom();
        this.newZoomForCalcZoom = zoom;
        this.onZoomStart();
        if (zoom < 15) {
            // убрать сетку и сектора
            if (mapManager.widget_fire_radial_grid)
                mapManager.widget_fire_radial_grid.setVisible(false);
            if (mapManager.widget_fire_sectors)
                mapManager.widget_fire_sectors.setVisible(false);
            if (!mapManager.strategy_mode_timer) {
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
    };

    MapManager.prototype.onZoomStart = function () {
        this.inZoomChange = true;
        audioManager.play({name: 'zoom_01', gain: 0.1 * audioManager._settings_interface_gain, priority: 0.5});
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
        if (wAltmetrControl) wAltmetrControl._resize_view();
        if (wHPControl) wHPControl._resize_view();
        if (wFuelControl) wFuelControl._resize_view();
        if (wRadiationControl) wRadiationControl._resize_view();
        if (wWindControl) wWindControl._resize_view();
    };

    MapManager.prototype.getZoomKoeff = function() {
        return smap.map.viewport().outher_zoom_koeff;
        // Старый вариант - рабочий, но немного расходится с картой
        // return Math.pow(2., (ConstMaxMapZoom - this.getZoom()));
    };

    return MapManager;
})(ClientObject);

var smap;
var mapManager = new MapManager();





