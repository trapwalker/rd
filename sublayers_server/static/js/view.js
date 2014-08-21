function redrawMap() {
    var tempPointMain;
    var tempAngleRad;

    // работа с юзеркаром
    if (user.userCar) {
        userCarMarker.draw(clock.getCurrentTime());
        // перерисовка всех контроллеров
        controllers.draw(userCarMarker.currentUserCarAngle, user.userCar);
    }

    // работа со списком машинок
    carMarkerList.draw(clock.getCurrentTime());

    // Перенос центра карты в центр маркера-спектракуса - выбранный маркер - по умолчанию - userCarMarker.marker
    if (!flagDebug)
        if (userCarMarker)
            myMap.panTo(userCarMarker.marker.getLatLng(), {animate: false});

}

//function onMouseClickMap(mouseEventObject) {
   // if(user.userCar)
   //     sendNewPoint(myMap.project(mouseEventObject.latlng, myMap.getMaxZoom()), user.userCar.ID);
//}



function onMouseDownMap(mouseEventObject){
    // Запомнить координаты начала нажатия и флаг нажатия = true
    myMap._mouseDowned = true;
    myMap.lastDownPoint = new Point(mouseEventObject.originalEvent.clientX, mouseEventObject.originalEvent.clientY);

    // Запустить setTimeout на появление меню. Если оно появилось, то myMap._mouseDown = false - обязательно!
    radialMenuTimeout = setTimeout(function(){
        radialMenu.showMenu(myMap.lastDownPoint, userCarMarker.currentUserCarAngle);
    }, 400);
}


function onMouseUpMap(mouseEventObject){
    // очистить тайм-аут, вне завивимости от того, было ли вызвано меню
    if(radialMenuTimeout)
        clearTimeout(radialMenuTimeout);

    // Если не вызывалось меню, то поехать в заданную точку
    if (radialMenu.isHide  && myMap._mouseDowned) {
        if (user.userCar)
            sendNewPoint(myMap.project(mouseEventObject.latlng, myMap.getMaxZoom()), user.userCar.ID);
    } else {
        // было вызвано меню, значит нужно обработать выход из меню и спрятать его
        radialMenu.hideMenu(true);
        userCarMarker.sectorsView.setSelectedToNormalState();
    }
    // фолсим флаг нажатия
    myMap._mouseDowned = false;
}


function onMouseMoveMap(mouseEventObject){
    var pointOfClick =  new Point(mouseEventObject.originalEvent.clientX, mouseEventObject.originalEvent.clientY);
    // Если флаг нажатия был установлен, то
    if(myMap._mouseDowned && radialMenu.isHide){ // Если кнопка нажата и меню не открыто, то проверить дистанцию и открыть меню
        if(distancePoints(myMap.lastDownPoint, pointOfClick) > 50){
            // т.к меню уже вызвано, то очистить тайм-аут на вызво меню
            if(radialMenuTimeout)
                clearTimeout(radialMenuTimeout);
            // Вызвать меню
            radialMenu.showMenu(myMap.lastDownPoint, userCarMarker.currentUserCarAngle);
        }
    }

    if(! radialMenu.isHide) { // Если меню уже открыто
        // определяем угол и подсвечиваем выбранный сектор
        var sectorUid = radialMenu.setActiveSector(angleVectorRadCCW(subVector(pointOfClick, myMap.lastDownPoint)));
        userCarMarker.sectorsView.setSelectedState({uid: sectorUid});
    }
}



function onMouseOutMap(){
    if(radialMenuTimeout)
        clearTimeout(radialMenuTimeout);
    // фолсим флаг нажатия
    myMap._mouseDowned = false;
    // если фокус ушёл с карты, то закрыть меню
    if (! radialMenu.isHide) {
        radialMenu.hideMenu(false);
        userCarMarker.sectorsView.setSelectedToNormalState();
    }
}


function onZoomStart(event) {
    clearInterval(timer);
}

