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
