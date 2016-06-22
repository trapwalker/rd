// Кусок кода отвечающий за прототипное наследование
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};


var rating_users_info_list = {}; // Список пользователей в рейтингах, чтобы каждого запрашивать только по 1 разу в 5-10 минут
var registration_status = 'not_register';


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
    canvasManager = new CanvasManager();
    canvasNoise = new CanvasNoise();
    canvasDisplayLine = new CanvasDisplayLine();
    canvasDisplayRippling = new CanvasDisplayRippling();
    canvasBlackOut = new CanvasBlackOut();
    //indicatorBlink = new IndicatorBlink();
    //textBlurBlink = new TextBlurBlink();

    // Получить стартовые ролевые классы и аватарки
    GetRPGInfo();

    // Получить текущего пользователя
    GetUserInfo();

    // Инициализация анимации платы
    var plate_img = new Image();
    plate_img.src = '/static/static_site/img/chip_anim_all.png';


    SetImageOnLoad(plate_img, function (img) {
            console.info('Event!!! haha!!! Event on load!!!!');
            eCanvasChipAnimation = new ECanvasChipAnimation(img);
        }
    );


    initConsoles();

    init_site_sound();

    window.onresize = function() {
        canvasManager.resize_window();

        var new_size = $('.content-block').width() > 800 ? '1080' : '768';
        var old_size = currentSiteSize;
        if (new_size != currentSiteSize) {
            currentSiteSize = new_size;
            radioPlayer.change_site_size(old_size, new_size);

        }

    };


    var hash_url = window.location.hash;
    if (hash_url && hash_url.length) {
        hash_url = hash_url.split('#')[1];
        if (hash_url.length)
            $('#RDbtn_' + hash_url).click();
    }

    // Запрос разных рейтингов
    GetQuickGameRecords();
    var ratings_name = ['Traders', 'Looters', 'Heroes', 'Villain', 'Leaders', 'Warriors', 'Adventurers'];
    for (var i = 0; i < ratings_name.length; i++) {
        GetRatingInfo(ratings_name[i]);
    }

    initRadioPlayer();

    if (! hash_url.length)
        glitchInit();
}

