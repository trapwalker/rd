var ConstCountTracerPerSecond = 5;      // Количество трасеров в секунду;
var ConstTracerSpeed = 120;              // Скорость полета трасера (px / s);
var ConstTracerLength = 8;               // Длина трасера (px);
var ConstCountFlashlightPerSecond = 10;  // Количество трасеров в секунду;
var ConstFlashlightPrecision = 50;       // Радиус разлёта вспышек около машинки (px);
var ConstFlashlightRadius = 2;           // Размер вспышки (px);


var FireAutoEffectManager = (function () {
    function FireAutoEffectManager() {
        this.controllers_list = []; // хранятся объекты {ctrl: FireAutoEffectController, count: int}
        timeManager.addTimerEvent(this, 'perform');
    }

    FireAutoEffectManager.prototype._findController = function (options) {
        var i = 0;
        while ((i < this.controllers_list.length) &&
            ((this.controllers_list[i].ctrl.subj != options.subj) ||
                (this.controllers_list[i].ctrl.obj != options.obj)))  i++;
        if (i == this.controllers_list.length)
            return null;
        else
            return i;
    };

    FireAutoEffectManager.prototype.addController = function (options) {
        var index = this._findController(options);
        if (index != null) {
            this.controllers_list[index].count++;
            this.controllers_list[index].ctrl.update(options);
        }
        else
            this.controllers_list.push({
                ctrl: new FireAutoEffectController(options),
                count: 1
            });
    };

    FireAutoEffectManager.prototype.delController = function (options) {
        var index = this._findController(options);
        if (index != null) {
            this.controllers_list[index].count--;
            if (this.controllers_list[index].count == 0) {
                this.controllers_list[index].ctrl.finish();
                this.controllers_list.splice(index, 1);
            }
        }
        else
            console.error('Попытка удалить несуществующий контроллер автоматической стрельбы!', options);
    };

    FireAutoEffectManager.prototype.perform = function () {
        for (var i = 0; i < this.controllers_list.length; i++)
            this.controllers_list[i].ctrl.change();
    };
    
    return FireAutoEffectManager;
})();


var FireAutoEffectController = (function () {
    function FireAutoEffectController(options) {
        setOptions(options, this);
        this.last_time = 0;
        this.d_time_t = 1. / ConstCountTracerPerSecond;
        this.d_time_fl = 1. / ConstCountFlashlightPerSecond;
        this.muzzle_flash = null;
    }

    FireAutoEffectController.prototype.change = function () {
        var time = clock.getCurrentTime();
        var subj = visualManager.getModelObject(this.subj);
        var obj = visualManager.getModelObject(this.obj);

        if (subj) {
            if (!this.muzzle_flash && this.side)
                this.muzzle_flash = new EAutoFireOnShooter(subj, this.side).start();
        }
        else if (this.muzzle_flash)
            this.muzzle_flash.finish();

        if (subj && obj)
            if ((time - this.last_time) > this.d_time_t) {
                this.last_time = time;
                var p_subj = subj.getCurrentCoord(time);
                var p2 = obj.getCurrentCoord(time);
                var random_point = new Point(
                        Math.random() * ConstFlashlightPrecision - ConstFlashlightPrecision / 2.,
                        Math.random() * ConstFlashlightPrecision - ConstFlashlightPrecision / 2.
                );
                var p_obj = summVector(p2, random_point);
                new EPointsTracer(p_subj, p_obj, ConstTracerSpeed, ConstTracerLength, function (pos) {
                    new EFlashLight(pos, ConstFlashlightRadius).start();
                }).start();
            }

        if (!subj && obj)
            if ((time - this.last_time) > this.d_time_fl) {
                this.last_time = time;
                var p2 = obj.getCurrentCoord(time);
                var random_point = new Point(
                        Math.random() * ConstFlashlightPrecision - ConstFlashlightPrecision / 2.,
                        Math.random() * ConstFlashlightPrecision - ConstFlashlightPrecision / 2.
                );
                var p_obj = summVector(p2, random_point);
                new EFlashLight(p_obj, ConstFlashlightRadius).start();
            }
    };

    FireAutoEffectController.prototype.update = function (options) {
        if (options.side)
            this.side = options.side;
    };

    FireAutoEffectController.prototype.finish = function (options) {
        if (this.muzzle_flash)
            this.muzzle_flash.finish();
    };

    return FireAutoEffectController;
})();

var fireAutoEffectManager = new FireAutoEffectManager();
