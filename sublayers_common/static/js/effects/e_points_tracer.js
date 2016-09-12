/*
* Еффект трассера между двумя точками с заданной скоростью и размерами трассера
* по завершениею эффекта вызовется коллбек, в который передастся последняя позиция трассера
*/

var ConstStartDistance = 20; // Расстояние от центра машинки до начальной точки трассера (px)


var EPointsTracer = (function(){
    function EPointsTracer(p1, p2, speed, length, call_back){
        console.log('Не используемый код !!!!');
        // получим вектор-направление движения трассера и дистанцию
        var track_vect = subVector(p2, p1);
        var dist_track = track_vect.abs();
        if(dist_track < 20) return; // todo не рисовать, если очень близко. можно сразу рисовать вспышки
        // на сколько нужно сдвинутся по вектору (сейчас lenght / 2.)
        var d_vect = ConstStartDistance; // можно изменить, чтобы трассер начинался не из машинки, а рядом
        this.length = length;
        // расчёт начальной точки
        var p11 = summVector(mulScalVector(track_vect, d_vect / dist_track), p1);
        track_vect = subVector(p2, p11);
        // вычислим направление движения трассера
        this.direction = angleVectorRadCCW(track_vect);
        // вычислим время движения между точками
        this.duration = track_vect.abs() / speed;

        this.svg_params = {
            stroke_width: 1.3,
            stroke_color: '#0f0',
            stroke_opacity: 1.0
        };
        // создание маркера
        this.div_id = 'EPointsTracer' + (-generator_ID.getID());
        var myIcon = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [length, length],
            iconAnchor: [length / 2., length / 2.],
            html: '<div id="' + this.div_id + '"></div>'
        });
        this.marker = L.marker(mapManager.unproject([p11.x, p11.y], mapManager.getMaxZoom()),
            {
                icon: myIcon,
                zIndexOffset: 10,
                clickable: false
            });

        // сохраняем параметры движения трассера
        this.x0 = p11.x;
        this.y0 = p11.y;
        this.t0 = clock.getCurrentTime();
        this.kx = (p2.x - p11.x) / this.duration;
        this.ky = (p2.y - p11.y) / this.duration;

        // сохраняем call_back и p2 для него
        this.cb = call_back;
        this.p2 = p2;
    }

    EPointsTracer.prototype.get_position = function (time) {
        return new Point(
            this.x0 + this.kx * (time - this.t0),
            this.y0 + this.ky * (time - this.t0)
        )
    };

    EPointsTracer.prototype.change = function (time) {
        var pos = this.get_position(time);
        var tempLatLng = mapManager.unproject([pos.x, pos.y], mapManager.getMaxZoom());
        this.marker.setLatLng(tempLatLng);
    };

    EPointsTracer.prototype.on_start = function () {
        var draw = SVG(this.div_id);
        var l2 = this.length / 2.;
        draw.line(0, 0, this.length, 0)
            .center(l2, l2)
            .transform({rotation: radToGrad(this.direction), cx: l2, cy: l2})
            .stroke({
                width: this.svg_params.stroke_width,
                color: this.svg_params.stroke_color,
                opacity: this.svg_params.stroke_opacity
            })
            .attr('stroke-linecap', 'round');
        draw.circle(0).radius(1)
            .center(l2, l2)
            .dmove(l2, 0)
            .transform({rotation: radToGrad(this.direction), cx: l2, cy: l2})
            .stroke({
                width: this.svg_params.stroke_width,
                color: this.svg_params.stroke_color,
                opacity: this.svg_params.stroke_opacity
            })
            .fill(this.svg_params.stroke_color)
    };

    EPointsTracer.prototype.start = function () {
        if (this.marker) {
            this.marker.addTo(map);
            this.on_start();
            timeManager.addTimeoutEvent(this, 'finish', this.duration * 1000.);
            timeManager.addTimerEvent(this, 'change');
        }
    };

    EPointsTracer.prototype.finish = function () {
        timeManager.delTimerEvent(this, 'change');
        map.removeLayer(this.marker);
        if(typeof (this.cb) === 'function')
            this.cb(this.p2);
    };

    return EPointsTracer
})();


