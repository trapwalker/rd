/*
* Синглтон для работы с картой
* В данный модуль писать все методы и функции для работы с картой
*/

//Максимальный и минимальный зумы карты
var ConstMaxMapZoom = 18;
var ConstMinMapZoom = 10;
var ConstDurationAnimation = 500;

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
    chat.addMessageToSys(map.project(mouseEventObject.latlng, myMap.getMaxZoom()));
    console.log(map.project(mouseEventObject.latlng, myMap.getMaxZoom()))
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
                clientManager.sendTurn(1);
                pressedArrowLeft = true;
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
                clientManager.sendTurn(-1);
                pressedArrowRight = true;
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
            if (crazy_timer){
                clearInterval(crazy_timer);
                crazy_timer = null;
            }
            else{
                crazy_timer = setInterval(sendRandGoTo, 100);
            }
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
            break;
        case 90:  // Z
            //console.log('Was pressed: Z');
            break;
        case 49:  // 1
            //console.log('Was pressed: 1');
            clientManager.sendSlowMine();
            break;
        case 50:  // 2
            //console.log('Was pressed: 2');
            clientManager.sendStationaryTurret();
            break;
        case 51:  // 3
            //console.log('Was pressed: 3');
            break;
        case 52:  // 4
            //console.log('Was pressed: 4');
            break;

        //LM=77 N O=79 P=80   Q=81
    }
}

function onKeyUpMap(event) {
    //console.log('onKeyUpMap');
    switch (event.keyCode) {
        case 37:
            clientManager.sendTurn(0);
            pressedArrowLeft = false;
            break;
        case 38:
            clientManager.sendSetSpeed(user.userCar.getCurrentSpeed(clock.getCurrentTime()));
            if (wCruiseControl) wCruiseControl.stopKeyboardControl();
            pressedArrowUp = false;
            break;
        case 39:
            clientManager.sendTurn(0);
            pressedArrowRight = false;
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
            }).setView([50.595, 36.59], cookieStorage.zoom);

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
                if (ui.draggable.hasClass('mainCarInfoWindow-body-trunk-body-right-item'))
                    clientManager.sendItemActionInventory(ui.draggable.data('owner_id'), ui.draggable.data('pos'),
                                                          null, null);
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
                errorTileUrl: 'http://sublayers.net/map/404.jpg',
                storage: storage});
        }
        else {
            mapManager.tileLayer = L.tileLayer(this.tileLayerPath, {
                continuousWorld: true,
                opacity: 1.0,
                errorTileUrl: 'http://sublayers.net/map/404.jpg',
                maxZoom: ConstMaxMapZoom});
        }
        if(cookieStorage.optionsMapTileVisible)
            mapManager.tileLayer.addTo(map);
        return true;
    };

    // =============================== Zoom

    MapManager.prototype.getZoom = function(){
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
            }
            else {
                // показать сетку и сектора, если боевой режим
                if ((mapManager.widget_fire_radial_grid) && (wFireController))
                    mapManager.widget_fire_radial_grid.setVisible(wFireController.visible);
                if ((mapManager.widget_fire_sectors) && (wFireController))
                    mapManager.widget_fire_sectors.setVisible(wFireController.visible);
            }
        }
    };

    MapManager.prototype.onZoomStart = function (event) {
        //console.log('MapManager.prototype.onZoomStart');
        mapManager.inZoomChange = true;
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





