/*
 * ������ ��� ��������� ������� ��������� �������
 * todo: ������ ������ �������� ����� ����� � ���������� �����!
 * todo: �����-������ �������, ���� ��� ���� ������ ����� ����� �� ������ ��� �������
 */


var WObservingRange = (function (_super) {
    __extends(WObservingRange, _super);

    function WObservingRange(car) {
        _super.call(this, [car]);
        this.car = car;
        this.lastZoom = 1;
        this.old_position = {x: 0, y: 0};
        mapCanvasManager.add_vobj(this);
    }

    WObservingRange.prototype._calcRadius = function(){
        return this.r / Math.pow(2., (map.getMaxZoom() - map.getZoom()));
    };

    WObservingRange.prototype.redraw = function(ctx, time){
        //console.log('WObservingRange.prototype.change');
        // todo: ������ ����� ��������. ������ ����������� ��� � �������, ����� !!! ���� �������� state ��� �������

        var car_pos = this.car.getCurrentCoord(time);  // ��������� �������
        var real_zoom = mapManager.getRealZoom(time);
        var map_tl = mapManager.getTopLeftCoords(real_zoom);  // ��� ����� ������������� 0,0 �� �������
        var zoom_koeff =  Math.pow(2., (ConstMaxMapZoom - real_zoom));
        var outher_radius = this.car.getObservingRange(time) / zoom_koeff;
        var inner_radius = 0.2 * outher_radius;

        var car_ctx_pos = mulScalVector(subVector(car_pos, map_tl), 1.0 / zoom_koeff).round();

        var grad1 = ctx.createRadialGradient(car_ctx_pos.x, car_ctx_pos.y, inner_radius, car_ctx_pos.x, car_ctx_pos.y, outher_radius);
        grad1.addColorStop(0, "rgba(0,0,0,1)");
        grad1.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.arc(car_ctx_pos.x, car_ctx_pos.y, outher_radius, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fill();

        ctx.globalCompositeOperation = "xor";
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, 1920, 1080);

        ctx.globalCompositeOperation = "source-over";


        //ctx.fillStyle = 'red';
        //ctx.font="40px Georgia";
        //ctx.fillText(outher_radius, 100, 100);
        //ctx.fillText(this.car.getCurrentSpeed(time), 100, 150);
        //ctx.fillText(outher_radius, 100, 200);
        //ctx.fillText(inner_radius, 100, 250);
    };

    WObservingRange.prototype.delModelObject = function (mobj) {
        //console.log('WViewRadius.prototype.delModelObject');
        if (mobj == this.car) {
            this.delFromVisualManager();
        }
    };

    WObservingRange.prototype.delFromVisualManager = function () {
        //console.log('WViewRadius.prototype.delFromVisualManager');
        this.car = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WObservingRange;
})(VisualObject);
