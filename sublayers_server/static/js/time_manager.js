var Clock = (function () {
    function Clock() {
        this.dt = 0;
    }

    // Получение текущего времени с поправкой на сервер
    Clock.prototype.getCurrentTime = function () {
        return new Date().getTime() / 1000. + this.dt;
    };

    // Расчет серверной "поправки". Для установки dt необходимо
    // серверное время передать в секундах = UTC/1000.
    Clock.prototype.setDt = function (aTimeServer) {
        this.dt = aTimeServer - new Date().getTime() / 1000.;
    };

    return Clock;
})();

// todo: подумать над синхронизацией

var ConstTimerInterval = 20;   // Интервал таймера (мс)
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
        //this.autoFPSStart();
    }

    // ТАЙМЕР

    // Запуск таймера
    TimeManager.prototype.timerStart = function () {
        self = this;
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
        time = clock.getCurrentTime();

        var list = this._timer_list;
        // основной проход
        for (var i = 0; i < list.length; i++)
            list[i].obj[list[i].method](time);

        if(visualManager)
            visualManager.perform(time);

        this._FPSInterval += clock.getCurrentTime() - time;
        time._FPSCount++;
    };

    // Установка интервала таймера
    TimeManager.prototype.setIntervalTimer = function (interval) {
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
    };

    // Выполнить авто-контроль FPS
    TimeManager.prototype._autoFPSPerform = function () {
        this._FPSInterval = this._FPSInterval / this._FPSCount;
        if (Math.abs(this._interval - this._FPSInterval) > ConstIntervalTimeEps)
            this.setIntervalTimer(Math.max(this._FPSInterval, ConstTimerInterval));
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