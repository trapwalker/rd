/*
* Синглтон для работы с картой
* В данный модуль писать все методы и функции для работы с картой
*/

//Максимальный и минимальный зумы карты
var ConstMaxMapZoom = 18;
var ConstMinMapZoom = 10;
var ConstDurationAnimation = 500;
var last_right_click_on_map = {x: 12517154, y:27028830};

function onMouseDownMap(mouseEventObject){
    // Запомнить координаты начала нажатия и флаг нажатия = true
    map._mouseDowned = true;
    map.lastDownPoint = new Point(mouseEventObject.originalEvent.clientX, mouseEventObject.originalEvent.clientY);
}

function onMouseUpMap(mouseEventObject) {
    clientManager.sendGoto(map.project(mouseEventObject.latlng, myMap.getMaxZoom()));
    map._mouseDowned = false;
}

function onMouseDblClick(mouseEventObject) {
    clientManager.sendScoutDroid(map.project(mouseEventObject.latlng, myMap.getMaxZoom()));
    //console.log(map.project(mouseEventObject.latlng, myMap.getMaxZoom()))
}

function onMouseRightClick(mouseEventObject) {
    var p = map.project(mouseEventObject.latlng, myMap.getMaxZoom());
    last_right_click_on_map = p;
    chat.addMessageToSys(p);
    console.log(p);

    if (map.dragging._enabled)
        clientManager.sendTileCoord(p.x, p.y);
}

function onMouseMoveMap(mouseEventObject) {
    /*
     var pointOfClick = new Point(mouseEventObject.originalEvent.clientX, mouseEventObject.originalEvent.clientY);
     // Если флаг нажатия был установлен, то
     if (myMap._mouseDowned && radialMenu.isHide) { // Если кнопка нажата и меню не открыто, то проверить дистанцию и открыть меню
     if (distancePoints(myMap.lastDownPoint, pointOfClick) > 50) {
     // т.к меню уже вызвано, то очистить тайм-аут на вызво меню
     if (radialMenuTimeout)
     clearTimeout(radialMenuTimeout);
     // Вызвать меню

     if (cookieStorage.enableRadialMenu())
     radialMenu.showMenu(myMap.lastDownPoint, userCarMarker.currentUserCarAngle);
     }
     }

     if(! radialMenu.isHide) { // Если меню уже открыто
     // определяем угол и подсвечиваем выбранный сектор
     var sectorUid = radialMenu.setActiveSector(angleVectorRadCCW(subVector(pointOfClick, myMap.lastDownPoint)));
     if(sectorUid != null)
     userCarMarker.sectorsView.setSelectedState({uid: sectorUid});
     }
     */
}

function onMouseOutMap(){
    /*
    if(radialMenuTimeout)
        clearTimeout(radialMenuTimeout);
    // фолсим флаг нажатия
    myMap._mouseDowned = false;
    // если фокус ушёл с карты, то закрыть меню
    if (! radialMenu.isHide) {
        radialMenu.hideMenu(false);
        userCarMarker.sectorsView.setSelectedToNormalState();
    }
    */
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
        case 37:
            if (!pressedArrowLeft) {
                pressedArrowLeft = true;
                var turn = 0;
                if (pressedArrowLeft) turn++;
                if (pressedArrowRight) turn--;
                clientManager.sendTurn(turn);
            }
            break;
        case 38:
            if (!pressedArrowUp) {
                clientManager.sendSetSpeed(user.userCar.v_forward);
                if (wCruiseControl) wCruiseControl.startKeyboardControl();
                pressedArrowUp = true;
            }
            break;
        case 39:
            if (!pressedArrowRight) {
                pressedArrowRight = true;
                var turn = 0;
                if (pressedArrowLeft) turn++;
                if (pressedArrowRight) turn--;
                clientManager.sendTurn(turn);
            }
            break;
        case 40:
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
            /*
            clientManager.sendFireAutoEnable('front', false);
            clientManager.sendFireAutoEnable('back', false);
            clientManager.sendFireAutoEnable('right', false);
            clientManager.sendFireAutoEnable('left', false);
            */
            break;
        case 77:  // M
            if (map.dragging._enabled)
                map.dragging.disable();
            else
                map.dragging.enable();
            mapCanvasManager.on_new_map_size();
            break;
        case 90:  // Z
            //console.log('Was pressed: Z');
            break;
        case 49:  // 1
            clientManager.sendActivateQuickItem(1, user.userCar.ID);
            break;
        case 50:  // 2
            clientManager.sendActivateQuickItem(2, user.userCar.ID);
            break;
        case 51:  // 3
            clientManager.sendActivateQuickItem(3, user.userCar.ID);
            break;
        case 52:  // 4
            clientManager.sendActivateQuickItem(4, user.userCar.ID);
            break;
        //LM=77 N O=79 P=80   Q=81
    }
}

