/*
 * Виджет для отрисовки области видимости машинки
 * todo: Виджет должен исчезать перед зумом и появляться после!
 * todo: Когда-нибудь сделать, если нам этот виджет будет нужен не только для отладки
 */


var WObservingRange = (function (_super) {
    __extends(WObservingRange, _super);

    function WObservingRange() {
        _super.call(this, []);
        mapCanvasManager.add_vobj(this, 100);
    }

    WObservingRange.prototype.redraw = function(ctx, time){
        //console.log('WObservingRange.prototype.change');
        //return;
        var zoom_koeff = mapCanvasManager.zoom_koeff;
        var real_zoom = mapCanvasManager.real_zoom;
        var map_tl = mapCanvasManager.map_tl;
        ctx.save();

        if (real_zoom <= 14) return;
        if (real_zoom < 15) ctx.globalAlpha = 1 - (15.0 - mapCanvasManager.real_zoom);

        for (var i = 0; i < this._model_objects.length; i++) {
            var car = this._model_objects[i];
            var car_pos = car.getCurrentCoord(time);  // положение машинки
            var outher_radius = car.getObservingRange(time) / zoom_koeff;
            var car_ctx_pos = mulScalVector(subVector(car_pos, map_tl), 1.0 / zoom_koeff);

            ctx.save();

            ctx.translate(car_ctx_pos.x, car_ctx_pos.y);

            var grad1 = ctx.createRadialGradient(0, 0, 0, 0, 0, outher_radius);
            grad1.addColorStop(0, "rgba(0,0,0,1)");
            grad1.addColorStop(0.65, "rgba(0,0,0,1)");
            grad1.addColorStop(1, "rgba(0,0,0,0)");

            ctx.fillStyle = grad1;
            ctx.beginPath();
            ctx.arc(0, 0, outher_radius, 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        ctx.globalCompositeOperation = "xor";
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        var a = mapManager.getMapSize();
        ctx.fillRect(0, 0, a.x, a.y);
        ctx.restore();
    };

    WObservingRange.prototype.delFromVisualManager = function () {
        //console.trace('WObservingRange.prototype.delFromVisualManager');
        //mapCanvasManager.del_vobj(this);
        //_super.prototype.delFromVisualManager.call(this);
        //wObservingRange = null;
    };

    WObservingRange.prototype.in_observing_range = function (position) {
        var time = clock.getCurrentTime();
        for (var i = 0; i < this._model_objects.length; i++) {
            var car = this._model_objects[i];
            var car_pos = car.getCurrentCoord(time);
            var observing_range = car.getObservingRange(time);
            if (observing_range * observing_range > distancePoints2(car_pos, position))
                return true;
        }
        return false;
    };

    return WObservingRange;
})(VisualObject);

var wObservingRange;