var EPointsTracerPNG = (function(){
    function EPointsTracerPNG(p1, p2, speed, call_back){
        console.log('Не используемый код !!!!');
        // получим вектор-направление движения трассера и дистанцию
        var track_vect = subVector(p2, p1);
        var dist_track = track_vect.abs();
        if(dist_track < 20) return; // todo не рисовать, если очень близко. можно сразу рисовать вспышки
        // расчёт начальной точки
        var p11 = summVector(mulScalVector(track_vect, ConstStartDistance / dist_track), p1);
        track_vect = subVector(p2, p11);
        // вычислим направление движения трассера
        this.direction = angleVectorRadCCW(track_vect);
        // вычислим время движения между точками
        this.duration = track_vect.abs() / speed;
        this.old_position = {x: 0, y: 0};

        // создание маркера
        this.div_id = 'EPointsTracerPNG' + (-generator_ID.getID());
        var myIcon = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [14, 7],
            iconAnchor: [14 / 2., 7 / 2.],
            html: '<div id="' + this.div_id + '" class="effect-tracer-png"></div>'
        });
        this.marker = L.rotatedMarker(mapManager.unproject([p11.x, p11.y], mapManager.getMaxZoom()),
            {
                icon: myIcon,
                zIndexOffset: -999,
                clickable: false
            });

        this.marker.options.angle = this.direction;

        // сохраняем параметры движения трассера
        this.x0 = p11.x;
        this.y0 = p11.y;
        this.t0 = clock.getCurrentTime();
        this.kx = (p2.x - p11.x) / this.duration;
        this.ky = (p2.y - p11.y) / this.duration;

        // сохраняем call_back и p2 для него
        this.cb = call_back;
        this.p2 = p2;
    }

    EPointsTracerPNG.prototype.get_position = function (time) {
        return new Point(
            this.x0 + this.kx * (time - this.t0),
            this.y0 + this.ky * (time - this.t0)
        )
    };

    EPointsTracerPNG.prototype.change = function (time) {
        if (mapManager.inZoomChange) return;
        var tempPoint = this.get_position(time);
        if ((Math.abs(this.old_position.x - tempPoint.x) >= 0.5) || (Math.abs(this.old_position.y - tempPoint.y) >= 0.5)) {
            this.old_position = tempPoint;
            var tempLatLng = mapManager.unproject([tempPoint.x, tempPoint.y], mapManager.getMaxZoom());
            this.marker.setLatLng(tempLatLng);
        }
    };

    EPointsTracerPNG.prototype.start = function () {
        if (this.marker) {
            this.marker.addTo(map);
            timeManager.addTimeoutEvent(this, 'finish', this.duration * 1000.);
            timeManager.addTimerEvent(this, 'change');
        }
    };

    EPointsTracerPNG.prototype.finish = function () {
        timeManager.delTimerEvent(this, 'change');
        map.removeLayer(this.marker);
        if(typeof (this.cb) === 'function')
            this.cb(this.p2);
    };

    return EPointsTracerPNG
})();


var ECanvasPointsTracerPNG = (function () {
    function ECanvasPointsTracerPNG(p1, p2, speed, call_back) {
        // получим вектор-направление движения трассера и дистанцию
        this.image_obj = effectPNGLoader.getImage("effect-tracer-png");
        var track_vect = subVector(p2, p1);
        var dist_track = track_vect.abs();
        if (dist_track < 20) return; // todo не рисовать, если очень близко. можно сразу рисовать вспышки
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
        mapCanvasManager.add_vobj(this, 50);
    };

    ECanvasPointsTracerPNG.prototype.finish = function () {
        mapCanvasManager.del_vobj(this);
        if (typeof (this.cb) === 'function')
            this.cb(this.p2);
    };

    return ECanvasPointsTracerPNG
})();