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
        else {
            this.icon_obj = iconsLeaflet.getIcon('icon_neutral_car', 'canvas_icon');
        }
    };

    return WCanvasCarMarker;
})(VisualObject);


var WCanvasStaticObjectMarker = (function (_super) {
    __extends(WCanvasStaticObjectMarker, _super);

    function WCanvasStaticObjectMarker(mobj) {
        _super.call(this, [mobj]);
        this.mobj = mobj;

        this.icon_obj = null;
        this.icon_arrow_obj = null;
        this.icon_offset = {x: 0, y: 0};

        this.updateIcon();

        mapCanvasManager.add_vobj(this, 11);  // todo: Выбрать правильный приоритет

        var time = clock.getCurrentTime();

    }

    WCanvasStaticObjectMarker.prototype.getVisibleState = function () {
        var zoom = 15. - mapCanvasManager.real_zoom;
        if (zoom <= 0) return 0;
        if (zoom > 1.) return 1.;
        return zoom;
    };

    WCanvasStaticObjectMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasCarMarker.prototype.redraw');
        var visible_state = this.getVisibleState();
        if (visible_state == 0) return;
        ctx.save();
        if (visible_state != 1.) {
            ctx.globalAlpha = visible_state;
        }
        var car_pos = this.mobj.getCurrentCoord(time);
        var ctx_car_pos = mulScalVector(subVector(car_pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        ctx.translate(ctx_car_pos.x, ctx_car_pos.y);

        var car_direction = this.mobj.direction;
        ctx.rotate(car_direction);
        //ctx.scale(1. / mapCanvasManager.zoom_koeff, 1. / mapCanvasManager.zoom_koeff);
        ctx.drawImage(this.icon_obj.img, this.icon_offset.x, this.icon_offset.y);

        // Вывод лейбла
        //var title = this.mobj.hasOwnProperty('title') ? this.mobj.title : ('-=' + this.mobj.cls + '=-');
        //ctx.textAlign = "center";
        //ctx.textBaseline = "center";
        //ctx.font = "8pt MICRADI";
        //ctx.fillStyle = 'rgba(42, 253, 10, 0.6)';
        //ctx.fillText(title, 0, -25);

        ctx.restore();  // Возврат транслейта
    };

    WCanvasStaticObjectMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasUserCarMarker.prototype.delFromVisualManager');
        this.mobj = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    WCanvasStaticObjectMarker.prototype.updateIcon = function() {
        var mobj = this.mobj;
        var icon_name = 'car';
        switch (mobj.cls) {
            case 'Town':
                switch (mobj.example.id) {
                    case 'reg://registry/poi/locations/towns/prior':
                        icon_name = 'city_prior';
                        break;
                    case 'reg://registry/poi/locations/towns/whitehill':
                        icon_name = 'city_whitehill';
                        break;
                    default:
                        icon_name = 'city';
                }
                break;
            case 'GasStation':
                icon_name = 'station';
                break;
            default:
                console.log('Не найдена иконка. Установлена стандартная. ', mobj);
                icon_name = 'city';
        }

        this.icon_obj = iconsLeaflet.getIcon('icon_' + icon_name, 'canvas_icon');
        if (mobj.cls == 'Town' || mobj.cls == 'GasStation') {
            this.icon_offset = {x: -this.icon_obj.iconSize[0] >> 1, y: -this.icon_obj.iconSize[0] + 10}
        }
        else {
            this.icon_offset = {x: -this.icon_obj.iconSize[0] >> 1, y: -this.icon_obj.iconSize[1] >> 1}
        }
    };


    return WCanvasStaticObjectMarker;
})(VisualObject);