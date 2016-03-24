var ConstPeriodOfPhase = 10; // Время полного оборота линии радара
var ConstLineRadarLength = 50000; // Длинна линии радара на 14 зуме // todo: прислать с сервера


var WStrategyModeManager = (function () {
    function WStrategyModeManager() {
        mapCanvasManager.add_vobj(this, 80);
        this.targets = [];  // Список точек для отображения в стратегическом режиме
        this.start_time = 0;
        this._radial_speed = 2 * Math.PI / ConstPeriodOfPhase;
        this.radar_radius = ConstLineRadarLength;
    }

    WStrategyModeManager.prototype.update = function (targets) {
        //console.log('WStrategyModeManager.prototype.update');
        this.targets = targets;
    };

    WStrategyModeManager.prototype.getRadarLineDirection = function(time){
        return normalizeAngleRad2((time - this.start_time) * this._radial_speed);
    };

    WStrategyModeManager.prototype.redraw = function(ctx, time){
        //console.log('WStrategyModeManager.prototype.redraw');
        if (mapCanvasManager.real_zoom >= 15) return;

        if (! user.userCar) return;

        ctx.save();

        if(mapCanvasManager.real_zoom > 14) {
            ctx.globalAlpha = 15.0 - mapCanvasManager.real_zoom;
        }
        var map_top_left = mapCanvasManager.map_tl;


        // вырезать круг обзора
        ctx.save();
        ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
        //ctx.globalCompositeOperation = "destination-out";
        var grad1 = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radar_radius / mapCanvasManager.zoom_koeff);
        grad1.addColorStop(0, "rgba(0,0,0,1)");
        grad1.addColorStop(0.65, "rgba(0,0,0,1)");
        grad1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.arc(0, 0, this.radar_radius / mapCanvasManager.zoom_koeff, 2 * Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.restore();


        // Шум и чёрное полотно
        ctx.save();
        ctx.globalCompositeOperation = "xor";
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = ctx.createPattern(img[Math.round(Math.random() * 3)], "repeat");
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.restore();



        ctx.fillStyle = '#00ff00';
        // Отрисовка точек
        for (var i = 0; i < this.targets.length; i++){
            var p = mulScalVector(subVector(this.targets[i], map_top_left), 1.0 / mapCanvasManager.zoom_koeff);
            // todo: не рисовать точки, которые заведомо никак не попадут на канвас
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 2 * Math.PI, 0, false);
            ctx.closePath();
            ctx.fill();
        }

        // Отрисовка линии радара
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y);
        ctx.rotate(this.getRadarLineDirection(time));
        var grad = ctx.createLinearGradient( 500, 500, 500, 0 );  // todo: должен зависеть от радиуса
        grad.addColorStop(0, "rgba(0, 255, 0, 0.4)");
        grad.addColorStop(1, "rgba(0, 255, 0, 0)");

        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc( 0, 0, this.radar_radius / mapCanvasManager.zoom_koeff, -0.8, 0.8, false);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Затемняющий круг
        var grad2 = ctx.createRadialGradient(mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y, 0,
            mapCanvasManager.cur_ctx_car_pos.x, mapCanvasManager.cur_ctx_car_pos.y, 2 * this.radar_radius / mapCanvasManager.zoom_koeff);
        grad2.addColorStop(0, "rgba(0,0,0,0)");
        grad2.addColorStop(0.37, "rgba(0,0,0,0)");
        grad2.addColorStop(0.5, "rgba(0,0,0,1)");
        grad2.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = grad2;
        //ctx.beginPath();
        //ctx.moveTo(0, 0);
        //ctx.arc( 0, 0, this.radar_radius / mapCanvasManager.zoom_koeff, 2 * Math.PI, 0, false);
        //ctx.closePath();
        //ctx.fill();
        ctx.fillRect(0, 0, 1920, 1080);





        ctx.restore();  // Возврат транслейта
    };


    return WStrategyModeManager;
})();

var wStrategyModeManager;
