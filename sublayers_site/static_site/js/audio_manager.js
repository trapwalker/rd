var AudioManager = (function () {
    function AudioManager() {
        this.audio_objects = {};
        this.audio_context = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Воспроизведение
    AudioManager.prototype.play = function (name, time, gain) {
        var audio_obj = this.get(name);
        if (! audio_obj) {
            console.warn('AudioManager not found melody name:', name);
            return false;
        }
        return audio_obj.play(time, gain);
    };

    AudioManager.prototype.stop = function (name, time) {
        var audio_obj = this.get(name);
        if (! audio_obj) return false;
        return audio_obj.stop(time);
    };

    AudioManager.prototype.gain = function (name, value) {
        var audio_obj = this.get(name);
        if (! audio_obj) return false;
        return audio_obj.gain(value);
    };

    // Загрузка
    AudioManager.prototype.load = function (name, source, autoplay, class_name) {
        if (this.get(name)) {
            console.warn('Аудио Объект с таким именем уже был загружен. Замена.');
        }
        class_name = class_name ? class_name : AudioObject;
        this.audio_objects[name] = new class_name(source, autoplay);
    };

    AudioManager.prototype.get = function (name) {
        if (this.audio_objects.hasOwnProperty(name))
            return this.audio_objects[name];
        return null;
    };

    AudioManager.prototype.get_ctx = function (name) {
        return this.audio_context;
    };

    return AudioManager;
})();

var audioManager = new AudioManager();