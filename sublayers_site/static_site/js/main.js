// Кусок кода отвечающий за прототипное наследование
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};


var rating_users_info_list = {}; // Список пользователей в рейтингах, чтобы каждого запрашивать только по 1 разу в 5-10 минут

// Инициализация всего и вся
function main() {
    canvasManager = new CanvasManager();
    canvasNoise = new CanvasNoise();
    canvasDisplayLine = new CanvasDisplayLine();
    canvasDisplayRippling = new CanvasDisplayRippling();
    canvasBlackOut = new CanvasBlackOut();
    indicatorBlink = new IndicatorBlink();
    //textBlurBlink = new TextBlurBlink();

    initConsoles();

    init_site_sound();


    window.onresize = function() {
        canvasManager.resize_window();
    };


    var hash_url = window.location.hash;
    if (hash_url && hash_url.length) {
        hash_url = hash_url.split('#')[1];
        $('#RDbtn_' + hash_url).click();
    }

    // Запрос разных рейтингов
    GetQuickGameRecords();
    var ratings_name = ['Traders', 'Looters', 'Heroes', 'Villain', 'Leaders', 'Warriors', 'Adventurers'];
    for (var i = 0; i < ratings_name.length; i++) {
        GetRatingInfo(ratings_name[i]);
    }

    consoleWStart.start();
}

function init_site_sound() {
    audioManager.load('click_0', {url: '/audio/button_click/2023__edwin-p-manchester__tapeplayer04.wav'});
    audioManager.load('click_1', {url: '/audio/button_click/275152__bird-man__click.wav'});
    audioManager.load('click_2', {url: '/audio/button_click/290442__littlerobotsoundfactory__mouth-09.wav'});
    audioManager.load('click_3', {url: '/audio/button_click/278967__sfstorm__sfx-clicking.wav'});

    audioManager.load('error_0', {url: '/audio/error_signal/151309__tcpp__beep1-resonant-error-beep.wav'});
    audioManager.load('error_1', {url: '/audio/error_signal/142608__autistic-lucario__error.wav'});

    audioManager.load('dev_gl_0', {url: '/audio/device_noise/178306__glitchedtones__glitchedtones-apc-66.wav'});
    audioManager.load('dev_gl_1', {url: '/audio/device_noise/178308__glitchedtones__glitchedtones-apc-79.wav'});

    // Кнопки клавиатуры
    audioManager.load('key_cl_0', {url: '/audio/print_keyboard/194797__jim-ph__vintage-keyboard-3.wav'});
    audioManager.load('key_cl_1', {url: '/audio/print_keyboard/332671__reitanna__some-sort-of-click.wav'});
    audioManager.load('key_cl_2', {url: '/audio/print_keyboard/181000__ueffects__r-key.wav'});
    audioManager.load('key_cl_3', {url: '/audio/print_keyboard/323717__reitanna__button.wav'});
    audioManager.load('key_cl_4', {url: '/audio/print_keyboard/333047__christopherderp__videogame-menu-button-clicking-sound-18.wav'});


    audioKeyboard = new AudioKeyboard([
        audioManager.get('key_cl_0'),
        audioManager.get('key_cl_1'),
        audioManager.get('key_cl_2'),
        audioManager.get('key_cl_3'),
        audioManager.get('key_cl_4')
    ]);


}

function GetQuickGameRecords() {
    $.ajax({
        url: location.protocol + '//' + location.host + '/site_api/get_quick_game_records',
        method: 'POST',
        data: {},
        success: function (data) {
            $('#RDSiteQuickGameRatingsTable').empty();
            $('#RDSiteQuickGameRatingsTable').append(data);

        },
        error: function() {
            $('#RDSiteQuickGameRatingsTable').empty();
            $('#RDSiteQuickGameRatingsTable').append('<p style="margin-left: 20px">@admin>: Connection Error: 404 </br> Ratings not load.</p>');
        }
    });
}

function GetRatingInfo(rating_name) {
    var jq_elem = $('#RDSiteRating_' + rating_name).find('.scroll-block').first();
    $.ajax({
        url: location.protocol + '//' + location.host + '/site_api/get_rating_info',
        method: 'POST',
        data: {rating_name: rating_name},
        success: function (data) {
            jq_elem.empty();
            jq_elem.append(data);
            if (rating_name == 'Traders') { // Если это первый рейтинг загрузился, то кликнуть на него
                $('.window-ratings-header-path').first().click();
            }
        },
        error: function() {
            jq_elem.empty();
            jq_elem.append('<p style="margin-left: 20px">@admin>: Connection Error: 404 </br> Ratings not load.</p>');
        }
    });
}

//function start_site() {
//    console.log('Start site ! ');
//    setInterval(refresh_server_stat_request, 3000)
//}
//
//function refresh_server_stat_request() {
//    $.ajax({
//            url: window.location.protocol + "//" + location.hostname + '/site_stat',
//            success: refresh_server_stat_answer,
//            error: refresh_server_stat_error
//        });
//}
//
//function refresh_server_stat_answer(data) {
//    console.log(data);
//    $('#srvStatAgents').text(data.s_agents_on);
//    $('#srvStatUnits').text(data.s_units_on);
//}
//
//function refresh_server_stat_error(data) {
//    console.log(data);
//    $('#srvStatAgents').text('-');
//    $('#srvStatUnits').text('-');
//}


