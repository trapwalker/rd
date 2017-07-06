/*
 * Виджет для отрисовки центрального виджета стрельбы (сетки )
 * Ссылка на него находится в мап менеджере, так как при зумировании он должен исчезать
 */

var WFCanvasireRadialGrid = (function (_super) {
    __extends(WCanvasFireRadialGrid, _super);

    function WCanvasFireRadialGrid(car) {
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

        mapCanvasManager.add_vobj(this, 9);
    }

    WCanvasFireRadialGrid.prototype.setVisible = function (visible) {
        //console.log('WCanvasFireRadialGrid.prototype.setVisible', visible);
        if (this._visible_want != visible){
            this.in_visible_change = true;
            this._visible_want = visible;
            this.start_change_visible_time = clock.getCurrentTime();
        }
    };

    WCanvasFireRadialGrid.prototype.getVisibleState = function (time) {
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

    WCanvasFireRadialGrid.prototype.redraw = function(ctx, time){
        //console.log('WCanvasFireSectorsScaled.prototype.redraw');
        var visible_state = this.getVisibleState(time);
        if (visible_state == 0) return;

        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        var opacity = mapCanvasManager.real_zoom -  14.;
        opacity = Math.max(Math.min(1, opacity), 0);
        if (this.in_visible_change)
            ctx.globalAlpha = Math.min(opacity, visible_state);

        var car_dir = this.car.getCurrentDirection(time);
        var zoom_koeff = mapCanvasManager.zoom_koeff;

        ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
        ctx.rotate(car_dir);

        // Рисование
        var max_radius = this.max_radius;
        var max_circles = this.max_circles;

        ctx.strokeStyle = "rgba(0, 255, 161, 0.4)";

        // Отрисовка кругов
        for (var i = 1; i <= max_circles; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, max_radius * i / max_circles, 2 * Math.PI, 0, false);
            ctx.stroke();
        }

        // добавление 45 градусных линий-отметок (их длинна сейчас по 10 градусов...изменяема)
        var p1 = new Point(max_radius, 0);
        var p2 = new Point(max_radius - (max_radius / max_circles) * 0.75, 0);
        ctx.save();

        var grad_line45 = ctx.createRadialGradient(p1.x, p1.y, 0, p1.x, p1.y, 30);
        grad_line45.addColorStop(0.0, "rgba(0, 255, 161, 0.65)");
        grad_line45.addColorStop(1.0, "rgba(0, 255, 161, 0)");

        ctx.strokeStyle = grad_line45;
        var pi_d2 = Math.PI / 2.;
        var pi_d10 = Math.PI / 10.;

        ctx.rotate(Math.PI / 4.);
        for (i = 0; i < 4; i++) {
            ctx.rotate(pi_d2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, max_radius, -pi_d10, pi_d10, false);
            ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = "rgba(0, 255, 161, 1)";
        ctx.save();
        // Добавление радиальных точек
        for (var i = 1; i <= max_circles; i++)
            for (var y = 0; y < 4; y++) {
                ctx.rotate(pi_d2);
                ctx.beginPath();
                ctx.arc(max_radius * i / max_circles, 0, 1, 2 * Math.PI, 0, false);
                ctx.fill();
            }
        ctx.restore();

        // Добавление точек-зумматоров
        ctx.save();
        ctx.rotate(-3 * Math.PI / 4);
        for (var i = 1; i <= max_circles; i++) {
            ctx.beginPath();
            ctx.arc(max_radius * i / max_circles, 0, 2, 2 * Math.PI, 0, false);
            ctx.fill();
        }
        ctx.restore();

        // Вывод текста зумматоров
        ctx.textAlign = "center";
        ctx.textBaseline = "center";
        ctx.font = "6pt MICRADI";
        ctx.fillStyle = 'rgba(0, 255, 161, 0.6)';
        var max_zoomator = rotateVector(new Point(max_radius, 0), -3 * Math.PI / 4 + car_dir);

        ctx.rotate(-car_dir);
        for (var i = 1; i <= max_circles; i++) {
            var p = mulScalVector(max_zoomator, i / max_circles);
            //var s = (i * zoom_koeff).toFixed(2);
            var s = ((zoom_koeff * this.max_radius * i / max_circles) >> 1) << 1;
            ctx.fillText(s, p.x, p.y - 15);
        }
        ctx.restore(); // Главный ресторе
    };

    WCanvasFireRadialGrid.prototype.setZoom = function() {};

    WCanvasFireRadialGrid.prototype.delFromVisualManager = function () {
        //console.log('WCanvasFireRadialGrid.prototype.delFromVisualManager');
        this.car = null;
        mapManager.widget_fire_radial_grid = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCanvasFireRadialGrid;
})(VisualObject);

