/*
* Виджет для позиционирования карты по пользовательской машинке
*/

var WMapPosition = (function (_super) {
    __extends(WMapPosition, _super);

    function WMapPosition() {
        _super.call(this, []);
        this.old_position = {x: 0, y: 0};
        this.temp_vector = new Point3d(0, 0, 0);
        this.current_vector = new Point3d(0, 0, 0);
        this.phase = "";

        // Завязка на время
        this.start_phase = 0;
        this.start_dur = 50;
        this.end_dur = 200;
    }

    WMapPosition.prototype.redraw = function(t) {
        var time = clock.getCurrentTime();
        var client_time = clock.getClientTime();
        if (!this._model_objects.length) return;
        var car = this._model_objects[0];
        var tempPoint = car.getCurrentCoord(time);
        tempPoint = summVector(tempPoint, mapCanvasManager.current_mouse_shift);

        // Рабочий вариант 1
        // var sqr_abs = this.temp_vector.sqr_abs();
        // if (sqr_abs > 0.0) {
        //     if (sqr_abs < 0.02)
        //         this.temp_vector = new Point3d(0, 0, 0);
        //     else
        //         this.temp_vector = this.temp_vector.mul_scal(0.93);
        //     // console.log(this.temp_vector);
        //     var map_zoom_k = mapManager.getZoomKoeff();
        //     if (map_zoom_k < 2) {
        //         mapManager.set_coord({z: mapManager.newZoomForCalcZoom + this.temp_vector.z});
        //         tempPoint = summVector(tempPoint, new Point(this.temp_vector.x / map_zoom_k, this.temp_vector.y / map_zoom_k));
        //     }
        // }

        // Рабочий вариант 2: разделение на фазы
        // var sqr_abs = this.temp_vector.sqr_abs();  // К чему стремимся
        // if (sqr_abs > 0) {
        //     var sqr_abs_current = this.current_vector.sqr_abs();  // Что есть в данный момент
        //
        //     if (this.phase == "end") {
        //         if (sqr_abs_current < 0.02) {
        //             this.temp_vector = new Point3d(0, 0, 0);
        //             this.current_vector = new Point3d(0, 0, 0);
        //             this.phase = "";
        //         }
        //         else
        //             this.current_vector = this.current_vector.mul_scal(0.93);
        //     }
        //
        //     if (this.phase == "start") {
        //         if (sqr_abs_current == 0.0)
        //             this.current_vector = this.temp_vector.mul_scal(0.5);
        //         else
        //             this.current_vector = this.current_vector.mul_scal(1.5);
        //
        //         if (sqr_abs <= sqr_abs_current)
        //             this.phase = "end";
        //     }
        //
        //     var map_zoom_k = mapManager.getZoomKoeff();
        //     if (map_zoom_k < 4) {
        //         mapManager.set_coord({z: mapManager.newZoomForCalcZoom + this.current_vector.z});
        //         tempPoint = summVector(tempPoint, new Point(this.current_vector.x / map_zoom_k, this.current_vector.y / map_zoom_k));
        //     }
        // }

        // Рабочий вариант 3: зависимость от времени
        var sqr_abs = this.temp_vector.sqr_abs();  // К чему стремимся
        if (sqr_abs > 0) {
            var phase_t = client_time - this.start_phase;
            var prc = 0;
            if (phase_t > this.start_dur + this.end_dur) {  // Значит закончили
                this.temp_vector = new Point3d(0, 0, 0);
                this.current_vector = new Point3d(0, 0, 0);
            }
            else if (phase_t > this.start_dur ) { // Значит в фазе END
                prc = 1.0 - Math.min(Math.max((phase_t - this.start_dur) / this.end_dur, 0), 1.0);
            }
            else { // Значит в фазе Start
                prc = Math.min(Math.max(phase_t / this.start_dur, 0), 1.0);
            }

            this.current_vector = this.temp_vector.mul_scal(prc);
            var map_zoom_k = mapManager.getZoomKoeff();
            if (map_zoom_k < 4) {
                mapManager.set_coord({z: mapManager.newZoomForCalcZoom + this.current_vector.z});
                tempPoint = summVector(tempPoint, new Point(this.current_vector.x / map_zoom_k, this.current_vector.y / map_zoom_k));
            }
        }

        // Перерисовка позиции карты
        if ((Math.abs(this.old_position.x - tempPoint.x) >= 0.5) || (Math.abs(this.old_position.y - tempPoint.y) >= 0.5)) {
            this.old_position = tempPoint;
            mapManager.set_coord({x: tempPoint.x, y:tempPoint.y});
        }
    };

    WMapPosition.prototype._random_shift = function(max_x, max_y, max_z) {
        this.temp_vector = new Point3d(randomRange(-max_x, max_x), randomRange(-max_y, max_y), randomRange(max_z, 0));
        this.phase = "start";
        this.current_vector = new Point3d(0, 0, 0);
        this.start_phase = clock.getClientTime();
        this.redraw();
    };

    WMapPosition.prototype.random_shift = function() {
        this._random_shift(40, 40, -0.03);
    };


    WMapPosition.prototype.delFromVisualManager = function () {};

    return WMapPosition;
})(VisualObject);

var wMapPosition;