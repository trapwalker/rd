/*
 *
 * */

var ECanvasAnimationPNG = (function () {

    function ECanvasAnimationPNG(position, direction){
        this.duration = 0;
        this.frame_count = 0;
        this.time_of_frame = 0;
        this.frame_width = 0; // размер одного кадра
        this.frame_height = 0; // размер одного кадра
        this.effect_image_obj = null;
        this.direction = direction; // Направление в радианах
        this.position = position; // Позиция в пиксельных-серверных координатах
        this.start_time = 0;
        this.offset_x = 0; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = 0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.infinity_animation = false;
    }

    ECanvasAnimationPNG.prototype._get_frame_num = function (time) {
        var time_off = time - this.start_time; // время, прошедшее сначала анимации
        time_off = time_off < 0 ? 0 : time_off;
        return Math.floor(time_off * 1000 / this.time_of_frame) % this.frame_count;
    };

    ECanvasAnimationPNG.prototype._start = function () {
        mapCanvasManager.add_vobj(this, 50);
        this.start_time = clock.getCurrentTime();
        if (this.duration > 0)
            timeManager.addTimeoutEvent(this, 'finish', this.duration);
    };

    ECanvasAnimationPNG.prototype.start = function(delay){
        if (delay)
            timeManager.addTimeoutEvent(this, '_start', delay);
        else
            this._start();
        return this;
    };

    ECanvasAnimationPNG.prototype.finish = function () {
        this.start_time = 0;
        mapCanvasManager.del_vobj(this);
    };

    ECanvasAnimationPNG.prototype.redraw = function (ctx, time) {
        if (! this.infinity_animation && time >= this.start_time + this.duration / 1000.) return;
        ctx.save();
        var img_obj = this.effect_image_obj;
        var ctx_pos = mulScalVector(subVector(this.position, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        ctx.translate(ctx_pos.x, ctx_pos.y);
        ctx.rotate(this.direction);
        //ctx.scale(1.0 / mapCanvasManager.zoom_koeff, 1.0 / mapCanvasManager.zoom_koeff);

        var frame = this._get_frame_num(time);
        ctx.drawImage(img_obj.img, frame * this.frame_width, 0, this.frame_width, this.frame_height,
            this.offset_x * img_obj.size[1], this.offset_y * img_obj.size[0], this.frame_width, this.frame_height);

        ctx.restore();
    };

    return ECanvasAnimationPNG
})();


var ECanvasDischargeFirePNG_1 = (function (_super) {
    __extends(ECanvasDischargeFirePNG_1, _super);

    function ECanvasDischargeFirePNG_1(position, direction){
        _super.call(this, position, direction);
        this.duration = 300;
        this.effect_image_obj = effectPNGLoader.getImage("effect-fire-discharge-png-1");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = 0.2; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasDischargeFirePNG_1
})(ECanvasAnimationPNG);


var ECanvasDischargeFirePNG_2 = (function (_super) {
    __extends(ECanvasDischargeFirePNG_2, _super);

    function ECanvasDischargeFirePNG_2(position, direction){
        _super.call(this, position, direction);
        this.duration = 1000;
        this.effect_image_obj = effectPNGLoader.getImage("effect-fire-discharge-png-2");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = 0.2; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasDischargeFirePNG_2
})(ECanvasAnimationPNG);


var ECanvasDischargeFirePNG_3_dbl = (function (_super) {
    __extends(ECanvasDischargeFirePNG_3_dbl, _super);

    function ECanvasDischargeFirePNG_3_dbl(position, direction){
        _super.call(this, position, direction);
        this.duration = 1000;
        this.effect_image_obj = effectPNGLoader.getImage("effect-fire-discharge-png-3-dbl");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = 0.2; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasDischargeFirePNG_3_dbl
})(ECanvasAnimationPNG);


var ECanvasAutoFirePNG = (function (_super) {
    __extends(ECanvasAutoFirePNG, _super);

    function ECanvasAutoFirePNG(car, side) {
        this.car = car;
        this.side_direction = user.userCar.fireSidesMng.sides[side].direction;
        _super.call(this, car.getCurrentCoord(clock.getCurrentTime()), car.getCurrentDirection(clock.getCurrentTime()));
        this.duration = 200;
        this.effect_image_obj = effectPNGLoader.getImage("effect-fire-auto-png");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.infinity_animation = true;

        if (side == 'front')
            this.offset_x = 0.8;
        else
            this.offset_x = 0.4;

    }

    ECanvasAutoFirePNG.prototype.redraw = function (ctx, time) {
        this.direction = this.car.getCurrentDirection(time) + this.side_direction;
        this.position = this.car.getCurrentCoord(time);

        _super.prototype.redraw.call(this, ctx, time);
    };


    ECanvasAutoFirePNG.prototype._start = function () {
        mapCanvasManager.add_vobj(this, 50);
        this.start_time = clock.getCurrentTime();
        return this;
    };


    return ECanvasAutoFirePNG
})(ECanvasAnimationPNG);


var ECanvasHeavyBangPNG_1 = (function (_super) {
    __extends(ECanvasHeavyBangPNG_1, _super);

    function ECanvasHeavyBangPNG_1(position){
        _super.call(this, position, 2 * Math.random() * Math.PI);
        this.duration = 1200;
        this.effect_image_obj = effectPNGLoader.getImage("effect-heavy-bang-png-1");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasHeavyBangPNG_1
})(ECanvasAnimationPNG);


var ECanvasHeavyBangPNG_2 = (function (_super) {
    __extends(ECanvasHeavyBangPNG_2, _super);

    function ECanvasHeavyBangPNG_2(position){
        _super.call(this, position, 2 * Math.random() * Math.PI);
        this.duration = 1200;
        this.effect_image_obj = effectPNGLoader.getImage("effect-heavy-bang-png-2");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasHeavyBangPNG_2
})(ECanvasAnimationPNG);


var ECanvasHeavyBangPNG_3 = (function (_super) {
    __extends(ECanvasHeavyBangPNG_3, _super);

    function ECanvasHeavyBangPNG_3(position){
        _super.call(this, position, 2 * Math.random() * Math.PI);
        this.duration = 1200;
        this.effect_image_obj = effectPNGLoader.getImage("effect-bang-png-1");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasHeavyBangPNG_3
})(ECanvasAnimationPNG);


var ECanvasLightBangPNG_1 = (function (_super) {
    __extends(ECanvasLightBangPNG_1, _super);

    function ECanvasLightBangPNG_1(position) {
        _super.call(this, position, 2 * Math.random() * Math.PI);
        this.duration = 300;
        this.effect_image_obj = effectPNGLoader.getImage("effect-light-bang-png-1");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasLightBangPNG_1
})(ECanvasAnimationPNG);


var ECanvasLightBangPNG_2 = (function (_super) {
    __extends(ECanvasLightBangPNG_2, _super);

    function ECanvasLightBangPNG_2(position, direction) {
        _super.call(this, position, direction);
        this.duration = 300;
        this.effect_image_obj = effectPNGLoader.getImage("effect-light-bang-png-2");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasLightBangPNG_2
})(ECanvasAnimationPNG);


var ECanvasHeavyBangOrientedPNG_1 = (function (_super) {
    __extends(ECanvasHeavyBangOrientedPNG_1, _super);

    function ECanvasHeavyBangOrientedPNG_1(position, direction){
        _super.call(this, position, direction);
        this.duration = 1200;
        this.effect_image_obj = effectPNGLoader.getImage("effect-heavy-bang-oriented-png-1");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -1.0; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasHeavyBangOrientedPNG_1
})(ECanvasAnimationPNG);


var ECanvasHeavyBangOrientedPNG_2 = (function (_super) {
    __extends(ECanvasHeavyBangOrientedPNG_2, _super);

    function ECanvasHeavyBangOrientedPNG_2(position, direction){
        _super.call(this, position, direction);
        this.duration = 1200;
        this.effect_image_obj = effectPNGLoader.getImage("effect-heavy-bang-oriented-png-2");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -1.0; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasHeavyBangOrientedPNG_2
})(ECanvasAnimationPNG);


var ECanvasPowerUpHide = (function (_super) {
    __extends(ECanvasPowerUpHide, _super);

    function ECanvasPowerUpHide(position) {
        _super.call(this, position, 0);
        this.duration = 300;
        this.effect_image_obj = effectPNGLoader.getImage("effect-power-up-off");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -1.0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasPowerUpHide
})(ECanvasAnimationPNG);


var ECanvasPowerUpOverDown = (function (_super) {
    __extends(ECanvasPowerUpOverDown, _super);

    function ECanvasPowerUpOverDown(position, icon_name) {
        _super.call(this, position, 0);
        this.duration = 800;
        this.effect_image_obj = effectPNGLoader.getImage(icon_name);
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -1.0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasPowerUpOverDown
})(ECanvasAnimationPNG);