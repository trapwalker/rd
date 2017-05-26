var ConstCountFlashlightPerSecond = 10;  // Количество трасеров в секунду;
var ConstFlashlightPrecision = 50;       // Радиус разлёта вспышек около машинки (px);
var ConstFlashlightOrientedRadius = 20;  // Радиус в котором вспышка будет направленной (px);

var ConstRangeFireDischargeFlashlight = 30;   // Разлет вспышек взрывов при залповой стрельбе (px);
var ConstCountFireDischargeFlashlight = 3;   // Количество вспышек взрывов при залповой стрельбе (px);
var ConstDelayFireDischargeFlashlight = 300; // Задержка между дульным пламенем и вспышкой взрыва при залповой стрельбе (ms);

// Список Иконок для всех видов маркеров леафлета

var EffectPNGLoader = (function(){
    function EffectPNGLoader(){
        this.effects = {};
        this.count_loading_img = 0;
        resourceLoadManager.add(this);

        this.load_new_image('effect-fire-discharge-png-1', '/static/img/fire_effects/shoots/heavygunfireright000_001_stripe_5frames.png', [40, 40], 5);
        this.load_new_image('effect-fire-discharge-png-2', '/static/img/fire_effects/shoots/heavygunfireright000_002_resized_stripe_12frames.png', [57, 75], 12);
        this.load_new_image('effect-fire-discharge-png-3-dbl', '/static/img/fire_effects/shoots/heavygunfireright000_003_resized_stripe_12frames2.png', [84, 84], 12);
        this.load_new_image('effect-fire-auto-png', '/static/img/fire_effects/shoots/light_fire_right_stripe_2frames.png', [32, 20], 2);
        this.load_new_image('effect-heavy-bang-png-1', '/static/img/fire_effects/bangs/heavy_damage_1000_2_res_stripe.png', [115, 115], 12);
        this.load_new_image('effect-heavy-bang-png-2', '/static/img/fire_effects/bangs/heavy_damage_wave_1000_2_res_stripe.png', [115, 115], 12);
        this.load_new_image('effect-light-bang-png-1', '/static/img/fire_effects/bangs/light_damage_ground_stripe_3frames.png', [22, 22], 3);
        this.load_new_image('effect-light-bang-png-2', '/static/img/fire_effects/bangs/light_damage_right_stripe_3frames.png', [22, 22], 3);
        this.load_new_image('effect-heavy-bang-oriented-png-1', '/static/img/fire_effects/bangs/heavy_damage_right_side_003_resized_stripe_12frames.png', [107, 107], 12);
        this.load_new_image('effect-heavy-bang-oriented-png-2', '/static/img/fire_effects/bangs/heavy_damage_right_side_003_wave_resized_stripe_12frames.png', [107, 107], 12);
        this.load_new_image('effect-tracer-png-simple', '/static/img/fire_effects/shoots/light_tracer.png', [7, 14], 1);
        this.load_new_image('effect-tracer-png-dbl-1', '/static/img/fire_effects/shoots/light_tracer_3.png', [11, 14], 1);
        this.load_new_image('effect-tracer-png-dbl-2', '/static/img/fire_effects/shoots/light_tracer_2.png', [14, 14], 1);
        this.load_new_image('light_tracer_MG_15', '/static/img/fire_effects/shoots/light_tracer_MG_15.png', [9, 15], 1);

        this.load_new_image('light_tracer_animation_1', '/static/img/fire_effects/shoots/light_tracer_2_frames.png', [7, 14], 2);
        this.load_new_image('light_tracer_animation_2', '/static/img/fire_effects/shoots/light_tracer_3_frames.png', [7, 14], 3);


        this.load_new_image('effect-bang-png-1', '/static/img/fire_effects/bangs/mine-bang-png-1.png', [115, 115], 12);

        // Завершение power-up
        this.load_new_image('effect-power-up-off', '/static/img/map_icons/power_up/power_up_bloop.png', [67, 67], 4);

        this.load_new_image('effect-power-up-off-build-set', '/static/img/map_icons/power_up/owerdown_heal.png', [60, 60], 10);
        this.load_new_image('effect-power-up-off-fuel', '/static/img/map_icons/power_up/owerdown_oil.png', [60, 60], 10);
        this.load_new_image('effect-power-up-off-shield', '/static/img/map_icons/power_up/owerdown_shield.png', [60, 60], 10);
        this.load_new_image('effect-power-up-off-obs', '/static/img/map_icons/power_up/owerdown_vision.png', [60, 60], 10);
        this.load_new_image('effect-power-up-off-vis', '/static/img/map_icons/power_up/owerdown_stels.png', [60, 60], 10);
        this.load_new_image('effect-power-up-off-ammo', '/static/img/map_icons/power_up/owerdown_sleeve.png', [60, 60], 10);
        this.load_new_image('effect-power-up-off-random', '/static/img/map_icons/power_up/owerdown_random.png', [60, 60], 10);


        // Анимации смерти
        this.load_new_image('effect-death-oriented-1', '/static/img/fire_effects/death/death_oriented_1.png', [90, 90], 16);
        this.load_new_image('effect-death-1', '/static/img/fire_effects/death/death.png', [204, 204], 12);


        // Эффекты радиации
        this.load_new_image('effect-radiation-cloud-1', '/static/img/effect_radiation/oblako1.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-2', '/static/img/effect_radiation/oblako2.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-3', '/static/img/effect_radiation/oblako3.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-4', '/static/img/effect_radiation/oblako4.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-5', '/static/img/effect_radiation/oblako5.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-6', '/static/img/effect_radiation/oblako6.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-7', '/static/img/effect_radiation/oblako7.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-8', '/static/img/effect_radiation/oblako8.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-9', '/static/img/effect_radiation/oblako9.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-10', '/static/img/effect_radiation/oblako10.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-11', '/static/img/effect_radiation/oblako11.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-12', '/static/img/effect_radiation/oblako12.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-13', '/static/img/effect_radiation/oblako13.png', [40, 40], 1);
        this.load_new_image('effect-radiation-cloud-14', '/static/img/effect_radiation/oblako14.png', [40, 40], 1);

    }

    EffectPNGLoader.prototype.getImage = function(name){
        if (this.effects.hasOwnProperty(name))
            return this.effects[name];
        //console.log("EffectPNGLoader.prototype.getImage not found image with name: ", name);
        return null;
    };

    EffectPNGLoader.prototype.load_complete = function () {
        if (this.count_loading_img == 0) {
            resourceLoadManager.del(this);
        }
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

        this._settings_particles_tracer = settingsManager.options.particles_tracer.value;
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
            var controller = this.controllers_list[index];
            controller.count++;
            controller.ctrl.update(options, true);
        }
        else
            this.controllers_list.push({
                ctrl: new FireAutoEffectController(options),
                count: 1
            });

        if (options.side && options.subj) {
            if (this.muzzle_flashs.hasOwnProperty(options.subj + options.side))
                this.muzzle_flashs[options.subj + options.side].update(options, 1);
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
            else {
                this.controllers_list[index].ctrl.update(options, false);
            }
        }
        else
            console.error('Попытка удалить несуществующий контроллер автоматической стрельбы!', options);

        if (options.side && options.subj) {
            var muzzle_flash_name = options.subj + options.side;
            if (this.muzzle_flashs.hasOwnProperty(muzzle_flash_name)) {
                var count = this.muzzle_flashs[muzzle_flash_name].update(options, -1);
                if (count <= 0) {
                    this.muzzle_flashs[muzzle_flash_name].finish();
                    delete this.muzzle_flashs[muzzle_flash_name];
                }
            }
            else console.error('Попытка отключить автоматическую стрельбу у отсутствующего контроллера', options);
        }
    };

    FireEffectManager.prototype.clear = function () {
        for (var i = 0; i < this.controllers_list.length; i++)
            if (this.controllers_list[i])
                this.controllers_list[i].ctrl.finish();
        for (var key in this.muzzle_flashs)
            if (this.muzzle_flashs.hasOwnProperty(key))
                this.muzzle_flashs[key].finish();
        this.controllers_list = [];
        this.muzzle_flashs = {};
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

        // Анимация залпа
        if (options.weapon_animation) {
            var effect_type_str = options.weapon_animation[Math.floor(Math.random() * options.weapon_animation.length)];
            if (typeof window[effect_type_str] === "function")
                new window[effect_type_str](options.pos_subj, direction).start();
        }

        var temp = 1 / ConstCountFireDischargeFlashlight;
        var tempDuration = ConstDelayFireDischargeFlashlight / ConstCountFireDischargeFlashlight;
        for (var i = 0; i < ConstCountFireDischargeFlashlight; i++)
            new ECanvasHeavyBangPNG_1(getRadialRandomPoint(summVector(mulScalVector(vekt, i * temp + temp * Math.random()), options.pos_subj),
                ConstRangeFireDischargeFlashlight))
                .start(i * tempDuration + tempDuration * Math.random());

        // Звук выстрела
        if (options.weapon_audio) {
            var audio_name = options.weapon_audio[Math.floor(Math.random() * options.weapon_audio.length)];
            if (options.self_shot) {
                // 0.6/0.8 - границы рандома рэйта
                var rate = 0.6 + (0.6 - 0.8) * Math.random();
                audioManager.play({
                    name: audio_name,
                    gain: 0.4 * audioManager._settings_discharge_fire_gain,
                    playbackRate: rate,
                    priority: 0.8
                });
            }
            else {
                var distance;
                if (user.userCar)
                    distance = distancePoints(user.userCar.getCurrentCoord(clock.getCurrentTime()), options.pos_subj);
                else
                    distance = distancePoints(mapManager.getMapCenter(), options.pos_subj);
                if (distance <= 2000) {
                    // 0.01/0.4 - минимальная/максимальная громкость звука
                    var gain = 0.01 + (0.4 - 0.01) * (1 - distance / 2000);
                    // 0.2/0.4 - границы рандома рэйта
                    var rate = 0.2 + (0.4 - 0.2) * Math.random();
                    audioManager.play({
                        name: audio_name,
                        gain: gain * audioManager._settings_discharge_fire_gain,
                        playbackRate: rate,
                        priority: 0.5
                    });
                }
            }
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
        this.d_time_t = 1. / options.animation_tracer_rate;
        this.d_time_fl = 1. / ConstCountFlashlightPerSecond;

        this.weapon_animation = [];
        this.set_weapon_animation(options.weapon_animation);
        this.weapon_animation = this.weapon_animation || [ECanvasPointsTracerSimple];

        this.current_particles_tracer = fireEffectManager._settings_particles_tracer;
    }

    FireAutoEffectController.prototype.change = function () {
        var time = clock.getCurrentTime();
        var subj = visualManager.getModelObject(this.subj);
        var obj = visualManager.getModelObject(this.obj);

        if (subj && obj) { // Если оба объекта видны, то рисуем между ними трассер, при условии, что рисуются усики выстрела
            var muzzle_flash = fireEffectManager.muzzle_flashs[this.subj + this.side];  // Если есть усики у субъекта имменно на этой стороне
            if (muzzle_flash && muzzle_flash.muzzle_flash && (time - this.last_time) > this.d_time_t) {
                this.last_time = time;
                var p_subj = subj.getCurrentCoord(time);
                var p2 = obj.getCurrentCoord(time);
                var p_obj = getRadialRandomPoint(p2, ConstFlashlightPrecision);

                var ECanvasPointsTracer_type = this.weapon_animation[Math.floor(Math.random() * this.weapon_animation.length)];

                if (distancePoints(p2, p_obj) > ConstFlashlightOrientedRadius)
                    new ECanvasPointsTracer_type(p_subj, p_obj, function (pos) {
                        new ECanvasLightBangPNG_1(pos).start();
                    }).start();
                else {
                    var dir = angleVectorRadCCW(subVector(p_subj, p_obj)) + Math.PI;
                    new ECanvasPointsTracer_type(p_subj, p_obj, function (pos) {
                        new ECanvasLightBangPNG_2(pos, dir).start();
                    }).start();
                }
            }
        }

        if (!subj && obj)  // Если источник трассеров не виден, то рисуем только вспышки вокруг получающей дамаг машинки
            if ((time - this.last_time) > this.d_time_fl) {
                this.last_time = time;
                var p2 = obj.getCurrentCoord(time);
                var p_obj = getRadialRandomPoint(p2, ConstFlashlightPrecision);
                new ECanvasLightBangPNG_1(p_obj).start();
            }
    };

    FireAutoEffectController.prototype.set_weapon_animation = function (weapon_animation) {
        for (var i = 0; i < weapon_animation.length; i++)
            if (typeof window[weapon_animation[i]] === "function")
                this.weapon_animation.push(window[weapon_animation[i]]);
    };

    FireAutoEffectController.prototype.del_weapon_animation = function (weapon_animation) {
        for (var i = 0; i < weapon_animation.length; i++){
            var f = window[weapon_animation[i]];
            if (typeof f === "function") {
                var index = this.weapon_animation.indexOf(f);
                if (index >= 0)
                    this.weapon_animation.splice(index, 1);
            }
        }
        this.weapon_animation = this.weapon_animation || [ECanvasPointsTracerSimple];
    };

    FireAutoEffectController.prototype.update = function (options, added) {
        if (options.side)
            this.side = options.side;

        if (added) {  // Если нужно добавить скорости или анимаций
            if (options.weapon_animation)
                this.set_weapon_animation(options.weapon_animation);
            if (options.animation_tracer_rate) {
                this.animation_tracer_rate += options.animation_tracer_rate;
                this.d_time_t = this.current_particles_tracer / this.animation_tracer_rate;
            }
        }
        else {
            if (options.weapon_animation)
                this.del_weapon_animation(options.weapon_animation);
            if (options.animation_tracer_rate) {
                this.animation_tracer_rate -= options.animation_tracer_rate;
                this.d_time_t = this.current_particles_tracer / this.animation_tracer_rate;
            }
        }
    };

    FireAutoEffectController.prototype.finish = function (options) {};

    return FireAutoEffectController;
})();


