var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() {
        this.constructor = d;
    }

    __.prototype = b.prototype;
    d.prototype = new __();
};

var ListMapObject = (function () {
    function ListMapObject() {
        this.objects = [];
    }

    ListMapObject.prototype.add = function (aObject) {
        this.objects[aObject.ID] = aObject;
    };

    ListMapObject.prototype.del = function (aID) {
        delete this.objects[aID];
    };

    ListMapObject.prototype.exist = function (aID) {
        return this.objects[aID] != null
    };

    ListMapObject.prototype.setState = function (aID, aState) {
        if (!(this.objects[aID] == null) && (this.objects[aID].hasOwnProperty("state"))) {
            this.objects[aID].state = aState;
        }
    };

    return ListMapObject;
})();


var ClientObject = (function () {
    function ClientObject(ID) {
        this.ID = ID || generator_ID.getID();
    }

    ClientObject.prototype.addToVisualManager = function () {
        visualManager.addModelObject(this);
    };

    ClientObject.prototype.delFromVisualManager = function () {
        visualManager.delModelObject(this);
    };

    return ClientObject;
})();


var DynamicObject = (function (_super) {
    __extends(DynamicObject, _super);

    function DynamicObject(ID, state, hp_state) {
        _super.call(this, ID);
        this._in_tm = false;
        this.addToVisualManager();
        this._motion_state = state;
        this._hp_state = hp_state;
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

    DynamicObject.prototype._manage_tm = function () {
        // вызывается только из апдейтов (setState и setHPState)
        var hp_changed = this._hp_state.is_changed();
        var motion_changed = this._motion_state.is_moving();

        if (this._in_tm && !(motion_changed || hp_changed)) {
            // если в timeManager и стейты не меняются, то удалиться из таймменеджера
            timeManager.delTimerEvent(this, 'change');
            this._in_tm = false;
        }
        if (!this._in_tm && (motion_changed || hp_changed)) {
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

    DynamicObject.prototype.getCurrentHP = function (time) {
        return this._hp_state.hp(time);
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

    function MapCar(aID, aState, aHPState) {
        _super.call(this, aID, aState, aHPState);
        this.fireSectors = [];
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


    return MapCar;
})(DynamicObject);


var UserCar = (function (_super) {
    __extends(UserCar, _super);

    function UserCar(aID, aVForward, aVBackward, aState, aHPState) {
        _super.call(this, aID, aState, aHPState);
        this.v_forward = aVForward;
        this.v_backward = aVBackward;
        this.fireSidesMng = new FireSideMng();
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
        if (!this.fireSidesMng.inRecharge(clock.getCurrentTime())
            && !this._hp_state.is_changed()
            && !this._motion_state.is_moving()) {
            timeManager.delTimerEvent(this, 'change');
            this._in_tm = false;
        }
    };

    UserCar.prototype.setShootTime = function (aSideStr, shoot_time) {
        this.fireSidesMng.setShootTime(aSideStr, shoot_time);
        // добавить в тайм-менеджер, чтобы оно начало обновляться
        if (this.fireSidesMng.inRecharge(clock.getCurrentTime()) && !this._in_tm) {
            timeManager.addTimerEvent(this, 'change');
            this._in_tm = true;
        }
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

    FireSideMng.prototype.setShootTime = function (sideStr, shoot_time) {
        this.sides[sideStr].last_shoot = shoot_time;
    };

    FireSideMng.prototype.getSectors = function (filterSides, isDischarge, isAuto) {
        // filterSides = строка перечисления бортов, которые нужно отправить, например: 'front, back, right, left'
        // isDischarge = true - внести в результат залповые сектора
        // isAuto = true - внести в результат автоматические сетора
        var res = [];
        if (filterSides == "" || filterSides == null)
            filterSides = ["front", "back", "right", "left"];
        if (isDischarge == undefined) isDischarge = False;
        if (isAuto == undefined) isAuto = False;
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
        if (dt - this.sideRecharge > 0.1) {
            // todo: разобраться с синхронизацией времени, иначе будут проблемы!!!
            console.error(' !!!! Логическая ошибка !!!! dt > sideRecharge');
            console.log(' dt            = ', dt);
            console.log(' sideRecharge  = ', this.sideRecharge);
            return null;
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
        if (isDischarge == undefined) isDischarge = False;
        if (isAuto == undefined) isAuto = False;
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
    function State(t, position, direct, velocity, acceleration, center_point, turn, ac_max, r_min, _sp_m, _sp_fi0, _rv_fi) {
        this.t0 = t;                // Время начала движения (состояния)
        this.p0 = position;         // Начальная позиция - вектор!
        this.fi0 = direct;          // Начальный угол
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

    State.prototype._fi = function (t) {
        if (!this._c) return this.fi0;
        if (this.a == 0.0)
            return this.fi0 - this.s(t) / this.r(t) * this._turn_sign;
        return this.fi0 - (this.sp_fi(t) - this._sp_fi0) * this._turn_sign;
    };

    State.prototype.fi = function (t) {
        if (!this._c) return this.fi0;
        if (this.a == 0.0)
            return this.fi0 - this.s(t) / this.r(t) * this._turn_sign;
        if (this.a > 0)
            return this.fi0 - (this.sp_fi(t) - this._sp_fi0) * this._turn_sign;
        else
            return normalizeAngleRad((this.fi0 - (this.sp_fi(t) - this._sp_fi0) * this._turn_sign) + Math.PI)
    };

    State.prototype.p = function (t) {
        if (!this._c)
            return summVector(this.p0, polarPoint(this.s(t), this.fi0));
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


var User = (function () {
    function User(aID) {
        this.ID = aID;
        this.party = null;
        this.login = null;
        this.userCar = null;
    }


    return User;
})();


// Владелец машины
var Owner = (function () {
    function Owner(uid, login, aParty) {
        this.uid = uid;
        this.login = login;
        this.cars = [];
        this.party = aParty;
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