function onKeyUpMap(event) {
    //console.log('onKeyUpMap');
    switch (event.keyCode) {
        case 37:
            pressedArrowLeft = false;
            var turn = 0;
            if (pressedArrowLeft) turn++;
            if (pressedArrowRight) turn--;
            clientManager.sendTurn(turn);
            break;
        case 38:
            clientManager.sendSetSpeed(user.userCar.getCurrentSpeed(clock.getCurrentTime()));
            if (wCruiseControl) wCruiseControl.stopKeyboardControl();
            pressedArrowUp = false;
            break;
        case 39:
            pressedArrowRight = false;
            var turn = 0;
            if (pressedArrowLeft) turn++;
            if (pressedArrowRight) turn--;
            clientManager.sendTurn(turn);
            break;
        case 40:
            clientManager.sendSetSpeed(user.userCar.getCurrentSpeed(clock.getCurrentTime()));
            if (wCruiseControl) wCruiseControl.stopKeyboardControl();
            pressedArrowDown = false;
            break;
    }
}

function TileLaterSet() {
    if (cookieStorage.optionsMapTileVisible) {  // Если нужно отображать
        if (!map.hasLayer(mapManager.tileLayer))
            mapManager.tileLayer.addTo(myMap);
    }
    else if (map.hasLayer(mapManager.tileLayer))
        map.removeLayer(mapManager.tileLayer);
}