var FireAutoAudioController = (function () {
    function FireAutoAudioController(owner, names, weapon_speed) {
        this.owner = owner;
        this.count = 1; // Сколько раз этот контроллер добавлен
        this._is_active = true;
        this.audio_objects_names = names; // список имен аудио объектов
        this.curren_play_object = null; // текущий воспроизводимый звук
        this.weapon_speed = weapon_speed; // Скорострельность в секунду - определяет задержку между звуками
        this.start(0);
    }

    FireAutoAudioController.prototype.start = function (delay) {
        this.owner.animation_finish();
        var self = this;
        this.curren_play_object = null;
        if (!this.audio_objects_names || this.audio_objects_names.length <= 0) return;
        var name = this.audio_objects_names[Math.floor(Math.random() * this.audio_objects_names.length)];

        setTimeout(function () {
            if (!self._is_active || !self.owner.is_active) return;
            // Настройка звука очереди от расстояния
            var gain = 0.5;
            var base_autofire_priority = 0.8;
            var subj = visualManager.getModelObject(self.owner.subj);
            var audio_cls = PlayAudioObject;

            if (!user.userCar) gain = 0; // Если своей машинки нет

            // Если стрельба не своя
            if (subj && user.userCar != subj) {
                base_autofire_priority = 0.5;
                var t = clock.getCurrentTime();
                var distance;
                if (user.userCar)
                    distance = distancePoints(user.userCar.getCurrentCoord(t), subj.getCurrentCoord(t));
                else
                    distance = distancePoints(mapManager.getMapCenter(), subj.getCurrentCoord(t));
                if (distance <= 1000) {
                    // 0.3/0.4 - минимальная/максимальная громкость звука
                    gain = 0.3 + (0.4 - 0.3) * (1 - distance / 1000);
                    base_autofire_priority = base_autofire_priority * gain;
                }
                else
                    gain = 0;
                audio_cls = PlayAudioObjectLowEq;
            }

            var delay = 1000. / self.weapon_speed; // задержка между очередями скорострельности
            self.curren_play_object = audioManager.play({
                name: name,
                gain: gain * audioManager._settings_auto_fire_gain,
                callback: self.start.bind(self, delay),
                priority: base_autofire_priority,
                cls: audio_cls,
            });
            self.owner.animation_start();  // пробросить в овнера запуск стрельбы

        }, delay);
    };

    FireAutoAudioController.prototype.stop = function () {
        this._is_active = false;
        //if (this.curren_play_object)
        //    this.curren_play_object.stop();
    };

    return FireAutoAudioController;
})();


