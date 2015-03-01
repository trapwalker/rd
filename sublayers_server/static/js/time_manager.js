var Clock = (function () {
    function Clock() {
        this.dt = 0;
        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: 'receiveMessage',
            subject: this
        });
        this._count_message = 0;
        this._pings = 0;
        this._msg_count_correct = 50; // количество сообщений необходимое для корректировки dt
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
        console.log('Поправка времени = ', this.dt)
    };

    Clock.prototype.receiveMessage = function (params) {
        if (params.message_type == "push") {
            this._pings += (new Date().getTime() - params.serv_time) / 1000.;
            this._count_message ++;
            if (this._count_message >= this._msg_count_correct) {
                this._pings /= this._count_message;
                this.setDt(this._pings);
                this._pings = 0;
                this._count_message = 0;
            }
        }
    };

    return Clock;
})();

// todo: подумать над синхронизацией

var ConstTimerInterval = 20;   // Интервал таймера минимальный (мс)
var ConstTimerIntervalMax = 75;   // Интервал таймера максимальный (мс)
var ConstTimerIntervalModificator = 3;   // Разовое изменение интервала таймера (мс)
var ConstIntervalTimeEps = 5; // Допустимая погрешность средней величины реального интервала таймера (мс)
var ConstSetFPSTimeout = 5000; // Время (мс), через которое будет обновляться интервал таймера (зависит от производительности)

var TimeManager = (function () {
    function TimeManager() {
        this._FPSEvent = null;
        this._FPSCount = 0;
        this._FPSInterval = ConstTimerInterval;

        this._timer = null;
        this._interval = ConstTimerInterval;
        this._timer_list = [];

        // todo: очень спорный момент запуска при старте
        this.timerStart();
        this.autoFPSStart();

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
        var self = this;
        this._timer = setInterval(function () {
            self._interval_perform();
        }, this._interval)
    };

    // Остановка таймера
    TimeManager.prototype.timerStop = function () {
        clearInterval(this._timer);
    };

    // Функция таймера
    TimeManager.prototype._interval_perform = function () {
        //console.log('TimeManager.prototype._interval_perform');
        var time = clock.getCurrentTime();
        var time_start = clock.getClientTime();

        var list = this._timer_list;
        // основной проход
        for (var i = 0; i < list.length; i++)
            list[i].obj[list[i].method](time);

        if(visualManager)
            visualManager.perform(time);

        var d_time = clock.getClientTime() - time_start;
        if (d_time > this.render_time)
            this.render_time = d_time;

        this._FPSInterval += d_time;
        this._FPSCount++;

        if (d_time > this._interval)
            console.log('Таймер не успел отработать! Время работы: ', d_time,  '      Желаемое время: ', this._interval);

    };

    // Установка интервала таймера
    TimeManager.prototype.setIntervalTimer = function (interval) {
        if(this._interval == interval) return;
        console.log('TimeManager.prototype.setIntervalTimer', interval);
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
        if (value_interval <= ConstTimerInterval) {
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