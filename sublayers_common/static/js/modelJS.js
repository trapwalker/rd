var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() {
        this.constructor = d;
    }
    __.prototype = b.prototype;
    d.prototype = new __();
};


var ClientObject = (function () {
    function ClientObject(ID) {
        this.ID = ID || generator_ID.getID();
        this.addToVisualManager();
    }

    ClientObject.prototype.addToVisualManager = function () {
        visualManager.addModelObject(this);
    };

    ClientObject.prototype.delFromVisualManager = function () {
        timeManager.delObjectFromTimer(this);
        visualManager.delModelObject(this);
    };

    return ClientObject;
})();


var StaticObject = (function (_super) {
    __extends(StaticObject, _super);

    function StaticObject(ID, position, direction) {
        _super.call(this, ID);
        this.position = position;
        if (direction)
            this.direction = direction;
        else
            this.direction = - 0.5 * Math.PI;
    }

    StaticObject.prototype.getCurrentDirection = function (time) {
        return this.direction
    };

    StaticObject.prototype.getCurrentCoord = function (time) {
        return this.position;
    };

    return StaticObject;
})(ClientObject);


var DynamicObject = (function (_super) {
    __extends(DynamicObject, _super);

    function DynamicObject(ID, state, hp_state, fuel_state) {
        _super.call(this, ID);
        this._in_tm = false;
        this._motion_state = state;
        this._hp_state = hp_state;
        this._fuel_state = fuel_state;
        this._manage_tm();
    }

    DynamicObject.prototype.getCurrentDirection = function (time) {
        return this._motion_state.fi(time);
    };

    DynamicObject.prototype.getCurrentCoord = function (time) {
        return this._motion_state.p(time);
    };

    DynamicObject.prototype.getCurrentSpeed = function (time) {
        return this._motion_state.v(time);
    };

    DynamicObject.prototype.getCurrentHP = function (time) {
        return this._hp_state.hp(time);
    };

    DynamicObject.prototype.getCurrentFuel = function (time) {
        return this._fuel_state.fuel(time);
    };

    DynamicObject.prototype._manage_tm = function () {
        // вызывается только из апдейтов (setState и setHPState и setFuelState)
        var hp_changed = this._hp_state.is_changed();
        var motion_changed = this._motion_state.is_moving();
        var fuel_changed = this._fuel_state != null ? this._fuel_state.is_changed() : false;

        if (this._in_tm && !(motion_changed || hp_changed || fuel_changed)) {
            // если в timeManager и стейты не меняются, то удалиться из таймменеджера
            timeManager.delTimerEvent(this, 'change');
            this._in_tm = false;
        }
        if (!this._in_tm && (motion_changed || hp_changed || fuel_changed)) {
            // если не в timeManager и хоть один стейт меняется, то добавиться в таймменеджер
            timeManager.addTimerEvent(this, 'change');
            this._in_tm = true;
        }
    };

    DynamicObject.prototype.setState = function (state) {
        this._motion_state = state;
        this._manage_tm();
        visualManager.changeModelObject(this);
    };

    DynamicObject.prototype.setHPState = function (hp_state) {
        this._hp_state = hp_state;
        this._manage_tm();
        visualManager.changeModelObject(this);
    };

    DynamicObject.prototype.setFuelState = function (fuel_state) {
        this._fuel_state = fuel_state;
        this._manage_tm();
        visualManager.changeModelObject(this);
    };

    DynamicObject.prototype.change = function () {
        visualManager.changeModelObject(this);
        // todo: Сделать оптимизацию: расчёты p(t), fi(t), v(t) проводить здесь.
        // а по тем методам отдавать данные расчитанные здесь!
    };

    return DynamicObject;
})(ClientObject);


var MapCar = (function (_super) {
    __extends(MapCar, _super);

    function MapCar(aID, aState, aHPState, aFuelState, aVForward, aObservingRange, aObsRangeRateMin, aObsRangeRateMax) {
        _super.call(this, aID, aState, aHPState, aFuelState);
        this.fireSectors = [];

        this.max_control_speed = aVForward;
        this.p_observing_range = aObservingRange;

        this.p_obs_range_rate_min = aObsRangeRateMin;
        this.p_obs_range_rate_max = aObsRangeRateMax;
    }

    MapCar.prototype.AddFireSector = function (aFireSector) {
        this.fireSectors.push(aFireSector);
    };

    MapCar.prototype.AddFireSectors = function (aSectors) {
        for (var i = 0; i < aSectors.length; i++)
            this.AddFireSector(aSectors[i]);
    };

    MapCar.prototype.unbindOwner = function () {
        if (this.owner)
            this.owner.unbindCar(this);
        return this;
    };

    MapCar.prototype.getObservingRange = function (time) {
        var value = this.p_obs_range_rate_min +
            ((this.p_obs_range_rate_max - this.p_obs_range_rate_min) *  (1.0 - Math.abs(this.getCurrentSpeed(time)) / this.max_control_speed));
        var res = value * this.p_observing_range;
        if (res < 5) return 5; // info: перестраховка, когда скорость машинки из-за неверного времени может быть неверной
        return res;
    };



    return MapCar;
})(DynamicObject);


