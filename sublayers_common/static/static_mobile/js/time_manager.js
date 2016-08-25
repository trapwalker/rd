(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
                                      window[vendors[x]+'CancelRequestAnimationFrame'];
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
        this.dt = 0;
        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: 'receiveMessage',
            subject: this
        });
        this._count_message = 0;
        this._ddt = 0;
        this._msg_count_correct = 20; // количество сообщений необходимое для корректировки dt
    }

    // Получение текущего времени с поправкой на сервер
    Clock.prototype.getCurrentTime = function () {
        return new Date().getTime() / 1000. - this.dt;
    };

    // Получение текущего времени в миллисекундах - нельзя учитывать при расчёте движения
    Clock.prototype.getClientTime = function () {
        return new Date().getTime();
    };

    // Расчет серверной "поправки".
    Clock.prototype.setDt = function (aDiffTime) {
        this.dt = aDiffTime;
        //console.log('Поправка времени = ', this.dt)
    };

    Clock.prototype.receiveMessage = function (params) {
        //console.log("Clock.prototype.receiveMessage", params);
        if (params.message_type == "push") {
            if (params.events[0].cls == "InitTime") {
                this.setDt((new Date().getTime() - params.events[0].time) / 1000.);
            }
            else {
                this._ddt += (new Date().getTime() - params.events[0].time) / 1000.;
                this._count_message++;
                if (this._count_message >= this._msg_count_correct) {
                    this.setDt(this._ddt / this._count_message);
                    this._ddt = 0;
                    this._count_message = 0;
                }
            }
        }
    };

    return Clock;
})();

// todo: подумать над синхронизацией

var ConstTimerInterval = 30;   // Интервал таймера минимальный (мс)
var ConstTimerIntervalMax = 75;   // Интервал таймера максимальный (мс)
var ConstTimerIntervalModificator = 3;   // Разовое изменение интервала таймера (мс)
var ConstIntervalTimeEps = 5; // Допустимая погрешность средней величины реального интервала таймера (мс)
var ConstSetFPSTimeout = 5000; // Время (мс), через которое будет обновляться интервал таймера (зависит от производительности)

var TimeManager = (function () {
    function TimeManager() {
        this._fps_interval = 0;
        this._fps_all_time = 0;
        this._redraw_time  = 0;

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
    TimeManager.prototype.timerStart = function () {
        //console.log('TimeManager.prototype.timerStart');
        var self = this;
        if (this.is_started) return;
        this.is_started = true;
        setTimeout(function() { timeManager._timer = timeManager._interval_perform(); }, 10);

        //this._timer = setInterval(function () {
        //    self._interval_perform();
        //}, this._interval)
    };

    // Остановка таймера
    TimeManager.prototype.timerStop = function () {
        //console.log('TimeManager.prototype.timerStop');
        if (! this.is_started) return;
        this.is_started = false;
        window.cancelAnimationFrame(this._timer);
         //clearInterval(this._timer);
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
            $('#FPSSpan').text((((timeManager._fps_interval / timeManager._fps_all_time) * 1000) >> 1) << 1);
            timeManager._fps_interval = 0;
            timeManager._fps_all_time = 0;
        }
        timeManager._redraw_time = time_start;

        mapManager.redraw(time);
        mapCanvasManager.redraw(time);

        return requestAnimationFrame(timeManager._interval_perform);

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