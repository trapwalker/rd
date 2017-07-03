$(document).ready(function () {
    initConsoles();
    if ($('#settings_first_enter').text() == 'True')
        textConsoleManager.start('first_enter');
    else
        textConsoleManager.start('enter');

    mapManager._init();

    locationManager = new LocationManager();
    mapCanvasManager = new MapCanvasManager();
    wStrategyModeManager = new WStrategyModeManager();
    wMapNoise = new WMapNoise();
    wMapNoise.start('cat_noise_1', 0.7);

    teachingManager = new TeachingManager();
    teachingMapManager = new TeachingMapManager();

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
    user = new User(1);
    ownerList = new OwnerList();

    ws_connector = new WSConnector({url: 'ws://'+ location.hostname + $('#settings_server_mode_link_path').text() + '/ws'});
    basic_server_mode = $('#settings_server_mode').text() == "basic";

    rpcCallList = new RPCCallList();

    clientManager = new ClientManager();

    chat = new ViewMessengerGlass({
        stream_mes: message_stream
    });

    window.onbeforeunload = function (e) {
        settingsManager.unload_client();
        radioPlayer.save_setting_to_cookie(true);
    };

    //if ($('#settings_server_mode').text() == 'quick')
    //    chat.setActivePage(chat.page_log);
    //else
    chat.setActivePage(chat.page_global);

    returnFocusToMap();

    document.getElementById('divMainMenuBtnCharacter').onclick = function () {
        if (windowTemplateManager.isOpen('character'))
            windowTemplateManager.closeUniqueWindow('character');
        else
            windowTemplateManager.openUniqueWindow('character', '/menu_character', null, characterManager.redraw,
                function (jq_window_div) {
                    var new_text = jq_window_div.find('textarea').first().val();
                    if (user.example_agent.about_self != new_text)
                        clientManager.sendSetAboutSelf(new_text);
                });
        returnFocusToMap();
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
    };

    document.getElementById('divMainMenuBtnCar').onclick = function () {
        if (windowTemplateManager.isOpen('car_info'))
            windowTemplateManager.closeUniqueWindow('car_info');
        else
            carManager.get_info();
        returnFocusToMap();
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
    };

    document.getElementById('divMainMenuBtnInventory').onclick = function () {
        if (windowTemplateManager.isOpen('inventory_info'))
            windowTemplateManager.closeUniqueWindow('inventory_info');
        else
            windowTemplateManager.openUniqueWindow('inventory_info', '/inventory', null,
                wFireController.switchOnConsumerPanel, wFireController.switchOffConsumerPanel);
        returnFocusToMap();
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
    };

    document.getElementById('divMainMenuBtnJournal').onclick = function () {
        if (windowTemplateManager.isOpen('map_journal'))
            windowTemplateManager.closeUniqueWindow('map_journal');
        else
            windowTemplateManager.openUniqueWindow('map_journal', '/menu_journal', null, journalManager.redraw);
        returnFocusToMap();
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
    };

    document.getElementById('divMainMenuBtnParty').onclick = function () {
        if (windowTemplateManager.isOpen('party'))
            windowTemplateManager.closeUniqueWindow('party');
        else
            windowTemplateManager.openUniqueWindow('party', '/menu_party', null, partyManager.redraw);
        returnFocusToMap();
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
    };

    document.getElementById('divMainMenuBtnMain').onclick = function () {
        window.open('/', '_blank');
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
    };

    document.getElementById('divMainMenuBtnForum').onclick = function () {
        window.open('https://vk.com/road_dogs', '_blank');
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
    };

    document.getElementById('divMainMenuBtnRadio').onclick = function () {
         if (windowTemplateManager.isOpen('radio'))
            windowTemplateManager.closeUniqueWindow('radio');
        else
            windowTemplateManager.openUniqueWindow('radio', '/menu_radio', null, function () {
            radioPlayer.update();
        });
        returnFocusToMap();
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
    };

    document.getElementById('divMainMenuBtnOptions').onclick = function () {
        if (windowTemplateManager.isOpen('settings'))
            windowTemplateManager.closeUniqueWindow('settings');
        else
            windowTemplateManager.openUniqueWindow('settings', '/menu_settings', null, settingsManager.redraw.bind(settingsManager), settingsManager.cancel_options.bind(settingsManager));
        returnFocusToMap();
        // Звук на клик по кнопке меню
        audioManager.play({name: "click", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
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

    // Работа со звуком
    init_sound();
    initRadioPlayer();

    setTimeout(function() {
        var radio_settings = settingsManager.getCookie('radio_player');
        if (radio_settings){
            try {
                var settings = radio_settings.split('_');
                radioPlayer.set_state(settings[0], parseInt(settings[1]), parseInt(settings[2]), parseFloat(settings[3]), parseInt(settings[4]));
            }
            catch (err) {
                console.error('Incorrect RadioPlayer settings: ', radio_settings);
            }
        }
    }, 1000);
    

    // Интервал запроса пинга
    setInterval(function(){
        if (ws_connector.isConnected)
            clientManager.get_ping_set_fps();
    }, 25000);

    resourceLoadManager.load_complete_init = true;
    resourceLoadManager.del(null);

    setTimeout(function() {
        // Включение сохранённой перекраски
        settingsManager.options.game_color.set_callback(settingsManager.options.game_color.value, true);
        if (settingsManager.options.map_tile_draw_back.value == "front")  // Если тайлы подложки скрыты, то съэмулировать их выключение
            settingsManager.options.map_tile_draw_back.set_callback(settingsManager.options.map_tile_draw_back.value);

    }, 10);
});

var index_notes_test = 0;
function addTestNotes() {
    var npc_html_hash;
    var build;
    var note;

    npc_html_hash = 'reg--registry-institutions-trader-bob_ferolito';
    build = locationManager.get_building_by_field('html_hash', npc_html_hash);
    note = new QuestNoteNPCBtn({
        npc_html_hash: npc_html_hash,
        btn_caption: 'жми сюда ' + index_notes_test,
        uid: 'notes_' + index_notes_test
    });
    note.bind_with_build(build);
    index_notes_test++;

    var inv = inventoryList.getInventory(user.ID);

    npc_html_hash = 'reg--registry-institutions-trader-bob_ferolito';
    build = locationManager.get_building_by_field('html_hash', npc_html_hash);
    note = new QuestNoteNPCBtnDelivery({
        npc_html_hash: npc_html_hash,
        btn_caption: 'Доставка ' + index_notes_test,
        uid: 'notes_' + index_notes_test,
        delivery_stuff: [
            {
                item: inv.items[0].example,
                count: 4
            },
            {
                item: inv.items[1].example,
                count: 2
            }
        ]


    });
    note.bind_with_build(build);
    index_notes_test++;

    note = new QuestNoteNPCCar({
        npc_html_hash: npc_html_hash,
        btn_caption: 'Машина ' + index_notes_test,
        uid: 'notes_' + index_notes_test,
        delivery_stuff: [
            {
                item: inv.items[0].example,
                count: 4
            },
            {
                item: inv.items[1].example,
                count: 2
            }
        ]
    });
    note.bind_with_build(build);
    index_notes_test++;

    npc_html_hash = 'reg--registry-institutions-mechanic-raul_alone';
    build = locationManager.get_building_by_field('html_hash', npc_html_hash);
    note = new QuestNoteNPCBtn({
        npc_html_hash: npc_html_hash,
        btn_caption: 'жми сюда ' + index_notes_test,
        uid: 'notes_' + index_notes_test
    });
    note.bind_with_build(build);
    index_notes_test++;

}

var basic_server_mode = true;
var interface_scale_big = true;
var interface_scale_small = true;
var b_canvas;
var b_context;
var pat;
var img = [];
var img1;
var window_scaled_prc = 1.0;


$(window).resize(resizeWindowHandler);


function resizeWindowHandler() {
    //console.log('Произошёл ресайз окна!', $( window ).width(), '   ', $( window ).height());
    interface_scale_big = ($(window).width()) > 1550 && ($(window).height() > 880);
    interface_scale_small = ($(window).width()) <= 1250 || ($(window).height() <= 670);
    var scale_prc_w_width = $(window).width() / 1920;
    var scale_prc_w_height = $(window).height() / 1080;
    var scale_prc = scale_prc_w_width < scale_prc_w_height ? scale_prc_w_width : scale_prc_w_height;
    if (scale_prc > 0.3) {
        $('#activeTownDiv').css('transform', 'scale(' + scale_prc + ')');
        $('#townTeachingCanvas').css('transform', 'scale(' + scale_prc + ')');
        window_scaled_prc = scale_prc;
    }
    if (teachingMapManager) teachingMapManager.redraw();
    if (mapManager) mapManager.on_new_map_size($(window).width(), $(window).height());
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