var UserCar = (function (_super) {
    __extends(UserCar, _super);

    function UserCar(aID, aVForward, aVBackward, aState, aHPState, aFuelState, aObservingRange, aObsRangeRateMin, aObsRangeRateMax) {
        _super.call(this, aID, aState, aHPState, aFuelState, aVForward, aObservingRange, aObsRangeRateMin, aObsRangeRateMax);
        this.v_forward = aVForward;
        this.v_backward = aVBackward;
        this.fireSidesMng = new FireSideMng();
        this.altitude = 0.0;
        this.radiation_dps = 0.0;
        this.radius_visible = aObservingRange;  // todo: поискать и стереть

        // устанавливается при инициализации UserCar в мессадже InitCar
        this.engine_audio = null;  // {audio_name: 'engine_05',  min_rate: 0.5, max_rate: 3 }
    }

    UserCar.prototype._manage_tm = function () {
        // вызывается только из апдейтов (setState и setHPState)
        var hp_changed = this._hp_state.is_changed();
        var motion_changed = this._motion_state.is_moving();

        if (this._in_tm && !(motion_changed || hp_changed)) {
            // если в timeManager и стейты не меняются, то удалиться из таймменеджера
            // при условии, что все борта перезаряжены
            if (!this.fireSidesMng.inRecharge(clock.getCurrentTime())) {
                timeManager.delTimerEvent(this, 'change');
                this._in_tm = false;
            }
        }
        if (!this._in_tm && (motion_changed || hp_changed)) {
            // если не в timeManager и хоть один стейт меняется, то добавиться в таймменеджер
            timeManager.addTimerEvent(this, 'change');
            this._in_tm = true;
        }
    };

    UserCar.prototype.change = function () {
        _super.prototype.change.call(this);
        // Если перезарядки нет и мы не движемся
        // todo: переделать это условие. Возможно стоит обойтись setTimeout, чтобы удаляться из таймера
        //console.log('UserCar.prototype.change');
        if (!this.fireSidesMng.inRecharge(clock.getCurrentTime())
            && !this._hp_state.is_changed()
            && !this._motion_state.is_moving()) {
            timeManager.delTimerEvent(this, 'change');
            this._in_tm = false;
        }
    };

    UserCar.prototype.setShootTime = function (aSideStr, shoot_time, t_rch) {
        this.fireSidesMng.setShootTime(aSideStr, shoot_time, t_rch);

        // Звук на завершение перезарядки
        setTimeout(function(){
            audioManager.play({name: "error_1", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});
        }, t_rch * 1000);

        // добавить в тайм-менеджер, чтобы оно начало обновляться
        if (this.fireSidesMng.inRecharge(clock.getCurrentTime()) && !this._in_tm) {
            timeManager.addTimerEvent(this, 'change');
            this._in_tm = true;
        }
    };

    UserCar.prototype.getAudioEngineRate = function (time) {
        if (! this.engine_audio) return 1;
        var m_v = Math.abs(this.getCurrentSpeed(time)) / Math.max(Math.abs(this.v_forward), Math.abs(this.v_backward));
        return this.engine_audio.min_rate + (this.engine_audio.max_rate - this.engine_audio.min_rate) * m_v;
    };

    return UserCar;
})(MapCar);


