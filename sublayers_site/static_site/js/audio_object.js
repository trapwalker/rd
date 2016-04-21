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

        this.load(source);
    }

    // Воспроизведение
    AudioObject.prototype.play = function (time) {
        if (this.current_source) {
            console.warn('Вызов play, без предварительного вызова stop ');
        }
        if (! this.ready_to_play  || ! this.audio_buffer) {
            console.warn('Вызов play до загрузки    audio_buffer not ready');
            this.play_on_load = true;
            return false;
        }
        if (this.is_playing) {
            console.warn('Нельзя вызывать play, пока не закончился предыдущий');
            return false;
        }



        var context = audioManager.get_ctx();
        this.current_source = context.createBufferSource();
        this.current_source.buffer = this.audio_buffer;
        this.current_source.connect(this.gainNode);
        this.gainNode.connect(context.destination);
        this.current_source.onended = AudioObject.prototype.ended.bind(this);  // Правильный callback с учётом объекта
        this.current_source.start(context.currentTime + (time == undefined ? 0 : time));
        this.is_playing = true; // Даже если оно ещё не играет, а только ждёт старта
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
        this.current_source = null;
        this.is_playing = false;
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
        value = value > 1.0 ? 1.0 : value;
        value = value < 0.0 ? 0.0 : value;
        this.gainNode.gain.value = value;
        return true;
    };


    return AudioObject;
})();