function init_site_sound() {
    //audioManager.gain_all(0.01);

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

function GetIDForStartRegistrationPage(){
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
        data: {},
        success: function (data) {
            registration_status = data.user_status;
            if (registration_status == 'register') {
                var pos_x = '';
                var pos_y = '';
                if (data.hasOwnProperty('position') && data.position && (data.position.length == 2)) {
                    pos_x = data.position[0].toFixed(0);
                    pos_y = data.position[1].toFixed(0);
                }
                consoleWPI.clear();
                consoleWPI.add_message('user', 'Загрузка системы навигации.');
                consoleWPI.add_message(
                    'system',
                    'Успешно.\n' +
                    '-----------------------------\n' +
                    'Добро пожаловать, ' + data.user_name + '!\n' +
                    'Ваш баланс: ' + data.user_balance + ' нукойнов\n' +
                    'Ваши координаты: x' + pos_x + ':y' + pos_y + '\n' +
                    'Ваша страховка: _\n' +
                    'Активных заданий: _\n' +
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
            if (window.location.hash == '#start')
                $('#RDbtn_start').click();
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
        data: {},
        success: function (data) {
            // Установка аватаров:
            var avatar_container = $('.reg1-path-avatar-list').first();
            avatar_container.empty();
            reg1_avatar_count =  data.avatar_list.length;
            for (var i = 0; i < data.avatar_list.length; i++) {
                var d = $('<div id="reg1_avatar_' + i +'" class="reg1-path-avatar-item"></div>');
                avatar_container.append(d);
                d.css('background-image', 'url(' + data.avatar_list[i] + ')');
            }

            // Установка классов
            var role_class_container = $('.reg1-path-class-list').first();
            role_class_container.empty();
            reg1_class_count =  data.class_list.length;
            role_class_list_info = data.class_list;
            for (var i = 0; i < data.class_list.length; i++) {
                var d = $('<div id="reg1_class_' + i +'" class="reg1-path-class-item"></div>');
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
            perk_node: perk_node
        },
        success: function (data) {
            //console.log(data);
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
                $('#reg2_free_perks').text(data.free_point_perks);
                var jq_perk_table = $('#re2_perk_table');
                var jq_perk_chip_perk_list = $('#RDSiteWReg3_PerkList');
                jq_perk_table.empty();
                jq_perk_chip_perk_list.empty();

                if (data.perks) {
                    for (var i = 0; i < data.perks.length; i++) {
                        var perk_rec = data.perks[i];
                        var jq_perk = $(
                            '<div class="reg2-table-line ' + (i % 2 ? '' : 'odd') + '" onclick="Reg2PerkClick(`' + perk_rec.perk.node_hash + '`)">' +
                            '<div class="reg2-perk-table-label">' + perk_rec.perk.title + '</div>' +
                            '<div class="reg2-perk-table-checkbox-block">[' + (perk_rec.active ? '●' : ' ') + ']</div>' +
                            '</div>');
                        jq_perk_table.append(jq_perk);

                        if (perk_rec.active) {
                            var jq_perk_chip = $(
                                '<div class="site-chip-content-line shift">' +
                                '<div class="site-chip-content-line-text left">' + perk_rec.perk.title + '</div>' +
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




var glitchInterval;
var glitchTimeouts = [];

function glitchStop(){
    if (glitchInterval) {
        clearTimeout(glitchInterval);
        glitchInterval = null;
    }

    while (glitchTimeouts.length) {
        clearTimeout(glitchTimeouts.pop());
    }
}



function glitchInit() {
    var canvas = document.getElementById('glith_test');
    var context = canvas.getContext('2d');
    var img = new Image();
    var w;
    var h;
    var globalCompositeOperationArray = ['overlay', 'lighter', 'screen', 'color-dodge'];
    var current_opacity = 1.0;
    console.log('glitchInit start ', timeManager.getTime());

    var draw_pure_image = function () {
        while (glitchTimeouts.length) {
            clearTimeout(glitchTimeouts.pop());
        }
        clear();
        context.drawImage(img, 0, 0, w, h, 0, 0, w, h);

        if (current_opacity != 1.0) {
            current_opacity = 1.0;
            $('.content-start-back.content-start.road-grid').css('opacity', current_opacity);
            $('.content-start-back.content-start.road').css('opacity', current_opacity);
        }
    };

    var glith_timeot_fire = function () {
        console.log('glith_timeot_fire start at ', timeManager.getTime());
        clear();
        context.drawImage(img, 0, 0, w, h, 0, 0, w, h);
        var i = 0;
        var one_frame = 130;
        for (i = 1; i < randInt(6, 9); i++) {
            glitchTimeouts.push(setTimeout(glitchImg, randInt2(i * one_frame, 50)));
        }
        glitchTimeouts.push(setTimeout(draw_pure_image, randInt2(i * one_frame, 50)));

        glitchInterval = setTimeout(glith_timeot_fire, randInt2(6000, 3000));
    };

    var init = function () {
        clearTimeout(glitchInterval);
        canvas.width = w = 2013;
        canvas.height = h = 997;
        glitchInterval = setTimeout(glith_timeot_fire, randInt2(6000, 3000));
        draw_pure_image();
    };

    var clear = function () {
         context.clearRect(0, 0, w, h);
    };


    var grayscale = function (pixels) {
        // получаем одномерный массив, описывающий все пиксели изображения
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        return pixels;
    };

    var threshold = function (pixels, threshold) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= threshold) ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = v
        }
        return pixels;
    };

    var glitchImg = function () {

        context.save();
        var opacity = null;
        context.clearRect(0, 0, w, h);

        // Глобальная прозрачность
        if (Math.random() < 0.6) {
            opacity =  Math.random() * 0.5 + 0.3;
            context.globalAlpha = opacity;
        }
        // Сдвиг всей машинки
        if (Math.random() < 0.4) {
            var offset_x = Math.random() * 15;
            var offset_y = Math.random() * 12;
            context.drawImage(img, 0, 0, w, h, offset_x, offset_y, w, h);
        }else {
            context.drawImage(img, 0, 0, w, h, 0, 0, w, h);
        }

        // Глич отдельных частей машинки
        for (var i = 0; i < randInt(2, 10); i++) {
            var x = Math.random() * w;
            var rand_offset_x = Math.random() * 200 - 100;
            var rand_offset_y = Math.random() * 60 - 30;
            var y = Math.random() * h;
            var spliceHeight = randInt(40, 100);
            context.save();
            if (y < 300 && Math.random() < 0.4) { // Значит можно делать globalCompositeOperation
                context.globalCompositeOperation = globalCompositeOperationArray[Math.floor(Math.random() * 4)];
            }
            context.drawImage(canvas,
                0, y, w, spliceHeight,
                rand_offset_x, y + rand_offset_y, w, spliceHeight);


            if (Math.random() > 0.7) {
                var imageData = context.getImageData(0, y, w, spliceHeight);
                var imageDataFiltered = Math.random() > 0.4 ? grayscale(imageData) : threshold(imageData, 100);
                //var imageDataFiltered = grayscale(imageData);
                context.putImageData(imageDataFiltered, 0, y);
            }

            context.restore();
        }

        context.restore();

        if (opacity && Math.random() > 0.5) {
            current_opacity = opacity;
            if (Math.random() > 0.5)
                $('.content-start-back.content-start.road-grid').css('opacity', current_opacity);
            if (Math.random() > 0.5)
                $('.content-start-back.content-start.road').css('opacity', current_opacity);
        }

    };

    var randInt = function (a, b) {
        return ~~(Math.random() * (b - a) + a);
    };

    var randInt2 = function (number, radius) {
        return randInt(number - radius, number + radius);
    };


    img.src = '/static/static_site/img/09-06-16/1080_car.png';
    SetImageOnLoad(img, init);
}