var FireSideMng = (function () {
    function FireSideMng() {
        this.sides = {
            front: new FireSide(0, 'front'),
            right: new FireSide(0.5 * Math.PI, 'right'),
            back: new FireSide(Math.PI, 'back'),
            left: new FireSide(1.5 * Math.PI, 'left')
        }
    }

    FireSideMng.prototype.addSector = function (fireSector, side) {
        if (side in this.sides)
            this.sides[side].addSector(fireSector)
    };

    FireSideMng.prototype.setShootTime = function (sideStr, shoot_time, t_rch) {
        var side = this.sides[sideStr];
        // это сообщение приходит с сервера. Значит был выстрел.
        // Значит если shoot_time отличается, то обновить и перезарядку и last_shoot

        // если старая перезарядка больше, чем новая, то ничего не делать
        if (side.last_shoot + side.sideRecharge > shoot_time + t_rch)
            return;

        if (Math.abs(side.last_shoot - shoot_time) > 0.01) {
            side.last_shoot = shoot_time; // обновляем время выстрела
            side.sideRecharge = 0.0;  // сбрасываем старую перезарядку
        }
        // если время окончания перезарядки больше, чем предыдущее, то обновить перезарядку
        if (side.last_shoot + side.sideRecharge < side.last_shoot + t_rch)
            side.sideRecharge = t_rch;

    };

    FireSideMng.prototype.getSectors = function (filterSides, isDischarge, isAuto) {
        // filterSides = строка перечисления бортов, которые нужно отправить, например: 'front, back, right, left'
        // isDischarge = true - внести в результат залповые сектора
        // isAuto = true - внести в результат автоматические сетора
        var res = [];
        if (filterSides == "" || filterSides == null)
            filterSides = ["front", "back", "right", "left"];
        if (isDischarge == undefined) isDischarge = false;
        if (isAuto == undefined) isAuto = false;
        for (var i = 0; i < filterSides.length; i++)
            res = res.concat(this.sides[filterSides[i]].getSectorsByType(isDischarge, isAuto));
        return res;
    };

    FireSideMng.prototype.getAllSides = function (onlyUsed) {
        if (onlyUsed) {
            var res = [];
            if (this.sides.front.sectors.length > 0) res.push(this.sides.front);
            if (this.sides.right.sectors.length > 0) res.push(this.sides.right);
            if (this.sides.back.sectors.length > 0) res.push(this.sides.back);
            if (this.sides.left.sectors.length > 0) res.push(this.sides.left);
            return res;
        }
        return [this.sides.front, this.sides.right, this.sides.back, this.sides.left];
    };

    FireSideMng.prototype.inRecharge = function (time) {
        // возвращает TRUE если хоть одна сторона в перезарядке
        return this.sides.front.inRecharge(time)
            || this.sides.back.inRecharge(time)
            || this.sides.left.inRecharge(time)
            || this.sides.right.inRecharge(time);
    };

    FireSideMng.prototype.getRechargeStates = function (time) {
        // todo: РОМАН !!! этот метод возвращает список объектов {борт, часть_перезарядки(от 0 до 1), время ДО окончания перезарядки}
        // вроде больше ничего не должно понадобиться
        var rez = [];
        var sides = this.sides;
        for (var side in sides)
            if (sides[side].isDischarge) {
                var value = sides[side].getRechargeState(time);
                rez.push({
                    prc: value.prc,
                    time: value.time,
                    side_str: side
                });
            }
        return rez;
    };

    return FireSideMng;
})();


var FireSide = (function () {
    function FireSide(direction, sideStr) {
        this.direction = direction;
        this.sideStr = sideStr;
        this.sectors = [];
        this.sideRadius = 0;
        this.sideWidth = 0;
        this.sideDischargeRadius = 0;
        this.sideDischargeWidth = 0;
        this.sideRecharge = 0;
        this.last_shoot = 0.0;
        this.isDischarge = false;
        this.isAuto = false;
    }

    FireSide.prototype.addSector = function (fireSector) {
        this.sectors.push(fireSector);
        this.sideRadius = Math.max(this.sideRadius, fireSector.radius);
        this.sideWidth = Math.max(this.sideWidth, fireSector.width);
        this.sideRecharge = Math.max(this.sideRecharge, fireSector.recharge);
        if (fireSector.isDischarge) {
            this.sideDischargeRadius = Math.max(this.sideDischargeRadius, fireSector.radius);
            this.sideDischargeWidth = Math.max(this.sideDischargeWidth, fireSector.width);
        }
        this.isDischarge = this.isDischarge || fireSector.isDischarge;
        this.isAuto = this.isAuto || fireSector.isAuto;
    };

    FireSide.prototype.getRechargeState = function (time) {
        // вернуть нужно проценты до окончания перезарядки + время до окончания перезарядки
        var rch_finish = this.last_shoot + this.sideRecharge;
        var dt = rch_finish - time;
        if (dt <= 0.0) return {
            prc: 1.,
            time: 0.0
        };
        if (dt - this.sideRecharge > 0.3) {
            // todo: разобраться с синхронизацией времени, иначе будут проблемы!!!
            console.error(' !!!! Логическая ошибка !!!! dt > sideRecharge');
            //console.log(' dt            = ', dt);
            //console.log(' sideRecharge  = ', this.sideRecharge);
            //console.log(' time  = ', time);
            return {
                prc: 0,
                time: dt
            }
        }
        return {
            prc: 1. - (dt / this.sideRecharge),
            time: dt
        }
    };

    FireSide.prototype.inRecharge = function (time) {
        return this.sideRecharge + this.last_shoot > time;
    };

    FireSide.prototype.getSectorsByType = function (isDischarge, isAuto) {
        // Установкой флагов можно регулировать результат (если оба True, то вернутся все сектора)
        if (isDischarge == undefined) isDischarge = false;
        if (isAuto == undefined) isAuto = false;
        var res = [];
        for (var i = 0; i < this.sectors.length; i++) {
            var s_disc = this.sectors[i].isDischarge;
            var s_auto = this.sectors[i].isAuto;
            if ((isAuto && s_auto) || (isDischarge && s_disc))
                res.push(this.sectors[i]);
        }
        return res;
    };

    return FireSide;
})();


