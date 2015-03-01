/*
* Синглтон для работы с картой
* В данный модуль писать все методы и функции для работы с картой
*/


//Путь к карте на сервере
//var ConstMapPath = 'http://sublayers.net:88/static/map/{z}/{x}/{y}.jpg';
var ConstMapPath = 'http://sublayers.net/map/{z}/{x}/{y}.jpg';
//var ConstMapPath = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';

//Путь к карте в локальном каталоге
var ConstMapPathLocal = '';

//Максимальный и минимальный зумы карты
var ConstMaxMapZoom = 18;
var ConstMinMapZoom = 8;


function onMouseDownMap(mouseEventObject){
    // Запомнить координаты начала нажатия и флаг нажатия = true
    map._mouseDowned = true;
    map.lastDownPoint = new Point(mouseEventObject.originalEvent.clientX, mouseEventObject.originalEvent.clientY);

    // Запустить setTimeout на появление меню. Если оно появилось, то myMap._mouseDown = false - обязательно!
    //radialMenuTimeout = setTimeout(function () {
    //if (cookieStorage.enableRadialMenu())
    //         radialMenu.showMenu(myMap.lastDownPoint, userCarMarker.currentUserCarAngle);
    // }, 400);
}

function onMouseUpMap(mouseEventObject) {
    //alert('onMouseUpMap');
    // очистить тайм-аут, вне завивимости от того, было ли вызвано меню
    //if (radialMenuTimeout)
    //    clearTimeout(radialMenuTimeout);

    // Если не вызывалось меню, то поехать в заданную точку
    //if (radialMenu.isHide && myMap._mouseDowned) {
    //    if (user.userCar)
        //clientManager.sendGoto(myMap.project(mouseEventObject.latlng, myMap.getMaxZoom()), controllers.speedSetSlider.getSpeed());
            clientManager.sendGoto(map.project(mouseEventObject.latlng, myMap.getMaxZoom()));
    //console.log(myMap.project(mouseEventObject.latlng, myMap.getMaxZoom()));

    //} else {
        // было вызвано меню, значит нужно обработать выход из меню и спрятать его
        //radialMenu.hideMenu(true);
        //userCarMarker.sectorsView.setSelectedToNormalState();
    //}
    // фолсим флаг нажатия
    map._mouseDowned = false;
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
                clientManager.sendSetSpeed(user.userCar.maxSpeed);
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
                clientManager.sendStopCar();
                pressedArrowDown = true;
            }
            break;
        case 32:
            //clientManager.sendRocket();
            //new Bang(user.userCar.getCurrentCoord(clock.getCurrentTime())).start();
            var coord = user.userCar.getCurrentCoord(clock.getCurrentTime());
            for(var i = 0; i < 50; i++){
                var r_x = Math.random() * 100 - 50.;
                var r_y = Math.random() * 100 - 50.;
                //var r = Math.random() * 6;
                var r = 4;
                var delay = Math.random() * 10; // задержка в секндах
                var flash = new EFlashLight(new Point(coord.x + r_x, coord.y + r_y), r);
                timeManager.addTimeoutEvent(flash, 'start', delay * 1000);
            }
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
            clientManager.sendFireAutoEnable('front', true);
            clientManager.sendFireAutoEnable('back', true);
            clientManager.sendFireAutoEnable('right', true);
            clientManager.sendFireAutoEnable('left', true);
            break;
        case 81:  // Q
            clientManager.sendFireAutoEnable('front', false);
            clientManager.sendFireAutoEnable('back', false);
            clientManager.sendFireAutoEnable('right', false);
            clientManager.sendFireAutoEnable('left', false);
            break;
        case 90:  // Z
            //clientManager.Die();
            console.log('ZZZZZZZZZZZZZZZ');


            break;

        case 49:  // 1
            console.log('111111111111');
            if(map.getZoom() < ConstMaxMapZoom){
                var zoom = map.getZoom() + 1;
                setTimeout(function(){mapManager.widget_fire_radial_grid.setZoom(zoom)}, 0);
                setTimeout(function(){mapManager.widget_fire_sectors.setZoom(zoom)}, 0);
                setTimeout(function(){map.setZoom(zoom)}, 0);
            }

            break;

        case 50:  // 2
            console.log('22222222222');
            if(map.getZoom() > ConstMinMapZoom){
                var zoom = map.getZoom() - 1;
                setTimeout(function(){mapManager.widget_fire_radial_grid.setZoom(zoom)}, 0);
                setTimeout(function(){mapManager.widget_fire_sectors.setZoom(zoom)}, 0);
                setTimeout(function(){map.setZoom(zoom)}, 0);
            }

            break;

        case 51:  // 3
            console.log('3333333333');
            if(map.getZoom() < ConstMaxMapZoom - 1){
                var zoom = map.getZoom() + 2;
                setTimeout(function(){mapManager.widget_fire_radial_grid.setZoom(zoom)}, 0);
                setTimeout(function(){mapManager.widget_fire_sectors.setZoom(zoom)}, 0);
                setTimeout(function(){map.setZoom(zoom)}, 0);
            }

            break;

        case 52:  // 4
            console.log('4444444444');
            if(map.getZoom() > ConstMinMapZoom + 1){
                var zoom = map.getZoom() - 2;
                setTimeout(function(){mapManager.widget_fire_radial_grid.setZoom(zoom)}, 0);
                setTimeout(function(){mapManager.widget_fire_sectors.setZoom(zoom)}, 0);
                setTimeout(function(){map.setZoom(zoom)}, 0);
            }

            break;
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
            pressedArrowUp = false;
            break;
        case 39:
            clientManager.sendTurn(0);
            pressedArrowRight = false;
            break;
        case 40:
            clientManager.sendSetSpeed(user.userCar.getCurrentSpeed(clock.getCurrentTime()));
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

        this.tileLayerPath = '';
        this.tileLayer = null;

        // добавление в визуалменеджер для своих виджетов (зум виджет например)
        this.addToVisualManager();
        //this._init();

        // Виджеты карты: виджеты-синглеты, находятся на карте, хранятся здесь для быстрого доступа
        this.widget_target_point = null; // инициализируется при получении своей машинки
        this.widget_fire_radial_grid = null; // инициализируется при получении своей машинки
        this.widget_fire_sectors = null; // инициализируется при получении своей машинки
    }

    MapManager.prototype._init = function () {
        //Если есть файл map_base_local.js, то брать карту из локального каталога
        if (ConstMapPathLocal === '') this.tileLayerPath = ConstMapPath;
        else this.tileLayerPath = ConstMapPathLocal;


        map = L.map('map',
            {
                minZoom: ConstMinMapZoom,
                maxZoom: ConstMaxMapZoom,
                zoomControl: false,
                attributionControl: false,
                scrollWheelZoom: "center",
                dragging: false,
                doubleClickZoom: false
            //}).setView([50.595, 36.59], cookieStorage.zoom);
            }).setView([50.595, 36.59], 18);

        myMap = map;

        var cbForStorage =  this.createTileLayer;

        //var storage = getIndexedDBStorage(cbForStorage) || getWebSqlStorage(cbForStorage);
        //var storage = getIndexedDBStorage(cbForStorage) || getWebSqlStorage(cbForStorage) || this.createTileLayer(null);
        //if (!storage) console.log('Storage not loading!');

        //var storage = null;
        this.createTileLayer(null);


        // Обработчики событий карты
        pressedKey = false;
        map.on('click', onMouseUpMap);
        //map.on('mousedown', onMouseDownMap);
        //map.on('mouseup', onMouseUpMap);
        map.on('mousemove', onMouseMoveMap);
        map.on('mouseout', onMouseOutMap);
        map.on('zoomstart', this.onZoomStart);
        map.on('zoomend', this.onZoomEnd);
        document.getElementById('map').onkeydown = onKeyDownMap;
        document.getElementById('map').onkeyup = onKeyUpMap;
        map.keyboard.disable();

        // Bнициализация виджетов карты
        new WZoomSlider(this);


        // Отображение квадрата всей карты
        // todo: если такое оставлять, то оно ЖУТКО лагает!!! ЖУТКО!!! Косяк лиафлета
        //var bounds = [[33.303547, -113.850131], [31.791908, -112.062069]];
        //L.rectangle(bounds, {color: "red", weight: 5, fill: false}).addTo(map);
    };

    MapManager.prototype.createTileLayer = function(storage) {
        //console.log('MapManager.prototype.createTileLayer');
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
    };

    // =============================== Zoom

    MapManager.prototype.getZoom = function(){
        return map.getZoom();
    };

    MapManager.prototype.setZoom = function(zoom) {
        //console.log('MapManager.prototype.setZoom');
        map.setZoom(zoom);
    };

    MapManager.prototype.onZoomEnd = function(event) {
        // Не знает про this !
        timeManager.timerStart();
        visualManager.changeModelObject(mapManager);
        //if (controllers.isActive)  // чтобы при изменении зума карты  менялся и слайдер.
        //    controllers.zoomSetSlider.setZoom(myMap.getZoom());
        /*
         // если мы отдалились далеко, то скрыть все лейблы и показывать их только по наведению
        var noHide = cookieStorage.visibleLabel();
        for (var i in listMapObject.objects) {
            if (listMapObject.exist(i)) {
                listMapObject.objects[i].marker.setLabelNoHide(noHide);
            }
        }
         // Изменение радиуса круга обзора
         //userCarMarker.setNewZoom();
         */

        //сектора на сетке появляются с новым зумом
        if (mapManager.widget_fire_sectors)
            mapManager.widget_fire_sectors.zoomEnd(event);
    };

    MapManager.prototype.onZoomStart = function(event) {
        //console.log('MapManager.prototype.onZoomStart', event);
        timeManager.timerStop();

        //сектора на сетке исчезают
        if (mapManager.widget_fire_sectors)
            mapManager.widget_fire_sectors.zoomStart(event);

    };






    return MapManager;
})(ClientObject);

var map;
var mapManager = new MapManager();





