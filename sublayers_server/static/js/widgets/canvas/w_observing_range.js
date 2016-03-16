/*
 * Виджет для отрисовки области видимости машинки
 * todo: Виджет должен исчезать перед зумом и появляться после!
 * todo: Когда-нибудь сделать, если нам этот виджет будет нужен не только для отладки
 */


var WObservingRange = (function (_super) {
    __extends(WObservingRange, _super);

    function WObservingRange(car) {
        _super.call(this, [car]);
        this.lastZoom = 1;
        this.old_position = {x: 0, y: 0};
        mapCanvasManager.add_vobj(this);
    }

    WObservingRange.prototype.redraw = function(ctx, time){
        //console.log('WObservingRange.prototype.change');
        for (var i = 0; i < this._model_objects.length; i++) {
            var car = this._model_objects[i];
            var car_pos =car.getCurrentCoord(time);  // положение машинки
            var real_zoom = mapManager.getRealZoom(time);
            var map_tl = mapManager.getTopLeftCoords(real_zoom);  // Эта точка соответствует 0,0 на канвасе
            var zoom_koeff =  Math.pow(2., (ConstMaxMapZoom - real_zoom));
            var outher_radius = car.getObservingRange(time) / zoom_koeff;

            var car_ctx_pos = mulScalVector(subVector(car_pos, map_tl), 1.0 / zoom_koeff).round();

            var grad1 = ctx.createRadialGradient(car_ctx_pos.x, car_ctx_pos.y, 0, car_ctx_pos.x, car_ctx_pos.y, outher_radius);
            grad1.addColorStop(0, "rgba(0,0,0,1)");
            grad1.addColorStop(0.5, "rgba(0,0,0,1)");
            grad1.addColorStop(1, "rgba(0,0,0,0)");

            ctx.fillStyle = grad1;
            ctx.beginPath();
            ctx.arc(car_ctx_pos.x, car_ctx_pos.y, outher_radius, 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.fill();
        }
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

    WObservingRange.prototype.delFromVisualManager = function () {
        //console.log('WViewRadius.prototype.delFromVisualManager');
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WObservingRange;
})(VisualObject);

var wObservingRange;
