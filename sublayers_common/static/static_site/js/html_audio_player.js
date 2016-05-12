var RadioNameSwitchText = "search ...";

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
        $('#btnPlay_' + name).click(RadioPlayer.prototype.click_play.bind(this));
        $('#btnStop_' + name).click(RadioPlayer.prototype.click_stop.bind(this));
        $('#sliderVolume_' + name).change(RadioPlayer.prototype.change_volume.bind(this));
        $('#sliderChannel_' + name).change(RadioPlayer.prototype.change_channel.bind(this));
        $('#sliderQuality_' + name).change(RadioPlayer.prototype.change_quality.bind(this));

        this.jq_btn_stop = $('#btnStop_' + name);
        this.jq_btn_play = $('#btnPlay_' + name);

        this.jq_station_name = $('#radioStationName_' + name);

        this.elem_volume = document.getElementById('sliderVolume_' + name);  //.value;
        this.elem_channel = document.getElementById('sliderChannel_' + name);
        this.elem_quality = document.getElementById('sliderQuality_' + name);

        // инициализация громкости
        this.current_volume = this.elem_volume.value;

        // Эвенты на воспроизведение
        this.audio.onloadeddata = RadioPlayer.prototype.load_buffer_complete.bind(this);
        this.audio.onpause = RadioPlayer.prototype.onpause.bind(this);
    }

    RadioPlayer.prototype.get_channel_key = function() {
        var channel = this.elem_channel.value;
        var quality = this.elem_quality.value;

        var channel_str = this.channel_map.hasOwnProperty(channel) ? this.channel_map[channel] : null;
        var quality_str = this.quality_map.hasOwnProperty(quality) ? this.quality_map[quality] : null;

        if (! channel_str || ! quality_str) {
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
            // todo: Что-то предпринять!!!
            this.click_stop();
            // Запуск просто шума. Пока не переключили радио
            audioManager.play('radio_noise', 0, this.current_volume, null, true);
        }

        //
        this.play_started = true;

        this.jq_btn_stop.css({display: 'block'});
        this.jq_btn_play.css({display: 'none'});

        this.jq_station_name.text(this.channels[this.get_channel_key()].name);
    };

    RadioPlayer.prototype.load_buffer_timeout = function () {
        //console.log('RadioPlayer.prototype.load_buffer_timeout', event);
        // Если мы здесь, значит радио не успело загрузиться.
        // todo: Что-то предпринять!
        audioManager.play('radio_noise', 0, this.current_volume, null, true);
        // Выключить звук помех
        audioManager.stop('radio_noise_switch');

        this.timer_for_buffer = null;
        this.jq_station_name.text('connection error');
    };

    RadioPlayer.prototype.onpause = function() {
        this.jq_btn_stop.css({display: 'none'});
        this.jq_btn_play.css({display: 'block'});

        this.jq_station_name.text('paused ...');
    };

    RadioPlayer.prototype.click_play = function(event) {
        //console.log('RadioPlayer.prototype.click_play', event);
        var radio_key = this.get_channel_key();
        if (!this.channels.hasOwnProperty(radio_key)) {
            console.warn('Что-то пошло не так! Нет ключа: ', radio_key);
            return;
        }
        audioManager.stop('radio_noise');
        var new_scr = this.channels[radio_key].link;
        if (this.playing && this.audio.src == new_scr) {
            console.warn('Нет смысла нажимать play для неизменившегося source', radio_key);
            return;
        }
        if (this.playing && this.play_started) this.audio.pause();

        this.audio.src = new_scr;
        this.audio.play();

        if (this.timer_for_buffer) clearInterval(this.timer_for_buffer);
        this.timer_for_buffer = setTimeout(RadioPlayer.prototype.load_buffer_timeout.bind(this), 15000);
        this.play_started = false;
        this.playing = true;

        // Запуск шума в цикле
        audioManager.play('radio_noise_switch', 0, this.current_volume, null, true);
        // Смена названия радиостанции на "поиск"
        this.jq_station_name.text(RadioNameSwitchText);
    };

    RadioPlayer.prototype.click_stop = function(event) {
        //console.log('RadioPlayer.prototype.click_stop', event);
        if (this.playing) this.audio.pause();
        this.playing = false;

        if (this.timer_update_track) {
            clearInterval(this.timer_update_track);
            this.timer_update_track = null;
        }
    };

    RadioPlayer.prototype.change_volume = function (event) {
        //console.log('RadioPlayer.prototype.change_volume', event);
        this.current_volume = this.elem_volume.value;
        this.audio.volume = this.current_volume;
        // Изменение шума помех, если вдруг они запущены
        audioManager.gain('radio_noise_switch', this.current_volume);
        audioManager.gain('radio_noise', this.current_volume);
    };

    RadioPlayer.prototype.change_channel = function(event) {
        //console.log('RadioPlayer.prototype.change_channel', event);
        if (this.playing) this.click_play();
    };

    RadioPlayer.prototype.change_quality = function(event) {
        //console.log('RadioPlayer.prototype.change_quality', event);
        if (this.playing) this.click_play();
    };

    RadioPlayer.prototype.track_name_update = function () {
        self.jq_track_name.text(RadioNameSwitchText);
    };


    return RadioPlayer;
})();

