// Кусок кода отвечающий за прототипное наследование
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};


var rating_users_info_list = {}; // Список пользователей в рейтингах, чтобы каждого запрашивать только по 1 разу в 5-10 минут
var registration_status = 'not_register';

var currentSiteSize = 1080;

var glitchEffectStartPage768 = null;
var glitchEffectStartPage1080 = null;

var videoPlayer;
var videoPlayerReadyState = false;
var lastRadioPlayerVolumeBeforeVideoActive = 0.15;


function SetImageOnLoad(img, onLoadHandler) {
    if (img.complete) {
        onLoadHandler(img);
        return;
    }
    img.addEventListener('load', function () {
        onLoadHandler(img);
    }, false);
}


// Инициализация всего и вся
function main() {
    // Начальная установка размера
    currentSiteSize = window.matchMedia("screen and (min-width: 1367px) and (min-height: 801px)").matches ? '1080' : '768';

    canvasManager = new CanvasManager();
    canvasNoise = new CanvasNoise();
    canvasDisplayLine = new CanvasDisplayLine();
    canvasDisplayRippling = new CanvasDisplayRippling();
    canvasBlackOut = new CanvasBlackOut();
    //indicatorBlink = new IndicatorBlink();
    //textBlurBlink = new TextBlurBlink();

    init_preload_images();

    // Получить стартовые ролевые классы и аватарки
    GetRPGInfo();

    // Получить текущего пользователя
    GetUserInfo();

    // Инициализация анимации платы
    var plate_img = new Image();
    plate_img.src = '/static/static_site/img/chip_anim_all.png';


    SetImageOnLoad(plate_img, function (img) {
            eCanvasChipAnimation = new ECanvasChipAnimation(img);
        }
    );

    var content_start_back_visible = true;
    var content_start_back_in_animate = false;

    // Чтобы кнопки залипали!
    $('.btn-page').click(function (event) {
        // Если кто-то быстро кликает, то игнорить эти клики
        if(content_start_back_in_animate) return;
        // Проигрывание звуков
        if (! $(this).hasClass('active')) {
            audioManager.play('microwave_btn_click');
        }
        else {
            // Значит произошёл клик по нажатой кнопке - её нужно отжать = клик по логотипу
            audioManager.play('microwave_btn_click');
            $('.site-logo').first().click();
            // todo: звук отжатой кнопки
            return;
        }
        $('.btn').removeClass('active');
        $(this).addClass('active');
        $(event.currentTarget).addClass('active');

        // скрыть сетку, машинку и тд
        if (content_start_back_visible) {
            content_start_back_visible = false;
            content_start_back_in_animate = true;
            $('.content-start').animate({opacity: 0}, function () {
                $('.content-start').css({display: 'none'});
                $('.car-skeleton-path').css({display: 'none'});
                content_start_back_in_animate = false;
            });
            if (glitchEffectStartPage1080)
                glitchEffectStartPage1080.stop();
            if (glitchEffectStartPage768)
                glitchEffectStartPage768.stop();

            // Запустить канвас-менеджер
            if (! canvasManager.is_active) canvasManager.is_active = true;
        }

        // Скрыть все окна
        $('.switch-page').css({display: 'none'});

        // Получить id-шник страницы, которую нужно отобразить
        var data;
        if (this.id == 'RDbtn_start') {
            data = GetIDForStartRegistrationPage();
        }
        else {
            data = $(this).data('window_id');
            consoleWReg.focus_interrupt();
        }

        // Показать окно
        $('#' + data).css({display: 'block'});

        // Отключить мерцание и линию на "Об игре"
        if (data == 'RDSiteGameInfo') {
            canvasDisplayLine.pause();
            canvasDisplayRippling.pause();
            if (videoPlayer && videoPlayerReadyState) {
                videoPlayer.playVideo();
                lastRadioPlayerVolumeBeforeVideoActive = radioPlayer.current_volume;
                radioPlayer.set_volume(0.0);
            }
        }
        else {
            canvasDisplayLine.play();
            canvasDisplayRippling.play();
            if (videoPlayer && videoPlayerReadyState) {
                videoPlayer.pauseVideo();
                radioPlayer.set_volume(lastRadioPlayerVolumeBeforeVideoActive);
            }
        }

        if (data == 'RDSiteWReg3') {
            // Включить рисование анимации платы завершения регистрации на канвасе
            var start_animation_func = function () {
                if (eCanvasChipAnimation) eCanvasChipAnimation.start();
                else setTimeout(start_animation_func, 300)
            };
            start_animation_func();
        }
        else {
            if (eCanvasChipAnimation) eCanvasChipAnimation.finish();
        }

        // Работа с консолями
        textConsoleManager.start(data);

        // Мерцание шума
        if (canvasNoise) canvasNoise.flashNoise();

        // Изменение хеша в адресной строке (хеш возьмётся из data-url_hash самой кнопки
        if (data == 'RDSiteNews') {
            // Если окно новостей, то найти последнюю активную новость
            var jq_active_news = $('.window-news-log-news-header.active');
            if (jq_active_news.length) {
                // Если есть активные новости (нажата хоть одна, хотя и должна быть нажата максимум одна)
                // прописать в хеш ссылку на новость
                setTimeout(function () { // Костыль!!!
                    setHashUrlForNews(jq_active_news.first()[0]);
                }, 10);
            }
            else {
                // Если нет активных новостей, то выбрать первую новость
                var jq_news = $('.window-news-log-news-header').first();
                viewNewsSilentClickReaction(jq_news[0]);
                setTimeout(function(){
                    setHashUrlForNews(jq_news[0]);
                }, 10);
            }
        }
        else {
            var url_hash = $(this).attr('id');
            if (url_hash && url_hash.length) {
                window.location.hash = url_hash.split('_')[1];
            }
        }

    });

    $('.btn').mouseover(function () {
        if (! $(this).hasClass('active'))
            audioManager.play('microwave_btn_hover');
    });


    // Активация скролов
    var scroll_interval = null;
    var d_scroll = 0;
    var scroll_block = null;

    function makeScroll() {
        var scroll_pos = scroll_block.scrollTop();
        scroll_block.scrollTop(scroll_pos + d_scroll);
    }

    $('.scroll-btn').mousedown(function (event) {
        var jq_this = $(this);
        scroll_block = $('#' + jq_this.data('block_id'));
        if (jq_this.hasClass('up')) d_scroll = -25;
        if (jq_this.hasClass('down')) d_scroll = 25;
        scroll_interval = setInterval(makeScroll, 50);

        audioManager.play('button_screen_press');
    });
    $('.scroll-btn').mouseup(function (event) {
        d_scroll = 0;
        clearInterval(scroll_interval);
    });


    // Вешаем клик на логотип
    $('.site-logo').first().click(function () {
        if (content_start_back_in_animate) return;
        if (!content_start_back_visible) {
            content_start_back_visible = true;
            $('.switch-page').css({display: 'none'});
            $('.btn').removeClass('active');
            $('.car-skeleton-path').css({display: 'block'});
            $('.content-start').css({display: 'block'});
            content_start_back_in_animate = true;
            $('.content-start').animate({opacity: 1.0}, function() {content_start_back_in_animate = false;});
            if (glitchEffectStartPage768)
                glitchEffectStartPage768.start();
            if (glitchEffectStartPage1080)
                glitchEffectStartPage1080.start();
            consoleWReg.focus_interrupt();

            // Остановить канвас-менеджер
            if (canvasManager.is_active) canvasManager.is_active = false;

            // Остановить видео
            if (videoPlayer && videoPlayerReadyState) {
                videoPlayer.pauseVideo();
                radioPlayer.set_volume(lastRadioPlayerVolumeBeforeVideoActive);
            }

            // Обработать hash_url - снова с этим багом-фичей
            setTimeout(function() {window.location.hash = '';}, 10);

        }
    });

    // Клик на отключение звуков сайта
    $('.site-sound-switch').first().click(function () {
        if (audioManager.general_gain == 0.0) {
            // Отключено, нужно включить звук
            audioManager.gain_all(GlobalGeneralSiteGain);
            radioPlayer.set_volume(lastRadioVolume, true);
            $(this).removeClass('off');
        }
        else {
            GlobalGeneralSiteGain = audioManager.general_gain;
            lastRadioVolume = radioPlayer.current_volume;
            audioManager.gain_all(0.0);
            radioPlayer.set_volume(0.0, true);
            $(this).addClass('off');
        }
    });

    // Обработка переключения вкладки сайта
    function sitePageFocus(focus) {
         if (focus) {// Отключено, нужно включить звук
            audioManager.gain_all(GlobalGeneralSiteGain);
        }
        else {
            GlobalGeneralSiteGain = audioManager.general_gain;
            audioManager.gain_all(0.0);
        }
    }

    window.onblur = function () {sitePageFocus(false);};
    window.onfocus = function () {sitePageFocus(true);};
    // завершение обработки переключения вкладки сайта

    // Вход и регистрация по Enter
    $('#RDSiteWReg input').on('keydown', windowRegKeyDownEnter);

    initConsoles();

    init_site_sound();

    window.onresize = function () {
        canvasManager.resize_window();

        var new_size = window.matchMedia("screen and (min-width: 1367px) and (min-height: 801px)").matches ? '1080' : '768';
        var old_size = currentSiteSize;
        if (new_size != currentSiteSize) {
            currentSiteSize = new_size;
            radioPlayer.change_site_size(old_size, new_size);
            //if (glitchEffectStartPage)
            //    glitchEffectStartPage.change_site_size(old_size, new_size);
            if (changeBackFrameEffect)
                changeBackFrameEffect.change_site_size(old_size, new_size);
        }

    };


    var hash_url = window.location.hash;
    if (hash_url && hash_url.length) {
        hash_url = hash_url.split('#')[1];
        if (hash_url.length) {
            if (hash_url.indexOf('news') == 0) {
                $('#RDbtn_news').click();
                var news_link = hash_url.split('=')[1];
                var jq_news = '';
                if (news_link && news_link.length) {
                    jq_news = $('.' + news_link).first();
                }
                else {
                    jq_news = $('.window-news-log-news-header').first();
                }
                viewNewsSilentClickReaction(jq_news[0]);
                setTimeout(function () {
                    setHashUrlForNews(jq_news[0]);
                }, 10);
            }
            else {
                if (hash_url.indexOf('start') == 0) {
                    // Не делать ничего, так как сделаем в функции GetUserInfo
                }
                else {
                    $('#RDbtn_' + hash_url).click();
                }
            }
        }
    }

    // Запрос разных рейтингов
    GetQuickGameRecords();
    var ratings_name = ['Traders', 'Looters', 'Heroes', 'Villain', 'Leaders', 'Warriors', 'Adventurers'];
    for (var i = 0; i < ratings_name.length; i++) {
        GetRatingInfo(ratings_name[i]);
    }

    initRadioPlayer();

    // Включение радио сразу
    if (hash_url && hash_url.length && hash_url.indexOf('about') == 0) {
        // Ничего не делать с радио
    } else { // Включить радио
        var radio_settings = getCookie('radio_player');
        if (radio_settings){
            try {
                var settings = radio_settings.split('_');
                radioPlayer.set_state(settings[0], parseInt(settings[1]), parseInt(settings[2]), parseFloat(settings[3]), parseInt(settings[4]));
            }
            catch (err) {
                console.error('Incorrect RadioPlayer settings: ', radio_settings);
            }
        }
        else {
            radioPlayer.click_power();
            radioPlayer.set_volume(lastRadioPlayerVolumeBeforeVideoActive);
        }
    }

    var img_start_page_1080 = new Image();
    img_start_page_1080.src = '/static/static_site/img/09-06-16/1080_car.png';
    SetImageOnLoad(img_start_page_1080, function () {
        glitchEffectStartPage1080 = new GlitchImageEffect('glitch_test_1080', img_start_page_1080, 8000, 1080);
        if (!hash_url.length) {
            glitchEffectStartPage1080.start();
        }
    });

    var img_start_page_768 = new Image();
    img_start_page_768.src = '/static/static_site/img/1366_june/768_car.png';
    SetImageOnLoad(img_start_page_768, function () {
        glitchEffectStartPage768 = new GlitchImageEffect('glitch_test_768', img_start_page_768, 8000, 768);
        if (!hash_url.length) {
            glitchEffectStartPage768.start();
        }
    });


    // Вешаем эвенты для отображения каркаса машинки
    var skeleton_logic = {
        glitch_opacity: 1.0,
        glitch_anim: false
    };

    $('.car-skeleton-path')
        .mouseover(function () {
            //console.log('mouseover');
            var name = $(this).data('name');
            //$(this).css('opacity', 1.0);
            //$('.content-start-back.glitch').css('opacity', 0.3);

            if (skeleton_logic[name]) skeleton_logic[name].finish();
            skeleton_logic[name] = $(this).animate({opacity: 1.0}, 500, function () {});

            if (skeleton_logic.glitch_anim) skeleton_logic.glitch_anim.finish();
            skeleton_logic.glitch_anim = $('.content-start-back.glitch').animate({opacity: 0.5}, 500, function () {});
            skeleton_logic.glitch_opacity = 0.3;
            $('.content-start-back.glitch').addClass('filtered');


            if (glitchEffectStartPage1080)glitchEffectStartPage1080.stop();
            if (glitchEffectStartPage768)glitchEffectStartPage768.stop();

            audioManager.play('skeleton_hover');
        })
        .mouseout(function () {
            //console.log('mouseout');
            //$(this).css('opacity', 0.0);
            //$('.content-start-back.glitch').css('opacity', 1);
            $(this).animate({opacity: 0.0}, 500, function () {});

            skeleton_logic.glitch_opacity = 1.0;
            if (skeleton_logic.glitch_anim) skeleton_logic.glitch_anim.finish();
            setTimeout(function() {
                if (skeleton_logic.glitch_opacity == 1.0) { // Значит мы снова зашли на какую-то систему
                    $('.content-start-back.glitch').animate({opacity: 1.0}, 500, function () {});
                    $('.content-start-back.glitch').removeClass('filtered');
                }

            }, 10);


            if (glitchEffectStartPage1080)glitchEffectStartPage1080.start();
            if (glitchEffectStartPage768)glitchEffectStartPage768.start();
        });

    // Клики на всякие кнопки внутри монитора
    // Hover
    $('.window-reg-up-btn,.window-qg-btn,.reg-btn,.reg1-btn,.reg2-btn,.reg3-btn,.slide-arrow,' +
        '.reg2-skill-table-counter-btn, .window-news-log-news-header, .scroll-btn, .window-ratings-header-path')
        .mouseover(function () {
            audioManager.play('button_screen_hover');
        });


    // Сохранение в куки значения аудиоплеера при уходе со страницы
    window.onbeforeunload = function (e) {
        radioPlayer.save_setting_to_cookie(true);
    };
}

