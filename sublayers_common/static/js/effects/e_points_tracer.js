/*
* Еффект трассера между двумя точками с заданной скоростью и размерами трассера
* по завершениею эффекта вызовется коллбек, в который передастся последняя позиция трассера
*/

var ConstStartDistance = 20; // Расстояние от центра машинки до начальной точки трассера (px)


var ECanvasPointsTracerPNG = (function () {
    function ECanvasPointsTracerPNG(p1, p2, speed, call_back, image_name) {
        // получим вектор-направление движения трассера и дистанцию
        this.image_obj = effectPNGLoader.getImage(image_name) || iconsLeaflet.getIcon(image_name);
        if (! this.image_obj) {console.log('Image not found! name = ', image_name); return; }
        var track_vect = subVector(p2, p1);
        var dist_track = track_vect.abs();
        this.dist_track = dist_track;
        // расчёт начальной точки
        var p11 = summVector(mulScalVector(track_vect, ConstStartDistance / dist_track), p1);
        track_vect = subVector(p2, p11);
        // вычислим направление движения трассера
        this.direction = angleVectorRadCCW(track_vect);
        // вычислим время движения между точками
        this.duration = track_vect.abs() / speed;

        // сохраняем параметры движения трассера
        this.x0 = p11.x;
        this.y0 = p11.y;
        this.t0 = clock.getCurrentTime();
        this.kx = (p2.x - p11.x) / this.duration;
        this.ky = (p2.y - p11.y) / this.duration;

        // сохраняем call_back и p2 для него
        this.cb = call_back;
        this.p2 = p2;
        this._last_pos = p11;
    }

    ECanvasPointsTracerPNG.prototype.get_position = function (time) {
        return new Point(
            this.x0 + this.kx * (time - this.t0),
            this.y0 + this.ky * (time - this.t0)
        )
    };

    ECanvasPointsTracerPNG.prototype.redraw = function (ctx, time) {
        ctx.save();
        var pos = this.get_position(time);
        this._last_pos = pos;
        var ctx_pos = mulScalVector(subVector(pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        ctx.translate(ctx_pos.x, ctx_pos.y);
        ctx.rotate(this.direction);
        var img_obj = this.image_obj;
        if (img_obj) {
            ctx.drawImage(img_obj.img, 0, 0, img_obj.size[1], img_obj.size[0],
                0, 0, img_obj.size[1], img_obj.size[0]);
        }
        else {
            console.warn('Странная ошибка! Говорит, что не смог найти картинку. Странно это. Очень странно!');
        }
        ctx.restore();
    };

    ECanvasPointsTracerPNG.prototype.start = function () {
        timeManager.addTimeoutEvent(this, 'finish', this.duration * 1000.);
        if (this.dist_track > 20) // не рисовать трассер если очень близко
            mapCanvasManager.add_vobj(this, 50);
    };

    ECanvasPointsTracerPNG.prototype.finish = function () {
        if (this.dist_track > 20)  // не рисовать трассер если очень близко
            mapCanvasManager.del_vobj(this);
        if (typeof (this.cb) === 'function')
            this.cb(this.p2);
    };

    return ECanvasPointsTracerPNG
})();


var ECanvasPointsTracerAnimation = (function (_super) {
    __extends(ECanvasPointsTracerAnimation, _super);

    function ECanvasPointsTracerAnimation(p1, p2, speed, call_back, image_name, time_of_frame) {
        _super.call(this, p1, p2, speed, call_back, image_name);
        if (! this.image_obj) {console.log('Image not found! name = ', image_name); return; }
        this.start_time = null;
        this.time_of_frame = time_of_frame || 300;
        this.frame_count = this.image_obj.frames;
        this.start_time = 0;
        this.frame_height = this.image_obj.size[0]; // размер одного кадра
        this.frame_width = this.image_obj.size[1]; // размер одного кадра
        this.offset_x = 1.0; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = 1.0; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
    }

    ECanvasPointsTracerAnimation.prototype.start = function () {
        _super.prototype.start.call(this);
        this.start_time = clock.getCurrentTime();
    };

    ECanvasPointsTracerAnimation.prototype._get_frame_num = function (time) {
        var time_off = time - this.start_time; // время, прошедшее сначала анимации
        time_off = time_off < 0 ? 0 : time_off;
        return Math.floor(time_off * 1000 / this.time_of_frame) % this.frame_count;
    };

    ECanvasPointsTracerAnimation.prototype.redraw = function (ctx, time) {
        ctx.save();
        var pos = this.get_position(time);
        this._last_pos = pos;
        var ctx_pos = mulScalVector(subVector(pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        ctx.translate(ctx_pos.x, ctx_pos.y);
        ctx.rotate(this.direction);
        var img_obj = this.image_obj;
        if (img_obj) {
            var frame = this._get_frame_num(time);
            //console.log(frame, this.frame_width, this.frame_height, )
            ctx.drawImage(img_obj.img, frame * this.frame_width, 0, this.frame_width, this.frame_height,
                this.offset_x * img_obj.size[1], this.offset_y * img_obj.size[0], this.frame_width, this.frame_height);
        }
        else {
            console.warn('Странная ошибка! Говорит, что не смог найти картинку. Странно это. Очень странно!');
        }
        ctx.restore();
    };

    return ECanvasPointsTracerAnimation;
})(ECanvasPointsTracerPNG);


var ECanvasPointsTracerSimple = (function (_super) {
    __extends(ECanvasPointsTracerSimple, _super);

    function ECanvasPointsTracerSimple(p1, p2, call_back) {
        _super.call(this, p1, p2, 360, call_back, "effect-tracer-png-simple");
    }

    return ECanvasPointsTracerSimple;
})(ECanvasPointsTracerPNG);


var ECanvasPointsTracerDbl1 = (function (_super) {
    __extends(ECanvasPointsTracerDbl1, _super);

    function ECanvasPointsTracerDbl1(p1, p2, call_back) {
        _super.call(this, p1, p2, 300, call_back, "effect-tracer-png-dbl-1");
    }

    return ECanvasPointsTracerDbl1;
})(ECanvasPointsTracerPNG);


var ECanvasPointsTracerDbl2 = (function (_super) {
    __extends(ECanvasPointsTracerDbl2, _super);

    function ECanvasPointsTracerDbl2(p1, p2, call_back) {
        _super.call(this, p1, p2, 310, call_back, "effect-tracer-png-dbl-2");
    }

    return ECanvasPointsTracerDbl2;
})(ECanvasPointsTracerPNG);


var ECanvasPointsTracerPNG_MG_15 = (function (_super) {
    __extends(ECanvasPointsTracerPNG_MG_15, _super);

    function ECanvasPointsTracerPNG_MG_15(p1, p2, call_back) {
        _super.call(this, p1, p2, 300, call_back, "light_tracer_MG_15");
    }

    return ECanvasPointsTracerPNG_MG_15;
})(ECanvasPointsTracerPNG);


var ECanvasPointsTracerAnimation_1 = (function (_super) {
    __extends(ECanvasPointsTracerAnimation_1, _super);

    function ECanvasPointsTracerAnimation_1(p1, p2, call_back) {
        _super.call(this, p1, p2, 420, call_back, "light_tracer_animation_1", 80);
    }

    return ECanvasPointsTracerAnimation_1;
})(ECanvasPointsTracerAnimation);


var ECanvasPointsTracerAnimation_2 = (function (_super) {
    __extends(ECanvasPointsTracerAnimation_2, _super);

    function ECanvasPointsTracerAnimation_2(p1, p2, call_back) {
        _super.call(this, p1, p2, 340, call_back, "light_tracer_animation_2", 80);
    }

    return ECanvasPointsTracerAnimation_2;
})(ECanvasPointsTracerAnimation);


var ETownRocket = (function (_super) {
    __extends(ETownRocket, _super);

    function ETownRocket(p1, p2, target_mobj_id, duration, call_back) {
        _super.call(this, p1, p2, 340, call_back, "icon-rocket-small", 100);
        this.duration = duration; // Обновить duration, так как зависит времени, а не от скорости
        this._target_mobj_id = target_mobj_id;

        this.mobj = visualManager.getModelObject(this._target_mobj_id);

        this.get_position(clock.getCurrentTime()); // Пересчитать kx, ky
        this.is_finished = false;
        this.p_start = p1;
        this.offset_x = -0.5;
        this.offset_y = -0.5;
    }

    ETownRocket.prototype.get_position = function (time) {
        if (this.mobj) {
            this.p2 = this.mobj.getCurrentCoord(this.start_time + this.duration);
            var lost_time = this.start_time + this.duration - time;
            if (lost_time < 0.1)
                return null;
            this.kx = (this.p2.x - this.x0) / this.duration;
            this.ky = (this.p2.y - this.y0) / this.duration;
            this.direction = angleVectorRadCCW2(new Point(this.kx, this.ky));
        }

        return _super.prototype.get_position.call(this, time);
    };

    ETownRocket.prototype.start = function () {
        this.start_time = clock.getCurrentTime();
        timeManager.addTimeoutEvent(this, 'finish', this.duration * 1000.);
        mapCanvasManager.add_vobj(this, 50);
        //console.log('ETownRocket.prototype.start ', this);
    };

    ETownRocket.prototype.finish = function () {
        if (this.is_finished) return;
        this.is_finished = true;
        mapCanvasManager.del_vobj(this);
        if (typeof (this.cb) === 'function')
            this.cb(this.p2);
        this.mobj = null;
    };

    ETownRocket.prototype.redraw = function (ctx, time) {
        ctx.save();
        var pos = this.get_position(time);
        if (!pos) {this.finish(); return;}
        this._last_pos = pos;
        var ctx_pos = mulScalVector(subVector(pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        ctx.translate(ctx_pos.x, ctx_pos.y);
        ctx.rotate(this.direction);
        var img_obj = this.image_obj;
        if (img_obj) {
            var frame = this._get_frame_num(time);
            ctx.drawImage(img_obj.img, frame * this.frame_width, 0, this.frame_width, this.frame_height,
                this.offset_x * img_obj.size[1], this.offset_y * img_obj.size[0], this.frame_width, this.frame_height);
        }
        else {
            console.warn('Странная ошибка! Говорит, что не смог найти картинку. Странно это. Очень странно!');
        }

        ctx.restore();

        if (mapCanvasManager._settings_particles_tail)
            new ECanvasCarTail(getRadialRandomPointWithAngle(this._last_pos, -5, this.direction, 0.5), Math.PI / 2. + this.direction, 2500 * mapCanvasManager._settings_particles_tail, "icon-rocket-tail-03", 0.5, 0.25).start();

    };


    return ETownRocket;
})(ECanvasPointsTracerAnimation);