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


var MapObject = (function () {
    function MapObject(aID) {
        this.ID = aID;
    }

    return MapObject;
})();


var DynamicObject = (function (_super) {
    __extends(DynamicObject, _super);


    function DynamicObject(aID, aState) {
        _super.call(this, aID);
        this.state = aState;
    }


    DynamicObject.prototype.getCurrentDirection = function (aClockTime) {
        return this.state.getCurrentDirection(aClockTime);
    };


    DynamicObject.prototype.getCurrentCoord = function (aClockTime) {
        return this.state.getCurrentCoord(aClockTime);
    };


    DynamicObject.prototype.getCurrentFuel = function (aClockTime) {
        return null;
    };


    DynamicObject.prototype.getCurrentSpeed = function (aClockTime) {
        return this.state.getCurrentSpeed(aClockTime);
    };


    return DynamicObject;
})(MapObject);


var MapCar = (function (_super) {
    __extends(MapCar, _super);


    function MapCar(aID, aHP, aState) {
        _super.call(this, aID, aState);
        this.hp = aHP;
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


    function UserCar(aID, aHP, aMaxSpeed, aState) {
        _super.call(this, aID, aHP, aState);
        this.maxSpeed = aMaxSpeed;
    }


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
    function State(t, position, direct, velocity, acceleration, center_point, turn, ac_max, r_min, _sp_m, _sp_fi0, _sp_dfi, _sp_r){
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
        this._sp_dfi = _sp_dfi;
        this._sp_r = _sp_r;
    };

    State.prototype.s = function(t) {
        var dt = t - this.t0;
        return this.v0 * dt + 0.5 * this.a * (dt * dt);
    };

    State.prototype.v = function(t) {
        var dt = t - this.t0;
        return this.v0 + this.a * dt;
    };

    State.prototype.r = function(t) {
        return Math.pow(this.v(t), 2) / this.ac_max + this.r_min
    };

    State.prototype.sp_fi = function(t) {
        return Math.log(this.r(t) / this.r_min) / this._sp_m
    };

    State.prototype.fi = function(t) {
        if (!this._c) return this.fi0;
        if (this.a <= 0.0)
            return this.fi0 - this.s(t) / this.r(t) * this._turn_sign;
        var _sp_fi1 = this.sp_fi(t);
        return this.fi0 - (_sp_fi1 - this._sp_fi0) * this._turn_sign;
    };

    State.prototype.p = function(t) {

        if (!this._c)
            return summVector(this.p0, polarPoint(this.s(t), this.fi0));
        if (this.a <= 0)
            return summVector(this._c, polarPoint(this.r(t), this.fi(t) + this._turn_sign * Math.PI * 0.5));
        console.log('3333');
        console.log(this._c, this.a, this._sp_r, this.fi(t) - this._sp_fi0);
        return summVector(this._c, polarPoint(this._sp_r, this.fi(t) - this._sp_fi0));
    };

    //todo: удалить следующие 3 функции
    State.prototype.getCurrentSpeed = function(t){
        return this.v(t);
    };

    State.prototype.getCurrentDirection = function(t){
        return this.fi(t);
    };

    State.prototype.getCurrentCoord = function(t) {
        return this.p(t);
    };

    return State;
})();


var User = (function () {
    function User(aID) {
        this.ID = aID;
        this.party = new OwnerParty(0, "");
    }


    return User;
})();


var Clock = (function () {
    function Clock() {
        this.dt = 0;
    }


    Clock.prototype.getCurrentTime = function () {
        return new Date().getTime() / 1000. + this.dt;
    };

    // Для установки dt необходимо серверное время передать в секундах = UTC/1000.
    Clock.prototype.setDt = function (aTimeServer) {
        this.dt = aTimeServer - new Date().getTime() / 1000.;
    };


    return Clock;
})();

// Владелец машины
var Owner = (function () {
    function Owner(uid, login, aParty) {
        this.uid = uid;
        this.login = login;
        this.cars = new Array();
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