var FireSector = (function () {
    function FireSector(options) {
        this.weapons = [];
        this.width = 0;
        this.radius = 0;
        this.direction = 0;
        this.uid = 0;
        this.side = "";
        this.recharge = 0.0;
        this.isDischarge = false;
        this.isAuto = false;
        if (options) setOptions(options, this);
    }

    FireSector.prototype.addWeapon = function (weapon) {
        this.weapons.push(weapon);
        this.recharge = Math.max(this.recharge, weapon.recharge);
        this.isDischarge = this.isDischarge || (weapon.cls == "WeaponDischarge");
        this.isAuto = this.isAuto || (weapon.cls == "WeaponAuto");
    };

    return FireSector;
})();


var Weapon = (function () {
    function Weapon(options) {
        this.cls = "WeaponDischarge";
        this.dmg = 0;
        this.dps = 0;
        this.recharge = 0;
        this.radius = 0;
        this.width = 0;
        if (options) setOptions(options, this);
    }

    return Weapon;
})();


var State = (function () {
    function State(t, position, fi0, _fi0, velocity, acceleration, center_point, turn, ac_max, r_min, _sp_m, _sp_fi0, _rv_fi) {
        this.t0 = t;                // Время начала движения (состояния)
        this.p0 = position;         // Начальная позиция - вектор!
        this.fi0 = fi0;             // Начальный угол
        this._fi0 = _fi0;           // Начальный угол для расчётов спиралей
        this.v0 = velocity;         // Начальная скорость - число, а не вектор
        this.a = acceleration;      // Начальное ускорение - число!
        this._c = center_point;      // Центр разворота - точка!
        this._turn_sign = turn;
        this.ac_max = ac_max;       // Максимальная перегрузка
        this.r_min = r_min;         // Минимальный радиус разворота
        this._sp_m = _sp_m;
        this._sp_fi0 = _sp_fi0;
        this._rv_fi = _rv_fi;
    }

    State.prototype.s = function (t) {
        var dt = t - this.t0;
        return this.v0 * dt + 0.5 * this.a * (dt * dt);
    };

    State.prototype.v = function (t) {
        var dt = t - this.t0;
        return this.v0 + this.a * dt;
    };

    State.prototype.r = function (t) {
        if (this.a == 0)
            return Math.pow(this.v0, 2) / this.ac_max + this.r_min;
        return Math.pow(this.v(t), 2) / this.ac_max + this.r_min
    };

    State.prototype.sp_fi = function (t) {
        return Math.log(this.r(t) / this.r_min) / this._sp_m
    };

    State.prototype.fi = function (t) {
        if (!this._c) return this.fi0;
        if (this.a == 0.0)
            return this.fi0 - this.s(t) / this.r(t) * this._turn_sign;
        return this.fi0 - (this.sp_fi(t) - this._sp_fi0) * this._turn_sign;
    };

    State.prototype._fi = function (t) {
        if (!this._c) return this._fi0;
        if (this.a == 0.0)
            return this._fi0 - this.s(t) / this.r(t) * this._turn_sign;
        return this._fi0 - (this.sp_fi(t) - this._sp_fi0) * this._turn_sign;
    };

    State.prototype.p = function (t) {
        if (!this._c)
            return summVector(this.p0, polarPoint(this.s(t), this._fi0));
        return summVector(this._c, polarPoint(this.r(t), this._fi(t) + this._turn_sign * this._rv_fi));
    };

    State.prototype.is_moving = function () {
        return this.a != 0.0 || this.v0 != 0.0
    };

    return State;
})();


