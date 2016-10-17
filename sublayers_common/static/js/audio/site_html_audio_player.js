var lastRadioVolume = 1.0;

var constHtmlSize = {
    1080: {
        offset_click_scale: 32,
        width_channels_rail: 240,
        width_channels_rail_click: 200,
        height_channels_rail: 22,
        height_channels_pointer: 18,
        width_of_one_station: 43,
        height_volume_disc: 105,
        height_volume_indicator: 110
    },
    768: {
        offset_click_scale: 27,
        width_channels_rail: 196,
        width_channels_rail_click: 164,
        height_channels_rail: 18,
        height_channels_pointer: 16,
        width_of_one_station: 35,
        height_volume_disc: 85,
        height_volume_indicator: 90
    }
};


var RadioPlayer = (function () {
    function RadioPlayer(options) {
        var name = options.name;
        this.name = name;
        this.audio = new Audio();

        this.channels = options.channels;
        this.channel_name_prefix = options.channel_name_prefix;
        this.channel_map = options.channel_map;
        this.quality_map = options.quality_map;

        this.current_volume = null;

        this.playing = false;
        this.play_started = false;

        // timeout на загрузку радио при старте проигрывания
        this.timer_for_buffer = null;

        // Вешаем эвенты на элементы управления плеером
        // сеть:
        this.power_on = false;
        //this.jq_power_btn = $('.radio-power-btn').first();
        //this.jq_power_btn.click(RadioPlayer.prototype.click_power.bind(this));

        // качество
        //this.jq_quality_btn = $('.radio-quality-btn').first();
        //this.jq_quality_btn.click(RadioPlayer.prototype.change_quality.bind(this));

        // Переключение радиостанций - самое сложное здесь!
        var self = this;
        this.current_channel_pointer_number = 0;
        this.jq_channels_block = $('.radio-slider-channel').first();
        this.jq_channels_carrete = $('.radio-slider-carette').first();
        this.jq_channels_pointer = $('.radio-slider-channel-pointer').first();
        this.jq_channels_carrete.draggable({
            containment: this.jq_channels_block,
            axis: "x",
            drag: RadioPlayer.prototype.set_channel_drag_handler.bind(this),
            stop: RadioPlayer.prototype.set_channel_drag_stop_handler.bind(this)
        });

        // Клик на шкалу
        $('.radio-scale-channels-block').click(function (event) {
            var x1 = $(event.currentTarget).offset().left;
            var x2 = event.clientX;
            self.set_channel_carrete(x2 - x1 - constHtmlSize[currentSiteSize].offset_click_scale);
        });

        // Дисплей и работа с ним
        this.jq_display = $('.radio-screen-content').first();

        // Работа с громкостью
        this.jq_volume_indicator = $('.radio-volume-indicator-block').first();
        this.jq_volume_indicator.click(function (event) {
            var y1 = $(event.currentTarget).offset().top;
            var y2 = event.clientY;
            var volume = (y2 - y1) / constHtmlSize[currentSiteSize].height_volume_indicator;
            if (volume > 1.0 || volume < 0.0) return;
            self.set_volume((1.0 - volume).toFixed(2));
            lastRadioPlayerVolumeBeforeVideoActive = self.current_volume;
        });

        this.jq_volume_disc = $('.radio-volume-controller-images').first();
        this.jq_volume_disc_item = $('.radio-volume-controller-item').first();
        this.volume_disc_active = false;
        this.volume_disc_start_coord = null;

        this.jq_volume_disc.mousedown(function (event) {
            self.volume_disc_active = true;
            self.volume_disc_start_coord = event.clientY + (self.current_volume * constHtmlSize[currentSiteSize].height_volume_disc);
        });
        this.jq_volume_disc.mousemove(function (event) {
            if (self.volume_disc_active) {
                if (self.power_on) { // Колёсико влияет на звук только когда включено питание
                    var value = self.volume_disc_start_coord - event.clientY;
                    if (value > 100) value = 100;
                    if (value < 0) value = 0;
                    self.set_volume((Math.abs(value) / 100.).toFixed(2));
                    lastRadioPlayerVolumeBeforeVideoActive = self.current_volume;
                }
                // Изменение колёсика
                if (self.jq_volume_disc_item.hasClass('item-2')) {
                    self.jq_volume_disc_item.removeClass('item-2');
                    self.jq_volume_disc_item.addClass('item-1');
                }
                else {
                    self.jq_volume_disc_item.removeClass('item-1');
                    self.jq_volume_disc_item.addClass('item-2');
                }
            }
        });
        this.jq_volume_disc.mouseleave(function () {
            self.volume_disc_active = false;
        });
        this.jq_volume_disc.mouseup(function () {
            self.volume_disc_active = false;
        });

        // инициализация громкости
        this.current_volume = 0.5;

        // Инициализация при старте (всё выключено)
        this.jq_display.css('display', 'none');
        this.jq_volume_indicator.css('display', 'none');

        // Эвенты на воспроизведение
        this.audio.onloadeddata = RadioPlayer.prototype.load_buffer_complete.bind(this);
        this.audio.onpause = RadioPlayer.prototype.onpause.bind(this);
    }

    RadioPlayer.prototype.set_channel_drag_handler = function (event, ui) {
        if (ui.position.left < 0) ui.position.left = 0;
        if (ui.position.left > constHtmlSize[currentSiteSize].width_channels_rail) ui.position.left = constHtmlSize[currentSiteSize].width_channels_rail;
        ui.position.top = (ui.position.left * constHtmlSize[currentSiteSize].height_channels_rail / constHtmlSize[currentSiteSize].width_channels_rail).toFixed(0);
        var pointer_top = (ui.position.left * constHtmlSize[currentSiteSize].height_channels_pointer / constHtmlSize[currentSiteSize].width_channels_rail).toFixed(0);
        this.jq_channels_pointer.css({left: ui.position.left + 'px', top: pointer_top + 'px'});
    };

    RadioPlayer.prototype.set_channel_drag_stop_handler = function (event, ui) {
        var old_channel = this.current_channel_pointer_number;
        this.current_channel_pointer_number = Math.floor(this.jq_channels_carrete.position().left / constHtmlSize[currentSiteSize].width_of_one_station);
        if (!this.channel_map.hasOwnProperty(this.current_channel_pointer_number)) {
            this.current_channel_pointer_number = 0;
        }
        if (this.playing && old_channel != this.current_channel_pointer_number) this.click_play();
        //console.log(this.current_channel_pointer_number);
    };

    RadioPlayer.prototype.set_channel_carrete = function (offset_x) {
        if (offset_x < 0) offset_x = 0;
        if (offset_x > constHtmlSize[currentSiteSize].width_channels_rail_click) offset_x = constHtmlSize[currentSiteSize].width_channels_rail_click;
        var carrete_top = (offset_x * constHtmlSize[currentSiteSize].height_channels_rail / constHtmlSize[currentSiteSize].width_channels_rail).toFixed(0);
        var pointer_top = (offset_x * constHtmlSize[currentSiteSize].height_channels_pointer / constHtmlSize[currentSiteSize].width_channels_rail).toFixed(0);
        this.jq_channels_carrete.css({left: offset_x + 'px', top: carrete_top + 'px'});
        this.jq_channels_pointer.css({left: offset_x + 'px', top: pointer_top + 'px'});

        this.set_channel_drag_stop_handler()
    };

    RadioPlayer.prototype.get_channel_key = function () {
        var channel = this.current_channel_pointer_number;
        var quality = this.jq_quality_btn.hasClass('high-quality') ? '0' : '1';

        var channel_str = this.channel_map.hasOwnProperty(channel) ? this.channel_map[channel] : null;
        var quality_str = this.quality_map.hasOwnProperty(quality) ? this.quality_map[quality] : null;

        if (!channel_str || !quality_str) {
            console.error('Ошибка !!!!!!! ', this);
            return '';
        }
        //console.log(this.channel_name_prefix + channel_str + '_' + quality_str);
        return this.channel_name_prefix + channel_str + '_' + quality_str;
    };

    RadioPlayer.prototype.load_buffer_complete = function () {
        //console.log('RadioPlayer.prototype.load_buffer_complete', event);

        if (this.timer_for_buffer) {  // Если успел загрузиться до таймаута, то отменить таймаут
            clearTimeout(this.timer_for_buffer);
            this.timer_for_buffer = null;
            // Выключить звук помех
            audioManager.stop('radio_noise_switch');
        }
        else {
            // Загрузка произошла после таймаута.
            // todo: Что-то предпринять!!!  - Сейчас это будет значить бесконечные помехи
            //this.click_stop();
            return;
        }

        //
        this.play_started = true;

        //this.jq_btn_stop.css({display: 'block'});
        //this.jq_btn_play.css({display: 'none'});

        //this.jq_station_name.text(this.channels[this.get_channel_key()].name);
        this.jq_display.removeClass('scan');
        this.jq_display.addClass(this.channels[this.get_channel_key()].screen_class);
    };

    RadioPlayer.prototype.load_buffer_timeout = function () {
        //console.log('RadioPlayer.prototype.load_buffer_timeout', event);
        // Если мы здесь, значит радио не успело загрузиться.
        // Выключить звук помех
        //audioManager.stop('radio_noise_switch');
        this.timer_for_buffer = null;
    };

    RadioPlayer.prototype.onpause = function () {
        //this.jq_btn_stop.css({display: 'none'});
        //this.jq_btn_play.css({display: 'block'});

        //this.jq_station_name.text('paused ...');
    };

    RadioPlayer.prototype.click_play = function (event) {
        //console.log('RadioPlayer.prototype.click_play', event);
        var radio_key = this.get_channel_key();
        if (!this.channels.hasOwnProperty(radio_key)) {
            console.warn('Что-то пошло не так! Нет ключа: ', radio_key);
            return;
        }
        var new_scr = this.channels[radio_key].link;
        if (this.playing && this.audio.src == new_scr) {
            console.warn('Нет смысла нажимать play для неизменившегося source', radio_key);
            return;
        }
        if (this.playing && this.play_started) this.audio.pause();

        this.audio.src = new_scr;
        this.audio.play();

        if (this.timer_for_buffer) clearInterval(this.timer_for_buffer);
        this.timer_for_buffer = setTimeout(RadioPlayer.prototype.load_buffer_timeout.bind(this), 60000);
        this.play_started = false;
        this.playing = true;

        // Запуск шума в цикле
        audioManager.play('radio_noise_switch', 0, this.current_volume, null, true, Math.random() * 35);
        // Смена названия радиостанции на "поиск"
        //this.jq_station_name.text(RadioNameSwitchText);
        this.jq_display.removeClass('junk maddog rrn town vigilante');
        this.jq_display.addClass('scan');
    };

    RadioPlayer.prototype.click_stop = function (event) {
        //console.log('RadioPlayer.prototype.click_stop', event);
        if (this.playing) this.audio.pause();
        this.playing = false;

        if (this.timer_update_track) {
            clearInterval(this.timer_update_track);
            this.timer_update_track = null;
        }
    };

    RadioPlayer.prototype.click_power = function (event) {
        if (this.power_on) {
            this.click_stop();
            this.jq_power_btn.removeClass('active');
            this.jq_power_btn.text('ВЫКЛ');
            this.jq_quality_btn.removeClass('active');
            this.jq_display.css('display', 'none');
            this.jq_volume_indicator.css('display', 'none');
            this.power_on = false;
            audioManager.stop('radio_noise_switch');
        }
        else {
            this.click_play();
            this.jq_power_btn.addClass('active');
            this.jq_power_btn.text('ВКЛ');
            this.jq_quality_btn.addClass('active');
            this.jq_display.css('display', 'block');
            this.jq_volume_indicator.css('display', 'block');
            this.power_on = true;
            // Отстроить звук
            this.set_volume(this.current_volume, true);
        }

        // Звук кнопки сети
        audioManager.play('tumbler');
    };

    RadioPlayer.prototype.set_volume = function (volume, not_ignore_equals) {
        //console.log('RadioPlayer.prototype.change_volume', volume);
        if (!not_ignore_equals && this.current_volume == volume) return;
        this.current_volume = volume;
        this.audio.volume = this.current_volume;
        // Изменение шума помех, если вдруг они запущены
        audioManager.gain('radio_noise_switch', this.current_volume);

        // Правка вёрстки уровня громкости
        var jq_childs = this.jq_volume_indicator.children();
        jq_childs.removeClass('active');
        var indicator_count = Math.floor(volume * 100 / 14.);
        //console.log(indicator_count, this.current_volume);
        for (var i = 0; i < indicator_count; i++) {
            $(jq_childs[i]).addClass('active');
        }
    };

    RadioPlayer.prototype.change_channel = function (event) {
        //console.log('RadioPlayer.prototype.change_channel', event);
        if (this.playing) this.click_play();
    };

    RadioPlayer.prototype.change_quality = function (event) {
        //console.log('RadioPlayer.prototype.change_quality', event);
        if (this.jq_quality_btn.hasClass('high-quality')) {
            //this.jq_quality_btn.addClass('active');
            this.jq_quality_btn.text('320');
            this.jq_quality_btn.removeClass('high-quality');
            this.jq_quality_btn.addClass('super-quality');
        }
        else {
            this.jq_quality_btn.text('128');
            this.jq_quality_btn.removeClass('super-quality');
            this.jq_quality_btn.addClass('high-quality');
        }

        if (this.playing) this.click_play();

        // Звук кнопки переключения качества
        audioManager.play('tumbler');
    };

    RadioPlayer.prototype.change_site_size = function (old_size, new_size) {
        var scale_length_old = constHtmlSize[old_size].offset_click_scale;
        var scale_length_new = constHtmlSize[new_size].offset_click_scale;
        var carrete_pos = this.jq_channels_carrete.position().left;
        this.set_channel_carrete(scale_length_new * carrete_pos / scale_length_old);
    };

    RadioPlayer.prototype.update = function () {
        var self = this;

        // ПИТАНИЕ
        this.jq_power_btn = $('.radio-btn-power').first();
        this.jq_power_btn.click(RadioPlayer.prototype.click_power.bind(this));

        // КАЧЕСТВО
        this.jq_quality_btn = $('.radio-btn-quality').first();
        this.jq_quality_btn.click(RadioPlayer.prototype.change_quality.bind(this));

        // ГРОМКОСТЬ
        this.jq_volume_disc = $('.radio-volume-scale').first();
        this.jq_volume_disc_item = $('.radio-volume-scale-hover').first();
        this.volume_disc_active = false;
        this.volume_disc_start_coord = null;

        this.jq_volume_disc.mousedown(function (event) {
            self.volume_disc_active = true;
            var offset = $('.radio-volume-scale').offset();
            self.volume_disc_start_coord = offset.left;
            if (self.power_on) { // Колёсико влияет на звук только когда включено питание
                var value = event.clientX - self.volume_disc_start_coord;
                var width = $('.radio-volume-scale').get(0).getBoundingClientRect().width;
                var val = value / width;
                var width_orig = $('.radio-volume-scale').width();
                $('.radio-volume-scale-hover').width(val * width_orig);
                self.set_volume(val.toFixed(2));
            }
        });

        this.jq_volume_disc.mousemove(function (event) {
            if (self.volume_disc_active) {
                if (self.power_on) { // Колёсико влияет на звук только когда включено питание
                    var value = event.clientX - self.volume_disc_start_coord;
                    var width = $('.radio-volume-scale').get(0).getBoundingClientRect().width;
                    if (value > width) value = width;
                    if (value < 0) value = 0;
                    var val = value / width;
                    var width_orig = $('.radio-volume-scale').width();
                    $('.radio-volume-scale-hover').width(val * width_orig);
                    self.set_volume(val.toFixed(2));
                }
            }
        });

        this.jq_volume_disc.mouseleave(function () {
            self.volume_disc_active = false;
        });

        this.jq_volume_disc.mouseup(function () {
            self.volume_disc_active = false;
        });
    };

    return RadioPlayer;
})();


