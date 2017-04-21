/*
 * ������ ��� �������� ������ ���������� ���������������� �������
 * ������ ��������� �� �����, ������� ������ �� ���� ��������� � map_manager
 * ��� ����, ����� �� ���� ����� ��������� (�������� � ���������)
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


        // ��������� ����������
        var tp_ctx = mulScalVector(subVector(this.target_point, this.car.getCurrentCoord(time)), 1.0 / mapCanvasManager.zoom_koeff);
        if (tp_ctx.abs() > 10.0) { // ���� ������ 10 ��������, �� ������ �� ����������
            ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);

            ctx.strokeStyle = 'rgba(0, 255, 84, 0.2)';
            ctx.lineCap = 'round';
            ctx.setLineDash([8, 5]);
            ctx.lineWidth = 2;
            // ����� ����� �� �������� �� �������
            tp_ctx = summVector(tp_ctx, normVector(tp_ctx, -10));
            // ��������� �����
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
        // ���� ������ ����� �� ��������, �� �����
        if (this.equals_target_points(target_point))
            return;
        audioManager.play({name: "error_1", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
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
