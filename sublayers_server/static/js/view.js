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
    user = new User(1, 1000);
    ownerList = new OwnerList();

    ws_connector = new WSConnector();

    rpcCallList = new RPCCallList();

    clientManager = new ClientManager();

    chat = new ViewMessengerGlass({
        stream_mes: message_stream
    });


    window.onbeforeunload = function (e) {
        cookieStorage.save();
    };

    chat.setActivePage(chat.page_global);


    ws_connector.connect();

    document.getElementById('map').focus();

    // Повесить на кнопки меню возврат фокуса на карту
    document.getElementById('divMainMenuBtnCharacter').onclick =
        function () {
            windowTemplateManager.openUniqueWindow('character', '/main_menu_character', null);
            returnFocusToMap();
        };

    document.getElementById('divMainMenuBtnCar').onclick =
        function () {
            windowTemplateManager.openUniqueWindow('car_info', '/main_car_info', null);
            returnFocusToMap();
        };

    document.getElementById('divMainMenuBtnLog').onclick = returnFocusToMap;

    document.getElementById('divMainMenuBtnNucoil').onclick =
        function () {
            windowTemplateManager.openUniqueWindow('nucoil', '/main_menu_nucoil', null);
            returnFocusToMap();
        };

    document.getElementById('divMainMenuBtnOptions').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnMain').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnForum').onclick = returnFocusToMap;
});


function returnFocusToMap() {
    document.getElementById('map').focus();
}


// Установка текста в верху страницы - вывод своего ника и своей пати
function setTitleOnPage() {
    var party_str = user.party ? (' [' + user.party.name + '] ') : "/";
    //if (cookieStorage.optionsShowID)
    $('#title').text('NUKE Navigator v5.51' + ' # ' + user.login + party_str + user.userCar.ID);
    //else
    //     $('#title').text('NUKE Navigator v5.51' + ' # ' + user.login + party_str);
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