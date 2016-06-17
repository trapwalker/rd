var WCanvasUserCarMarker = (function (_super) {
    __extends(WCanvasUserCarMarker, _super);

    function WCanvasUserCarMarker(car) {
        _super.call(this, [car]);
        this.car = car;

        this.icon_obj = null;
        this.icon_arrow_obj = null;

        this.updateIcon();

        mapCanvasManager.add_vobj(this, 11);
    }


    WCanvasUserCarMarker.prototype.redraw = function(ctx, time){
        //console.log('WCanvasUserCarMarker.prototype.redraw');
        ctx.save();
        if (this.car == user.userCar)
            ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
        else {
            var car_pos = this.car.getCurrentCoord(time);
            var ctx_car_pos = mulScalVector(subVector(car_pos, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
            ctx.translate(ctx_car_pos.x, ctx_car_pos.y);
        }

        var car_direction = this.car.getCurrentDirection(time) + Math.PI / 2.;
        // Отображение иконки
        ctx.save(); // для возврата от поворота
        ctx.rotate(car_direction);
        //ctx.scale(1. / mapCanvasManager.zoom_koeff, 1. / mapCanvasManager.zoom_koeff);
        ctx.drawImage(this.icon_obj.img, -this.icon_obj.iconSize[0] >> 1, -this.icon_obj.iconSize[1] >> 1);
        ctx.restore(); // Возврат после поворота

        // Отображение стрелки иконки
        if (this.icon_arrow_obj) {
            ctx.save(); // для возврата от поворота
            var speed_angle = this.car.getCurrentSpeed(time) >= 0 ? 0 : Math.PI;
            var car_direction_arrow = this.car.getCurrentDirection(time + 0.5) + Math.PI / 2. + speed_angle;
            ctx.rotate(car_direction_arrow);
            ctx.drawImage(this.icon_arrow_obj.img, -this.icon_arrow_obj.iconSize[0] >> 1, -this.icon_arrow_obj.iconSize[1] >> 1);
            ctx.restore(); // Возврат после поворота
        }

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



    WCanvasUserCarMarker.prototype.updateIcon = function() {
        var car = this.car;
        var icon_type = 'neutral';
        var icon_name = 'car';

        if (car.owner)
            if (user.party && car.owner.party)
                if (car.owner.party.name == user.party.name)
                    icon_type = 'party';
        // Если своя машинка, но при этом ты в пати
        if (car == user.userCar && user.party) {
            icon_type = 'party';
        }

        // todo: узнать подкласс машинки

        this.icon_obj = iconsLeaflet.getIcon('icon_' + icon_type + '_' + icon_name, 'canvas_icon');
        this.icon_arrow_obj = iconsLeaflet.getIcon('icon_' + icon_type + '_arrow', 'canvas_icon');
    };

    return WCanvasUserCarMarker;
})(VisualObject);

