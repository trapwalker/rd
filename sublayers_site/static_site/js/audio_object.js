var AudioObject = (function () {
    function AudioObject(source, autoplay) {
        this.current_source = null;
        this.ready_to_play = false;
        this.play_on_load = autoplay ? true : false;
        this.audio_buffer = null;
        this.is_playing = false;
        this.time = null;
        this.gainNode = audioManager.get_ctx().createGain();
        this.gainNode.gain.value = 1;
        this.ended_callback = null;   // callback на завершение проигрывания

        this.load(source);
    }

    // Воспроизведение
    AudioObject.prototype.play = function (time, gain, callback) {
        if (this.current_source) {
            console.warn('Вызов play, без предварительного вызова stop ');
        }
        if (! this.ready_to_play  || ! this.audio_buffer) {
            console.warn('Вызов play до загрузки    audio_buffer not ready');
            this.play_on_load = true;
            return false;
        }
        if (this.is_playing) {
            console.warn('Нехорошо (!!!) вызывать play, пока не закончился предыдущий');
        }

        this.gain(gain);
        var context = audioManager.get_ctx();
        this.current_source = context.createBufferSource();
        this.current_source.buffer = this.audio_buffer;
        this.current_source.connect(this.gainNode);
        this.gainNode.connect(context.destination);
        this.current_source.onended = AudioObject.prototype.ended.bind(this);  // Правильный callback с учётом объекта
        this.current_source.start(context.currentTime + (time == undefined ? 0 : time));
        this.is_playing = true; // Даже если оно ещё не играет, а только ждёт старта

        if (typeof(callback) === 'function') {this.ended_callback = callback; }

        return true;
    };

    AudioObject.prototype.stop = function (time) {
        if (this.current_source) {
            this.current_source.stop(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
            this.current_source = null;
            this.is_playing = false;
            return true;
        }
        return false;
    };

    AudioObject.prototype.ended = function (event) {
        if (event.target === this.current_source) {
            this.current_source = null;
            this.is_playing = false;

            if (typeof(this.ended_callback) === 'function') {
                this.ended_callback()
            }
        }
    };

    // Загрузка
    AudioObject.prototype.load = function (source) {
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
                    if (self.play_on_load){
                        self.play();
                    }
                    self.time = new Date().getTime();
                }, function (e) {
                    console.log('Error decoding file', e);
                });
        };
        xhr.send();
    };

    // Установка громкости
    AudioObject.prototype.gain = function (value) {
        value = value === undefined ? 1.0 : value;
        value = value > 1.0 ? 1.0 : value;
        value = value < 0.0 ? 0.0 : value;
        this.gainNode.gain.value = value;
        return true;
    };


    return AudioObject;
})();



var TagAudioObject = (function () {
    function TagAudioObject(source, autoplay) {
        this.audio = new Audio([source.url]);
        if (autoplay) {
            this.play();
        }
    }

    // Воспроизведение
    TagAudioObject.prototype.play = function (time, gain, callback) {
        // time - delay in seconds before start
        // callback --- not supported in this class
        if (!this.audio.paused) {
            console.warn('Вызов play у уже играющего объекта ');
        }

        var self = this;
        this.gain(gain);

        if (time && time > 0.0) {
            setTimeout(function() {self.audio.play();}, time * 1000);
        }
        else {
            this.audio.play();
        }
        return true;
    };

    TagAudioObject.prototype.stop = function (time) {
        if (! this.audio.paused) {
            var self = this;
            if (time && time > 0.0) {
                setTimeout(function () {self.audio.pause();}, time * 1000);
            }
            else {
                this.audio.pause();
            }
            return true;
        }
        return false;
    };

    // Установка громкости
    TagAudioObject.prototype.gain = function (value) {
        value = value === undefined ? 1.0 : value;
        value = value > 1.0 ? 1.0 : value;
        value = value < 0.0 ? 0.0 : value;
        this.audio.volume = value;
        return true;
    };

    return TagAudioObject;
})();
