var AudioManager = (function () {
    function AudioManager() {
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
        var audio_obj = this.get(name);
        if (!audio_obj) {
            console.warn('AudioManager not found melody name:', name);
            return false;
        }
        return audio_obj.play(time, gain ? gain : 1.0, callback, loop, offset, duration);
    };

    AudioManager.prototype.stop = function (name, time, play_object) {
        var audio_obj = this.get(name);
        if (!audio_obj) return false;
        return audio_obj.stop(time, play_object);
    };

    AudioManager.prototype.gain = function (name, value, play_object) {
        var audio_obj = this.get(name);
        if (!audio_obj) return false;
        return audio_obj.gain(value, play_object);
    };

    AudioManager.prototype.general_gain = function (value) {
        this.general_gain = value;
        for (var key in this.audio_objects)
            if (this.audio_objects.hasOwnProperty(key))
                this.audio_objects[key].general_gain(value);
    };

    // Загрузка
    AudioManager.prototype.load = function (name, source, gain) {
        if (this.get(name))
            console.warn('Аудио Объект с таким именем уже был загружен. Замена.');
        this.audio_objects[name] = new GameAudioObject(source, gain === undefined ? 1.0 : gain);
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
    audioManager.load('tumbler', {url: '/static/audio/final_v1_mp3/tumbler.mp3'}, 1.0);
    audioManager.load('radio_noise_switch', {url: "/static/audio/final_v1_mp3/radio_static.mp3"}, 1.0);

    // Тестовые звуки от димона
    audioManager.load('engine_01_1', {url: '/static/audio/test/engine_01_1.wav'}, 1.0);
    audioManager.load('engine_01_2', {url: '/static/audio/test/engine_01_2.wav'}, 1.0);
    audioManager.load('engine_01_3', {url: '/static/audio/test/engine_01_3.wav'}, 1.0);
    audioManager.load('engine_01_4', {url: '/static/audio/test/engine_01_4.wav'}, 1.0);

    audioManager.load('engine_02', {url: '/static/audio/test/engine_02.wav'}, 1.0);
    audioManager.load('engine_03', {url: '/static/audio/test/engine_03.wav'}, 1.0);
    audioManager.load('engine_04', {url: '/static/audio/test/engine_04.wav'}, 1.0);
    audioManager.load('engine_05', {url: '/static/audio/test/engine_05.wav'}, 1.0);

    audioManager.load('shot_01', {url: '/static/audio/test/shot_01.wav'}, 1.0);
    audioManager.load('shot_02', {url: '/static/audio/test/shot_02.wav'}, 1.0);
    audioManager.load('shot_03', {url: '/static/audio/test/shot_03.wav'}, 1.0);

    audioManager.load('zoom_01', {url: '/static/audio/test/zoom_01.wav'}, 1.0);
}


function randomInterval(a, b) {return Math.random() * (b - a) + a;}


function scene(){
    var a1 = audioManager.play('engine_05', 0.0, 0.3, null, true);

    var razgon = null;
    var razgon_znak = 1.0;

    setInterval(function() {
        if (Math.random() > 0.95) {
            var a21 = audioManager.play('shot_01', 0.0, randomInterval(0.05, 0.3), null, true, 0.0, Math.random() * 3.0);
            a21.source_node.playbackRate.value = 5.0
        }

        if (Math.random() > 0.95) {
            var a22 = audioManager.play('shot_02', 0.0, randomInterval(0.05, 0.4), null, true, 0.0, Math.random() * 3.0);
            a22.source_node.playbackRate.value = 3.0
        }

        if (Math.random() > 0.95) {
            var a23 = audioManager.play('shot_03', 0.0, randomInterval(0.05, 0.3), null, true, 0.0, Math.random() * 3.0);
            a23.source_node.playbackRate.value = 3.5
        }


        if (Math.random() > 0.97) {
            audioManager.play('shot_01', 0.0, randomInterval(0.3, 0.5), null, false);
        }
        if (Math.random() > 0.97) {
            audioManager.play('shot_02', 0.0, randomInterval(0.3, 0.5), null, false);
        }
        if (Math.random() > 0.97) {
            audioManager.play('shot_03', 0.0, randomInterval(0.2, 0.5), null, false);
        }

        // разгон или торможение
        if (Math.random() > 0.8) {
            if (razgon) {clearInterval(razgon); razgon=null;}
            if (Math.random() > 0.8) {
                razgon_znak = Math.random() > 0.5 ? 1.0 : -1.0;
                razgon = setInterval(function () {
                    a1.source_node.playbackRate.value += 0.02 * razgon_znak;
                    if (a1.source_node.playbackRate.value < 0.35)
                        a1.source_node.playbackRate.value = 0.35;
                    if (a1.source_node.playbackRate.value > 1.9)
                        a1.source_node.playbackRate.value = 1.9;
                }, 130);
            }
        }
    }, 200)
}