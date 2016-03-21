var WCanvasUserCarMarker = (function (_super) {
    __extends(WCanvasUserCarMarker, _super);

    function WCanvasUserCarMarker(car) {
        _super.call(this, [car]);
        this.car = car;

        this.icon_id = 5; // todo: временно так. Дать нормальный алиасинг (текстовое имя)

        this.icon_obj = iconsLeaflet.getIconByID(this.icon_id, 'canvas_icon');

        mapCanvasManager.add_vobj(this, 11);
    }


    WCanvasUserCarMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasUserCarMarker.prototype.redraw');
        ctx.save();

        ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
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

