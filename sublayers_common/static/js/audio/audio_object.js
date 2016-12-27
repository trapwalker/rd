var AudioObject = (function () {
    function AudioObject(source, autoplay, gain) {
        this.current_source = null;
        this.ready_to_play = false;
        this.play_on_load = autoplay ? true : false;
        this.audio_buffer = null;
        this.is_playing = false;
        this.time = null;
        this.gainNode = audioManager.get_ctx().createGain();
        this.start_relative_gain = gain === undefined ? 1.0 : gain; // Это относительная громкость (относительно переданной в play)
        this.gainNode.gain.value = this.start_relative_gain;
        this.ended_callback = null;   // callback на завершение проигрывания
        this.play_loop = false;


        this.load(source);
    }

    // Воспроизведение
    AudioObject.prototype.play = function (time, gain, callback, loop, offset, duration) {
        if (this.current_source) {
            //console.warn('Вызов play, без предварительного вызова stop ');
        }
        if (!this.ready_to_play || !this.audio_buffer) {
            //console.warn('Вызов play до загрузки    audio_buffer not ready');
            this.play_on_load = true;
            return false;
        }
        if (this.is_playing) {
            //console.warn('Нехорошо (!!!) вызывать play, пока не закончился предыдущий');
        }

        this.gain(gain);
        var context = audioManager.get_ctx();
        this.current_source = context.createBufferSource();
        this.current_source.buffer = this.audio_buffer;
        this.current_source.connect(this.gainNode);
        this.gainNode.connect(context.destination);
        this.current_source.onended = AudioObject.prototype.ended.bind(this);  // Правильный callback с учётом объекта

        try {
            duration = duration === undefined ? this.audio_buffer.duration : duration;
            offset = offset === undefined ? null : offset;
            var t = context.currentTime + (time === undefined ? 0 : time);
            if (typeof(this.current_source.start) == 'function') { // Если это нормальный браузер
                this.current_source.start(t, offset, duration);
            }
            else { // Если это сафари
                this.current_source.noteOn(t);
            }
        }
        catch (e) {
            console.log(e);
        }

        this.is_playing = true; // Даже если оно ещё не играет, а только ждёт старта

        if (typeof(callback) === 'function') {
            this.ended_callback = callback;
        }

        if (loop) this.play_loop = loop;

        return true;
    };

    AudioObject.prototype.stop = function (time) {
        if (this.current_source) {
            this.play_loop = false;
            try {
                if (typeof(this.current_source.stop) == 'function') { // если это нормальный браузер
                    this.current_source.stop(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
                }
                else { // если это safari
                    this.current_source.noteOff(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
                }
            }
            catch (e) {
                console.log(e);
            }
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

            if (this.play_loop) {
                this.play();
                return;
            }

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
                    if (self.play_on_load) {
                        self.play();
                    }
                    self.time = new Date().getTime();
                    //console.log('Load complete', decodedArrayBuffer);
                }, function (e) {
                    console.log('Error decoding file', e);
                });
        };
        xhr.send();
    };

    // Установка громкости
    AudioObject.prototype.gain = function (value) {
        value = value === undefined ? 1.0 : value * this.start_relative_gain;
        value = value > 1.0 ? 1.0 : value;
        value = value < 0.0 ? 0.0 : value;
        this.gainNode.gain.value = value;
        return true;
    };


    return AudioObject;
})();


