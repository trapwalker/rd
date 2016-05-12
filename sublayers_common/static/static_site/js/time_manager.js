(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                                      window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) { clearTimeout(id); };
}());

var TimeManager = (function () {
    function TimeManager() {
        this._timer = null;
        this._timer_list = [];

        this.timerStart();
    }

    // Получение текущего времени в миллисекундах
    TimeManager.prototype.getTime = function () {
        return new Date().getTime();
    };

    // ТАЙМЕР

    // Запуск таймера
    TimeManager.prototype.timerStart = function (delay) {
        //console.log('TimeManager.prototype.timerStart');
        delay = delay || 0;
        setTimeout(function() { timeManager._timer = timeManager._interval_perform(); }, delay);
    };

    // Остановка таймера
    TimeManager.prototype.timerStop = function () {
        //console.log('TimeManager.prototype.timerStop');
        window.cancelAnimationFrame(this._timer);
    };

    // Функция таймера
    TimeManager.prototype._interval_perform = function () {
        //console.log('TimeManager.prototype._interval_perform');
        var time = timeManager.getTime();

        // Основной проход
        var list = timeManager._timer_list;
        for (var i = 0; i < list.length; i++)
            list[i].obj[list[i].method](time);

        return requestAnimationFrame(timeManager._interval_perform);
    };

    // Добавление ивента таймера
    TimeManager.prototype.addTimerEvent = function (obj, method) {
        if (!obj || typeof(obj[method]) != 'function')
            return;
        for (var i = this._timer_list.length - 1; i >= 0; i--)
            if ((this._timer_list[i].obj == obj) && (this._timer_list[i].method == method))
                return;
        this._timer_list.push({obj: obj, method: method})
    };

    // Удаление ивента таймера
    TimeManager.prototype.delTimerEvent = function (obj, method) {
        for (var i = this._timer_list.length - 1; i >= 0; i--)
            if ((this._timer_list[i].obj == obj) && (!method || (this._timer_list[i].method == method)))
                this._timer_list.splice(i, 1);
    };

    // Удаление подписчика со всеми его ивентами таймера
    TimeManager.prototype.delObjectFromTimer = function (obj) {
        this.delTimeoutEvent(obj, null);
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
        if (event)  event.alive = false;
    };

    return TimeManager;
})();

var timeManager = new TimeManager();