var MapManager = (function(_super){
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

        map = L.map('map',
            {
                minZoom: ConstMinMapZoom,
                maxZoom: ConstMaxMapZoom,
                zoomControl: false,
                attributionControl: false,
                scrollWheelZoom: "center",
                dragging: false,
                zoomAnimationThreshold: 8,
                doubleClickZoom: false
            }).setView([32.93523932687671, -113.0391401052475], cookieStorage.zoom);

        myMap = map;
        this.anim_zoom = map.getZoom();

        //var storage = getWebSqlStorage('createTileLayer', this)
        //     || getIndexedDBStorage('createTileLayer', this);
        //if (!storage) {
        //    alert('Storage not loading!');
            this.createTileLayer(null);
        //}

        // Обработчики событий карты
        pressedKey = false;
        map.on('click', onMouseUpMap);
        //map.on('mousedown', onMouseDownMap);
        //map.on('mouseup', onMouseUpMap);
        map.on('contextmenu', onMouseRightClick);
        map.on('mousemove', onMouseMoveMap);
        map.on('mouseout', onMouseOutMap);
        map.on('zoomstart', this.onZoomStart);
        map.on('zoomend', this.onZoomEnd);
        map.on('zoomanim', this.onZoomAnimation);

        document.getElementById('map').onkeydown = onKeyDownMap;
        document.getElementById('map').onkeyup = onKeyUpMap;
        map.keyboard.disable();

        // Инициализация виджетов карты
        this.zoomSlider = new WZoomSlider(this);

        // Отображение квадрата всей карты
        // todo: если такое оставлять, то оно ЖУТКО лагает!!! ЖУТКО!!! Косяк лиафлета
        //var bounds = [[33.303547, -113.850131], [31.791908, -112.062069]];
        //L.rectangle(bounds, {color: "red", weight: 5, fill: false}).addTo(map);


        // Рисовалка на канвасе
        var canvasTiles = L.tileLayer.canvas();
        canvasTiles.drawTile = function (canvas, tilePoint, zoom) {
            var ctx = canvas.getContext('2d');
            //ctx.fillText(tilePoint.toString(), 50, 50);
            ctx.globalAlpha = 1;
            var l = 0, s = 255;
            //ctx.fillStyle = 'transparent';
            ctx.strokeStyle = "rgba(42, 253, 10, 0.15)";
            ctx.strokeRect(0, 0, 255, 0);
            ctx.strokeRect(255, 0, 255, 255);
        };
        canvasTiles.addTo(myMap);

        /*
            Карта является глобальным droppabl'ом в качестве мусорки
            P.S.
            Тут дропабл вешается именно на бодидив, а не на мап, т.к. мап и например окно инвентаря лежат в разных
            ветках дом-дерева и запрет делегирования дропа не отрабатывает корректно (одновременно отрабатывает и дроп
            на карту и дроп в ячейку инвентаря)
        */
        var mapDiv = $('#bodydiv');
        mapDiv.droppable({
            greedy: true,
            drop: function(event, ui) {
                // Эта проверка нужна так как таскание окон также порождает событие дропа
                if (ui.draggable.hasClass('mainCarInfoWindow-body-trunk-body-right-item')) {
                    modalWindow.modalDialogAnswerShow({
                        caption: 'Inventory Operation',
                        header: 'Выкинуть?!',
                        body_text: 'Вы уверены, что хотите выкинуть данный предмет на карту?',
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

    };

    MapManager.prototype.createTileLayer = function(storage) {
        //console.log('MapManager.prototype.createTileLayer', storage);
        if (storage) {
            mapManager.tileLayer = new StorageTileLayer(this.tileLayerPath, {
                maxZoom: ConstMaxMapZoom,
                continuousWorld: true,
                opacity: 1.0,
                errorTileUrl: '/static/img/map_404.jpg',
                storage: storage});
        }
        else {
            mapManager.tileLayer = L.tileLayer(this.tileLayerPath, {
                continuousWorld: true,
                opacity: 1.0,
                errorTileUrl: '/static/img/map_404.jpg',
                maxZoom: ConstMaxMapZoom});
        }
        if(cookieStorage.optionsMapTileVisible)
            mapManager.tileLayer.addTo(map);
        return true;
    };


    // =============================== Map Coords

    MapManager.prototype.getMapCenter = function () {
        var c = map.project(map.getCenter(), map.getMaxZoom());
        return new Point(c.x, c.y);
    };

    MapManager.prototype.getMapSize = function() {
        var s = map.getSize();
        return new Point(s.x, s.y);
    };

    MapManager.prototype.getTopLeftCoords = function(zoom) {
        var c = this.getMapCenter();
        var map_size = mulScalVector(this.getMapSize(), 0.5);
        var koeff = Math.pow(2., (ConstMaxMapZoom - zoom));
        return subVector(c, mulScalVector(map_size, koeff));
    };

    // =============================== Zoom


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
            return map.getZoom();
    };

    MapManager.prototype.setZoom = function(zoom) {
        //console.log('MapManager.prototype.setZoom');
        if(zoom == map.getZoom()) return;
        map.setZoom(zoom);
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
        mapManager.inZoomChange = true;
        mapManager.oldZoomForCalcZoom = map.getZoom();
        mapManager.startZoomChangeTime = clock.getCurrentTime();
    };

    MapManager.prototype.onZoomEnd = function (event) {
        //console.log('MapManager.prototype.onZoomEnd');
        mapManager.inZoomChange = false;
        visualManager.changeModelObject(mapManager);
    };

    return MapManager;
})(ClientObject);

var map;
var mapManager = new MapManager();





