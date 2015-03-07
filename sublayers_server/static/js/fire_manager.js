var ConstCountTracerPerSecond = 5;      // Количество трасеров в секунду;
var ConstTracerSpeed = 120;              // Скорость полета трасера (px / s);
var ConstTracerLength = 8;               // Длина трасера (px);
var ConstCountFlashlightPerSecond = 10;  // Количество трасеров в секунду;
var ConstFlashlightPrecision = 50;       // Радиус разлёта вспышек около машинки (px);
var ConstFlashlightOrientedRadius = 20;  // Радиус в котором вспышка будет направленной (px);

var ConstRangeFireDischargeFlashlight = 30;   // Разлет вспышек взрывов при залповой стрельбе (px);
var ConstCountFireDischargeFlashlight = 3;   // Количество вспышек взрывов при залповой стрельбе (px);
var ConstDelayFireDischargeFlashlight = 300; // Задержка между дульным пламенем и вспышкой взрыва при залповой стрельбе (ms);
var ConstFireDischargeFlashlightRadius = 6;  // Размер вспышки взрыва при залповой стрельбе (px);

var FireEffectManager = (function () {
    function FireEffectManager() {
        this.controllers_list = []; // хранятся объекты {ctrl: FireAutoEffectController, count: int}
        this.muzzle_flashs = {}; // хранятся FireAutoMuzzleFlashController's
        timeManager.addTimerEvent(this, 'perform');
    }

    FireEffectManager.prototype._findController = function (options) {
        var i = 0;
        while ((i < this.controllers_list.length) &&
            ((this.controllers_list[i].ctrl.subj != options.subj) ||
                (this.controllers_list[i].ctrl.obj != options.obj)))  i++;
        if (i == this.controllers_list.length)
            return null;
        else
            return i;
    };

    FireEffectManager.prototype.addController = function (options) {
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

        if (options.side && options.subj) {
            if (this.muzzle_flashs.hasOwnProperty(options.subj + options.side))
                this.muzzle_flashs[options.subj + options.side].update(1);
            else
                this.muzzle_flashs[options.subj + options.side] = new FireAutoMuzzleFlashController(options);
        }

    };

    FireEffectManager.prototype.delController = function (options) {
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
        if (options.side && options.subj) {
            if (this.muzzle_flashs.hasOwnProperty(options.subj + options.side))
                this.muzzle_flashs[options.subj + options.side].update(-1);
            else  console.error('Попытка отключить автоматическую стрельбу у отсутствующего контроллера', options);
        }
    };

    FireEffectManager.prototype.fireDischargeEffect = function (options) {
        var vekt = subVector(options.pos_obj, options.pos_subj);
        var direction = angleVectorRadCCW(vekt);
        if (!options.is_fake) {
            new EDischargeFirePNG_1(options.pos_subj, direction).start();
            //for (var i = 0; i < ConstCountFireDischargeFlashlight; i++)
            var pos = getRadialRandomPoint(options.pos_obj, ConstRangeFireDischargeFlashlight);
            if (distancePoints(options.pos_obj, pos) > ConstFlashlightOrientedRadius)
                new EHeavyBangPNG_2(pos).start(ConstDelayFireDischargeFlashlight);
            else if (Math.random() > 0.5)
                new EHeavyBangOrientedPNG_1(options.pos_obj, direction).start();
            else
                new EHeavyBangOrientedPNG_2(options.pos_obj, direction).start();
        }
        else {
            //new EDischargeFire(options.pos_subj, direction).start();
            new EDischargeFirePNG_2(options.pos_subj, direction).start();
            var temp = 1 / ConstCountFireDischargeFlashlight;
            var tempDuration = ConstDelayFireDischargeFlashlight / ConstCountFireDischargeFlashlight;
            for (var i = 0; i < ConstCountFireDischargeFlashlight; i++)
                new EHeavyBangPNG_1(getRadialRandomPoint(summVector(mulScalVector(vekt, i * temp + temp * Math.random()), options.pos_subj),
                                                         ConstRangeFireDischargeFlashlight))
                    .start(i * tempDuration + tempDuration * Math.random());
        }
    };

    FireEffectManager.prototype.perform = function () {
        for (var i = 0; i < this.controllers_list.length; i++)
            this.controllers_list[i].ctrl.change();
    };
    
    return FireEffectManager;
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
/*
        if (subj) {
            if (!this.muzzle_flash && this.side)
                this.muzzle_flash = new EAutoFirePNG(subj, this.side).start();
        }
        else if (this.muzzle_flash)
            this.muzzle_flash.finish();
*/
        if (subj && obj)
            if ((time - this.last_time) > this.d_time_t) {
                this.last_time = time;
                var p_subj = subj.getCurrentCoord(time);
                var p2 = obj.getCurrentCoord(time);
                var p_obj = getRadialRandomPoint(p2, ConstFlashlightPrecision);
                if (distancePoints(p2, p_obj) > ConstFlashlightOrientedRadius)
                    new EPointsTracerPNG(p_subj, p_obj, ConstTracerSpeed, function (pos) {
                        new ELightBangPNG_1(pos).start();
                    }).start();
                else {
                    var dir = angleVectorRadCCW(subVector(p_subj, p_obj)) + Math.PI;
                    new EPointsTracerPNG(p_subj, p_obj, ConstTracerSpeed, function (pos) {
                        new ELightBangPNG_2(pos, dir).start();
                    }).start();
                }
            }

        if (!subj && obj)
            if ((time - this.last_time) > this.d_time_fl) {
                this.last_time = time;
                var p2 = obj.getCurrentCoord(time);
                var p_obj = getRadialRandomPoint(p2, ConstFlashlightPrecision);
                new ELightBangPNG_1(p_obj).start();
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


var FireAutoMuzzleFlashController = (function () {
    function FireAutoMuzzleFlashController(options) {
        setOptions(options, this);
        this.count = 0;
        this.muzzle_flash = null;
        this.update(1);
    }

    FireAutoMuzzleFlashController.prototype.start = function () {
        var subj = visualManager.getModelObject(this.subj);
        if (subj && !this.muzzle_flash && this.side)
            this.muzzle_flash = new EAutoFirePNG(subj, this.side).start();
    };

    FireAutoMuzzleFlashController.prototype.finish = function (options) {
        if (this.muzzle_flash) {
            this.muzzle_flash.finish();
            this.muzzle_flash = null;
        }
    };

    FireAutoMuzzleFlashController.prototype.update = function (count_diff) {
        this.count += count_diff;
        if (this.count > 0 && !this.muzzle_flash) this.start();
        if (this.count <=0 && this.muzzle_flash) this.finish();
    };

    return FireAutoMuzzleFlashController;
})();


var fireEffectManager = new FireEffectManager();