var RadioPlayer = (function () {
    function RadioPlayer(options) {
        var name = options.name;
        this.name = name;

        this.channels_names = options.channels_names;
        this.channel_name_prefix = options.channel_name_prefix;

        this.current_volume = null;

        this.channel_map = options.channel_map;
        this.quality_map = options.quality_map;

        this.playing = false;

        // Вешаем эвенты на элементы управления плеером

        $('#btnPlay_' + name).click(RadioPlayer.prototype.click_play.bind(this));
        $('#btnStop_' + name).click(RadioPlayer.prototype.click_stop.bind(this));
        $('#sliderVolume_' + name).change(RadioPlayer.prototype.change_volume.bind(this));
        $('#sliderChannel_' + name).change(RadioPlayer.prototype.change_channel.bind(this));
        $('#sliderQuality_' + name).change(RadioPlayer.prototype.change_quality.bind(this));


        this.jq_btn_stop = $('#btnStop_' + name);
        this.jq_btn_play = $('#btnPlay_' + name);

        this.elem_volume = document.getElementById('sliderVolume_' + name);  //.value;
        this.elem_channel = document.getElementById('sliderChannel_' + name);
        this.elem_quality = document.getElementById('sliderQuality_' + name);

        // инициализация громкости и current_channel
        this.current_volume = this.elem_volume.value;

    }

    RadioPlayer.prototype.create_channel_name = function() {
        var channel = this.elem_channel.value;
        var quality = this.elem_quality.value;
        var channel_str = this.channel_map.hasOwnProperty(channel) ? this.channel_map[channel] : null;
        var quality_str = this.channel_map.hasOwnProperty(quality) ? this.quality_map[quality] : null;

        if (! channel_str || ! quality_str) {
            console.error('Ошибка !!!!!!! ', this);
            return '';
        }
        console.log(this.channel_name_prefix + channel_str + '_' + quality_str);
        return this.channel_name_prefix + channel_str + '_' + quality_str;
    };

    RadioPlayer.prototype._stop_all = function() {
        //console.log('RadioPlayer.prototype._stop_all');
        var curr_name = this.create_channel_name();
        for (var i = 0; i < this.channels_names.length; i++) {
            var name = this.channels_names[i];
            if (name != curr_name)
                audioManager.stop(name);
        }
    };


    RadioPlayer.prototype.click_play = function(event) {
        //console.log('RadioPlayer.prototype.click_play', event);
        //if (this.playing) return;
        this._stop_all();
        audioManager.play(this.create_channel_name(), 0, this.current_volume);

        this.playing = true;
        this.jq_btn_stop.css({display: 'block'});
        this.jq_btn_play.css({display: 'none'});
    };

    RadioPlayer.prototype.click_stop = function(event) {
        //console.log('RadioPlayer.prototype.click_stop', event);
        audioManager.stop(this.create_channel_name());

        this.playing = false;
        this.jq_btn_stop.css({display: 'none'});
        this.jq_btn_play.css({display: 'block'});
    };

    RadioPlayer.prototype.change_volume = function (event) {
        //console.log('RadioPlayer.prototype.change_volume', event);
        this.current_volume = this.elem_volume.value;
        audioManager.gain(this.create_channel_name(), this.current_volume);
    };

    RadioPlayer.prototype.change_channel = function(event) {
        //console.log('RadioPlayer.prototype.change_channel', event);
        if (this.playing) this.click_play();
    };

    RadioPlayer.prototype.change_quality = function(event) {
        //console.log('RadioPlayer.prototype.change_quality', event);
        if (this.playing) this.click_play();
    };


    return RadioPlayer;
})();

