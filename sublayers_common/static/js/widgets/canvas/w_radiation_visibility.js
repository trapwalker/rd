var WRadiationEffect = (function () {
    function WRadiationEffect() {
        mapCanvasManager.add_vobj(this, 95);
        this._effects = [];
        this._effects_for_delete = [];
    }

    WRadiationEffect.prototype.redraw = function(ctx, time){
        //console.log('WRadiationEffect.prototype.redraw', time);
        time = clock.getClientTime() / 1000.;

        for (var i = 0; i < this._effects_for_delete.length; i++) {
            var index = this._effects.indexOf(this._effects_for_delete[i]);
            if (index >= 0)
                this._effects.splice(index, 1);
        }

        if (mapCanvasManager.real_zoom < 15) return;
        if (! user.userCar) return;

        var radiation_dps = user.userCar.radiation_dps || 0;  // 0
        radiation_dps = Math.floor(radiation_dps * 30);

        for (var i = 0; i < radiation_dps - this._effects.length && i < 50; i++) {
            //new RadiationAnimationEffectRandomCloud().start();
            //new RadiationCircleEffectRandom().start();
            new RadiationLineEffectRandom().start();
        }

        ctx.save();

        for (var i = 0; i < this._effects.length; i++)
            this._effects[i].redraw(ctx, time);

        ctx.restore();
    };

    return WRadiationEffect;
})();

var wRadiationEffect;


var RadiationSampleEffect = (function () {
    function RadiationSampleEffect(position, direction){
        this.start_time = 0;
        this.position = position;
        this.direction = direction;
        this.is_active = false;
    }

    RadiationSampleEffect.prototype.start = function() {
        this.start_time = clock.getClientTime() / 1000.;
        wRadiationEffect._effects.push(this);
        this.is_active = true;
    };

    RadiationSampleEffect.prototype.finish = function () {
        //console.log('RadiationSampleEffect.prototype.finish', this.id);
        this.is_active = false;
        wRadiationEffect._effects_for_delete.push(this);
    };

    RadiationSampleEffect.prototype.redraw = function (ctx, time) {};

    return RadiationSampleEffect
})();


var RadiationEffectSmooth = (function (_super) {
    __extends(RadiationEffectSmooth, _super);

    function RadiationEffectSmooth(position, direction, duration){
        _super.call(this, position, direction);
        this.duration = duration; // Время, сколько висит эвент
        this._start_smooth_time = this.duration * 0.2; // Время плавного появления
        this._finish_smooth_time = this.duration * 0.3; // Время плавного исчезновения
        this._max_alpha_koeff = 1.0;
    }

    RadiationEffectSmooth.prototype._get_alpha = function (time) {
        var cur_effect_time = (time - this.start_time) * 1000;
        var alpha_start = 1.0;
        var alpha_finish = 1.0;
        if (cur_effect_time < this._start_smooth_time)
            alpha_start = cur_effect_time / this._start_smooth_time;
        cur_effect_time = this.duration - cur_effect_time;
        if (cur_effect_time < this._finish_smooth_time)
            alpha_finish = cur_effect_time / this._finish_smooth_time;
        return Math.min(Math.max(Math.min(alpha_start, alpha_finish), 0.0), 1.0) * this._max_alpha_koeff;
    };

    return RadiationEffectSmooth
})(RadiationSampleEffect);


var RadiationAnimationEffect = (function (_super) {
    __extends(RadiationAnimationEffect, _super);

    function RadiationAnimationEffect(position, direction, duration){
        _super.call(this, position, direction, duration);
        this.frame_count = 0;
        this.time_of_frame = 0;
        this.frame_width = 0; // размер одного кадра
        this.frame_height = 0; // размер одного кадра
        this.effect_image_obj = null;
        this.start_time = 0;
        this.offset_x = 0; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = 0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;
    }

    RadiationAnimationEffect.prototype._get_frame_num = function (time) {
        var time_off = time - this.start_time; // время, прошедшее сначала анимации
        time_off = time_off < 0 ? 0 : time_off;
        return Math.floor(time_off * 1000 / this.time_of_frame) % this.frame_count;
    };

    RadiationAnimationEffect.prototype.redraw = function (ctx, time) {
        if (! this.is_active) return;
        if (time >= this.start_time + this.duration / 1000.) {this.finish(); return; }
        ctx.save();
        ctx.globalAlpha = this._get_alpha(time);

        var img_obj = this.effect_image_obj;
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.direction);
        var frame = this._get_frame_num(time);

        ctx.drawImage(img_obj.img, frame * this.frame_width, 0, this.frame_width, this.frame_height,
            this.offset_x * img_obj.size[1], this.offset_y * img_obj.size[0], this.frame_width * this.scale_icon_x, this.frame_height * this.scale_icon_y);

        ctx.restore();
    };

    return RadiationAnimationEffect
})(RadiationEffectSmooth);


