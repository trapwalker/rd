var AudioKeyboard = (function () {
    function AudioKeyboard(audio_list) {
        this.audio_list = audio_list;
        this.gain = null;
        this.need_stop = false;
        this.started = false;
    }

    // Воспроизведение
    AudioKeyboard.prototype.play = function () {
        // console.log('AudioKeyboard.prototype.play', this.need_stop, this.started);
        if (this.need_stop) {
            this.need_stop = false;
            this.started = false;
            return;
        }
        this.started = true;
        var audio_obj = this.audio_list[Math.floor(Math.random() * 0.99 * this.audio_list.length)];
        audioManager.play({
            name: audio_obj,
            gain: this.gain ? this.gain : audioManager.general_gain,
            callback: AudioKeyboard.prototype.play.bind(this)
        });
    };

    AudioKeyboard.prototype.stop = function () {
        // console.log('AudioKeyboard.prototype.stop', this.need_stop, this.started);
        if (this.started)
            this.need_stop = true;
    };

    // Установка громкости
    AudioKeyboard.prototype.gain = function (value) {
        this.gain = value;
    };

    return AudioKeyboard;
})();


var audioKeyboard;

