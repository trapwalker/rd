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




$(document).ready(function () {


    // Загрузка Cookie
    cookieStorage = new LocalCookieStorage();

    mapManager._init();

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

    ws_connector = new WSConnector();

    j_connector = new JabberConnector({
        jid: 'menkent@menkent-desktop/subclient',
        password: '1',
        adress_server: 'http://localhost:5280/http-bind'
    });

    rpcCallList = new RPCCallList();

    clientManager = new ClientManager();


    // Включение/Выключение отображения настроек игры
    buttonOptions.onclick = funcModalOptionsShow;


    // создание чата
/*
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
*/

    chat = new ViewMessengerGlass({
        stream_mes: message_stream
    });


    // тестовые сообщения, просто чтобы видеть как они будут выглядеть
    setTimeout(function() {
       // chat.addMessage(-2, '', {login: 'Ivan'}, 'Привет! Это тестовое сообщение в пати!');
       // chat.addMessage(-2, '', {login: user.login}, 'Привет! Это мой браузер!');

        chat.addMessage(-1, '', {login: 'system'}, 'Городской чат говорите? Рация значит ловит.');
      //  chat.addMessage(-1, '', {login: 'Vasiliy'}, 'аааа, город! хаха! я в городе');

        chat.addMessage(-3, '', {login: 'game'}, 'Система загружена. Вы можете начать движение.');
        chat.addMessage(-3, '', {login: 'game'}, 'Для начала движения выставьте круиз контроль на желаемое значение.');

        chat.addMessage(-4, '', {login: 'system'}, 'На сервере игроков ххх.');
        chat.addMessage(-4, '', {login: 'game'}, 'Мы рады сообщить Вам, что здесь будет всякий флуд от сервера');
    }, 0);

    //carMarkerList = new CarMarkerList({_map: myMap});

    window.onbeforeunload = function (e) {
        cookieStorage.save();
    };


    // Когда всё загружено и создано вызвать коннекты к серверу
    //j_connector.connect();


    ws_connector.connect();

    document.getElementById('map').focus();
    //alert(window.location);

    // Не показывать окно приветствия в debug режиме
   // if (!cookieStorage.debugMode())
   //     modalWindow.modalWelcomeShow();


    // Повесить на кнопки меню возврат фокуса на карту
    document.getElementById('divMainMenuBtnCharacter').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnCar').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnLog').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnNucoil').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnOptions').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnMain').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnForum').onclick = returnFocusToMap;
});


function returnFocusToMap() {
    document.getElementById('map').focus();
}


function funcModalOptionsShow(){
    modalWindow.modalOptionsShow();
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




// todo: снести myMap
var myMap;
var map = myMap;

var chat;
var userCarMarker;
var rpcCallList;
var tileLayerShow;
var controllers;
var debugMapList = [];
var carMarkerList;
var cookieStorage;
var clientManager;
var j_connector;
var ws_connector;

var user;
var listMapObject;
var ownerList;

var levelZoomForVisibleTail = 8;

// радиальноe меню
var radialMenu;
var radialMenuTimeout;

// модальное окно
var modalWindow;

//Префиксы для подстановки к методам для работы полноэкранного режима в различных браузерах
var pfx = ["webkit", "moz", "ms", "o", ""];