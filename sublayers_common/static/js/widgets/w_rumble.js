/*
 * Виджет тряски
 *      - дивы с позицией fixed/absolute должны быть предворительно "обернуты" в дивы с позицией fixed/absolute)))
 */

var ConstRumbleAutoDx = 1;      // Смещение при тряске по оси X (автоматический огонь)
var ConstRumbleAutoDy = 1;      // Смещение при тряске по оси Y (автоматический огонь)
var ConstRumbleAutoRotate = 0;  // Вращение при тряске (автоматический огонь)
var ConstRumbleAutoSpeed = 15;  // Интенсивность тряски (чем больше значение тем меньше интенсивность) (автоматический огонь)

var ConstRumbleDischarge = [{
        duration: 50,    // Длительность тряски при попадании из залпового орудия
        dx: 10,          // Смещение при тряске по оси X (залповый огонь)
        dy: 10,          // Смещение при тряске по оси Y (залповый огонь)
        rotate: 0,       // Вращение при тряске (залповый огонь)
        speed: 0         // Интенсивность тряски (чем больше значение тем меньше интенсивность)(залповый огонь)
    }, {
        duration: 200,   // Длительность тряски при попадании из залпового орудия
        dx: 3,           // Смещение при тряске по оси X (залповый огонь)
        dy: 3,           // Смещение при тряске по оси Y (залповый огонь)
        rotate: 0,       // Вращение при тряске (залповый огонь)
        speed: 0         // Интенсивность тряски (чем больше значение тем меньше интенсивность)(залповый огонь)
    }, {
        duration: 200,   // Длительность тряски при попадании из залпового орудия
        dx: 2,           // Смещение при тряске по оси X (залповый огонь)
        dy: 2,           // Смещение при тряске по оси Y (залповый огонь)
        rotate: 0,       // Вращение при тряске (залповый огонь)
        speed: 0         // Интенсивность тряски (чем больше значение тем меньше интенсивность)(залповый огонь)
    }, {
        duration: 200,   // Длительность тряски при попадании из залпового орудия
        dx: 1,           // Смещение при тряске по оси X (залповый огонь)
        dy: 1,           // Смещение при тряске по оси Y (залповый огонь)
        rotate: 0,       // Вращение при тряске (залповый огонь)
        speed: 0         // Интенсивность тряски (чем больше значение тем меньше интенсивность)(залповый огонь)
    }
];

var WRumble = (function (_super) {
    __extends(WRumble, _super);

    function WRumble(car) {
        _super.call(this, [car]);
        this.car = car;
        // Дивы которые надо трясти
        this.isStartAutoRumble = false;
        this.isStartDischargeRumble = false;
        this.discharge_stage = 0;
        this.rumbleDivs = [];
        // todo: сделать возможность добавлять/удалять их динамически

        this.rumbleDivs.push($('#zoomControlRumble'));
        this.rumbleDivs.push($('#cruiseControlRumble'));
        this.rumbleDivs.push($('#chatControlRumble'));
        this.rumbleDivs.push($('#fireControlRumble'));
        this.rumbleDivs.push($('#map2'));

        //this.rumbleDivs.push($('#allControlRumble'));

        for (var div_key in this.rumbleDivs)
            this.rumbleDivs[div_key].jrumble();
        this.change(clock.getCurrentTime());
    }

    WRumble.prototype._startAutoRumble = function () {
        if (!settingsManager.options.rumble.currentValue) return;
        for (var div_key in this.rumbleDivs) {
            this.rumbleDivs[div_key].get(0).rumble_x = ConstRumbleAutoDx;
            this.rumbleDivs[div_key].get(0).rumble_y = ConstRumbleAutoDy;
            this.rumbleDivs[div_key].get(0).rumble_rot = ConstRumbleAutoRotate;
            this.rumbleDivs[div_key].get(0).rumble_speed = ConstRumbleAutoSpeed;
            this.rumbleDivs[div_key].trigger('startRumble');
        }
    };

    WRumble.prototype._startDischargeRumble = function (rumble_x, rumble_y, rumble_rotate, rumble_speed) {
        //console.log(rumble_x, rumble_y, rumble_rotate, rumble_speed);
        for (var div_key in this.rumbleDivs) {
            this.rumbleDivs[div_key].get(0).rumble_x = rumble_x;
            this.rumbleDivs[div_key].get(0).rumble_y = rumble_y;
            this.rumbleDivs[div_key].get(0).rumble_rot = rumble_rotate;
            this.rumbleDivs[div_key].get(0).rumble_speed = rumble_speed;
            this.rumbleDivs[div_key].trigger('startRumble');
        }
    };

    WRumble.prototype._stopAnyRumble = function () {
        for (var div_key in this.rumbleDivs)
            this.rumbleDivs[div_key].trigger('stopRumble')
    };

    WRumble.prototype.startDischargeRumble = function () {
        //console.log('WRumble.prototype.startDischargeRumble');
        if (!settingsManager.options.rumble.currentValue) return;
        if (this.isStartDischargeRumble) return;
        this.isStartDischargeRumble = true;
        this.discharge_stage = 0;
        this._makeDischargeRumble()
    };

    WRumble.prototype._makeDischargeRumble = function () {
        //console.log('WRumble.prototype._makeDischargeRumble', this.discharge_stage);
        var rumble = ConstRumbleDischarge[this.discharge_stage];
        this._stopAnyRumble();
        this._startDischargeRumble(rumble.dx, rumble.dy, rumble.rotate, rumble.speed);
        this.discharge_stage++;
        if (this.discharge_stage < ConstRumbleDischarge.length)
            timeManager.addTimeoutEvent(this, '_makeDischargeRumble', rumble.duration);
        else
            timeManager.addTimeoutEvent(this, 'finishDischargeRumble', rumble.duration);
    };

    WRumble.prototype.finishDischargeRumble = function () {
        //console.log('WRumble.prototype.finishDischargeRumble');
        this.isStartDischargeRumble = false;
        if (this.isStartAutoRumble) this._startAutoRumble();
        else this._stopAnyRumble();
    };

    WRumble.prototype.change = function (t) {
        return;
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

var wRumble;

