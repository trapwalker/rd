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

var cut_radio_player = null;


function SetImageOnLoad(img, onLoadHandler) {
    if (img.complete) {
        onLoadHandler(img);
        return;
    }
    img.addEventListener('load', function () {
        onLoadHandler(img);
    }, false);
}


function centered_window() {
    var all_height = $('.shift-content-block').height();
    var window_height = $('.content-block').height();
    if ((all_height - window_height) > 150)
        $('.content-block').css('padding-top', (all_height - window_height) / 2 - 20 + 'px');
    else
        $('.content-block').css('padding-top', '50px');
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

    //init_preload_images();

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

    // Клик на отключение звуков сайта
    $('.site-sound-switch').first().click(function () {
        if (audioManager.general_gain == 0.0) {
            // Отключено, нужно включить звук
            audioManager.gain_all(GlobalGeneralSiteGain);
            set_radio_volume(GlobalGeneralSiteGain);
            $(this).removeClass('off');
        }
        else {
            GlobalGeneralSiteGain = audioManager.general_gain;
            audioManager.gain_all(0.0);
            set_radio_volume(0.0);
            $(this).addClass('off');
        }
    });


    // Вход и регистрация по Enter
    $('#RDSiteWReg input').on('keydown', windowRegKeyDownEnter);


    initConsoles();

    init_site_sound();
    init_radio_cut();  // Инициализация обрезанного радио - будет играть только 128 виджиланте

    centered_window();

    window.onresize = function () {
        canvasManager.resize_window();
        var new_size = window.matchMedia("screen and (min-width: 1367px) and (min-height: 801px)").matches ? '1080' : '768';
        var old_size = currentSiteSize;
        if (new_size != currentSiteSize) {
            currentSiteSize = new_size;
            //if (glitchEffectStartPage)
            //    glitchEffectStartPage.change_site_size(old_size, new_size);
            if (changeBackFrameEffect)
                changeBackFrameEffect.change_site_size(old_size, new_size);
        }
        centered_window();
    };

    // Клики на всякие кнопки внутри монитора
    // Hover
    $('.window-reg-up-btn,.window-qg-btn,.reg-btn,.reg1-btn,.reg2-btn,.reg3-btn,.slide-arrow,' +
        '.reg2-skill-table-counter-btn, .window-news-log-news-header, .scroll-btn, .window-ratings-header-path')
        .mouseover(function () {
            audioManager.play('button_screen_hover');
        });
}

function getCookie(name) {
  var matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}


function init_site_sound() {
    //audioManager.gain_all(0.0);

    audioManager.load('microwave_btn_click', {url: '/static/audio/final_v1_mp3/buttons.mp3'}, null, null, 1.0);
    audioManager.load('microwave_btn_hover', {url: '/static/audio/interface/hover_001.m4a'}, null, null, 0.5);
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

function init_radio_cut() {
    audioManager.load('vigilante_128', {url: "http://listen.radiotower.su:8000/vigilante_2084_128"}, true, TagAudioObject, 1.0);
    cut_radio_player = audioManager.get('vigilante_128');

    $(".electron-sound-volume-diagram").click(function (event) {
        var max_width = event.target.offsetWidth || 1;
        set_radio_volume(event.offsetX / max_width);
    });

    set_radio_volume(0.2);
}


function set_radio_volume(value) {
    var jj = $(".electron-sound-volume-diagram").first();
    var max_width = jj[0].offsetWidth || 1;
    value = Math.min(Math.max(value, 0.03), 1.0);
    jj.find(".electron-sound-volume-diagram-hover").first().width(value * max_width);
    audioManager.gain_all(value);
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
        timeout: 10000,
        success: function (data) {
            registration_status = data.user_status;
            if (registration_status == 'register') {
                var pos_x = '';
                var pos_y = '';
                var insurance_name = '_';
                var active_quests = '_';
                if (data.hasOwnProperty('position') && data.position && (data.position.length == 2)) {
                    pos_x = data.position[0].toFixed(0);
                    pos_y = data.position[1].toFixed(0);
                }
                if (data.hasOwnProperty('insurance_name'))
                    insurance_name = data.insurance_name;
                if (data.hasOwnProperty('active_quests_count'))
                    active_quests  = data.active_quests_count;

                consoleWPI.clear();
                consoleWPI.add_message('user', _('con_wpi_1'));
                consoleWPI.add_message(
                    'system',
                    _('con_wpi_2_1') + '\n' +
                    '-----------------------------\n' +
                    _('con_wpi_2_2') + data.user_name + '!\n' +
                    _('con_wpi_2_3') + data.user_balance + ' NC\n' +
                    _('con_wpi_2_4') + 'x' + pos_x + ':y' + pos_y + '\n' +
                    _('con_wpi_2_5') + insurance_name + '\n' +
                    _('con_wpi_2_6') + active_quests + '\n' +
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

            EmitClickBtnStart();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            // todo: Закрыть электрон клиент или перезапустить
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

            // Вызов функций установки классов и аватаров
            SetCurrentAvatar();
            SetCurrentClass();
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
                            '<div class="reg2-perk-table-label" data-title="' + _(perk_rec.perk['title']) + '" data-description="' + _(perk_rec.perk['description_locale']) + '">' + _(perk_rec.perk['title']) + '</div>' +
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
                                '<div class="site-chip-content-line-text left">' + perk_rec.perk.title[locale_object.locale] + '</div>' +
                                '</div>'
                            );
                            jq_perk_chip_perk_list.append(jq_perk_chip);
                        }
                    }
                }
                // Обновление чипа
                $('#RDSiteWReg3_RoleClass').text(data.role_class_title[locale_object.locale]);

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


function EmitClickBtnStart() {
    // Запустить канвас-менеджер
    if (!canvasManager.is_active) canvasManager.is_active = true;

    // Скрыть все окна
    $('.switch-page').css({display: 'none'});

    // Получить id-шник страницы, которую нужно отобразить
    var data = GetIDForStartRegistrationPage();
    // Показать окно
    $('#' + data).css({display: 'block'});

    canvasDisplayLine.play();
    canvasDisplayRippling.play();


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
};