function onZoomEnd(event) {
    timer = setInterval(redrawMap, timerDelay);
    if(controllers.isActive)  // чтобы при изменении зума карты  менялся и слайдер.
        controllers.zoomSetSlider.setZoom(myMap.getZoom());

    // если мы отдалились далеко, то скрыть все лейблы и показывать их только по наведению
    var noHide = myMap.getZoom() > levelZoomForVisible;
    for (var i in listMapObject.objects) {
        if (listMapObject.exist(i)) {
            listMapObject.objects[i].marker.setLabelNoHide(noHide);
/*
            if(noHide)
            // повесить клик на кнопочку инфо
                $('#idCar'+listMapObject.objects[i].ID).on('click', {car: listMapObject.objects[i]}, carInfoClickEvent);
            else
                $('#idCar'+listMapObject.objects[i].ID).off('click', carInfoClickEvent);
*/
        }
    }
}

function createTileLayer(storage) {
    if (storage) {
        tileLayerShow = new StorageTileLayer(mapBasePath, {
            maxZoom: 7,
            continuousWorld: true,
            opacity: 0.5,
            storage: storage});
    }
    else {
        tileLayerShow = L.tileLayer(mapBasePath, {
            continuousWorld: true,
            opacity: 0.5,
            maxZoom: 7});
    }
    tileLayerShow.addTo(myMap);
}

$(document).ready(function () {
    //Если есть файл map_base_local.js, то брать карту из локального каталога
    if (mapBasePathLocal != '') {mapBasePath = mapBasePathLocal};

    var storage = getIndexedDBStorage(createTileLayer) || getWebSqlStorage(createTileLayer) || createTileLayer(null);
    if (!storage) {
        alert('Storage not loading!');
    }

    // Загрузка Cookie
    cookieStorage = new LocalCookieStorage({zoom: 15, flagDebug: flagDebug, chatVisible: true, chatActiveID: -2});

    // инициализация и показ модальных окон
    modalWindow = new ModalWindow({
        parent: 'modalDiv',
        back: 'modalBack',
        modalWelcome: 'modalWelcome',
        modalOptions: 'modalOptions',
        modalDeath: 'modalDeath'
    });


    // Установка flagDebug из Cookie
    flagDebug = cookieStorage.flagDebug;

    // Инициализация.
    ModelInit();
    wsjson = new WSJSON();
    rpcCallList = new RPCCallList();

    myMap = L.map('map',
        {
            minZoom: 3,
            maxZoom: 7,
            zoomControl: false,
            attributionControl: false,
            keyboard: false,
            scrollWheelZoom: "center",
            dragging: flagDebug,
            doubleClickZoom: false
            //    maxBounds: ([
            //        [50.21, 35.42],
            //        [51.43, 39.44]
            //    ])
        }).setView([50.595, 36.59], cookieStorage.zoom);

    //myMap.on('click', onMouseClickMap);
    myMap.on('mousedown', onMouseDownMap);
    myMap.on('mouseup', onMouseUpMap);
    myMap.on('mousemove', onMouseMoveMap);
    myMap.on('mouseout', onMouseOutMap);
    myMap.on('zoomstart', onZoomStart);
    myMap.on('zoomend', onZoomEnd);


    // Включение/Выключение полноэранного режима
    buttonFullScreen.onclick = FullScreenToggle;

    // Включение/Выключение отображения карты
    buttonMapOnOffBtn.onclick = funcModalOptionsShow;

    // Кнопка Debug
    buttonDebugOnOff.onclick = DebugToggle;

    // Кнопка подключения к серверу (пока просто перезагружает страницу)
    buttonConnectServerBtn.onclick = ConnectServerToggle;


    // создание чата
    chat = new ViewMessenger({
            parentDiv: 'chatArea',
            height: 550,
            width: 400});
    chat.addChat(0, 'broadcast');
    chat.addChat(-1, 'log-push');
    chat.addChat(-3, 'log-answer');
    chat.addChat(-4, 'log-rpc');
    chat.addChat(-2, 'system');
    chat.setActiveChat(cookieStorage.chatActiveID);
    chat.setVisible(cookieStorage.chatVisible);
    chat.setMessagesHistory(cookieStorage.historyArray);




    carMarkerList = new CarMarkerList({_map: myMap});


    // Запуск тамера
    timer = setInterval(redrawMap, timerDelay);


    window.onbeforeunload = function (e) {
        cookieStorage.save();
    };


    //alert(window.location);


    modalWindow.modalWelcomeShow();


    // показать ещё раз!
    //setTimeout(function(){
    //    modalWindow.modalWelcomeShow();
    //},10000)


});

