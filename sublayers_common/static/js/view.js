$(document).ready(function () {
    initConsoles();
    if ($('#settings_first_enter').text() == 'True')
        textConsoleManager.start('first_enter');
    else
        textConsoleManager.start('enter');

    // Загрузка Cookie
    cookieStorage = new LocalCookieStorage();

    mapManager._init();


    // Тест PreloaderImage Начало

    // Чтобы всегда картинки заново грузулились
    function random_str() { return (Math.random() * 10000).toFixed(0); }

    function pi_test_1(load) {console.log('pi_test_1 =', preloaderImage.count_loading, load, preloaderImage.tasks); }
    function pi_test_2(load) {console.log('pi_test_2 =', preloaderImage.count_loading, load, preloaderImage.tasks); }
    function pi_test_3(load) {console.log('pi_test_3 =', preloaderImage.count_loading, load, preloaderImage.tasks); }


    resourceLoadManager.add(preloaderImage);

    function pi_test_4(load) {
        console.log('pi_test_4 =', preloaderImage.count_loading, load, preloaderImage.tasks);
        resourceLoadManager.del(preloaderImage);
    }

    //preloaderImage.add('/static/static_site/img/09-06-16/1080_main_bg.jpg?' + random_str(), pi_test_1);
    //preloaderImage.add('/static/static_site/img/09-06-16/1080_car.png?' + random_str(), pi_test_2);
    //preloaderImage.add('/static/static_site/img/09-06-16/1080_road.png?' + random_str(), pi_test_1, 10);
    //preloaderImage.add('/static/static_site/img/09-06-16/1080_road+grid_002.png?' + random_str(), pi_test_1);

    preloaderImage.add_list([
        '/static/static_site/img/09-06-16/1080_main_bg.jpg?' + random_str(),
        '/static/static_site/img/09-06-16/1080_car.png?' + random_str(),
        '/static/static_site/img/09-06-16/1080_road.png?' + random_str(),
        '/static/static_site/img/09-06-16/1080_road+grid_002.png?' + random_str()
    ], pi_test_4, 10);


    // Тест PreloaderImage Конец

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
        windowTemplateManager.openUniqueWindow('character', '/menu_character', null, characterManager.redraw,
            function(jq_window_div) {
                var new_text = jq_window_div.find('textarea').first().val();
                if (user.example_agent.about_self != new_text)
                    clientManager.sendSetAboutSelf(new_text); 
            });
        returnFocusToMap();
    };

    document.getElementById('divMainMenuBtnCar').onclick = function () {
        carManager.get_info();
        returnFocusToMap();
    };

    document.getElementById('divMainMenuBtnInventory').onclick = function () {
        windowTemplateManager.openUniqueWindow('inventory_info', '/inventory', null,
            wFireController.switchOnConsumerPanel, wFireController.switchOffConsumerPanel);
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

    document.getElementById('divMainMenuBtnRadio').onclick = function () {
        windowTemplateManager.openUniqueWindow('radio', '/menu_radio', null, null);
        returnFocusToMap();
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
    var scale_prc_w_width = $(window).width() / 1920;
    var scale_prc_w_height = $(window).height() / 1080;
    var scale_prc = scale_prc_w_width < scale_prc_w_height ? scale_prc_w_width : scale_prc_w_height;
    if (scale_prc > 0.3) {
        $('#activeTownDiv').css('transform', 'scale(' + scale_prc + ')');
        window_scaled_prc = scale_prc;
    }
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