function getCookie(name) {
  var matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

function changeLanguage(lang) {
    document.cookie = 'lang' + "=" + lang;
    window.location.reload();
}

function init_site_sound() {
    audioManager.gain_all(0.0);

    audioManager.load('microwave_btn_click', {url: '/static/audio/final_v1_mp3/buttons.mp3'}, null, null, 1.0);
    audioManager.load('microwave_btn_hover', {url: '/static/audio/final_v1_mp3/hover.mp3'}, null, null, 0.5);
    audioManager.load('skeleton_hover', {url: '/static/audio/final_v1_mp3/scaner.mp3'}, null, null, 0.5);
    audioManager.load('button_screen_hover', {url: '/static/audio/final_v1_mp3/button_screen_hover.mp3'}, null, null, 0.65);
    audioManager.load('button_screen_press', {url: '/static/audio/final_v1_mp3/button_screen_press.mp3'}, null, null, 1.0);
    audioManager.load('tumbler', {url: '/static/audio/final_v1_mp3/tumbler.mp3'}, null, null, 1.0);
    audioManager.load('listing', {url: '/static/audio/final_v1_mp3/listing.mp3'}, null, null, 1.0);
    audioManager.load('glitch_noise', {url: '/static/audio/final_v1_mp3/glitch_noise.mp3'}, null, null, 0.8);
    audioManager.load('error_1', {url: '/static/audio/signals/error_001.m4a'}, null, null, 0.6);
    audioManager.load('radio_noise_switch', {url: "/static/audio/final_v1_mp3/radio_static.mp3"}, null, null, 1.0);
    audioManager.load('key_cl_1', {url: '/static/audio/final_v1_mp3/type.mp3'}, null, null, 0.2);

    audioKeyboard = new AudioKeyboard([
        audioManager.get('key_cl_1')
    ]);
}

function GetQuickGameRecords() {
    $.ajax({
        url: location.protocol + '//' + location.host + '/site_api/get_quick_game_records',
        method: 'POST',
        data: {_xsrf: getCookie('_xsrf')},
        success: function (data) {
            $('#RDSiteQuickGameRatingsTable').empty();
            $('#RDSiteQuickGameRatingsTable').append(data);

        },
        error: function () {
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
        data: {rating_name: rating_name, _xsrf: getCookie('_xsrf')},
        success: function (data) {
            jq_elem.empty();
            jq_elem.append(data);
            if (rating_name == 'Traders') { // Если это первый рейтинг загрузился, то кликнуть на него
                $('.window-ratings-header-path').first().click();
            }

            jq_elem.find('.window-ratings-line').mouseover(function () {
                audioManager.play('button_screen_hover');
            });

        },
        error: function () {
            jq_elem.empty();
            jq_elem.append('<p style="margin-left: 20px">@admin>: Connection Error: 404 </br> Ratings not load.</p>');
        }
    });
}

function GetIDForStartRegistrationPage() {
    // Функция-контроллер, которая возвращает ID для клика на кнопку Начать Игру в зависимости от Статуса регистрации пользователя
    var map = {
        'not_register': 'RDSiteWReg', // Показывать нулевое окно регистрации или авторизации
        'nickname': 'RDSiteWReg1', // Показывать окно ввода ника и выбора класса
        'settings': 'RDSiteWReg2', // Показывать окно ввода навыков и перков
        'chip': 'RDSiteWReg3', // Показывать окно-чипа, предложенеи завершить регистрацию
        'register': 'RDSitePersonalInfo' // Показывать окно личного кабинета
    };

    if (map.hasOwnProperty(registration_status)) return map[registration_status];
    return map['not_register'];
}

function GetUserInfo() {
    $.ajax({
        url: location.protocol + '//' + location.host + '/site_api/get_user_info',
        method: 'POST',
        data: {_xsrf: getCookie('_xsrf')},
        success: function (data) {

            // todo: убрать после тестирования
            SetQuickGameBtnEnable(data.is_tester);

            registration_status = data.user_status;
            if (registration_status == 'register') {
                var pos_x = '';
                var pos_y = '';
                if (data.hasOwnProperty('position') && data.position && (data.position.length == 2)) {
                    pos_x = data.position[0].toFixed(0);
                    pos_y = data.position[1].toFixed(0);
                }
                consoleWPI.clear();
                consoleWPI.add_message('user', _('con_wpi_1'));
                consoleWPI.add_message(
                    'system',
                    _('con_wpi_2_1') + '\n' +
                    '-----------------------------\n' +
                    _('con_wpi_2_2') + data.user_name + '!\n' +
                    _('con_wpi_2_3') + data.user_balance + ' NC\n' +
                    _('con_wpi_2_4') + 'x' + pos_x + ':y' + pos_y + '\n' +
                    _('con_wpi_2_5')+ '_\n' +
                    _('con_wpi_2_6') + '_\n' +
                    '-----------------------------'
                );

                $('#RDSitePersonalInfoUserInfo').empty();
                $('#RDSitePersonalInfoUserCar').empty();
                $('#RDSitePersonalInfoUserInfo').append(data.user_info_html);
                $('#RDSitePersonalInfoUserCar').append(data.user_car_html);
            }
            if (registration_status == 'chip') {
                var ordinal_number = 1000000000 + data.ordinal_number;
                ordinal_number = ordinal_number.toString();
                ordinal_number = ordinal_number.substr(1, ordinal_number.length);

                var d = new Date(data.created);
                d.setFullYear(d.getFullYear() + 100);

                $('#RDSiteWReg3_OrdinalNumber').text(ordinal_number);
                $('#RDSiteWReg3_Created').text(d.toLocaleDateString());

                $('#RDSiteWReg3_Nickname').text(data.user_name);

                var procent_length = 20 + 4 * data.user_name.length;
                procent_length = procent_length > 80 ? 80 : procent_length;
                $('#RDSiteWReg3_Nickname').parent().width(procent_length + '%');

                $('#RDSiteWReg3_UserBalance').text(data.user_balance);

                $('#RDSiteWReg3_AvatarBlock').css('background-image', 'url(' + data.avatar_link + ')');

                // todo: считать перки и навыки
            }
            if (registration_status == 'settings') {
                GetUserRPGInfo();
            }
            if (registration_status == 'nickname') {
                SetCurrentAvatar();
                SetCurrentClass();
            }
            if (registration_status == 'quick_user') {
                console.log('Произошёл запрос информации для QuickGameUser');
                return;
            }

            // Переход на следующую страницу
            if (window.location.hash == '#start') {
                // Должны кликнуть для определения какую именно из первых страниц показывать
                $('#RDbtn_start').removeClass('active'); // Хитрость
                $('#RDbtn_start').click();
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('Error GetUserInfo');
        }
    });
}

function GetRPGInfo() {
    $.ajax({
        url: location.protocol + '//' + location.host + '/site_api/get_rpg_info',
        method: 'POST',
        data: {_xsrf: getCookie('_xsrf')},
        success: function (data) {
            //console.log(data);
            // Установка аватаров:
            var avatar_container = $('.reg1-path-avatar-list').first();
            avatar_container.empty();
            reg1_avatar_count = data.avatar_list.length;
            for (var i = 0; i < data.avatar_list.length; i++) {
                var d = $('<div id="reg1_avatar_' + i + '" class="reg1-path-avatar-item"></div>');
                avatar_container.append(d);
                d.css('background-image', 'url(' + data.avatar_list[i] + ')');
            }

            // Установка классов
            var role_class_container = $('.reg1-path-class-list').first();
            role_class_container.empty();
            reg1_class_count = data.class_list.length;
            role_class_list_info = data.class_list;
            for (var i = 0; i < data.class_list.length; i++) {
                var d = $('<div id="reg1_class_' + i + '" class="reg1-path-class-item"></div>');
                role_class_container.append(d);
                d.css('background-image', 'url(' + role_class_list_info[i].icon + ')');
            }
        }
    });
}

function GetUserRPGInfo(action, skill_name, perk_node) {
    $.ajax({
        url: location.protocol + '//' + location.host + '/site_api/get_user_rpg_info',
        method: 'POST',
        data: {
            action: action,
            skill_name: skill_name,
            perk_node: perk_node,
            _xsrf: getCookie('_xsrf')
        },
        success: function (data_str) {
            //console.log(data);
            var data = JSON.parse(data_str);
            if (data.status == 'success') {
                // Отобразить show_skills в вёрстку
                for (var key in data.show_skills)
                    if (data.show_skills.hasOwnProperty(key)) {
                        $('#reg2_' + key).text(data.show_skills[key]);
                        $('#reg3_' + key).text(data.show_skills[key]);

                        if (key == data.role_class_target_0) {
                            $('#reg2_' + key).parent().parent().find('.reg2-skill-table-label span').addClass('decorator');
                            $('#reg2_' + key).addClass('decorator')
                        }
                        else {
                            $('#reg2_' + key).parent().parent().find('.reg2-skill-table-label span').removeClass('decorator');
                            $('#reg2_' + key).removeClass('decorator');
                        }
                    }

                // Записываем свободные очки
                reg2_skill_point = data.free_point_skills;
                $('#reg2_free_skils').text(reg2_skill_point);

                // Перки
                reg2_perk_point = data.free_point_perks;
                $('#reg2_free_perks').text(reg2_perk_point);
                var jq_perk_table = $('#re2_perk_table');
                var jq_perk_chip_perk_list = $('#RDSiteWReg3_PerkList');
                jq_perk_table.empty();
                jq_perk_chip_perk_list.empty();

                if (data.perks) {
                    for (var i = 0; i < data.perks.length; i++) {
                        var perk_rec = data.perks[i];
                        var jq_perk = $(
                            '<div class="reg2-table-line ' + (i % 2 ? '' : 'odd') + '">' +
                            '<div class="reg2-perk-table-label" data-title="' + perk_rec.perk['title__' + locale_object.locale] + '" data-description="' + perk_rec.perk['description__' + locale_object.locale] + '">' + perk_rec.perk['title__' + locale_object.locale] + '</div>' +
                            '<div class="reg2-perk-table-checkbox-block" onclick="Reg2PerkClick(`' + perk_rec.perk.uri + '`)">[' + (perk_rec.active ? '●' : ' ') + ']</div>' +
                            '</div>');
                        jq_perk_table.append(jq_perk);
                        jq_perk.find('.reg2-perk-table-label').click(function() {
                            var title = $(this).data('title');
                            var description = $(this).data('description');
                            consoleWReg2.add_message('user', _('con_wreg_msg46'), true);
                            consoleWReg2.add_message('system', _('con_wreg_msg47') + title + '.\n' +
                                description + '.\n' + '--------------------------------------------------------------');
                        });
                        if (perk_rec.active) {
                            var jq_perk_chip = $(
                                '<div class="site-chip-content-line shift">' +
                                '<div class="site-chip-content-line-text left">' + perk_rec.perk['title__' + locale_object.locale] + '</div>' +
                                '</div>'
                            );
                            jq_perk_chip_perk_list.append(jq_perk_chip);
                        }
                    }
                }
                // Обновление чипа
                $('#RDSiteWReg3_RoleClass').text(data.role_class_title);

                if (registration_status == 'nickname') {
                    SetCurrentAvatar();
                    SetCurrentClass();
                }
            }
        }
    });
}

function windowRegKeyDownEnter(event) {
    if (event.keyCode != 13) return;
    var jq_target = $(event.currentTarget);
    var target_id = jq_target.attr('id');
    // info: Можно упростисть, заранее определив jq_password и func_click, но будет казаться запутанным
    if (target_id == 'reg_email') {
        var jq_reg_password = $('#reg_password');
        // Если пароль вбит, то попробовать зарегистрироваться // todo: и его длина больше 4-х симовлов
        if (jq_reg_password.val().length >= 1) { // >= 4
            RegisterBtnClick();
        }
        else {
            jq_reg_password[0].focus();
        }
    }
    if (target_id == 'auth_email') {
        var jq_auth_password = $('#auth_password');
        // Если пароль вбит, то попробовать зарегистрироваться // todo: и его длина больше 4-х симовлов
        if (jq_auth_password.val().length >= 1) { // >= 4
            AuthorisationBtnClick();
        }
        else {
            jq_auth_password[0].focus();
        }
    }

    if (target_id == 'reg_password') {
        var jq_reg_email = $('#reg_email');
        if (jq_reg_email.val().length >= 3) { // >= 4
            RegisterBtnClick();
        }
        else {
            jq_reg_email[0].focus();
        }
    }

    if (target_id == 'auth_password') {
        var jq_auth_email = $('#auth_email');
        if (jq_auth_email.val().length >= 3) { // >= 4
            AuthorisationBtnClick();
        }
        else {
            jq_auth_email[0].focus();
        }
    }
}

/* Youtube Video Player Functions */

function onPlayerReady(event) {
    //console.log('onPlayerReady');
    //event.target.setVolume(100);
    //event.target.playVideo();
    videoPlayerReadyState = true;
    if ($('#RDSiteGameInfo').hasClass('active')) {
        videoPlayer.playVideo();
        lastRadioPlayerVolumeBeforeVideoActive = radioPlayer.current_volume;
        radioPlayer.set_volume(0.0);
    }
}

function onPlayerError(event) {
    console.log('onPlayerError');
    videoPlayerReadyState = false;
}

