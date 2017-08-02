(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

var Clock = (function () {
    function Clock() {
        this.ddt = 0;     // Скорость изменения времени
        this.t0dt = 0;    // Клиентское время начало изменения времени
        this.sdt = 0;     // Стартовое dt
        this.edt = 0;     // Целевое dt
        this.t_move = 1;  // Время достижения целевого dt

        this.last_time = 0;

        this.accum_array = [];
        this.accum_summ = 0.0;
        this.accum_count = 10;

        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: 'receiveMessage',
            subject: this
        });
    }

    // Получение текущего времени с поправкой на сервер
    Clock.prototype.getCurrentTime = function () {
        var time = new Date().getTime() / 1000. - this.getDt();
        return time;
        // todo: разобраться здесь. Скорее всего часовые пояса выдавали фигню!
        //if (time > this.last_time) this.last_time = time;
        //return this.last_time;
    };

    // Получение текущего времени в миллисекундах - нельзя учитывать при расчёте движения
    Clock.prototype.getClientTime = function () {
        return new Date().getTime();
    };

    // Расчет серверной "поправки".
    Clock.prototype.setDt = function () {
        this.sdt = this.getDt();  // Стартовое dt
        if (this.accum_array)
            this.edt = this.accum_summ / this.accum_array.length;
        this.ddt = (this.edt - this.sdt) / this.t_move;
        this.t0dt = this.getClientTime() / 1000.;
    };

    Clock.prototype.getDt = function () {
        var time = this.getClientTime() / 1000.;
        if ((time - this.t0dt) >= this.sdt) return this.edt;
        else return this.sdt + (time - this.t0dt) * this.ddt;
    };

    Clock.prototype.logDtInfo = function () {
        console.log('Стартовое dt:', this.sdt);
        console.log('Текущее dt:', this.getDt());
        console.log('Целевое dt:', this.edt);
        console.log('---------------------------------');
    };

    Clock.prototype.receiveMessage = function (params) {
        //console.log("Clock.prototype.receiveMessage", params);
        if (params.message_type == "push") {
            var temp_dt = (new Date().getTime() - params.events[0].time) / 1000.;
            this.accum_summ += temp_dt;
            this.accum_array.push(temp_dt);
            if (this.accum_array.length > this.accum_count)
                this.accum_summ -= this.accum_array.shift();
            this.setDt();
            //console.log('Время на клиенте:', this.getClientTime() / 1000.);
            //console.log('dt сообщения: ', temp_dt);
            //this.logDtInfo();
        }
    };

    return Clock;
})();

var ConstTimerInterval = 30;   // Интервал таймера минимальный (мс)
var ConstTimerIntervalMax = 75;   // Интервал таймера максимальный (мс)
var ConstTimerIntervalModificator = 3;   // Разовое изменение интервала таймера (мс)
var ConstIntervalTimeEps = 5; // Допустимая погрешность средней величины реального интервала таймера (мс)
var ConstSetFPSTimeout = 5000; // Время (мс), через которое будет обновляться интервал таймера (зависит от производительности)

