var AudioManager = (function () {
    function AudioManager() {
        this.web_api_audio_objects = {}; // WebApi аудио объекты
        this.audio_objects = {}; // <audio> объекты
        this.audio_context = new (window.AudioContext || window.webkitAudioContext)();
        this.general_gain = 1.0; // Общая громкость по-умолчанию
    }

    // Воспроизведение
    /* name - имя звукового объекта
    *  time - задержка перед стартом
    *  gain - уровень громкости
    *  callback - ...
    *  loop - повторение звука
    *  offset - смещение от начала звука
    *  duration - продолжительность проигрывания
    * */
    AudioManager.prototype.play = function (name, time, gain, callback, loop, offset, duration) {
        //console.log(name, gain, this.general_gain);
        //if (!preloaderImage || preloaderImage.ready_images == false) return;

        var audio_obj = this.get(name);
        if (!audio_obj) {
            console.warn('AudioManager not found melody name:', name);
            return false;
        }
        if (this.general_gain == 0.0) {
            return true;
        }
        if (loop && audio_obj.is_playing && audio_obj.play_loop) { // В случае лупа повторный запуск невозможен!
            return true; // Значит уже луп запущен и второй нет смысла запускать
        }
        return audio_obj.play(time, gain ? gain : this.general_gain, callback, loop, offset, duration);
    };

    AudioManager.prototype.stop = function (name, time, play_object) {
        var audio_obj = this.get(name);
        if (!audio_obj) return false;
        return audio_obj.stop(time, play_object);
    };

    AudioManager.prototype.gain = function (name, value) {
        var audio_obj = this.get(name);
        if (!audio_obj) return false;
        return audio_obj.gain(value);
    };

    AudioManager.prototype.gain_all = function (value) {
        this.general_gain = value;
        for (var key in this.audio_objects)
            if (this.audio_objects.hasOwnProperty(key))
                this.audio_objects[key].gain(value);
    };

    // Загрузка
    AudioManager.prototype.load = function (name, source, autoplay, class_name, gain) {
        if (this.get(name)) {
            console.warn('Аудио Объект с таким именем уже был загружен. Замена.');
        }
        class_name = class_name ? class_name : AudioObject;
        this.audio_objects[name] = new class_name(source, autoplay, gain === undefined ? this.general_gain : gain);
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


function init_sound() {
    audioManager.gain_all(1.0);
    audioManager.load('tumbler', {url: '/static/audio/final_v1_mp3/tumbler.mp3'}, null, null, 1.0);
    audioManager.load('radio_noise_switch', {url: "/static/audio/final_v1_mp3/radio_static.mp3"}, null, null, 1.0);

    // Тестовые звуки от димона
    audioManager.load('engine_01_1', {url: '/static/audio/test/engine_01_1.wav'}, null, GameAudioObject, 1.0);
    audioManager.load('engine_01_2', {url: '/static/audio/test/engine_01_2.wav'}, null, GameAudioObject, 1.0);
    audioManager.load('engine_01_3', {url: '/static/audio/test/engine_01_3.wav'}, null, GameAudioObject, 1.0);
    audioManager.load('engine_01_4', {url: '/static/audio/test/engine_01_4.wav'}, null, GameAudioObject, 1.0);

    audioManager.load('engine_02', {url: '/static/audio/test/engine_02.wav'}, null, GameAudioObject, 1.0);
    audioManager.load('engine_03', {url: '/static/audio/test/engine_03.wav'}, null, GameAudioObject, 1.0);
    audioManager.load('engine_04', {url: '/static/audio/test/engine_04.wav'}, null, GameAudioObject, 1.0);
    audioManager.load('engine_05', {url: '/static/audio/test/engine_05.wav'}, null, GameAudioObject, 1.0);

    audioManager.load('shot_01', {url: '/static/audio/test/shot_01.wav'}, null, null, 1.0);
    audioManager.load('shot_02', {url: '/static/audio/test/shot_02.wav'}, null, null, 1.0);
    audioManager.load('shot_03', {url: '/static/audio/test/shot_03.wav'}, null, null, 1.0);

    audioManager.load('zoom_01', {url: '/static/audio/test/zoom_01.wav'}, null, null, 1.0);
}