var HPState = (function () {
    function HPState(t, max_hp, hp0, dps, dhp) {
        this.t0 = t;
        this.max_hp = max_hp;
        this.hp0 = hp0;
        this.dps = dps;
        this.dhp = dhp;
    }

    HPState.prototype.hp = function (t) {
        return Math.min(this.max_hp, this.hp0 - this.dps * (t - this.t0));
    };

    HPState.prototype.is_changed = function () {
        return this.dps != 0.0;
    };


    return HPState;
})();


var FuelState = (function () {
    function FuelState(t, max_fuel, fuel0, dfs) {
        this.t0 = t;
        this.max_fuel = max_fuel;
        this.fuel0 = fuel0;
        this.dfs = dfs;
    }

    FuelState.prototype.fuel = function (t) {
        return Math.min(this.max_fuel, this.fuel0 - this.dfs * (t - this.t0));
    };

    FuelState.prototype.is_changed = function () {
        return this.dfs != 0.0;
    };

    return FuelState;
})();


var User = (function () {
    function User(aID) {
        this.ID = aID;
        this.party = null;
        this.login = null;
        this.userCar = null;
        this.balance = 0;
        this.quick = false;

        this.example_car = null;
        this.example_agent = null;
        this.avatar_link = null;
        this.templates = {};
        this.car_npc_info = null;
    }

    return User;
})();

// Владелец машины
var Owner = (function () {
    function Owner(uid, login, aParty, quick) {
        this.uid = uid;
        this.login = login;
        this.cars = [];
        this.party = aParty;
        this.quick = quick;
    }

    Owner.prototype.bindCar = function (aCar) {
        if (!this.car(aCar.ID)) {
            aCar.owner = this;
            this.cars.push(aCar);
        }
        return this;
    };

    Owner.prototype.unbindCar = function (aCar) {
        for (var i = 0; i < this.cars.length; i++)
            if (this.cars[i].ID == aCar.ID) {
                this.cars.splice(i, 1);
                aCar.owner = null;
            }
        return this;
    };

    Owner.prototype.unbindAllCars = function () {
        for (; this.cars.length > 0;) {
            var tcar = this.cars.pop();
            tcar.owner = null;
        }
        return this;
    };

    Owner.prototype.car = function (aID) {
        for (var i = 0; i < this.cars.length; i++)
            if (this.cars[i].ID === aID)
                return this.cars[i];
        return null;
    };

    Owner.prototype.setParty = function (aParty) {
        this.party = aParty;
        return this;
    };

    return Owner;
})();

// Список владельцев машин
var OwnerList = (function () {
    function OwnerList() {
        this.owners = [];
    }


    OwnerList.prototype.add = function (owner) {
        var exstOwner = this.getOwnerByUid(owner.uid);
        if (!exstOwner) {
            this.owners.push(owner);
            return owner;
        }
        // если овнер уже был, но по какой-то приничине не было ника или пати или они отличаются, то заменить
        if (exstOwner.login != owner.login)
            exstOwner.login = owner.login;
        if (exstOwner.party != owner.party)
            exstOwner.setParty(owner.party);
        return exstOwner;
    };


    OwnerList.prototype.getOwnerByUid = function (uid) {
        for (var i = 0; i < this.owners.length; i++) {
            if (this.owners[i].uid === uid) {
                return this.owners[i];
            }
        }
        return null;
    };


    OwnerList.prototype.getOwnerByLogin = function (login) {
        for (var i = 0; i < this.owners.length; i++) {
            if (this.owners[i].login === login) {
                return this.owners[i];
            }
        }
        return null;
    };


    OwnerList.prototype.clearOwnerList = function () {
        for (var i = 0; i < this.owners.length; i++)
            this.owners[i].unbindAllCars();
    };

    OwnerList.prototype.update_party_icons = function (party_id) {
        for (var i = 0; i < this.owners.length; i++) {
            var curr_owner = this.owners[i];
            //if (party_id == curr_owner.party.id) {
                for (var car_index = 0; car_index < curr_owner.cars.length; car_index++) {
                    var widget_marker = visualManager.getVobjByType(curr_owner.cars[car_index], WCanvasCarMarker);
                    if (widget_marker) widget_marker.updateIcon();
                //}
            }
        }
    };


    return OwnerList;
})();

// Класс Party - добавляется в овнер, у любого пользователя будет своя пати
var OwnerParty = (function () {
    function OwnerParty(aID, aName) {
        this.id = aID;
        this.name = aName;
    }

    return OwnerParty;
})();