var FireAutoMuzzleFlashController = (function () {
    function FireAutoMuzzleFlashController(options) {
        setOptions(options, this);
        this.count = 0;
        this.muzzle_flash = null;

        // Звуковые контроллеры
        this.audio_ctrls = {};
        this.audio_count = 0;
        this.is_active = true;

        this.update(options, 1);
    }

    //FireAutoMuzzleFlashController.prototype.start = function () {
    //    var subj = visualManager.getModelObject(this.subj);
    //    if (subj && !this.muzzle_flash && this.side){
    //        this.muzzle_flash = new ECanvasAutoFirePNG(subj, this.side).start();
    //    }
    //};

    FireAutoMuzzleFlashController.prototype.finish = function () {
        if (this.muzzle_flash) {
            this.muzzle_flash.finish();
            this.muzzle_flash = null;
        }
        this.is_active = false;
    };

    FireAutoMuzzleFlashController.prototype.animation_start = function () {
        this.audio_count++;
        if(!this.is_active) return;
        if (!this.muzzle_flash) {
            var subj = visualManager.getModelObject(this.subj);
            if (subj && this.side)
                this.muzzle_flash = new ECanvasAutoFirePNG(subj, this.side).start();
        }
    };

    FireAutoMuzzleFlashController.prototype.animation_finish = function () {
        this.audio_count--;
        if (this.audio_count <= 0 && this.muzzle_flash) {
            this.muzzle_flash.finish();
            this.muzzle_flash = null;
        }
    };

    FireAutoMuzzleFlashController.prototype.update = function (options, count_diff) {
        //console.log("FireAutoMuzzleFlashController.prototype.update", options, count_diff);
        this.count += count_diff;
        if (options.weapon_id) {
            if (count_diff > 0)  // Значит нужно добавить звуки стрельбы
                this.addAudioController(options.weapon_id, options.weapon_audio, options.animation_tracer_rate);
            else
                this.delAudioController(options.weapon_id, options.weapon_audio);
        }
        return this.count;
    };

    FireAutoMuzzleFlashController.prototype.addAudioController = function (weapon_id, weapon_audio, weapon_speed) {
        //console.log("FireAutoMuzzleFlashController.prototype.addAudioController", weapon_id, weapon_audio);
        if (this.audio_ctrls.hasOwnProperty(weapon_id) && this.audio_ctrls[weapon_id]) {
            this.audio_ctrls[weapon_id].count++;
            return;
        }
        if (weapon_audio)
            this.audio_ctrls[weapon_id] = new FireAutoAudioController(this, weapon_audio, weapon_speed);
        else
            console.warn('Попытка добавления звукового контроллера без списка audio_names', weapon_audio);
    };

    FireAutoMuzzleFlashController.prototype.delAudioController = function (weapon_id) {
        //console.log("FireAutoMuzzleFlashController.prototype.delAudioController", weapon_id);
        if (this.audio_ctrls.hasOwnProperty(weapon_id)) {
            this.audio_ctrls[weapon_id].count--;
            if (this.audio_ctrls[weapon_id].count == 0) {
                this.audio_ctrls[weapon_id].stop();
                delete this.audio_ctrls[weapon_id];
            }
        }
    };

    return FireAutoMuzzleFlashController;
})();


var effectPNGLoader = new EffectPNGLoader();
var fireEffectManager = new FireEffectManager();