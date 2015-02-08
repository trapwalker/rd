/*
 * Виджет тряски
 *      - дивы с позицией fixed/absolute должны быть предворительно "обернуты" в дивы с позицией fixed/absolute)))
 */

var ConstRumbleDx = 1;      // Смещение при тряске по оси X
var ConstRumbleDy = 1;      // Смещение при тряске по оси Y
var ConstRumbleRotate = 0;  // Вращение при тряске
var ConstRumbleSpeed = 75;   // Скорость (интенсивность) тряски (чем больше значение тем меньше интенсивность)


var WRumble = (function (_super) {
    __extends(WRumble, _super);

    function WRumble(car) {
        _super.call(this, [car]);
        this.car = car;

        // Дивы которые надо трясти
        this.startRumble = false;
        this.rumbleDivs = [];
        // todo: сделать возможность добавлять/удалять их динамически
        this.rumbleDivs.push($('#zoomSetDivForZoomSliderRumble'));
        this.rumbleDivs.push($('#divScaleCarHealthRumble'));
        this.rumbleDivs.push($('#speedSetDivForSpeedSliderRumble'));
        for (var div_key in this.rumbleDivs)
            this.rumbleDivs[div_key].jrumble({
                x: ConstRumbleDx,
                y: ConstRumbleDy,
                rotation: ConstRumbleRotate,
                speed: ConstRumbleSpeed
            });
        this.change(clock.getCurrentTime());
    }

    WRumble.prototype.change = function (t) {
        //console.log('WRumble.prototype.change');
        if (this.car._hp_state.dps) {
            if (!this.startRumble) {
                // Вкл
                for (var div_key in this.rumbleDivs)
                    this.rumbleDivs[div_key].trigger('startRumble')
                this.startRumble = true;
            }
        }
        else if (this.startRumble) {
            for (var div_key in this.rumbleDivs)
                this.rumbleDivs[div_key].trigger('stopRumble')
            this.startRumble = false;
        }
    };

    WRumble.prototype.delFromVisualManager = function () {
        //console.log('WRumble.prototype.delFromVisualManager');
        this.car = null;
        if (this.startRumble)
            for (var div_key in this.rumbleDivs)
                this.rumbleDivs[div_key].trigger('stopRumble')
        _super.prototype.delFromVisualManager.call(this);
    };

    return WRumble;
})(VisualObject);