var radioPlayer;

function initRadioPlayer() {
    //console.log('initRadioPlayer !');
    context = audioManager.get_ctx();

    radioPlayer = new RadioPlayer({
        name: 'p1',
        channels: {
            'r_ch0_128': {
                link: "http://listen.radiotower.su:8000/vigilante_2084_128",
                name: "Vigilante 2084 128",
                screen_class: 'vigilante'
            },
            'r_ch0_320': {
                link: "http://listen.radiotower.su:8000/vigilante_2084_320",
                name: "Vigilante 2084 320",
                screen_class: 'vigilante'
            },
            'r_ch1_128': {
                link: "http://listen.radiotower.su:8000/lonesome_town_128",
                name: "Lonesome Town 128",
                screen_class: 'town'
            },
            'r_ch1_320': {
                link: "http://listen.radiotower.su:8000/lonesome_town_320",
                name: "Lonesome Town 320",
                screen_class: 'town'
            },
            'r_ch2_128': {
                link: "http://listen.radiotower.su:8000/mad_dog_fm_128",
                name: "Mad Dog FM 128",
                screen_class: 'maddog'
            },
            'r_ch2_320': {
                link: "http://listen.radiotower.su:8000/mad_dog_fm_320",
                name: "Mad Dog FM 320",
                screen_class: 'maddog'
            },
            'r_ch3_128': {
                link: "http://listen.radiotower.su:8000/rrn_radio_128",
                name: "RRN Radio 128",
                screen_class: 'rrn'
            },
            'r_ch3_320': {
                link: "http://listen.radiotower.su:8000/rrn_radio_320",
                name: "RRN Radio 320",
                screen_class: 'rrn'
            },
            'r_ch4_128': {
                link: "http://listen.radiotower.su:8000/industrial_junk_128",
                name: "Industrial Junk 128",
                screen_class: 'junk'
            },
            'r_ch4_320': {
                link: "http://listen.radiotower.su:8000/industrial_junk_320",
                name: "Industrial Junk 320",
                screen_class: 'junk'
            }
        },
        channel_name_prefix: 'r_',
        channel_map: {
            0: 'ch0',
            1: 'ch1',
            2: 'ch2',
            3: 'ch3',
            4: 'ch4'
        },
        quality_map: {
            0: '128',
            1: '320'
        }
    });
}
