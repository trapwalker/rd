$(document).ready(function () {


    // Загрузка Cookie
    cookieStorage = new LocalCookieStorage();

    mapManager._init();

    mapCanvasManager = new MapCanvasManager();

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

    document.getElementById('divMainMenuBtnInventory').onclick =
        function () {
            windowTemplateManager.openUniqueWindow('inventory_info', '/inventory', null);
            returnFocusToMap();
        };

    document.getElementById('divMainMenuBtnJournal').onclick =
        function () {
            windowTemplateManager.openUniqueWindow('map_journal', '/map_journal', null, function() {
                if (journalManager) journalManager.redraw();
            });
            returnFocusToMap();
        };

//    document.getElementById('divMainMenuBtnLog').onclick = returnFocusToMap;

    //document.getElementById('divMainMenuBtnNucoil').onclick =
    //    function () {
    //        windowTemplateManager.openUniqueWindow('nucoil', '/main_menu_nucoil', null);
    //        returnFocusToMap();
    //    };

//    document.getElementById('divMainMenuBtnOptions').onclick = returnFocusToMap;
    document.getElementById('divMainMenuBtnMain').onclick = function () {
        location = '/';
    };
//    document.getElementById('divMainMenuBtnForum').onclick = returnFocusToMap;

    $('.anti-click-class').click(function(){
        returnFocusToMap();
    });


    img.push(new Image());
    img.push(new Image());
    img.push(new Image());
    img.push(new Image());

    img[0].src = '/static/img/n1.png';
    img[1].src = '/static/img/n2.png';
    img[2].src = '/static/img/n3.png';
    img[3].src = '/static/img/n4.png';

    //ws_connector.connect(); // вызывается лишь тогда, когда всё будет загружено и проинициализировано

});

var b_canvas;
var b_context;
var pat;
var img = [];
var img1;


function returnFocusToMap() {
    document.getElementById('map').focus();
}


function ifBrowser () {
    var ua = navigator.userAgent;
    return function () {
        if (ua.search(/MSIE/) > -1) return "ie";
        if (ua.search(/Firefox/) > -1) return "firefox";
        if (ua.search(/Opera/) > -1) return "opera";
        if (ua.search(/Chrome/) > -1) return "chrome";
        if (ua.search(/Safari/) > -1) return "safari";
        if (ua.search(/Konqueror/) > -1) return "konqueror";
        if (ua.search(/Iceweasel/) > -1) return "iceweasel";
        if (ua.search(/SeaMonkey/) > -1) return "seamonkey";
    }();
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