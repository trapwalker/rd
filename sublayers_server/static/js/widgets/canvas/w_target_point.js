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

        // ����� �� ��� ��������
        this.old_map_size = new Point(0, 0);
        this.old_ctx_car_pos = new Point(0, 0);

        mapCanvasManager.add_vobj(this, 20);
    }


    WCanvasTargetPoint.prototype.redraw = function(ctx, time){
        //console.log('WCanvasTargetPoint.prototype.redraw');
        if (! this.target_point) return;

        ctx.save();

        var real_zoom = mapManager.getRealZoom(time);
        var zoom_koeff = Math.pow(2., (ConstMaxMapZoom - real_zoom));
        var map_tl = mapManager.getTopLeftCoords(real_zoom);  // ��� ����� ������������� 0,0 �� �������

        var map_size = mapManager.getMapSize();

        if (subVector(map_size, this.old_map_size).abs() > 0.2 || map.dragging._enabled) {
            var car_pos = this.car.getCurrentCoord(time);
            var car_ctx_pos = mulScalVector(subVector(car_pos, map_tl), 1.0 / zoom_koeff);

            this.old_map_size = map_size;
            this.old_ctx_car_pos = car_ctx_pos;
        }

        // ��������� ����������
        var tp_ctx = mulScalVector(subVector(this.target_point, this.car.getCurrentCoord(time)), 1.0 / zoom_koeff);
        if (tp_ctx.abs() > 10.0) { // ���� ������ 10 ��������, �� ������ �� ����������
            ctx.translate(this.old_ctx_car_pos.x, this.old_ctx_car_pos.y);

            ctx.strokeStyle = 'rgba(0, 255, 84, 0.2)';
            ctx.lineCap = 'round';
            ctx.setLineDash([8, 5]);
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(tp_ctx.x, tp_ctx.y);
            ctx.lineTo(0, 0);
            ctx.stroke();
        }

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
