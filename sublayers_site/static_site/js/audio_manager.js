var AudioManager = (function () {
    function AudioManager() {
        this.web_api_audio_objects = {}; // WebApi аудио объекты
        this.tag_audio_objects = {}; // <audio> объекты
        this.audio_context = new (window.AudioContext || window.webkitAudioContext)();
        this.general_gain = 1.0; // Общая громкость по-умолчанию
    }

    // Воспроизведение
    AudioManager.prototype.play = function (name, time, gain) {
        var audio_obj = this.get(name);
        if (! audio_obj) {
            console.warn('AudioManager not found melody name:', name);
            return false;
        }
        return audio_obj.play(time, gain ? gain : this.general_gain);
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

    AudioManager.prototype.gain_all = function (value) {
        this.general_gain = value;
        var key;
        for (key in this.web_api_audio_objects)
            if (this.web_api_audio_objects.hasOwnProperty(key))
                this.web_api_audio_objects[key].gain(value);
        for (key in this.tag_audio_objects)
            if (this.tag_audio_objects.hasOwnProperty(key))
                this.tag_audio_objects[key].gain(value);
    };

    // Загрузка
    AudioManager.prototype.load = function (name, source, autoplay, class_name) {
        if (this.get(name)) {
            console.warn('Аудио Объект с таким именем уже был загружен. Замена.');
        }
        class_name = class_name ? class_name : AudioObject;
        this.web_api_audio_objects[name] = new class_name(source, autoplay);
    };

    AudioManager.prototype.get = function (name) {
        if (this.web_api_audio_objects.hasOwnProperty(name))
            return this.web_api_audio_objects[name];
        return null;
    };

    AudioManager.prototype.get_ctx = function (name) {
        return this.audio_context;
    };


    // ------- Работа с <audio> объектами ------- //
    AudioManager.prototype.get_audio = function (name) {
        if (this.tag_audio_objects.hasOwnProperty(name))
            return this.tag_audio_objects[name];
        return null;
    };

    AudioManager.prototype.load_audio = function (name, source) {
        if (this.get_audio(name)) {
            console.warn('Аудио Объект с таким именем уже был загружен. Замена.');
        }
        this.tag_audio_objects[name] = new TagAudioObject(source);
    };

    AudioManager.prototype.play_audio = function (name) {
        var audio_obj = this.get_audio(name);
        if (! audio_obj) {
            console.warn('AudioManager not found melody name:', name);
            return false;
        }
        audio_obj.play();
    };

    AudioManager.prototype.stop_audio = function (name) {
        var audio_obj = this.get_audio(name);
        if (! audio_obj) {
            console.warn('AudioManager not found melody name:', name);
            return false;
        }
        audio_obj.stop();
    };



    return AudioManager;
})();

var audioManager = new AudioManager();