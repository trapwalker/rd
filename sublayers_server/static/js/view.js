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
    if(! cookieStorage.optionsDraggingMap) // Если нельзя таскать карту, то переносить. А можно таскать только когда машинка мертва
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
    radialMenuTimeout = setTimeout(function () {
        if (cookieStorage.enableRadialMenu())
            radialMenu.showMenu(myMap.lastDownPoint, userCarMarker.currentUserCarAngle);
    }, 400);
}


function onMouseUpMap(mouseEventObject) {
    // очистить тайм-аут, вне завивимости от того, было ли вызвано меню
    if (radialMenuTimeout)
        clearTimeout(radialMenuTimeout);

    // Если не вызывалось меню, то поехать в заданную точку
    if (radialMenu.isHide && myMap._mouseDowned) {
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


function onMouseMoveMap(mouseEventObject) {
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
    var noHide = cookieStorage.visibleLabel();
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
    if(cookieStorage.optionsMapTileVisible)
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
    cookieStorage = new LocalCookieStorage();

    // инициализация и показ модальных окон
    modalWindow = new ModalWindow({
        parent: 'modalDiv',
        back: 'modalBack',
        modalWelcome: 'modalWelcome',
        modalOptions: 'modalOptions',
        modalDeath: 'modalDeath',
        modalWin: 'modalWin',
        modalLose: 'modalLose'
    });

    // Инициализация.
    ModelInit();
    wsjson = new WSJSON();
    rpcCallList = new RPCCallList();

    myMap = L.map('map',
        {
            minZoom: 1,
            maxZoom: 7,
            zoomControl: false,
            attributionControl: false,
            keyboard: false,
            scrollWheelZoom: "center",
            dragging: false,
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

    // Включение/Выключение отображения настроек игры
    buttonOptions.onclick = funcModalOptionsShow;

    // Кнопка подключения к серверу (пока просто перезагружает страницу)
    buttonConnectServer.onclick = ConnectServerToggle;


    // создание чата
    chat = new ViewMessenger({
            parentDiv: 'chatArea',
            height: (cookieStorage.flagDebug ? 550 : 250),
            width: (cookieStorage.flagDebug ? 400 : 400)
    });
    chat.addChat(chat.systemsChats.broadcast.id, chat.systemsChats.broadcast.name);
    if (cookieStorage.optionsChatPush)
        chat.addChat(chat.systemsChats.push.id, chat.systemsChats.push.name);
    if (cookieStorage.optionsChatSystemLog)
        chat.addChat(chat.systemsChats.system.id, chat.systemsChats.system.name);
    if (cookieStorage.optionsChatAnswer)
        chat.addChat(chat.systemsChats.answer.id, chat.systemsChats.answer.name);
    if (cookieStorage.optionsChatRPC)
        chat.addChat(chat.systemsChats.rpc.id, chat.systemsChats.rpc.name);
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

    // Не показывать окно приветствия в debug режиме
    if (!cookieStorage.debugMode())
        modalWindow.modalWelcomeShow();



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

function TileLaterSet() {
    if (cookieStorage.optionsMapTileVisible) {
        // Если нужно отображать
        if (!myMap.hasLayer(tileLayerShow))tileLayerShow.addTo(myMap);
    }
    else {
        if (myMap.hasLayer(tileLayerShow))myMap.removeLayer(tileLayerShow);
    }
}

//Подключение к серверу (пока просто перезагрузка страницы)
function ConnectServerToggle() {
    window.location.reload();
}


function setClientState(state){
    if(state === 'death_car'){
        // Перевести клиент в состояние, пока машинка мертва
        cookieStorage.optionsDraggingMap = true; // значит радиальное меню не будет отображаться!
        myMap.dragging.enable(); // разрешить тягать карту
        return true;
    }
    // Если ни одно из состояний не выбрано, то перевести в нормальное состояние
    cookieStorage.optionsDraggingMap = false; // значит радиальное меню снова будет отображаться и карта будет двигаться за машинкой!
    myMap.dragging.disable(); // запретить двигать карту


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
