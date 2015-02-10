var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
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


    ListMapObject.prototype.setCarHP = function (aID, aHP) {
        if (!(this.objects[aID] == null) && (this.objects[aID].hasOwnProperty("hp"))) {
            this.objects[aID].hp = aHP;
        }
    };


    ListMapObject.prototype.getCarHP = function (aID) {
        if (!(this.objects[aID] == null) && (this.objects[aID].hasOwnProperty("hp"))) {
            return this.objects[aID].hp;
        }
        return null;
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

    DynamicObject.prototype.getCurrentHP = function(time){
        return this._hp_state.hp(time);
    };

    DynamicObject.prototype.change = function(time){
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


    function UserCar(aID, aMaxSpeed, aState, aHPState) {
        _super.call(this, aID, aState, aHPState);
        this.maxSpeed = aMaxSpeed;
        this._lastSpeed = 0.75 * aMaxSpeed;
    }

    UserCar.prototype.getGround = function () {
        // todo: правильно обработать тип местности
        return null;
    };

    UserCar.prototype.setLastSpeed = function (speed) {
        this._lastSpeed = speed;
    };


    UserCar.prototype.getLastSpeed = function () {
        return this._lastSpeed;
    };



    return UserCar;
})(MapCar);


var FireSector = (function () {
    function FireSector(aDirectionAngle, aWidthAngle, aRadius, aUid, aRecharge) {
        this.directionAngle = aDirectionAngle;
        this.widthAngle = aWidthAngle;
        this.radius = aRadius;
        this.uid = aUid;
        this.recharge = aRecharge;
    }

    return FireSector;
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

    State.prototype.s = function(t) {
        var dt = t - this.t0;
        return this.v0 * dt + 0.5 * this.a * (dt * dt);
    };

    State.prototype.v = function(t) {
        var dt = t - this.t0;
        return this.v0 + this.a * dt;
    };

    State.prototype.r = function(t) {
        if (this.a <= 0)
            return Math.pow(this.v0, 2) / this.ac_max + this.r_min;
        return Math.pow(this.v(t), 2) / this.ac_max + this.r_min
    };

    State.prototype.sp_fi = function(t) {
        return Math.log(this.r(t) / this.r_min) / this._sp_m
    };

    State.prototype.fi = function(t) {
        if (!this._c) return this.fi0;
        if (this.a <= 0.0)
            return this.fi0 - this.s(t) / this.r(t) * this._turn_sign;
        return this.fi0 - (this.sp_fi(t) - this._sp_fi0) * this._turn_sign;
    };

    State.prototype.p = function(t) {
        if (!this._c)
            return summVector(this.p0, polarPoint(this.s(t), this.fi0));
        return summVector(this._c, polarPoint(this.r(t), this.fi(t) + this._turn_sign * this._rv_fi));
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

    HPState.prototype.hp = function(t) {
        return Math.min(this.max_hp, this.hp0 - this.dps * (t - this.t0));
    };

    HPState.prototype.is_changed = function() {
        return this.dps != 0.0;
    };


    return HPState;
})();


var User = (function () {
    function User(aID) {
        this.ID = aID;
        this.party = new OwnerParty(0, "");
    }


    return User;
})();


// Владелец машины
var Owner = (function () {
    function Owner(uid, login, aParty) {
        this.uid = uid;
        this.login = login;
        this.cars = [];
        this.party = aParty ? aParty : new OwnerParty(0, "");
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



