var AudioManager = (function () {
    function AudioManager() {
        this.audio_objects = {}; // <audio> объекты
        this.audio_context = new (window.AudioContext || window.webkitAudioContext)();
        this.general_gain = 1.0; // Общая громкость по-умолчанию

        this.queue = [];
        this.queue_size = 10;
        this.queue_tail_size = 5;

        // settings
        this.general_gain = settingsManager.options.general_gain.value;
        this._settings_auto_fire_gain =  settingsManager.options.auto_fire_gain.value;
        this._settings_discharge_fire_gain =  settingsManager.options.discharge_fire_gain.value;
        this._settings_bang_gain =  settingsManager.options.bang_gain.value;
        this._settings_engine_gain =  settingsManager.options.engine_gain.value;
        this._settings_interface_gain =  settingsManager.options.interface_gain.value;
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
    
    // console

    audioManager.load('key_cl_1', {url: '/static/audio/final_v1_mp3/type.mp3'}, 0.2);
    audioKeyboard = new AudioKeyboard(['key_cl_1']);

    // radio

    audioManager.load('tumbler', {url: '/static/audio/final_v1_mp3/tumbler.mp3'}, 1.0);
    audioManager.load('radio_noise_switch', {url: "/static/audio/final_v1_mp3/radio_static.mp3"}, 1.0);

    // cannons

    audioManager.load('shot_01', {url: '/static/audio/test/shot_01.wav'}, 1.0);
    audioManager.load('shot_02', {url: '/static/audio/test/shot_02.wav'}, 1.0);
    audioManager.load('shot_03', {url: '/static/audio/test/shot_03.wav'}, 1.0);

    // machine guns

    audioManager.load('auto_test_1', {url: '/static/audio/test2/z_11.wav'}, 1.0);
    audioManager.load('auto_test_2', {url: '/static/audio/test2/z_12.wav'}, 1.0);
    audioManager.load('auto_test_3', {url: '/static/audio/test2/z_13.wav'}, 1.0);
    audioManager.load('auto_test_4', {url: '/static/audio/test2/z_14.wav'}, 1.0);

    audioManager.load('auto_r_11', {url: '/static/audio/auto_shoot/1/1_1.wav'}, 1.0);
    audioManager.load('auto_r_12', {url: '/static/audio/auto_shoot/1/1_2.wav'}, 1.0);
    audioManager.load('auto_r_13', {url: '/static/audio/auto_shoot/1/1_3.wav'}, 1.0);
    audioManager.load('auto_r_14', {url: '/static/audio/auto_shoot/1/1_4.wav'}, 1.0);

    audioManager.load('auto_r_21', {url: '/static/audio/auto_shoot/2/2_2.wav'}, 1.0);
    audioManager.load('auto_r_22', {url: '/static/audio/auto_shoot/2/2_3.wav'}, 1.0);
    audioManager.load('auto_r_23', {url: '/static/audio/auto_shoot/2/2_4.wav'}, 1.0);
    audioManager.load('auto_r_24', {url: '/static/audio/auto_shoot/2/2_5.wav'}, 1.0);

    // items

    audioManager.load('mine_ttt', {url: '/static/audio/items/map_weapon/mines/mine_ttt.m4a'}, 0.3);
    audioManager.load('sa16_igla', {url: '/static/audio/items/map_weapon/rockets/sa16_igla.m4a'}, 0.3);
    audioManager.load('turret_mg15', {url: '/static/audio/items/map_weapon/turret/turret_mg15.m4a'}, 0.3);
    audioManager.load('repair_kit_001', {url: '/static/audio/items/usable/build_set/repair_kit_001.m4a'}, 0.3);

    // powerups

    audioManager.load('powerup_001', {url: '/static/audio/powerups/powerup_001.m4a'}, 0.3);

    // signals

    audioManager.load('reverse_gear', {url: '/static/audio/signals/drive_reverse_001.m4a'}, 0.3);
    audioManager.load('error_1', {url: '/static/audio/signals/error_001.m4a'}, 0.3);
    audioManager.load('zoom_01', {url: '/static/audio/signals/zoom_001.m4a'}, 1.0);

    // engines

    audioManager.load('engine_heavy_001', {url: '/static/audio/engines/engine_heavy_001.ogg'}, 0.075);
    audioManager.load('engine_light_001', {url: '/static/audio/engines/engine_light_001.ogg'}, 0.075);
    audioManager.load('engine_05', {url: '/static/audio/engines/engine_05.ogg'}, 0.075);

    // interface

    audioManager.load('red_alert', {url: '/static/audio/interface/red_alert.m4a'}, 0.1);
    audioManager.load('green_alert', {url: '/static/audio/interface/green_alert.m4a'}, 0.1);
    audioManager.load('interface_hover', {url: '/static/audio/interface/hover_001.m4a'}, 0.1);
    audioManager.load('interface_click', {url: '/static/audio/interface/click_001.m4a'}, 0.1);
    audioManager.load('npc_transaction_fail', {url: '/static/audio/signals/error_001.m4a'}, 0.3);
    audioManager.load('npc_transaction_finish', {url: '/static/audio/interface/npc_transaction_finish_001.m4a'}, 0.1);

    // widgets motion

    audioManager.load('widget_motion_show', {url: '/static/audio/interface/widget_motion_show_001.m4a'}, 0.15);
    audioManager.load('widget_motion_hide', {url: '/static/audio/interface/widget_motion_hide_001.m4a'}, 0.15);
    audioManager.load('widget_motion_battle_show', {url: '/static/audio/interface/widget_motion_battle_show_001.m4a'}, 0.15);
    audioManager.load('widget_motion_battle_hide', {url: '/static/audio/interface/widget_motion_battle_hide_001.m4a'}, 0.15);
    audioManager.load('widget_motion_zoom_show', {url: '/static/audio/interface/widget_motion_zoom_show_001.m4a'}, 0.15);
    audioManager.load('widget_motion_zoom_hide', {url: '/static/audio/interface/widget_motion_zoom_hide_001.m4a'}, 0.15);

    // other

    audioManager.load('cannon_reloaded', {url: '/static/audio/interface/cannon_reloaded_001.m4a'}, 0.45);
    audioManager.load('alarm', {url: '/static/audio/interface/alarm_001.m4a'}, 0.1);
    audioManager.load('path_setting', {url: '/static/audio/interface/path_setting_001.m4a'}, 0.1);
    audioManager.load('click', {url: '/static/audio/interface/click_001.m4a'}, 0.1);
    audioManager.load('autofire_enable', {url: '/static/audio/interface/autofire_enable_001.m4a'}, 0.15);
    audioManager.load('autofire_disable', {url: '/static/audio/interface/autofire_disable_001.m4a'}, 0.15);
}