var RadiationCircleEffect = (function (_super) {
    __extends(RadiationCircleEffect, _super);

    function RadiationCircleEffect(position, direction, duration){
        _super.call(this, position, direction, duration);
        this._radius = 5;
        this._fillStyle = "green";
        this._lineWidth = 1;
        this._strokeStyle = "red";
    }

    RadiationCircleEffect.prototype.redraw = function (ctx, time) {
        if (! this.is_active) return;
        if (time >= this.start_time + this.duration / 1000.) {this.finish(); return; }
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.direction);
        ctx.globalAlpha = this._get_alpha(time);
        ctx.beginPath();
        ctx.arc(0, 0, this._radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = this._fillStyle;
        ctx.fill();
        ctx.lineWidth = this._lineWidth;
        ctx.strokeStyle = this._strokeStyle;
        ctx.stroke();

        ctx.restore();
    };

    return RadiationCircleEffect
})(RadiationEffectSmooth);


var RadiationLineEffect = (function (_super) {
    __extends(RadiationLineEffect, _super);

    function RadiationLineEffect(position, direction, duration, line_length){
        _super.call(this, position, direction, duration);
        this._line_length = line_length;
        this._lineWidth = 1;
        this._strokeStyle = "red";
    }

    RadiationLineEffect.prototype.redraw = function (ctx, time) {
        if (! this.is_active) return;
        if (time >= this.start_time + this.duration / 1000.) {this.finish(); return; }
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.direction);
        ctx.globalAlpha = this._get_alpha(time);
        ctx.beginPath();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this._line_length, 0);
        ctx.lineWidth = this._lineWidth;
        ctx.strokeStyle = this._strokeStyle;
        ctx.stroke();
        ctx.restore();
    };

    return RadiationLineEffect
})(RadiationEffectSmooth);


var RadiationMoveLineEffect = (function (_super) {
    __extends(RadiationMoveLineEffect, _super);

    function RadiationMoveLineEffect(position, direction, duration, line_length){
        _super.call(this, position, direction, duration, line_length);
        this._p0 = position;
        this._ll0 = line_length;
        this._speed_x = 0;
        this._speed_y = 0;
        this._speed_line_length = 0;
    }

    RadiationMoveLineEffect.prototype.redraw = function (ctx, time) {
        var t = time - this.start_time;
        this.position = new Point(this._p0.x + this._speed_x * t, this._p0.y + this._speed_y * t);
        this._line_length = this._ll0 + this._speed_line_length * t;

        _super.prototype.redraw.call(this, ctx, time);


    };

    return RadiationMoveLineEffect
})(RadiationLineEffect);


var RadiationAnimationEffectIcon = (function (_super) {
    __extends(RadiationAnimationEffectIcon, _super);

    function RadiationAnimationEffectIcon(position, direction, icon_name, duration){
        _super.call(this, position, direction, duration);
        var icon = effectPNGLoader.getImage(icon_name);
        this.frame_count = icon.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_width = icon.size[1]; // размер одного кадра
        this.frame_height = icon.size[0]; // размер одного кадра
        this.effect_image_obj = icon;
        this.offset_x = 0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = 0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;
    }

    return RadiationAnimationEffectIcon
})(RadiationAnimationEffect);


var RadiationAnimationEffectRandomCloud = (function (_super) {
    __extends(RadiationAnimationEffectRandomCloud, _super);

    function RadiationAnimationEffectRandomCloud() {
        var icon_name = "effect-radiation-cloud-" + (Math.random() * 12.99 + 1.0).toFixed(0);
        var position = new Point(mapCanvasManager.canvas.width * Math.random(), mapCanvasManager.canvas.height * Math.random());
        var direction = Math.random() * 2.0 * Math.PI;
        var duration = 300 * Math.random() + 300;
        _super.call(this, position, direction, icon_name, duration);
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return RadiationAnimationEffectRandomCloud
})(RadiationAnimationEffectIcon);


var RadiationCircleEffectRandom = (function (_super) {
    __extends(RadiationCircleEffectRandom, _super);

    function RadiationCircleEffectRandom() {
        var position = new Point(mapCanvasManager.canvas.width * Math.random(), mapCanvasManager.canvas.height * Math.random());
        var direction = Math.random() * 2.0 * Math.PI;
        var duration = 5000 * Math.random() + 300;
        _super.call(this, position, direction, duration);

        this._radius = 1.0 + Math.random() * 8.0;
        this._fillStyle = "green";
        this._lineWidth = Math.random() > 0.5 ? 1 : 2;
        this._strokeStyle = "red";

        this._start_smooth_time = this.duration * 0.8; // Время плавного появления
        this._finish_smooth_time = this.duration * 0.8; // Время плавного исчезновения
        //this._max_alpha_koeff = 0.8;
    }

    return RadiationCircleEffectRandom
})(RadiationCircleEffect);





var RadiationLineEffectRandom = (function (_super) {
    __extends(RadiationLineEffectRandom, _super);

    function RadiationLineEffectRandom() {
        var position = new Point(mapCanvasManager.canvas.width * Math.random(), mapCanvasManager.canvas.height * Math.random());
        var direction = 0; //Math.random() * 2.0 * Math.PI;
        var duration = 200 * Math.random() + 200;
        var line_length = 2;
        _super.call(this, position, direction, duration, line_length);

        this._lineWidth = Math.random() > 0.6 ? 2 : 1;
        this._strokeStyle = "white";

        var speed = 70 +  Math.random() * 60;

        this._speed_x = -speed / 2.0;
        this._speed_line_length = speed;

        this._start_smooth_time = this.duration * 0.1; // Время плавного появления
        this._finish_smooth_time = this.duration * 0.9; // Время плавного исчезновения
    }

    return RadiationLineEffectRandom
})(RadiationMoveLineEffect);



