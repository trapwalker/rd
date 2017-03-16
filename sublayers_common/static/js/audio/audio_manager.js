var AudioManager = (function () {
    function AudioManager() {
        this.audio_objects = {}; // <audio> объекты
        this.audio_context = new (window.AudioContext || window.webkitAudioContext)();
        this.general_gain = 1.0; // Общая громкость по-умолчанию

        this.queue = [];
        this.queue_size = 10;
        this.queue_tail_size = 5;
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
        var cls = null;
        if (arguments.length == 1) {
            var options = arguments[0];
            name = options.name || "";
            time = options.time;
            gain = options.gain || 0.0;
            callback = options.callback;
            loop = options.loop;
            offset = options.offset;
            duration = options.duration;
            playbackRate = options.playbackRate;
            priority = options.priority;
            cls = options.cls;
        }

        var audio_obj = this.get(name);
        if (!audio_obj) {
            console.warn('AudioManager not found melody name:', name);
            return false;
        }

        return audio_obj.play(cls, time, gain, callback, loop, offset, duration, playbackRate, priority);
    };

    AudioManager.prototype.stop = function (time, play_object) {
        return play_object.stop(time);
    };

    AudioManager.prototype.set_gain = function (value, play_object) {
        play_object.start_gain = value;
        var index = this.queue.indexOf(play_object);
        if (index >= 0)
            this.update_gain(index);
        else
            play_object.gain(value);
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

    AudioManager.prototype.update_gain = function (index) {
        var get_gain_mul = function(index, queue_size, queue_tail_size) {
            if (index < queue_size)
                return 1;
            if (index < (queue_size + queue_tail_size))
                return 1 - (1 / (queue_tail_size + 1)) * (index - queue_size + 1);
            return 0;
        };

        this.queue[index].gain(this.queue[index].start_gain * get_gain_mul(index, this.queue_size, this.queue_tail_size));
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

        for (var i = 0; i < this.queue.length; i++)
            this.update_gain(i);
    };

    AudioManager.prototype.del_playobject = function (play_object) {
        var index = this.queue.indexOf(play_object);
        if (index < 0 || index > this.queue.length) {
            console.error(play_object + " не найден в очереди !");
            return;
        }

        this.queue.splice(index, 1);

        for (var i = 0; i < this.queue.length; i++)
            this.update_gain(i);
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
    audioManager.load('reverse_gear', {url: '/static/audio/test/reverse_gear.wav'}, 1.0);

    // Комплекты звуков авто стрельбы

    audioManager.load('auto_test_1', {url: '/static/audio/test2/z_11.wav'}, 1.0);
    audioManager.load('auto_test_2', {url: '/static/audio/test2/z_12.wav'}, 1.0);
    audioManager.load('auto_test_3', {url: '/static/audio/test2/z_13.wav'}, 1.0);
    audioManager.load('auto_test_4', {url: '/static/audio/test2/z_14.wav'}, 1.0);

    audioManager.load('auto_11', {url: '/static/audio/auto_shoot/auto_shoot_1/2x.wav'}, 1.0);
    audioManager.load('auto_12', {url: '/static/audio/auto_shoot/auto_shoot_1/3x.wav'}, 1.0);
    audioManager.load('auto_13', {url: '/static/audio/auto_shoot/auto_shoot_1/4x.wav'}, 1.0);
    audioManager.load('auto_14', {url: '/static/audio/auto_shoot/auto_shoot_1/6x.wav'}, 1.0);

    audioManager.load('auto_21', {url: '/static/audio/auto_shoot/auto_shoot_2/2x.wav'}, 1.0);
    audioManager.load('auto_22', {url: '/static/audio/auto_shoot/auto_shoot_2/3x.wav'}, 1.0);
    audioManager.load('auto_23', {url: '/static/audio/auto_shoot/auto_shoot_2/4x.wav'}, 1.0);
    audioManager.load('auto_24', {url: '/static/audio/auto_shoot/auto_shoot_2/6x.wav'}, 1.0);

    audioManager.load('auto_31', {url: '/static/audio/auto_shoot/auto_shoot_3/2x.wav'}, 1.0);
    audioManager.load('auto_32', {url: '/static/audio/auto_shoot/auto_shoot_3/3x.wav'}, 1.0);
    audioManager.load('auto_33', {url: '/static/audio/auto_shoot/auto_shoot_3/4x.wav'}, 1.0);
    audioManager.load('auto_34', {url: '/static/audio/auto_shoot/auto_shoot_3/6x.wav'}, 1.0);


    audioManager.load('auto_r_11', {url: '/static/audio/auto_shoot/1/1_1.wav'}, 1.0);
    audioManager.load('auto_r_12', {url: '/static/audio/auto_shoot/1/1_2.wav'}, 1.0);
    audioManager.load('auto_r_13', {url: '/static/audio/auto_shoot/1/1_3.wav'}, 1.0);
    audioManager.load('auto_r_14', {url: '/static/audio/auto_shoot/1/1_4.wav'}, 1.0);

    audioManager.load('auto_r_21', {url: '/static/audio/auto_shoot/2/2_2.wav'}, 1.0);
    audioManager.load('auto_r_22', {url: '/static/audio/auto_shoot/2/2_3.wav'}, 1.0);
    audioManager.load('auto_r_23', {url: '/static/audio/auto_shoot/2/2_4.wav'}, 1.0);
    audioManager.load('auto_r_24', {url: '/static/audio/auto_shoot/2/2_5.wav'}, 1.0);







}


