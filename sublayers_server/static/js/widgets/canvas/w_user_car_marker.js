var WCanvasUserCarMarker = (function (_super) {
    __extends(WCanvasUserCarMarker, _super);

    function WCanvasUserCarMarker(car) {
        _super.call(this, [car]);
        this.car = car;

        // чтобы не так дёргалось
        this.old_map_size = new Point(0, 0);
        this.old_ctx_car_pos = new Point(0, 0);
        this.icon_id = 5; // todo: временно так. Дать нормальный алиасинг (текстовое имя)

        this.icon_obj = iconsLeaflet.getIconByID(this.icon_id, 'canvas_icon');

        mapCanvasManager.add_vobj(this, 11);
    }


    WCanvasUserCarMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasUserCarMarker.prototype.redraw');
        ctx.save();

        var real_zoom = mapManager.getRealZoom(time);
        var zoom_koeff = Math.pow(2., (ConstMaxMapZoom - real_zoom));

        var map_size = mapManager.getMapSize();

        if (subVector(map_size, this.old_map_size).abs() > 0.2 || map.dragging._enabled) {
            var car_pos = this.car.getCurrentCoord(time);
            var map_tl = mapManager.getTopLeftCoords(real_zoom);  // Эта точка соответствует 0,0 на канвасе
            var car_ctx_pos = mulScalVector(subVector(car_pos, map_tl), 1.0 / zoom_koeff);

            this.old_map_size = map_size;
            this.old_ctx_car_pos = car_ctx_pos;
        }


        ctx.translate(this.old_ctx_car_pos.x, this.old_ctx_car_pos.y);

        ctx.save(); // для возврата от поворота
        ctx.rotate(this.car.getCurrentDirection(time));

        ctx.drawImage(this.icon_obj.img, -this.icon_obj.iconSize[0] >> 1, -this.icon_obj.iconSize[1] >> 1);

        ctx.restore(); // Возврат после поворота

        // Вывод лейбла
        if (this.car.owner || this.car == user.userCar) {
            var owner = this.car.owner || user;
            var party_str = "";
            if (owner.party != null) party_str = '[' + owner.party.name + ']';
            var label_str = owner.login + party_str;
            ctx.textAlign = "center";
            ctx.textBaseline = "center";
            ctx.font = "8pt MICRADI";
            ctx.fillStyle = 'rgba(42, 253, 10, 0.6)';
            //ctx.fillText(label_str, 0, this.old_ctx_car_pos.y - ((this.old_ctx_car_pos.y >> 1) << 1) - 15.0);
            ctx.fillText(label_str, 0, -15);
        }

        ctx.restore();  // Возврат транслейта
    };


    WCanvasUserCarMarker.prototype.delFromVisualManager = function () {
        //console.log('WCanvasUserCarMarker.prototype.delFromVisualManager');
        this.car = null;
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCanvasUserCarMarker;
})(VisualObject);


var userCarMarkerImg = new Image('/static/img/n1.png');

