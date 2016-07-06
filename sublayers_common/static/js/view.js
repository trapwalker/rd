$(document).ready(function () {


    // Загрузка Cookie
    cookieStorage = new LocalCookieStorage();

    mapManager._init();

    locationManager = new LocationManager();
    mapCanvasManager = new MapCanvasManager();
    wStrategyModeManager = new WStrategyModeManager();

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

    document.getElementById('divMainMenuBtnCharacter').onclick = function () {
        windowTemplateManager.openUniqueWindow('character', '/menu_character', null, characterManager.redraw);
        returnFocusToMap();
    };

    document.getElementById('divMainMenuBtnCar').onclick = function () {
        windowTemplateManager.openUniqueWindow('car_info', '/menu_car', null, carManager.redraw);
        returnFocusToMap();
    };

    document.getElementById('divMainMenuBtnInventory').onclick = function () {
        windowTemplateManager.openUniqueWindow('inventory_info', '/inventory', null);
        returnFocusToMap();
    };

    document.getElementById('divMainMenuBtnJournal').onclick = function () {
        windowTemplateManager.openUniqueWindow('map_journal', '/menu_journal', null, journalManager.redraw);
        returnFocusToMap();
    };

    document.getElementById('divMainMenuBtnParty').onclick = function () {
        windowTemplateManager.openUniqueWindow('party', '/menu_party', null, partyManager.redraw);
        returnFocusToMap();
    };

    document.getElementById('divMainMenuBtnMain').onclick = function () {
        window.open('/', '_blank');
    };

    document.getElementById('divMainMenuBtnForum').onclick = function () {
        window.open('https://vk.com/road_dogs', '_blank');
    };

    $('.anti-click-class').click(function(){
        returnFocusToMap();
    });


    img.push(new Image());
    img.push(new Image());
    img.push(new Image());
    img.push(new Image());

    // старый шум
    //img[0].src = '/static/img/2n1.png';
    //img[1].src = '/static/img/2n2.png';
    //img[2].src = '/static/img/2n3.png';
    //img[3].src = '/static/img/2n4.png';

    // шум тест 1
    //img[0].src = '/static/img/noise/1_noise.png';
    //img[1].src = '/static/img/noise/2_noise.png';
    //img[2].src = '/static/img/noise/3_noise.png';
    //img[3].src = '/static/img/noise/4_noise.png';

    // шум тест 2   _inv
    //img[0].src = '/static/img/noise/1_noise_inv.png';
    //img[1].src = '/static/img/noise/2_noise_inv.png';
    //img[2].src = '/static/img/noise/3_noise_inv.png';
    //img[3].src = '/static/img/noise/4_noise_inv.png';

    // шум тест 3   60
    img[0].src = '/static/img/noise/1_noise60.png';
    img[1].src = '/static/img/noise/2_noise60.png';
    img[2].src = '/static/img/noise/3_noise60.png';
    img[3].src = '/static/img/noise/4_noise60.png';

    //ws_connector.connect(); // вызывается лишь тогда, когда всё будет загружено и проинициализировано




    // Установка размеров экрана города
    resizeWindowHandler();
});

var b_canvas;
var b_context;
var pat;
var img = [];
var img1;
var window_scaled_prc = 1.0;


function returnFocusToMap() {
    document.getElementById('map').focus();
}


$(window).resize(resizeWindowHandler);


function resizeWindowHandler() {
    //console.log('Произошёл ресайз окна!', $( window ).width(), '   ', $( window ).height());
    //var scale_prc_w_width = $(window).width() / 1920;
    //var scale_prc_w_height = $(window).height() / 1080;
    //var scale_prc = scale_prc_w_width < scale_prc_w_height ? scale_prc_w_width : scale_prc_w_height;
    //if (scale_prc > 0.3) {
    //    $('#activeTownDiv').css('transform', 'scale(' + scale_prc + ')');
    //    window_scaled_prc = scale_prc;
    //}
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

// Функции переключения шаблонов - не должны менять модель, только вид!!!!
function CarTableInfoMenuClick(target) {
    var jq_target = $(target);
    var jq_parent = jq_target.parent();
    var jq_grand_parent = jq_target.parent().parent();
    jq_parent.children().removeClass('active');
    jq_target.addClass('active');
    var page = jq_target.data('page');

    var bodys = jq_grand_parent.find('.car-info-block-body-right-list');
    bodys.removeClass('active');
    for (var  i = 0; i < bodys.length; i++){
        var jq_elem = $(bodys[i]);
        if (jq_elem.hasClass(page)){
            jq_elem.addClass('active');
        }
    }
}


function CarInfoBlockAmmoInfoView(description) {
    if (locationManager.in_location_flag) {
        locationManager.panel_right.show({text: description}, 'description');
    }
}


function CarInfoBlockAmmoInfoHide(descripion) {
    if (locationManager.in_location_flag) {
        locationManager.panel_right.show({text: ''}, 'description');
    }
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