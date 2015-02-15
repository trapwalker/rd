/*
* Еффект трассера между двумя точками с заданной скоростью и размерами трассера
* по завершениею эффекта вызовется коллбек, в который передастся последняя позиция трассера
* */


var EPointsTracer = (function(){
    function EPointsTracer(p1, p2, speed, length, call_back){
        // получим вектор-направление движения трассера и дистанцию
        var track_vect = subVector(p2, p1);
        var dist_track = track_vect.abs();
        if(dist_track < 20) return; // todo не рисовать, если очень близко. можно сразу рисовать вспышки
        // на сколько нужно сдвинутся по вектору (сейчас lenght / 2.)
        var d_vect = 20; // можно изменить, чтобы трассер начинался не из машинки, а рядом
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
        this.marker = L.marker(myMap.unproject([p11.x, p11.y], map.getMaxZoom()),
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
        var tempLatLng = map.unproject([pos.x, pos.y], map.getMaxZoom());
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
            .attr('stroke-linecap', 'round')
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