var TagAudioObject = (function () {
    function TagAudioObject(source, autoplay, gain) {
        this.audio = new Audio([source.url]);
        //this.audio = document.getElementById(source.id);
        if (autoplay) {
            this.play();
        }
        this.start_relative_gain = gain === undefined ? 1.0 : gain; // Это относительная громкость (относительно переданной в play)
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
            setTimeout(function () {
                self.audio.play();
            }, time * 1000);
        }
        else {
            this.audio.play();
        }
        return true;
    };

    TagAudioObject.prototype.stop = function (time) {
        if (!this.audio.paused) {
            var self = this;
            if (time && time > 0.0) {
                setTimeout(function () {
                    self.audio.pause();
                }, time * 1000);
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
        value = value === undefined ? 1.0 : value * this.start_relative_gain;
        value = value > 1.0 ? 1.0 : value;
        value = value < 0.0 ? 0.0 : value;
        this.audio.volume = value;
        return true;
    };

    return TagAudioObject;
})();



var GameAudioObject = (function () {
    function GameAudioObject(source, gain) {
        //this.current_source = null;
        this.current_objects_playing = [];  // {source: current_source, gain: gainNode, loop: loop, ended_cb: cb}
        this.ready_to_play = false;
        this.audio_buffer = null;

        this.start_relative_gain = gain === undefined ? 1.0 : gain; // Это относительная громкость (относительно переданной в play)
        //this.gainNode.gain.value = this.start_relative_gain;
        //this.ended_callback = null;   // callback на завершение проигрывания
        //this.play_loop = false;

        this.load(source);
    }

    // Воспроизведение
    GameAudioObject.prototype.play = function (time, gain, callback, loop, offset, duration, playbackRate) {

        if (!this.ready_to_play || !this.audio_buffer) {
            //console.warn('Вызов play до загрузки    audio_buffer not ready');
            this.play_on_load = true;
            return false;
        }

        var current_source = null;

        var context = audioManager.get_ctx();
        current_source = context.createBufferSource();
        var gainNode = context.createGain();
        var biquadFilter = context.createBiquadFilter();
        this.gain(gainNode, gain);  // Установка звука для данного gainNode

        //var delayNode = context.createDelay(5.0);

        current_source.buffer = this.audio_buffer;
        current_source.connect(biquadFilter);
        //biquadFilter.connect(delayNode);
        //delayNode.connect(gainNode);
        biquadFilter.connect(gainNode);
        gainNode.connect(context.destination);

        var obj = {source: current_source, gain: gainNode, loop: loop, ended_cb: null, eq: biquadFilter};
        if (typeof(callback) === 'function') { obj.ended_cb = callback; }

        this.current_objects_playing.push(obj);


        // Настройка эквалайзера
        biquadFilter.type = 'peaking'; // тип фильтра
        biquadFilter.frequency.value = 1000; // частота
        biquadFilter.Q.value = 1; // Q-factor
        biquadFilter.gain.value = 25.0;

        //delayNode.delayTime = 5.0;

        current_source.onended = GameAudioObject.prototype.ended.bind(this, obj);  // Правильный callback с учётом объекта

        try {
            duration = duration === undefined ? this.audio_buffer.duration : duration;
            offset = offset === undefined ? null : offset;

            current_source.playbackRate.value = playbackRate != null && playbackRate != undefined ? playbackRate : 1.0;
            current_source.loop = loop;
            var t = context.currentTime + (time === undefined ? 0 : time);
            if (typeof(current_source.start) == 'function') { // Если это нормальный браузер
                current_source.start(t, offset, duration);
            }
            else { // Если это сафари
                current_source.noteOn(t);
            }
        }
        catch (e) {
            console.log(e);
        }

        return obj;
    };

    GameAudioObject.prototype.stop = function (time) {
        if (this.current_source) {
            this.play_loop = false;
            try {
                if (typeof(this.current_source.stop) == 'function') { // если это нормальный браузер
                    this.current_source.stop(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
                }
                else { // если это safari
                    this.current_source.noteOff(audioManager.get_ctx().currentTime + (time == undefined ? 0 : time));
                }
            }
            catch (e) {
                console.log(e);
            }
            this.current_source = null;
            this.is_playing = false;
            return true;
        }
        return false;
    };

    GameAudioObject.prototype.ended = function (audio_object, event) {
        console.log('GameAudioObject.prototype.ended', audio_object, event);
        // todo: удалить из списка
        //if (event.target === audio_object.current_source) {
        //    audio_object.current_source = null;
        //    this.is_playing = false;
        //
        //    if (this.play_loop) {
        //        this.play();
        //        return;
        //    }
        //
        //    if (typeof(this.ended_callback) === 'function') {
        //        this.ended_callback()
        //    }
        //
        //}
    };

    // Загрузка
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
                    self.time = new Date().getTime();
                    //console.log('Load complete', decodedArrayBuffer);
                }, function (e) {
                    console.log('Error decoding file', e);
                });
        };
        xhr.send();
    };

    // Установка громкости
    GameAudioObject.prototype.gain = function (gainNode, value) {
        value = value === undefined ? 1.0 : value * this.start_relative_gain;
        value = value > 1.0 ? 1.0 : value;
        value = value < 0.0 ? 0.0 : value;
        gainNode.gain.value = value;
        return true;
    };


    return GameAudioObject;
})();