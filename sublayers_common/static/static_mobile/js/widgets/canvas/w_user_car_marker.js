var ConstMaxLengthToMoveMarker = 2;
var ConstMaxAngleToMoveMarker = Math.PI / 90.;


var WCanvasCarMarker = (function (_super) {
    __extends(WCanvasCarMarker, _super);

    function WCanvasCarMarker(car) {
        _super.call(this, [car]);
        this.car = car;

        this.icon_obj = null;
        this.icon_arrow_obj = null;

        this.updateIcon();

        mapCanvasManager.add_vobj(this, 11);

        var time = clock.getCurrentTime();
        this.last_position = this.car.getCurrentCoord(time);  // experimental
        this.last_direction = this.car.getCurrentDirection(time) + Math.PI / 2.;  // experimental
        this.last_direction_arrow = this.last_direction;

        this._last_car_ctx_pos = new Point(-100, -100); // нужно для кеширования при расчёте теста мышки
    }

    WCanvasCarMarker.prototype.mouse_test = function(time) {
        //console.log('WCanvasCarMarker.prototype.mouse_test');
        var distance = distancePoints2(this._last_car_ctx_pos, mapCanvasManager._mouse_client);
        var icon_size = this.icon_obj.iconSize[1] >> 2;
        icon_size *= icon_size;
        if (distance < icon_size)
            return true;
    };

    WCanvasCarMarker.prototype.click_handler = function(event) {  };

    WCanvasCarMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasCarMarker.prototype.redraw');
        ctx.save();
        if (this.car == user.userCar) {
            ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
            //ctx.translate(mapManager.max_size >> 1, mapManager.max_size >> 1);
            this._last_car_ctx_pos = mapCanvasManager.cur_ctx_car_pos
        }
        else {
            var car_pos_real = this.car.getCurrentCoord(time);
            var car_pos;

            var diff_vec = subVector(car_pos_real, this.last_position);
            var diff_vec_abs = diff_vec.abs();
            if (diff_vec_abs > ConstMaxLengthToMoveMarker) {  // Если больше заданного максимального расстояния, то подвинуть по направлению на максимальное расстояние
                car_pos = summVector(this.last_position, mulScalVector(diff_vec, ConstMaxLengthToMoveMarker / diff_vec_abs))
            }
            else {
                car_pos = car_pos_real;
            }
            this.last_position = car_pos;
            var ctx_car_pos = mulScalVector(subVector(car_pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
            ctx.translate(ctx_car_pos.x, ctx_car_pos.y);
            this._last_car_ctx_pos = ctx_car_pos;
        }

        var car_direction_real = this.car.getCurrentDirection(time) - Math.PI / 2.;
        var car_direction = car_direction_real;
        //var diff_angle_direction = car_direction_real - this.last_direction;
        //if (Math.abs(diff_angle_direction) > ConstMaxAngleToMoveMarker && Math.abs(diff_angle_direction_arrow) < Math.PI / 2.) {
        //    //car_direction = this.last_direction + ConstMaxAngleToMoveMarker * (diff_angle_direction > 0 ? 1 : -1);
        //    car_direction = this.last_direction + ConstMaxAngleToMoveMarker * (diff_angle_direction / 3.);
        //}
        //else {
        //    car_direction = car_direction_real;
        //}
        this.last_direction = car_direction;

        ctx.save(); // для возврата от поворота
        ctx.rotate(car_direction);
        //ctx.scale(1. / mapCanvasManager.zoom_koeff, 1. / mapCanvasManager.zoom_koeff);
        ctx.drawImage(this.icon_obj.img, -this.icon_obj.iconSize[0] >> 1, -this.icon_obj.iconSize[1] >> 1);
        ctx.restore(); // Возврат после поворота

        ctx.restore();  // Возврат транслейта
    };

    WCanvasCarMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasCarMarker.prototype.delFromVisualManager');
        this.car = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasCarMarker.prototype.updateIcon = function() {
        if (this.car == user.userCar)
            this.icon_obj = iconsLeaflet.getIcon('icon_party_car', 'canvas_icon');
        else
            this.icon_obj = iconsLeaflet.getIcon('icon_neutral_car', 'canvas_icon');
    };

    return WCanvasCarMarker;
})(VisualObject);