var TimeManager = (function () {
    function TimeManager() {
        this._need_fps = 0; // ФПС который будет пытаться выдерживать клиент (если <= 0 то брать requestAnimationFrame)
        this._fps_interval = 0;
        this._fps_all_time = 0;
        this._redraw_time  = 0;
        this.FPS = 0;

        this._FPSEvent = null;
        this._FPSCount = 0;
        this._FPSInterval = ConstTimerInterval;

        this._timer = null;
        this._interval = ConstTimerInterval;
        this._timer_list = [];
        this.is_started = false;

        // todo: очень спорный момент запуска при старте
        //this.timerStart();
        //this.autoFPSStart();

        this.render_time = 0;

        var self = this;
        setInterval(function () {
            //console.log('Максимальное время отрисовки: ', self.render_time);
            self.render_time = 0;
        }, 10000)
    }

    // ТАЙМЕР

    // Запуск таймера
    TimeManager.prototype.timerStart = function (fps) {
        //console.log('TimeManager.prototype.timerStart');
        var self = this;
        if (this.is_started) return;
        this.is_started = true;
        if (fps && (fps > 0)) {
            this._need_fps = fps;
            this._interval = 1000 / this._need_fps;
            this._timer = setInterval(function () { self._interval_perform(); }, this._interval)
        }
        else
            setTimeout(function() { timeManager._interval_perform(); }, 10);
    };

    // Остановка таймера
    TimeManager.prototype.timerStop = function () {
        //console.log('TimeManager.prototype.timerStop');
        if (! this.is_started) return;
        this.is_started = false;
        if (this._need_fps && (this._need_fps > 0))
            clearInterval(this._timer);
        else
            window.cancelAnimationFrame(this._timer);
        this._need_fps = 0;
    };

    // Функция таймера
    TimeManager.prototype._interval_perform = function () {
        //console.log('TimeManager.prototype._interval_perform', this);

        var time = clock.getCurrentTime();
        var time_start = clock.getClientTime();

        var list = timeManager._timer_list;
        // основной проход
        for (var i = 0; i < list.length; i++)
            list[i].obj[list[i].method](time);

        if(visualManager)
            visualManager.perform(time);

        timeManager._fps_all_time += time_start - timeManager._redraw_time;
        timeManager._fps_interval = timeManager._fps_interval + 1;
        if (timeManager._fps_interval == 200) {
            //console.log('FPS = ', (timeManager._fps_interval / timeManager._fps_all_time) * 1000);
            var FPS = (((timeManager._fps_interval / timeManager._fps_all_time) * 1000) >> 1) << 1;
            if (timeManager.FPS != FPS) {
                timeManager.FPS = FPS;
                $('#FPSSpan').text(FPS);
            }
            timeManager._fps_interval = 0;
            timeManager._fps_all_time = 0;
        }
        timeManager._redraw_time = time_start;

        //CanvasTestStart();
        mapCanvasManager.redraw(time);
        locationManager.location_canvas_laser_manager.redraw(time);
        locationManager.location_canvas_effect_manager.redraw(time);

        if (timeManager._need_fps <= 0)
            timeManager._timer = requestAnimationFrame(timeManager._interval_perform);

        //var d_time = clock.getClientTime() - time_start;
        //if (d_time > this.render_time)
        //    this.render_time = d_time;
        //
        //this._FPSInterval += d_time;
        //this._FPSCount++;
        //
        //if (d_time > this._interval)
        //    console.log('Таймер не успел отработать! Время работы: ', d_time,  '      Желаемое время: ', this._interval);
    };

    // Установка интервала таймера
    TimeManager.prototype.setIntervalTimer = function (interval) {
        if(this._interval == interval) return;
        console.log('Установлено новое время перерисовки кадра = ', interval, ' мс');
        this.timerStop();
        this._interval = interval;
        this.timerStart();
    };

    // Добавление ивента таймера
    TimeManager.prototype.addTimerEvent = function (obj, method) {
        if (!obj || typeof(obj[method]) != 'function')
            return;
        var list = this._timer_list;
        for (var i = list.length - 1; i >= 0; i--)
            if (list[i].obj == obj && list[i].method == method)
                return;
        this._timer_list.push({obj: obj, method: method})
    };

    // Удаление ивента таймера
    TimeManager.prototype.delTimerEvent = function (obj, method) {
        var list = this._timer_list;
        for (var i = list.length - 1; i >= 0; i--)
            if (list[i].obj == obj)
                if (!method || list[i].method == method)
                    list.splice(i, 1);
    };

    // Удаление подписчика со всеми его ивентами таймера
    TimeManager.prototype.delObjectFromTimer = function (obj) {
        var list = this._timer_list;
        for (var i = list.length - 1; i >= 0; i--)
            if (list[i].obj == obj)
                list.splice(i, 1);
    };

    // Запустить авто-контроль FPS
    TimeManager.prototype.autoFPSStart = function () {
        this._FPSEvent = this.addTimeoutEvent(this, '_autoFPSPerform', ConstSetFPSTimeout);
        this._FPSInterval = 0.0;
        this._FPSCount = 0;
    };

    // Выполнить авто-контроль FPS
    TimeManager.prototype._autoFPSPerform = function () {
        //console.log(this._FPSInterval, '          ',  this._FPSCount);
        var value_interval = this._FPSInterval / this._FPSCount;
        if (value_interval >= ConstTimerInterval) {
            var abs_diff = Math.abs(this._interval - value_interval);
            if (abs_diff > ConstIntervalTimeEps) {
                //console.log('Изменение ФПС --- abs_diff =  ', abs_diff, '    interval = ', value_interval);
                if (value_interval > this._interval)
                    this.setIntervalTimer(Math.min(this._interval + ConstTimerIntervalModificator, ConstTimerIntervalMax));
                else
                    this.setIntervalTimer(Math.max(this._interval - ConstTimerIntervalModificator, ConstTimerInterval));
            }
        }

        this._FPSInterval = 0;
        this._FPSCount = 0;
        this._FPSEvent = this.addTimeoutEvent(this, '_autoFPSPerform', ConstSetFPSTimeout);
    };

    // Запустить авто-контроль FPS
    TimeManager.prototype.autoFPSStop = function () {
        this.delTimeoutEvent(this._FPSEvent);
    };

    // ТАЙМАУТ

    // Добавление ивента таймаута
    TimeManager.prototype.addTimeoutEvent = function (obj, method, time) {
        if (!(obj && typeof(obj[method]) === 'function'))
            return null;
        var event = {obj: obj, method: method, alive: true};
        event.timeout = setTimeout(function () {
            if (event.alive)
                event.obj[event.method]();
        }, time);
        return event;
    };

    // Удаление ивента таймаута
    TimeManager.prototype.delTimeoutEvent = function (event) {
        if (event)
            event.alive = false;
    };

    return TimeManager;
})();

var clock = new Clock();
var timeManager = new TimeManager();