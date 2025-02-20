var ConstCountTracerPerSecond = 5;       // Количество трасеров в секунду;
var ConstTracerSpeed = 120;              // Скорость полета трасера (px / s);
var ConstTracerLength = 8;               // Длина трасера (px);
var ConstCountFlashlightPerSecond = 10;  // Количество трасеров в секунду;
var ConstFlashlightPrecision = 50;       // Радиус разлёта вспышек около машинки (px);
var ConstFlashlightOrientedRadius = 20;  // Радиус в котором вспышка будет направленной (px);

var ConstRangeFireDischargeFlashlight = 30;   // Разлет вспышек взрывов при залповой стрельбе (px);
var ConstCountFireDischargeFlashlight = 3;   // Количество вспышек взрывов при залповой стрельбе (px);
var ConstDelayFireDischargeFlashlight = 300; // Задержка между дульным пламенем и вспышкой взрыва при залповой стрельбе (ms);
var ConstFireDischargeFlashlightRadius = 6;  // Размер вспышки взрыва при залповой стрельбе (px);

// Список Иконок для всех видов маркеров леафлета

var EffectPNGLoader = (function(){
    function EffectPNGLoader() {
        this.effects = {};
        this.count_loading_img = 0;
        resourceLoadManager.add(this);

        this.host_addr = $('#settings_host_name').text();
        this.load_new_image('effect-fire-discharge-png-1', this.host_addr + '/static/img/fire_effects/shoots/heavygunfireright000_001_stripe_5frames.png', [40, 40], 5);
        this.load_new_image('effect-fire-discharge-png-2', this.host_addr + '/static/img/fire_effects/shoots/heavygunfireright000_002_resized_stripe_12frames.png', [57, 75], 12);
        this.load_new_image('effect-fire-auto-png', this.host_addr + '/static/img/fire_effects/shoots/light_fire_right_stripe_2frames.png', [32, 20], 2);
        this.load_new_image('effect-heavy-bang-png-1', this.host_addr + '/static/img/fire_effects/bangs/heavy_damage_1000_2_res_stripe.png', [115, 115], 12);
        this.load_new_image('effect-heavy-bang-png-2', this.host_addr + '/static/img/fire_effects/bangs/heavy_damage_wave_1000_2_res_stripe.png', [115, 115], 12);
        this.load_new_image('effect-light-bang-png-1', this.host_addr + '/static/img/fire_effects/bangs/light_damage_ground_stripe_3frames.png', [22, 22], 3);
        this.load_new_image('effect-light-bang-png-2', this.host_addr + '/static/img/fire_effects/bangs/light_damage_right_stripe_3frames.png', [22, 22], 3);
        this.load_new_image('effect-heavy-bang-oriented-png-1', this.host_addr + '/static/img/fire_effects/bangs/heavy_damage_right_side_003_resized_stripe_12frames.png', [107, 107], 12);
        this.load_new_image('effect-heavy-bang-oriented-png-2', this.host_addr + '/static/img/fire_effects/bangs/heavy_damage_right_side_003_wave_resized_stripe_12frames.png', [107, 107], 12);
        this.load_new_image('effect-tracer-png', this.host_addr + '/static/img/fire_effects/shoots/light_tracer.png', [7, 14], 1);
    }

    EffectPNGLoader.prototype.getImage = function(name){
        return this.effects[name];
    };

    EffectPNGLoader.prototype.load_complete = function () {
        if (this.count_loading_img == 0)
            resourceLoadManager.del(this);
    };

    EffectPNGLoader.prototype.load_new_image = function(name, url, size, frames){
        var img = new Image();
        this.count_loading_img++;
        img.onload = function() {
            effectPNGLoader.effects[name] = {
                img: img,
                size: size,
                frames: frames
            };
            effectPNGLoader.count_loading_img--;
            effectPNGLoader.load_complete();
        };
        img.onerror = function() {
            console.warn('EffectPNGLoader: Content dont load: ', url);
            effectPNGLoader.count_loading_img--;
            effectPNGLoader.load_complete();
        };
        img.src = url;
    };

    return EffectPNGLoader;
})();


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
            else console.error('Попытка отключить автоматическую стрельбу у отсутствующего контроллера', options);
        }
    };

    FireEffectManager.prototype.fireDischargeEffect = function (options) {
        var vekt = subVector(options.fake_position, options.pos_subj);
        var direction = angleVectorRadCCW(vekt);

        for (var i = 0; i < options.targets.length; i++) {
            var pos_obj = new Point(options.targets[i].x, options.targets[i].y);
            var pos = getRadialRandomPoint(pos_obj, ConstRangeFireDischargeFlashlight);
            if (distancePoints(pos_obj, pos) > ConstFlashlightOrientedRadius)
                new ECanvasHeavyBangPNG_2(pos).start(ConstDelayFireDischargeFlashlight);
            else if (Math.random() > 0.5)
                new ECanvasHeavyBangOrientedPNG_1(pos_obj, direction).start();
            else
                new ECanvasHeavyBangOrientedPNG_2(pos_obj, direction).start();
        }

        new ECanvasDischargeFirePNG_1(options.pos_subj, direction).start();
        //new ECanvasDischargeFirePNG_2(options.pos_subj, direction).start();

        var temp = 1 / ConstCountFireDischargeFlashlight;
        var tempDuration = ConstDelayFireDischargeFlashlight / ConstCountFireDischargeFlashlight;
        for (var i = 0; i < ConstCountFireDischargeFlashlight; i++)
            new ECanvasHeavyBangPNG_1(getRadialRandomPoint(summVector(mulScalVector(vekt, i * temp + temp * Math.random()), options.pos_subj),
                ConstRangeFireDischargeFlashlight))
                .start(i * tempDuration + tempDuration * Math.random());
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
    }

    FireAutoEffectController.prototype.change = function () {
        var time = clock.getCurrentTime();
        var subj = visualManager.getModelObject(this.subj);
        var obj = visualManager.getModelObject(this.obj);

        if (subj && obj)
            if ((time - this.last_time) > this.d_time_t) {
                this.last_time = time;
                var p_subj = subj.getCurrentCoord(time);
                var p2 = obj.getCurrentCoord(time);
                var p_obj = getRadialRandomPoint(p2, ConstFlashlightPrecision);
                if (distancePoints(p2, p_obj) > ConstFlashlightOrientedRadius)
                    new ECanvasPointsTracerPNG(p_subj, p_obj, ConstTracerSpeed, function (pos) {
                        new ECanvasLightBangPNG_1(pos).start();
                    }).start();
                else {
                    var dir = angleVectorRadCCW(subVector(p_subj, p_obj)) + Math.PI;
                    new ECanvasPointsTracerPNG(p_subj, p_obj, ConstTracerSpeed, function (pos) {
                        new ECanvasLightBangPNG_2(pos, dir).start();
                    }).start();
                }
            }

        if (!subj && obj)
            if ((time - this.last_time) > this.d_time_fl) {
                this.last_time = time;
                var p2 = obj.getCurrentCoord(time);
                var p_obj = getRadialRandomPoint(p2, ConstFlashlightPrecision);
                new ECanvasLightBangPNG_1(p_obj).start();
            }
    };

    FireAutoEffectController.prototype.update = function (options) {
        if (options.side)
            this.side = options.side;
    };

    FireAutoEffectController.prototype.finish = function (options) {
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
        if (subj && !this.muzzle_flash && this.side){
            this.muzzle_flash = new ECanvasAutoFirePNG(subj, this.side).start();
        }
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


var effectPNGLoader;
var fireEffectManager;