var AudioManager = (function () {
    function AudioManager() {
        this.audio_objects = {}; // <audio> объекты
        this.audio_context = new (window.AudioContext || window.webkitAudioContext)();
        this.general_gain = 1.0; // Общая громкость по-умолчанию

        this.queue = [];
        this.queue_size = 2;
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
    AudioManager.prototype.play = function (name, time, gain, callback, loop, offset, duration, playbackRate, priority) {
        var audio_obj = this.get(name);
        if (!audio_obj) {
            console.warn('AudioManager not found melody name:', name);
            return false;
        }
        return audio_obj.play(time, gain ? gain : 1.0, callback, loop, offset, duration, playbackRate, priority);
    };

    AudioManager.prototype.stop = function (time, play_object) {
        return play_object.stop(time);
    };

    AudioManager.prototype.set_gain = function (value, play_object) {
        return play_object.gain(value);
    };

    AudioManager.prototype.set_general_gain = function (value) {
        var old_gain = this.general_gain;
        this.general_gain = value;
        for (var key in this.audio_objects)
            if (this.audio_objects.hasOwnProperty(key))
                this.audio_objects[key].general_gain(old_gain);
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

    AudioManager.prototype.add_playobject = function (play_object) {
        var index = this.queue.indexOf(play_object);
        if (index >= 0 && index <= this.queue.length) {
            console.error(play_object + " уже в очереди ! Повторное добавление невозможно");
            return;
        }

        var queue = this.queue;
        queue.push(play_object);
        var qlength = this.queue.length;

        var i = qlength - 1;

        for (; i > 0  && queue[i].priority > queue[i - 1].priority; i--) {
            var temp = queue[i];
            queue[i] = queue[i - 1];
            queue[i - 1] = temp;
        }
        if (i < this.queue_size) {
            play_object.gain(play_object.start_gain);
            if (qlength > this.queue_size + 1) queue[this.queue_size + 1].gain(0);
        }
        else {
            play_object.gain(0);
        }
    };


    AudioManager.prototype.del_playobject = function (play_object) {
        var index = this.queue.indexOf(play_object);
        if (index < 0 || index > this.queue.length) {
            console.error(play_object + " не найден в очереди !");
            return;
        }
        this.queue.splice(index, 1);
        if (index <= this.queue_size && this.queue.length > this.queue_size)
            this.queue[this.queue_size].gain(this.queue[this.queue_size].start_gain);
    };

    AudioManager.prototype.get_playobject_gain = function (play_object) {
        var index = this.queue.indexOf(play_object);
        if (index < 0 || index > this.queue.length) {
            console.error(play_object + " не найден в очереди !");
            return 0;
        }
        if (index > this.queue_size) return 0;
        return play_object.start_gain;
    };

    return AudioManager;
})();


var audioManager = new AudioManager();


function init_sound() {
    audioManager.load('tumbler', {url: '/static/audio/final_v1_mp3/tumbler.mp3'}, 1.0);
    audioManager.load('radio_noise_switch', {url: "/static/audio/final_v1_mp3/radio_static.mp3"}, 1.0);

    // Тестовые звуки от димона
    audioManager.load('error_1', {url: '/static/audio/final_v1_mp3/error.mp3'}, 0.1);
    audioManager.load('engine_01_1', {url: '/static/audio/test/engine_01_1.wav'}, 1.0);
    audioManager.load('engine_01_2', {url: '/static/audio/test/engine_01_2.wav'}, 1.0);
    audioManager.load('engine_01_3', {url: '/static/audio/test/engine_01_3.wav'}, 1.0);
    audioManager.load('engine_01_4', {url: '/static/audio/test/engine_01_4.wav'}, 1.0);

    audioManager.load('engine_02', {url: '/static/audio/test/engine_02.wav'}, 1.0);
    audioManager.load('engine_03', {url: '/static/audio/test/engine_03.wav'}, 1.0);
    audioManager.load('engine_04', {url: '/static/audio/test/engine_04.wav'}, 1.0);
    audioManager.load('engine_05', {url: '/static/audio/test/engine_05.wav'}, 0.075);

    audioManager.load('shot_01', {url: '/static/audio/test/shot_01.wav'}, 1.0);
    audioManager.load('shot_02', {url: '/static/audio/test/shot_02.wav'}, 1.0);
    audioManager.load('shot_03', {url: '/static/audio/test/shot_03.wav'}, 1.0);

    audioManager.load('auto_self_1', {url: '/static/audio/test/auto_self_1.wav'}, 1.0);
    audioManager.load('auto_self_2', {url: '/static/audio/test/auto_self_2.wav'}, 1.0);
    audioManager.load('auto_self_3', {url: '/static/audio/test/auto_self_3.wav'}, 0.15);
    audioManager.load('auto_other_1', {url: '/static/audio/test/auto_other_1.wav'}, 1.0);
    audioManager.load('auto_other_2', {url: '/static/audio/test/auto_other_2.wav'}, 0.15);

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

var audio_obj1;
var audio_obj2;
var audio_obj3;
var audio_obj4;

function random_shoot_start() {
    audio_obj1 = audioManager.play('shot_01', 0.0,      0.5, null, true, 0, 0, 1);
    audio_obj2 = audioManager.play('shot_01', 0.164925, 0.5, null, true, 0, 0, 1);
    audio_obj3 = audioManager.play('shot_01', 0.32985,  0.5, null, true, 0, 0, 1);
    audio_obj4 = audioManager.play('shot_01', 0.494775, 0.5, null, true, 0, 0, 1);
}

function random_shoot_stop() {
    audioManager.play('shot_01', 0, audio_obj1);
    audioManager.play('shot_01', 0, audio_obj2);
    audioManager.play('shot_01', 0, audio_obj3);
    audioManager.play('shot_01', 0, audio_obj4);
}

    //function generateShoot() {
    //    audioManager.play('shot_01', 0, 0.2 + Math.random() * 0.2, function() { generateShoot() }, false, 0, 0, 3 + Math.random() * 2);
    //}
    //generateShoot()

    //audioManager.play('shot_03', 0.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 0.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 0.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 0.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 0.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 0.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 0.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 0.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 0.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 1.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 2.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 3.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 4.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 5.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 6.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 7.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 8.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 9.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.1, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.2, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.3, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.4, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.5, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.6, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.7, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.8, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 10.9, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
    //audioManager.play('shot_03', 11.0, 0.2 + Math.random() * 0.2, null, false, 0, 0, 1);
//}