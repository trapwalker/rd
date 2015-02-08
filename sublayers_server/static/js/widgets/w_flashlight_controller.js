/*
 * Виджет для регулировки взрывов вокруг машинки
 *      - плотность вспышек зависит от dps
 *      - размер вспышек от типа дамага (dhp)
 */

var ConstCountFlashlightOnHP = 0.2;  // Количество вспышек на 1 HP
var ConstDispersionFlashlight = 50; // Разброс вспышек вокруг машинки
var ConstRadiusFlashlight = 3;      // Радиус вспышки


var WFlashlightController = (function (_super) {
    __extends(WFlashlightController, _super);

    function WFlashlightController(car) {
        _super.call(this, [car]);
        this.car = car;
        this.hp = car.getCurrentHP(clock.getCurrentTime());
        this.change(clock.getCurrentTime());
        this.dhp = 1. / ConstCountFlashlightOnHP;
    }

    WFlashlightController.prototype.change = function (t) {
        //console.log('WFlashlightController.prototype.change');
        if (map.getMaxZoom() - map.getZoom() <= 2) {
            var time = clock.getCurrentTime();
            var cur_hp = this.car.getCurrentHP(time);
            if (this.hp - cur_hp > this.dhp) {
                var coord = this.car.getCurrentCoord(time);
                var r_x = Math.random() * ConstDispersionFlashlight - ConstDispersionFlashlight / 2.;
                var r_y = Math.random() * ConstDispersionFlashlight - ConstDispersionFlashlight / 2.;
                new EFlashLight(new Point(coord.x + r_x, coord.y + r_y), ConstRadiusFlashlight).start();
                this.hp = cur_hp;
            }
        }
    };

    WFlashlightController.prototype.delFromVisualManager = function () {
        //console.log('WFlashlightController.prototype.delFromVisualManager');
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WFlashlightController;
})(VisualObject);