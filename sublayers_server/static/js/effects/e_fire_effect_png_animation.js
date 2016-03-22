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
    }

    ECanvasAnimationPNG.prototype._get_frame_num = function (time) {
        var time_off = time - this.start_time; // время, прошедшее сначала анимации
        time_off = time_off < 0 ? 0 : time_off;
        return (time_off * 1000 / this.time_of_frame).toFixed(0);
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
        if (time >= this.start_time + this.duration) return;
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
        this.duration = 1000;
        this.effect_image_obj = effectPNGLoader.getImage("effect-fire-discharge-png-2");
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
        this.duration = 300;
        this.effect_image_obj = effectPNGLoader.getImage("effect-fire-discharge-png-1");
        this.frame_count = this.effect_image_obj.frames;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.offset_x = 0.2; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    return ECanvasDischargeFirePNG_2
})(ECanvasAnimationPNG);


var EAutoFirePNG = (function (_super) {
    __extends(EAutoFirePNG, _super);

    function EAutoFirePNG(car, side) {
        this.car = car;
        this.direction = user.userCar.fireSidesMng.sides[side].direction;
        _super.call(this, car.getCurrentCoord(clock.getCurrentTime()), this.direction);
        this.frame_count = 2;
        this.time_of_frame = 100;
        this._offset = 20;
        this.icon_size_x = 20;
        this.icon_size_y = 32;
        this.div_class = "effect-fire-auto-png";
        if (side == 'front')
            this.icon_offset = 35;
        else
            this.icon_offset = 20;
        this._lastRotateAngle = 0.0;
    }

    EAutoFirePNG.prototype.change = function() {
        //console.log('EAutoFirePNG.prototype.change');
        if (mapManager.inZoomChange && this.car != user.userCar) return;
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var dir = this.car.getCurrentDirection(time) + this.direction;

        var pos = summVector(tempPoint, polarPoint(this.icon_offset, dir));
        var tempLatLng = map.unproject([pos.x, pos.y], map.getMaxZoom());

        if (Math.abs(this._lastRotateAngle - dir) > 0.01) {
            this.marker.options.angle = dir;
            this._lastRotateAngle = dir;
        }
        if (!mapManager.inZoomChange)
            this.marker.setLatLng(tempLatLng);
        else
            this.marker.update();
    };

    EAutoFirePNG.prototype.start = function (delay) {
        _super.prototype.start.call(this, delay);
        timeManager.addTimerEvent(this, 'change');
        return this
    };


    return EAutoFirePNG
})(EAnimationPNG);


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


var ECanvasLightBangPNG_1 = (function (_super) {
    __extends(ECanvasLightBangPNG_1, _super);

    function ECanvasLightBangPNG_1(position){
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

    function ECanvasLightBangPNG_2(position, direction){
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
