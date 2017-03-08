var GameAudioObject = (function () {
    function GameAudioObject(source, gain) {
        this.current_objects_playing = [];  // {source_node, gain_node, eq_node, ended_cb}
        this.current_source = null;
        this.ready_to_play = false;
        this.audio_buffer = null;
        this.start_relative_gain = gain === undefined ? 1.0 : gain;
        this.load(source);
    }

    GameAudioObject.prototype.load = function (source) {
        var self = this;
        var context = audioManager.get_ctx();
        // делаем XMLHttpRequest (AJAX) на сервер
        var xhr = new XMLHttpRequest();
        xhr.open('GET', source.url, true);
        xhr.responseType = 'arraybuffer'; // Говорит о том, что принятые данные будут являться аудио буффером
        xhr.onload = function (e) {
            // декодируем бинарный ответ
            context.decodeAudioData(this.response,
                function (decodedArrayBuffer) {
                    // получаем декодированный буфер
                    self.audio_buffer = decodedArrayBuffer;
                    self.ready_to_play = true;
                }, function (e) {
                    console.log('Error decoding file', e);
                });
        };
        xhr.send();
    };

    GameAudioObject.prototype.play = function (time, gain, callback, loop, offset, duration, playbackRate, priority) {
        if (!this.ready_to_play || !this.audio_buffer) return null;
        return new PlayAudioObject(this, time, gain, callback, loop, offset, duration, playbackRate, priority);
    };

    // Установка громкости
    GameAudioObject.prototype.gain = function (play_object, value) {
        return play_object.gain(value);
    };

    GameAudioObject.prototype.general_gain = function (old_value) {
        for (var key in this.current_objects_playing)
            if (this.current_objects_playing.hasOwnProperty(key)) {
                var play_obj = this.current_objects_playing[key];
                var value = play_obj.gain_node.gain.value;
                value /= old_value * this.start_relative_gain;
                play_obj.gain(value);
            }
        return true;
    };

    return GameAudioObject;
})();


var PlayAudioObject = (function () {
    function PlayAudioObject(parent, time, gain, callback, loop, offset, duration, playbackRate, priority) {
        this.parent = parent;
        // Создание и настройка нод
        var context = audioManager.get_ctx();
        var current_source = context.createBufferSource();
        current_source.buffer = parent.audio_buffer;
        current_source.loop = loop ? true : false;
        current_source.playbackRate.value = playbackRate != null && playbackRate != undefined ? playbackRate : 1.0;

        var gainNode = context.createGain();

        // Создание конвейера
        current_source.connect(gainNode);
        gainNode.connect(context.destination);

        // Создание хенддлера текущеко воспроизведения
        this.source_node = current_source;
        this.gain_node = gainNode;
        this.ended_cb = typeof(callback) === 'function' ? callback : null;

        this.start_gain = gain;
        this.priority = priority || 0;

        //this.gain(gain);  // Установка звука для данного gainNode

        current_source.onended = PlayAudioObject.prototype.ended.bind(this);

        parent.current_objects_playing.push(this);
        audioManager.add_playobject(this);

        // Попытка запуска
        try {
            offset = offset === undefined ? null : offset;
            var t = context.currentTime + (time === undefined ? 0 : time);
            duration = duration ? duration : undefined;
            if (typeof(current_source.start) == 'function') // Если это нормальный браузер
                current_source.start(t, offset, duration);
            else // Если это сафари
                current_source.noteOn(t);
        }
        catch (e) {
            console.warn('Ошибка при попытке старта аудио объекта', e);
        }
    }

    PlayAudioObject.prototype.stop = function (time) {
        var index_playing = this.parent.current_objects_playing.indexOf(this);
        if (index_playing >= 0) {
            try {
                if (typeof(this.source_node.stop) == 'function')  // если это нормальный браузер
                    this.source_node.stop(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
                else // если это safari
                    this.source_node.noteOff(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
            }
            catch (e) {
                console.log(e);
            }
            return true;
        }
        else
            console.warn('Неизвестный аудио объект', this);
        return false;
    };

    PlayAudioObject.prototype.ended = function (event) {
        var parent = this.parent;
        //console.log('GameAudioObject.prototype.ended', audio_object, event);
        audioManager.del_playobject(this);
        var index_playing = parent.current_objects_playing.indexOf(this);
        if ((index_playing >= 0) && (event.target === this.source_node)) {
            parent.current_objects_playing.splice(index_playing, 1);
            if (typeof(this.ended_cb) === 'function')
                this.ended_cb()
        }
        else
            console.warn('Неизвестный аудио объект', this);
    };

    PlayAudioObject.prototype.duration = function () {
        return this.source_node.buffer.duration;
    };

    // Установка громкости
    PlayAudioObject.prototype.gain = function (value) {
        value = value === undefined ? 1.0 : value;
        value = value * this.parent.start_relative_gain * audioManager.general_gain;
        value = value > 1.0 ? 1.0 : value;
        value = value < 0.0 ? 0.0 : value;
        if (this.gain_node.gain.value != value)
            this.gain_node.gain.value = value;
        return true;
    };

    return PlayAudioObject;
})();
