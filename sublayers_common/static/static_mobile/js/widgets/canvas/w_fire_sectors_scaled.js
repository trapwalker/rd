/*
 * Виджет для отрисовки центрального виджета стрельбы (сетки )
 */

var WCanvasFireSectorsScaled = (function (_super) {
    __extends(WCanvasFireSectorsScaled, _super);

    function WCanvasFireSectorsScaled(car) {
        _super.call(this, [car]);
        this.car = car;

        this._visible = true;  // todo: взять из настроек, куки, или из любого другого места
        this._visible_want = this._visible; // Желаемое значение переменной _visible
        this.in_visible_change = false;
        this.start_change_visible_time = 0;

        // Инициализация всяких нужных штук
        this.max_circles = 6; // кол-во кругов сетки
        var sides = this.car.fireSidesMng.sides;
        this.max_radius = Math.max(
            sides.front.sideRadius,
            sides.back.sideRadius,
            sides.left.sideRadius,
            sides.right.sideRadius);

        mapCanvasManager.add_vobj(this, 10);
    }

    WCanvasFireSectorsScaled.prototype.setZoom = function(){};

    WCanvasFireSectorsScaled.prototype._drawSectors = function(ctx, zoom_koeff, time){
        // Подготовка для отрисовки секторов и бортов
        //var first_radius = this.max_radius / this.max_circles;
        //var second_radius = this.max_radius * 2/ this.max_circles;

        // Добавление залповых секторов (только сектора, без привязки к стронам)
        var sectors = this.car.fireSidesMng.getSectors('', true, false); // взять все залповые сектора
        for (var i = 0; i < sectors.length; i++) {
            var sector = sectors[i];
            var sect_radius = sector.radius;
            this._drawOneSector(ctx, sect_radius / zoom_koeff * 0.2, sect_radius / zoom_koeff, sector.width, sector.direction);
        }

        // Добавление автоматических секторов (только сектора, без привязки к стронам)
        var auto_sectors = this.car.fireSidesMng.getSectors('', false, true);
        for (i = 0; i < auto_sectors.length; i++) {
            var asector = auto_sectors[i];
            var asect_radius = asector.radius;
            this._drawOneAutoSector(ctx, asect_radius / zoom_koeff, asector.width, asector.direction);

        }

        // todo: меньше какого радиуса рисовать или не рисовать эти зацепы.
        // Добавление бортов - просто линии, указывающие направление борта

        var second_radius = 30;
        for (var key_side in this.car.fireSidesMng.sides)
            if (this.car.fireSidesMng.sides.hasOwnProperty(key_side)){
                var side = this.car.fireSidesMng.sides[key_side];
                var max_disch_radius = side.sideDischargeRadius;
                var max_disch_width = side.sideDischargeWidth;
                if (max_disch_radius > second_radius && max_disch_width > 0) {
                    this._drawOneSide(ctx, second_radius / zoom_koeff, max_disch_radius / zoom_koeff, max_disch_width,
                        side.direction);

                    this._drawOneRechargeSide(ctx, side.sideRadius + 30, max_disch_width, side.direction, side.getRechargeState(time))
                }
            }
    };

    WCanvasFireSectorsScaled.prototype._drawOneSector = function(ctx, minRadius, maxRadius, width, direction){
        // Пример с красным кружком
        var grad_fill = ctx.createRadialGradient(0, 0, minRadius, 0, 0, maxRadius);
        grad_fill.addColorStop(0.0, "rgba(85, 255, 85, 0)");
        grad_fill.addColorStop(0.33, "rgba(85, 255, 85, 0.2)");

        ctx.save();

        ctx.rotate(direction);
        ctx.fillStyle = grad_fill;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, maxRadius, -width / 2, width / 2, false);
        ctx.closePath();

        ctx.fill();

        ctx.restore();

    };

    WCanvasFireSectorsScaled.prototype._drawOneSide = function(ctx, minRadius, maxRadius, width, direction){
        var half_width =  width /2.;
        var diff_zacep = half_width / 4.;
        var sp11 = rotateVector(new Point(minRadius, 0), half_width);
        var sp12 = rotateVector(new Point(minRadius, 0), -half_width);
        var sp21 = rotateVector(new Point(maxRadius, 0), half_width);
        var sp22 = rotateVector(new Point(maxRadius, 0), -half_width);

        ctx.save();

        var grad_stroke = ctx.createRadialGradient(0, 0, minRadius, 0, 0, maxRadius);
        grad_stroke.addColorStop(0.0, "rgba(85, 255, 85, 0)");
        grad_stroke.addColorStop(0.2, "rgba(85, 255, 85, 1)");
        grad_stroke.addColorStop(1.0, "rgba(85, 255, 85, 1)");

        ctx.rotate(direction);

        ctx.strokeStyle = grad_stroke;

        ctx.beginPath();
        ctx.moveTo(sp11.x, sp11.y);
        ctx.lineTo(sp21.x, sp21.y);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sp12.x, sp12.y);
        ctx.lineTo(sp22.x, sp22.y);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(85, 255, 85, 0.6)';

        var grad_left_zacep_22 = ctx.createRadialGradient(sp22.x, sp22.y, 0, sp22.x, sp22.y, 50);
        grad_left_zacep_22.addColorStop(0.0, "rgba(85, 255, 85, 0.65)");
        grad_left_zacep_22.addColorStop(1.0, "rgba(85, 255, 85, 0)");

        var grad_left_zacep_21 = ctx.createRadialGradient(sp21.x, sp21.y, 0, sp21.x, sp21.y, 50);
        grad_left_zacep_21.addColorStop(0.0, "rgba(85, 255, 85, 0.65)");
        grad_left_zacep_21.addColorStop(1.0, "rgba(85, 255, 85, 0)");

        ctx.strokeStyle = 'rgba(85, 255, 85, 0.6)';
        ctx.strokeStyle = grad_left_zacep_22;
        ctx.beginPath();
        ctx.arc(0, 0, maxRadius, -half_width, -half_width + diff_zacep, false);
        ctx.stroke();

        ctx.strokeStyle = grad_left_zacep_21;
        ctx.beginPath();
        ctx.arc(0, 0, maxRadius, half_width, half_width - diff_zacep, true);
        ctx.stroke();

        ctx.restore();

    };

    WCanvasFireSectorsScaled.prototype._drawOneRechargeSide = function(ctx, recharge_area_radius, width, direction, recharge_state){
        var half_width =  width /2.;

        //var sp21 = rotateVector(new Point(recharge_area_radius, 0), half_width);
        //var sp22 = rotateVector(new Point(recharge_area_radius, 0), -half_width);

        ctx.save();
        ctx.rotate(direction);

        ctx.strokeStyle = 'rgba(85, 255, 85, 0.6)';
        // вывод тонкой линии
        ctx.beginPath();
        ctx.arc(0, 0, recharge_area_radius, -half_width, half_width, false);
        ctx.stroke();

        ctx.lineWidth = 3;

        // вывод линий перезарядки
        if (recharge_state.prc >= 1){
            ctx.beginPath();
            ctx.arc(0, 0, recharge_area_radius, -half_width, half_width, false);
            ctx.stroke();
        }
        else {
            var prc = 1 - recharge_state.prc;
            var temp_rech_angle = -half_width * prc;
            temp_rech_angle = -half_width > temp_rech_angle ? -half_width : temp_rech_angle;
            ctx.beginPath();
            ctx.arc(0, 0, recharge_area_radius, -half_width, temp_rech_angle, false);
            ctx.stroke();
            temp_rech_angle = half_width * prc;
            temp_rech_angle = temp_rech_angle > half_width ? half_width : temp_rech_angle;
            ctx.beginPath();
            ctx.arc(0, 0, recharge_area_radius, temp_rech_angle, half_width, false);
            ctx.stroke();
        }

        ctx.font = "11pt MICRADI";
        ctx.textAlign = "center";
        ctx.textBaseline = "center";
        ctx.fillStyle = 'rgba(85, 255, 85, 0.6)';

        var const_width_letter = 15; // Ширина одной буквы равна 15px;
        // todo: вычисляем
        var recharge_text = recharge_state.prc >= 1 ? "READY" : "RELOAD";

        this.fillTextCircle(ctx, recharge_text, recharge_area_radius + 20, -half_width / 2 + Math.PI / 2,
                half_width / 2 + Math.PI / 2);

        ctx.restore();
    };

    WCanvasFireSectorsScaled.prototype.fillTextCircle = function (ctx, text, radius, startRotation, endRotation) {
        var numRadsPerLetter = Math.abs(endRotation - startRotation) / text.length;
        ctx.save();
        ctx.rotate(startRotation + numRadsPerLetter / 2.);

        for (var i = 0; i < text.length; i++) {
            ctx.save();
            ctx.rotate(i * numRadsPerLetter);

            ctx.fillText(text[i], 0, -radius);
            ctx.restore();
        }
        ctx.restore();
    };

    WCanvasFireSectorsScaled.prototype._drawOneAutoSector = function(ctx, radius, width, direction){
        var grad_stroke = ctx.createRadialGradient(0, 0, 5, 0, 0, radius);
        grad_stroke.addColorStop(0.0, "rgba(85, 255, 85, 0)");
        grad_stroke.addColorStop(0.8, "rgba(85, 255, 85, 0)");
        grad_stroke.addColorStop(1.0, "rgba(85, 255, 85, 1)");

        ctx.save();
        ctx.rotate(direction);
        ctx.strokeStyle = grad_stroke;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, -width / 2, width / 2, false);
        ctx.closePath();

        ctx.stroke();

        ctx.restore();

    };

    WCanvasFireSectorsScaled.prototype.setVisible = function (visible) {
        //console.log('WCanvasFireSectorsScaled.prototype.setVisible', visible);
        if (this._visible_want != visible){
            this.in_visible_change = true;
            this._visible_want = visible;
            this.start_change_visible_time = clock.getCurrentTime();
        }
    };

    WCanvasFireSectorsScaled.prototype.getVisibleState = function (time) {
        if (this.in_visible_change) {
            // todo: задать время анимации виджетаСтрельбы не через slow, а константой
            var p = (time - this.start_change_visible_time) / ( 600 / 1000.);
            p = p < 0 ? 0 : p;
            p = p > 1.0 ? 1 : p;
            if (p == 1) {
                this.in_visible_change = false;
                this._visible = this._visible_want;
            }
            return this._visible_want == true ? p : 1 - p;
        }
        return this._visible ? 1 : 0;
    };

    WCanvasFireSectorsScaled.prototype.redraw = function(ctx, time){
        //console.log('WCanvasFireSectorsScaled.prototype.redraw');
        var visible_state = this.getVisibleState(time);
        if (visible_state == 0) return;

        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        if (this.in_visible_change) {
            ctx.globalAlpha = visible_state;
        }

        ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
        ctx.rotate(this.car.getCurrentDirection(time));

        this._drawSectors(ctx, mapCanvasManager.zoom_koeff, time);

        ctx.restore();
    };

    WCanvasFireSectorsScaled.prototype.delFromVisualManager = function () {
        //console.log('WCanvasFireSectorsScaled.prototype.delFromVisualManager');
        this.car = null;
        mapManager.widget_fire_sectors = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCanvasFireSectorsScaled;
})(VisualObject);
