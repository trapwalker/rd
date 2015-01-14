function redrawMap() {
    var tempPointMain;
    var tempAngleRad;

    // работа с юзеркаром
    if (user.userCar) {
        userCarMarker.draw(clock.getCurrentTime());
        // перерисовка всех контроллеров
        if (controllers)
            controllers.draw(userCarMarker.currentUserCarAngle, user.userCar);
    }

    // работа со списком машинок
    carMarkerList.draw(clock.getCurrentTime());

    // Перенос центра карты в центр маркера-спектракуса - выбранный маркер - по умолчанию - userCarMarker.marker
    if(! cookieStorage.optionsDraggingMap) // Если нельзя таскать карту, то переносить. А можно таскать только когда машинка мертва
        if (userCarMarker)
            myMap.panTo(userCarMarker.marker.getLatLng(), {animate: false});

}

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
    //alert('onMouseUpMap');
    // очистить тайм-аут, вне завивимости от того, было ли вызвано меню
    if (radialMenuTimeout)
        clearTimeout(radialMenuTimeout);

    // Если не вызывалось меню, то поехать в заданную точку
    if (radialMenu.isHide && myMap._mouseDowned) {
        if (user.userCar)
            clientManager.sendGoto(myMap.project(mouseEventObject.latlng, myMap.getMaxZoom()), controllers.speedSetSlider.getSpeed());
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

var pressedKey;
var pressedArrowUp;
var pressedArrowDown;
var pressedArrowLeft;
var pressedArrowRight;

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
            clientManager.sendRocket();
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

function onZoomEnd(event) {
    timer = setInterval(redrawMap, timerDelay);
    if(controllers.isActive)  // чтобы при изменении зума карты  менялся и слайдер.
        controllers.zoomSetSlider.setZoom(myMap.getZoom());

    // если мы отдалились далеко, то скрыть все лейблы и показывать их только по наведению
    var noHide = cookieStorage.visibleLabel();
    for (var i in listMapObject.objects) {
        if (listMapObject.exist(i)) {
            listMapObject.objects[i].marker.setLabelNoHide(noHide);
        }
    }

    // Изменение радиуса круга обзора
    userCarMarker.setNewZoom();
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
        modalLose: 'modalLose',
        modalRestart: 'modalRestart'
    });

    // Инициализация.
    ModelInit();
    message_stream = new MessageConnector();
    ws_connector = new WSConnector();
    j_connector = new JabberConnector({
        jid: 'menkent@menkent-desktop/subclient',
        password: '1',
        adress_server: 'http://localhost:5280/http-bind'
    });
    rpcCallList = new RPCCallList();
    clientManager = new ClientManager();

    myMap = L.map('map',
        {
            minZoom: 1,
            maxZoom: 7,
            zoomControl: false,
            attributionControl: false,
            scrollWheelZoom: "center",
            dragging: false,
            crs: L.CRS.Simple,
            doubleClickZoom: false
            //    maxBounds: ([
            //        [50.21, 35.42],
            //        [51.43, 39.44]
            //    ])
        }).setView([50.595, 36.59], cookieStorage.zoom);

    // Обработчики событий карты
    pressedKey = false;
    //myMap.on('click', onMouseClickMap);
    myMap.on('mousedown', onMouseDownMap);
    myMap.on('mouseup', onMouseUpMap);
    myMap.on('mousemove', onMouseMoveMap);
    myMap.on('mouseout', onMouseOutMap);
    myMap.on('zoomstart', onZoomStart);
    myMap.on('zoomend', onZoomEnd);
    document.getElementById('bodydiv').onkeydown = onKeyDownMap;
    document.getElementById('bodydiv').onkeyup = onKeyUpMap;
    myMap.keyboard.disable();

    var storage = getIndexedDBStorage(createTileLayer) || getWebSqlStorage(createTileLayer) || createTileLayer(null);
    if (!storage) {
        alert('Storage not loading!');
    }

    // Включение/Выключение полноэранного режима
    buttonFullScreen.onclick = FullScreenToggle;

    // Включение/Выключение отображения настроек игры
    buttonOptions.onclick = funcModalOptionsShow;

    // Кнопка подключения к серверу (пока просто перезагружает страницу)
    buttonConnectServer.onclick = ConnectServerToggle;


    // создание чата
    chat = new ViewMessenger({
            parentDiv: 'bodydiv',
            height: (cookieStorage.flagDebug ? 550 : 250),
            width: (cookieStorage.flagDebug ? 600 : 400),
            stream_mes: message_stream
    });
    chat.showChatWindow();
    chat.setupDragElement(chat.vMHA);
    chat.setMessagesHistory(cookieStorage.historyArray);
    chat.addChat(-1, "-= L O G =-");
    chat.setActiveChat(-1);
    chat.setVisible(cookieStorage.chatVisible);


    carMarkerList = new CarMarkerList({_map: myMap});


    // Запуск тамера
    timer = setInterval(redrawMap, timerDelay);


    window.onbeforeunload = function (e) {
        cookieStorage.save();
    };


    // Когда всё загружено и создано вызвать коннекты к серверу
    //j_connector.connect();
    ws_connector.connect();


    //alert(window.location);

    // Не показывать окно приветствия в debug режиме
   // if (!cookieStorage.debugMode())
   //     modalWindow.modalWelcomeShow();

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


function showWinLoseMessage(winner){
    if(user.party.name === winner)
        modalWindow.modalWinShow();
    else
        modalWindow.modalLoseShow();
}

// Реализация выстрелов при crazy режиме
function crazyShooting(){
    var sectors = controllers.fireControl.sectors;
    var crazyInterval = setInterval(function () {
        // Пытать стрелять каждым сектором, но при условии, что он отречарджился
        for (var i in sectors)
            if (!sectors[i].recharged) { // Если сектор не в перезарядке
                // То стрельнуть этим сектором
                sendFireCrazy(sectors[i]._fireSector.uid, carMarkerList.getListIDsForShoot(sectors[i]._fireSector.uid))
            }
        if(user.userCar.hp <= 0) clearInterval(crazyInterval);
    }, 1500);
}

// Установка текста в верху страницы - вывод своего ника и своей пати
function setTitleOnPage(){
    if (cookieStorage.optionsShowID)
        $('#title').text('NUKE Navigator v5.51' + ' # ' + user.login + ' [' + user.role + '@' + user.party.name + '] ' + user.userCar.ID);
    else
        $('#title').text('NUKE Navigator v5.51' + ' # ' + user.login + ' [' + user.role + '@' + user.party.name + ']');
}

// Функция показа кол-ва минут до следующих 15-ти минут
function showTimeToResetServer(servTime){
    var dt = 0;
    if(servTime)
        dt = (new Date().getTime()) - servTime;
    var minut15 = 15 * 60 * 1000;
    if(dt > minut15) dt = 0;

    var fullPart = servTime / minut15;
    fullPart = Math.floor(fullPart) + 1;
    var timeToReset = fullPart * minut15 + dt;
    var selectorTimeText = $('#timeToResetTime');


    var intervalForTimerReset = setInterval(function () {
        var textTime = timeToReset - new Date().getTime();
        if(textTime < minut15 && textTime >= 0) {
            var newDate = new Date(0);
            newDate.setUTCMilliseconds(textTime);
            selectorTimeText.text(newDate.getMinutes() + ' : ' + newDate.getSeconds());
        }
    }, 1000);


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
var message_stream;
var clientManager;
var j_connector;
var ws_connector;


// Массив иконок
var iconsLeaflet;


var timerDelay = 20; //константа задающая временной интервал таймера (юзать по всему проекту только это)
var user;
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