//Переключение в полноэкранный режим и обратно по кнопке
function FullScreenToggle() {
    var html = document.documentElement;
    var jSelector = $('#buttonFullScreen');

    if (RunPrefixMethod(document, "FullScreen") || RunPrefixMethod(document, "IsFullScreen")) {
        RunPrefixMethod(document, "CancelFullScreen");
        jSelector.removeClass('buttonFullScreenOff');
        jSelector.addClass('buttonFullScreenOn');
    }
    else {
        RunPrefixMethod(html, "RequestFullScreen");
        jSelector.removeClass('buttonFullScreenOn');
        jSelector.addClass('buttonFullScreenOff');
    }
}


function funcModalOptionsShow(){
    modalWindow.modalOptionsShow();
}

function TileLayerToggle(){
    var jSelector = $('#buttonMapOnOffStatus');
    if(myMap.hasLayer(tileLayerShow)){
        myMap.removeLayer(tileLayerShow);
        jSelector.removeClass('buttonMapOnOffStatusOn');
        jSelector.addClass('buttonMapOnOffStatusOff');
    }
    else {
        tileLayerShow.addTo(myMap);
        jSelector.removeClass('buttonMapOnOffStatusOff');
        jSelector.addClass('buttonMapOnOffStatusOn');
    }
}

function TileLaterSet() {
    if (cookieStorage.optionsMapTileVisible) {
        // Если нужно отображать
        if (!myMap.hasLayer(tileLayerShow))tileLayerShow.addTo(myMap);
    }
    else {
        if (myMap.hasLayer(tileLayerShow))myMap.removeLayer(tileLayerShow);
    }
}


function DebugToggle(){
    if(flagDebug){
        // Выключить всю Debug информацию
        flagDebug=false;
        // Очистиить debugMapList и удалить всё с карты
        for(;debugMapList.length;)
            myMap.removeLayer(debugMapList.pop());
        // Включить dragging
        myMap.dragging.disable();

    }
    else {
        // Включить всю Debug информацию
        flagDebug = true;
        // Выключить dragging
        myMap.dragging.enable();


    }
}

//Подключение к серверу (пока просто перезагрузка страницы)
function ConnectServerToggle() {
    location.reload();
}

//Подстановка префиксов к методам для работы полноэкранного режима в различных браузерах
function RunPrefixMethod(obj, method) {
    var p = 0, m, t;
    while (p < pfx.length && !obj[m]) {
        m = method;
        if (pfx[p] == "") {
            m = m.substr(0, 1).toLowerCase() + m.substr(1);
        }
        m = pfx[p] + m;
        t = typeof obj[m];
        if (t) {
            pfx = [pfx[p]];
            return (t == "function" ? obj[m]() : obj[m]);
        }
        p++;
    }

}

var myMap;
var chat;
var userCarMarker;
var wsjson;
var rpcCallList;
var tileLayerShow;
var controllers;
var flagDebug = false;
var debugMapList = [];
var carMarkerList;
var cookieStorage;

// Массив иконок
var iconsLeaflet;


var timerDelay = 20; //константа задающая временной интервал таймера (юзать по всему проекту только это)
var user;
var clock;
var timer;
var listMapObject;
var ownerList;

var levelZoomForVisible = 5;
var levelZoomForVisibleTail = 8;

// радиальноe меню
var radialMenu;
var radialMenuTimeout;

// модальное окно
var modalWindow;




//Путь к карте на сервере
var mapBasePath = 'http://sublayers.net:88/static/map/{z}/{x}/{y}.jpg';

//Путь к карте в локальном каталоге
var mapBasePathLocal = '';

//Префиксы для подстановки к методам для работы полноэкранного режима в различных браузерах
var pfx = ["webkit", "moz", "ms", "o", ""];
