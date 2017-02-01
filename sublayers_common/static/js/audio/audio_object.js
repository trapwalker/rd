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

    GameAudioObject.prototype.play = function (time, gain, callback, loop, offset, duration, playbackRate) {
        if (!this.ready_to_play || !this.audio_buffer) return null;

        // Создание и настройка нод
        var context = audioManager.get_ctx();
        var current_source = context.createBufferSource();
        current_source.buffer = this.audio_buffer;
        current_source.loop = loop ? true : false;
        current_source.playbackRate.value = playbackRate != null && playbackRate != undefined ? playbackRate : 1.0;

        //var synthDelay = context.createDelay(10);

        var gainNode = context.createGain();
        this.gain(gainNode, gain);  // Установка звука для данного gainNode

        var biquadFilter = context.createBiquadFilter();
        biquadFilter.type = 'peaking'; // тип фильтра
        biquadFilter.frequency.value = 1000; // частота
        biquadFilter.Q.value = 1; // Q-factor
        biquadFilter.gain.value = 25.0;

        // Создание конвейера
        current_source.connect(biquadFilter);
        biquadFilter.connect(gainNode);
        gainNode.connect(context.destination);
        //synthDelay.connect();

        // Создание хенддлера текущеко воспроизведения
        var obj = {
            source_node: current_source,
            gain_node: gainNode,
            eq_node: biquadFilter,
            ended_cb: typeof(callback) === 'function' ? callback : null
        };
        current_source.onended = GameAudioObject.prototype.ended.bind(this, obj);  // Правильный callback с учётом объекта
        this.current_objects_playing.push(obj);

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

        return obj;
    };

    GameAudioObject.prototype.stop = function (time, audio_object) {
        var index_playing = this.current_objects_playing.indexOf(audio_object);
        if (index_playing >= 0) {
            try {
                if (typeof(audio_object.source_node.stop) == 'function')  // если это нормальный браузер
                    audio_object.source_node.stop(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
                else // если это safari
                    audio_object.source_node.noteOff(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
            }
            catch (e) {
                console.log(e);
            }
            return true;
        }
        else
            console.warn('Неизвестный аудио объект', audio_object);
        return false;
    };

    GameAudioObject.prototype.ended = function (audio_object, event) {
        //console.log('GameAudioObject.prototype.ended', audio_object, event);
        var index_playing = this.current_objects_playing.indexOf(audio_object);
        if ((index_playing >= 0) && (event.target === audio_object.source_node)) {
            this.current_objects_playing.splice(index_playing, 1);
            if (typeof(audio_object.ended_cb) === 'function')
                audio_object.ended_callback()
        }
        else
            console.warn('Неизвестный аудио объект', audio_object);
    };

    // Установка громкости
    GameAudioObject.prototype.gain = function (gainNode, value) {
        value = value === undefined ? 1.0 : value;
        value = value * this.start_relative_gain * audioManager.general_gain;
        value = value > 1.0 ? 1.0 : value;
        value = value < 0.0 ? 0.0 : value;
        gainNode.gain.value = value;
        return true;
    };

    return GameAudioObject;
})();