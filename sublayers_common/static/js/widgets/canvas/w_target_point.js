/*
 * Виджет для указания пункта назначения пользовательской машинки
 * Виджет находится на карте, поэтому ссылка на него находится в map_manager
 * для того, чтобы им было легко управлять (включать и выключать)
 */

var WCanvasTargetPoint = (function (_super) {
    __extends(WCanvasTargetPoint, _super);

    function WCanvasTargetPoint(car) {
        _super.call(this, [car]);
        this.car = car;
        this.target_point = null;

        this.icon_target_obj = iconsLeaflet.getIcon('icon_map_target_point');

        mapCanvasManager.add_vobj(this, 20);
    }

    WCanvasTargetPoint.prototype.redraw = function(ctx, time){
        //console.log('WCanvasTargetPoint.prototype.redraw');
        if (! this.target_point) return;

        ctx.save();

        // Вычисляем координаты
        var tp_ctx = mulScalVector(subVector(this.target_point, this.car.getCurrentCoord(time)), 1.0 / mapCanvasManager.zoom_koeff);
        if (tp_ctx.abs() > 10.0) { // если меньше 10 пикселей, то просто не показываем
            ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);

            //ctx.strokeStyle = 'rgba(0, 255, 161, 0.2)';
            //ctx.setLineDash([8, 5]);

            // чтобы линия не наезжала на крестик
            //tp_ctx = summVector(tp_ctx, normVector(tp_ctx, -10));

            var gradient = ctx.createLinearGradient(0, 0, tp_ctx.x, tp_ctx.y);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.1, '#00ffa1');
            gradient.addColorStop(1, '#00ffa1');
            ctx.strokeStyle = gradient;

            ctx.globalAlpha = 0.2;

            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            // Отрисовка линии
            ctx.beginPath();
            ctx.moveTo(tp_ctx.x, tp_ctx.y);
            ctx.lineTo(0, 0);
            ctx.stroke();
        }

        ctx.restore();

        ctx.save();
        var ctx_car_pos = mulScalVector(subVector(this.target_point, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        ctx.translate(ctx_car_pos.x, ctx_car_pos.y);
        ctx.globalAlpha = 0.2;
        ctx.drawImage(this.icon_target_obj.img, -this.icon_target_obj.iconSize[0] >> 1, -this.icon_target_obj.iconSize[1] >> 1);
        ctx.restore();
    };

    WCanvasTargetPoint.prototype.equals_target_points = function (target) {
        if (!this.target_point) return false;
        return Math.abs(this.target_point.x - target.x) < 0.1 &&
            Math.abs(this.target_point.y - target.y) < 0.1;
    };

    WCanvasTargetPoint.prototype.activate = function(target_point){
        // если таргет поинт не сменился, то выход
        if (this.equals_target_points(target_point))
            return;
        audioManager.play({name: "path_setting", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
        this.target_point = target_point;
    };

    WCanvasTargetPoint.prototype.deactivate = function(){
        this.target_point = null;
    };

    WCanvasTargetPoint.prototype.delFromVisualManager = function () {
        //console.log('WCanvasTargetPoint.prototype.delFromVisualManager');
        this.deactivate();
        this.car = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCanvasTargetPoint;
})(VisualObject);



var MapRoute = (function (_super) {
    __extends(MapRoute, _super);

    function MapRoute(car, point) {
        _super.call(this, [car]);
        this.car = car;
        this.target_point = null;

        this.points = [point];

        this.icon_target_obj = iconsLeaflet.getIcon('icon_map_target_point');

        this.route_accuracy2 = 2500; // 50px

        this.icon_width = this.icon_target_obj.iconSize[0];
        this.icon_height = this.icon_target_obj.iconSize[1];
        this.icon_width_half = this.icon_width / 2.;
        this.icon_height_half = this.icon_height / 2.;

        mapCanvasManager.add_vobj(this, 20);
        this.set_accuracy();
    }

    MapRoute.prototype.redraw = function(ctx, time){
        //console.log('WCanvasTargetPoint.prototype.redraw');
        if (! this.target_point) return;

        var car_pos = this.car.getCurrentCoord(time);

        // Попробовать перейти на следующую точку
        if (this.need_next_point(car_pos))
            this.get_next_point();

        ctx.save();

        var current_point = car_pos;
        var current_ctx_pos = mapCanvasManager.cur_ctx_car_pos;
        for (var i = 0; i < this.points.length; i++) {
            var p = this.points[i];
            var tp_ctx = mulScalVector(subVector(p, current_point), 1.0 / mapCanvasManager.zoom_koeff);

            ctx.translate(current_ctx_pos.x, current_ctx_pos.y);
            ctx.save();

            if (i == 0) {
                var gradient = ctx.createLinearGradient(0, 0, tp_ctx.x, tp_ctx.y);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(0.1, '#00ffa1');
                gradient.addColorStop(1, '#00ffa1');
                ctx.strokeStyle = gradient;
            }
            else
                ctx.strokeStyle = '#00ffa1';

            ctx.globalAlpha = 0.2;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            // Отрисовка линии
            ctx.beginPath();
            ctx.moveTo(tp_ctx.x, tp_ctx.y);
            ctx.lineTo(0, 0);
            ctx.stroke();

            ctx.globalAlpha = 0.4;
            ctx.drawImage(this.icon_target_obj.img, 0, 0,
                this.icon_width, this.icon_height,
                Math.round(tp_ctx.x - this.icon_width_half),
                Math.round(tp_ctx.y - this.icon_height_half),
                this.icon_width, this.icon_height
            );

            ctx.restore();

            current_point = p;
            current_ctx_pos = tp_ctx;
        }

        ctx.restore();
    };

    MapRoute.prototype.set_accuracy = function () {
        var val = settingsManager.options.map_route_accuracy.currentValue;
        this.route_accuracy2 = val * val;
    };

    MapRoute.prototype.need_next_point = function (car_pos) {
        return this.target_point && distancePoints2(this.target_point, car_pos) < this.route_accuracy2;
    };

    MapRoute.prototype.get_next_point = function (not_send_to_server) {
        //console.log('MapRoute.prototype.get_next_point', this.points.length);
        if (this.target_point && this.points && this.target_point == this.points[0])
            this.points.shift();
        this.target_point = this.points && this.points[0];
        if (this.target_point) {
            if (!not_send_to_server) {
                clientManager.sendGoto(this.target_point);
                // звук взята следующая точка
                if (!window_focused){
                    audioManager.play({name: "path_setting", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
                }
            }
        }
        else {
            // звук маршрут завершён
            if (!window_focused) {
                audioManager.play({name: "path_setting", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
                audioManager.play({name: "path_setting", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0, time: 0.15});
            }
        }
    };

    MapRoute.prototype.equals_target_point = function (target) {
        if (!this.target_point) return true;
        return distancePoints2(this.target_point, target) < this.route_accuracy2;
    };

    MapRoute.prototype.activate = function (target_point) {
        //console.log('MapRoute.prototype.activate');
        if (this.equals_target_point(target_point)) {
            // Проверить, если вкладка не активна, и до точки недалеко, то взять следующую точку
            if (!window_focused && this.need_next_point(this.car.getCurrentCoord(clock.getCurrentTime())))
                this.get_next_point();
            return;
        }
        this.clear_points();
        this.add_point(target_point, true);
    };

    MapRoute.prototype.clear_points = function () {
        //console.log('MapRoute.prototype.clear_points');
        this.points = [];
        this.get_next_point();
    };

    MapRoute.prototype.deactivate = function() {
        //console.log('MapRoute.prototype.deactivate', clock.getClientTime(), this.points);
        if (this.points.length == 0 || window_focused)
            this.clear_points();
        else
            if (this.need_next_point(this.car.getCurrentCoord(clock.getCurrentTime())))
                this.get_next_point();
    };

    MapRoute.prototype.add_point = function(point, not_send_to_server) {
        //console.log("MapRoute.prototype.add_point", point);
        // не учитывать, если клик был рядом с последней точкой (или с любой, тогда заменять, например)
        var last_p = this.points && this.points[this.points.length - 1];

        if (!last_p)
            this.points.push(point);
        else {
            if (distancePoints2(last_p, point) < this.route_accuracy2) {
                this.points[this.points.length - 1] = point;
                if (this.points.length == 1)
                    this.target_point = this.points[0];
            }
            else
                this.points.push(point);
        }

        audioManager.play({name: "path_setting", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});

        if (! this.target_point) this.get_next_point(not_send_to_server);
    };


    MapRoute.prototype.delFromVisualManager = function () {
        //console.log('WCanvasTargetPoint.prototype.delFromVisualManager');
        this.deactivate();
        this.car = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return MapRoute;
})(VisualObject);