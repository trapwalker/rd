var ConstPeriodOfPhase = 10; // Время полного оборота линии радара
var ConstLineRadarLength = 75000; // Длинна линии радара на 14 зуме // todo: прислать с сервера


var WStrategyModeManager = (function () {
    function WStrategyModeManager() {
        mapCanvasManager.add_vobj(this, 80);
        this.targets = [];  // Список точек для отображения в стратегическом режиме
        this.start_time = 0;
        this._radial_speed = 2 * Math.PI / ConstPeriodOfPhase;
        this.radar_radius = ConstLineRadarLength;
        this.radar_width = 0.8;  // половина ширины радара

        this.radar_width_point_opacity = 1.75 * Math.PI;

        this.icon_strategy_car = null;
    }

    WStrategyModeManager.prototype.update = function (targets) {
        //console.log('WStrategyModeManager.prototype.update', targets);
        this.targets = targets;
    };

    WStrategyModeManager.prototype.getRadarLineDirection = function(time){
        return normalizeAngleRad2((time - this.start_time) * this._radial_speed);
    };

    WStrategyModeManager.prototype.redraw = function(ctx, time){
        //console.log('WStrategyModeManager.prototype.redraw');

        if (mapCanvasManager.real_zoom >= 14) return;

        if (! user.userCar) return;

        ctx.save();

        var alpha = 1;
        if(mapCanvasManager.real_zoom > 13) alpha = 14.0 - mapCanvasManager.real_zoom;

        var map_top_left = mapCanvasManager.map_tl;
        var radar_direction = this.getRadarLineDirection(time);
        var radar_fake_dir = radar_direction + this.radar_width;
        var car_pos = user.userCar.getCurrentCoord(time);

        // Отрисовка линии радара
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var grad1 = ctx.createLinearGradient(500, 500, 500, 0 );  // todo: должен зависеть от радиуса
        grad1.addColorStop(0, "rgba(0, 0, 0, " + alpha + ")");
        grad1.addColorStop(1, "rgba(0, 0, 0, 0)");
        var grad2 = ctx.createLinearGradient(1000, 1000, 1000, 0);
        grad2.addColorStop(0, "rgba(0, 255, 161, " + alpha * 0.5 + ")");
        grad2.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.restore();

        ctx.save();
        ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
        ctx.rotate(radar_direction);
        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc( 0, 0, this.radar_radius / mapCanvasManager.zoom_koeff, -this.radar_width, this.radar_width, false);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Чёрное полотно для вырезания круга обзора
        ctx.save();
        ctx.globalCompositeOperation = "xor";
        //ctx.fillStyle = 'rgba(3, 15, 0, 0.97)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.93)';
        var a = mapManager.getMapSize();
        ctx.fillRect(0, 0, a.x, a.y);
        ctx.restore();

        ctx.save();
        ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
        ctx.rotate(radar_direction);
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc( 0, 0, this.radar_radius / mapCanvasManager.zoom_koeff, -this.radar_width, this.radar_width, false);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();  // Возврат транслейта

        // Отрисовка точек - новый вариант
        if (this.icon_strategy_car) {
            ctx.save();
            ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
            for (var i = 0; i < this.targets.length; i++) {
                var p = mulScalVector(subVector(this.targets[i], car_pos), 1.0 / mapCanvasManager.zoom_koeff);
                // todo: не рисовать точки, которые заведомо никак не попадут на канвас
                var angle_p = angleVectorRadCCW2(p);
                var angle_diff = normalizeAngleRad2(radar_fake_dir - angle_p);
                var opacity = 0;
                if (angle_diff < this.radar_width_point_opacity)
                    opacity = Math.abs(1.0 - angle_diff / this.radar_width_point_opacity);

                if (opacity > 1.0 || opacity < 0.0) {console.log('что-то не то'); opacity = 0.1}

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.globalAlpha = opacity;
                ctx.drawImage(this.icon_strategy_car.img, -this.icon_strategy_car.iconSize[0] >> 1, -this.icon_strategy_car.iconSize[1] >> 1);
                ctx.restore();
            }
            ctx.restore();
        }
        else {
            this.icon_strategy_car = iconsLeaflet.getIcon('icon_strategy_mode_car');
        }
    };

    return WStrategyModeManager;
})();


var wStrategyModeManager;
