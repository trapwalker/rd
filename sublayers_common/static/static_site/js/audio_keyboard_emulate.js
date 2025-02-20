var AudioKeyboard = (function () {
    function AudioKeyboard(audio_list) {
        this.audio_list = audio_list;
        this.gain = null;
        this.need_stop = false;
    }

    // Воспроизведение
    AudioKeyboard.prototype.play = function () {
        if (!preloaderImage || !preloaderImage.ready_images) return;

        if (this.need_stop) {
            this.need_stop = false;
            return;
        }
        var audio_obj = this.audio_list[Math.floor(Math.random() * 0.99 * this.audio_list.length)];
        audio_obj.play(0, this.gain ? this.gain : audioManager.general_gain, AudioKeyboard.prototype.play.bind(this));
    };

    AudioKeyboard.prototype.stop = function () {
        this.need_stop = true;
    };

    // Установка громкости
    AudioKeyboard.prototype.gain = function (value) {
        this.gain = value;
    };

    return AudioKeyboard;
})();


var audioKeyboard;

