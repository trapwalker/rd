/*
 * Виджет тряски
 *      - дивы с позицией fixed/absolute должны быть предворительно "обернуты" в дивы с позицией fixed/absolute)))
 */

var ConstRumbleAutoDx = 1;      // Смещение при тряске по оси X (автоматический огонь)
var ConstRumbleAutoDy = 1;      // Смещение при тряске по оси Y (автоматический огонь)
var ConstRumbleAutoRotate = 0;  // Вращение при тряске (автоматический огонь)
var ConstRumbleAutoSpeed = 15;  // Интенсивность тряски (чем больше значение тем меньше интенсивность) (автоматический огонь)

var ConstDurationRumbleDischarge = 250;  // Длительность тряски при попадании из залпового орудия
var ConstRumbleDischargeDx =10;          // Смещение при тряске по оси X (залповый огонь)
var ConstRumbleDischargeDy = 10;          // Смещение при тряске по оси Y (залповый огонь)
var ConstRumbleDischargeRotate = 1;      // Вращение при тряске (залповый огонь)
var ConstRumbleDischargeSpeed = 15;      // Интенсивность тряски (чем больше значение тем меньше интенсивность)(залповый огонь)

var WRumble = (function (_super) {
    __extends(WRumble, _super);

    function WRumble(car) {
        _super.call(this, [car]);
        this.car = car;
        // Дивы которые надо трясти
        this.isStartAutoRumble = false;
        this.isStartDischargeRumble = false;
        this.rumbleDivs = [];
        // todo: сделать возможность добавлять/удалять их динамически
        this.rumbleDivs.push($('#zoomSetDivForZoomSliderRumble'));
        this.rumbleDivs.push($('#divScaleCarHealthRumble'));
        this.rumbleDivs.push($('#speedSetDivForSpeedSliderRumble'));
        for (var div_key in this.rumbleDivs)
            this.rumbleDivs[div_key].jrumble();
        this.change(clock.getCurrentTime());
    }

    WRumble.prototype._startAutoRumble = function () {
        for (var div_key in this.rumbleDivs) {
            this.rumbleDivs[div_key].get(0).rumble_x = ConstRumbleAutoDx;
            this.rumbleDivs[div_key].get(0).rumble_y = ConstRumbleAutoDy;
            this.rumbleDivs[div_key].get(0).rumble_rot = ConstRumbleAutoRotate;
            this.rumbleDivs[div_key].get(0).rumble_speed = ConstRumbleAutoSpeed;
            this.rumbleDivs[div_key].trigger('startRumble');
        }
    };

    WRumble.prototype._startDischargeRumble = function () {
        for (var div_key in this.rumbleDivs) {
            this.rumbleDivs[div_key].get(0).rumble_x = ConstRumbleDischargeDx;
            this.rumbleDivs[div_key].get(0).rumble_y = ConstRumbleDischargeDy;
            this.rumbleDivs[div_key].get(0).rumble_rot = ConstRumbleDischargeRotate;
            this.rumbleDivs[div_key].get(0).rumble_speed = ConstRumbleDischargeSpeed;
            this.rumbleDivs[div_key].trigger('startRumble');
        }
    };

    WRumble.prototype._stopAnyRumble = function () {
        for (var div_key in this.rumbleDivs)
            this.rumbleDivs[div_key].trigger('stopRumble')
    };

    WRumble.prototype.startDischargeRumble = function () {
        //console.log('WRumble.prototype.startDischargeRumble');
        this.isStartDischargeRumble = true;
        this._startDischargeRumble();
        timeManager.addTimeoutEvent(this, 'finishDischargeRumble', ConstDurationRumbleDischarge);
    };

    WRumble.prototype.finishDischargeRumble = function () {
        //console.log('WRumble.prototype.finishDischargeRumble');
        this.isStartDischargeRumble = false;
        if (this.isStartAutoRumble) this._startAutoRumble();
        else this._stopAnyRumble();
    };

    WRumble.prototype.change = function (t) {
        //console.log('WRumble.prototype.change');
        if (this.car._hp_state.dps) {
            if (!this.isStartAutoRumble && !this.isStartDischargeRumble) this._startAutoRumble();
            this.isStartAutoRumble = true;
        }
        else {
            if (this.isStartAutoRumble && !this.isStartDischargeRumble) this._stopAnyRumble();
            this.isStartAutoRumble = false;
        }
    };

    WRumble.prototype.delFromVisualManager = function () {
        //console.log('WRumble.prototype.delFromVisualManager');
        this.car = null;
        this._stopAnyRumble();
        _super.prototype.delFromVisualManager.call(this);
    };

    return WRumble;
})(VisualObject);