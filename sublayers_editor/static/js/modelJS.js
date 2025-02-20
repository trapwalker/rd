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
        if (this.objects[aID] != null) {
            return true;
        } else {
            return false;
        }
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
        return -1;
    };


    ListMapObject.prototype.setTrack = function (aID, aTrack) {
        if (!(this.objects[aID] == null) && (this.objects[aID].hasOwnProperty("track"))) {
            this.objects[aID].track = aTrack;
        }
    };


    return ListMapObject;
})();


var MapObject = (function () {
    function MapObject(aID) {
        this.ID = aID;
    }


    MapObject.prototype.getCurrentCoord = function (aClockTime) {
        return null;
    };


    return MapObject;
})();


var StaticObject = (function (_super) {
    __extends(StaticObject, _super);


    function StaticObject(aID, aCoord) {
        _super.call(this, aID);
        this.coord = aCoord;
    }


    StaticObject.prototype.getCurrentCoord = function (aClockTime) {
        return this.coord;
    };


    return StaticObject;
})(MapObject);


var MapTown = (function (_super) {
    __extends(MapTown, _super);


    function MapTown(aID, aCoord, aName, aSize) {
        _super.call(this, aID, aCoord);
        this.size = aSize;
        this.name = aName;
    }


    return MapTown;
})(StaticObject);


var MapGasStation = (function (_super) {
    __extends(MapGasStation, _super);


    function MapGasStation(aID, aCoord) {
        _super.call(this, aID, aCoord);
    }


    return MapGasStation;
})(StaticObject);


var DynamicObject = (function (_super) {
    __extends(DynamicObject, _super);


    function DynamicObject(aID, aTrack) {
        _super.call(this, aID);
        this.track = aTrack;
    }


    DynamicObject.prototype.getCurrentDirection = function (aClockTime) {
        return this.track.getCurrentDirection(aClockTime);
    };


    DynamicObject.prototype.getCurrentCoord = function (aClockTime) {
        return this.track.getCurrentCoord(aClockTime);
    };


    DynamicObject.prototype.getCurrentFuel = function (aClockTime) {
        return this.track.getCurrentFuel(aClockTime);
    };


    DynamicObject.prototype.getCurrentSpeedAbs = function (aClockTime) {
        return this.track.getCurrentSpeedAbs(aClockTime);
    };


    return DynamicObject;
})(MapObject);


var MapCar = (function (_super) {
    __extends(MapCar, _super);


    function MapCar(aID, aType, aHP, aTrack) {
        _super.call(this, aID, aTrack);
        this.type = aType;
        this.hp = aHP;
        this.fireSectors = new Array();
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


    function UserCar(aID, aType, aHP, aMaxSpeed, aTrack) {
        _super.call(this, aID, aType, aHP, aTrack);
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


var MoveTrack = (function () {
    function MoveTrack(aTimeStart, aFuelStart, aFuelDec, aDirection) {
        this.timeStart = aTimeStart;
        this.fuelStart = aFuelStart;
        this.fuelDec = aFuelDec;
        this.direction = aDirection;
    }


    MoveTrack.prototype.getCurrentFuel = function (aCurrentTime) {
        return this.fuelStart - this.fuelDec * ((aCurrentTime - this.timeStart));
    };


    MoveTrack.prototype.getCurrentCoord = function (aClockTime) {
        return null;
    };


    MoveTrack.prototype.getCurrentDirection = function (aClockTime) {
        return null;
    };


    MoveTrack.prototype.getRelativelyTime = function (aClockTime) {
        return aClockTime - this.timeStart;
    };


    MoveTrack.prototype.getCurrentSpeedAbs = function (aClockTime) {
        return null;
    };


    return MoveTrack;
})();


var MoveLine = (function (_super) {
    __extends(MoveLine, _super);


    function MoveLine(aTimeStart, aFuelStart, aFuelDec, aDirection, aCoord, aSpeedV, aAcceleration) {
        _super.call(this, aTimeStart, aFuelStart, aFuelDec, aDirection);
        this.coord = aCoord;
        this.speedV = aSpeedV;
        this.acceleration = aAcceleration;
    }


    MoveLine.prototype.getCurrentCoord = function (aClockTime) {
        // Pv = Av * t2 + Vv * t + S   =  acceleration * t * t    +   speedV * t   +   coord ;
        var t = this.getRelativelyTime(aClockTime);
        var a = mulScalVector(this.acceleration, t * t);
        var v = mulScalVector(this.speedV, t);
        var sum = summVector(a, v);
        return summVector(sum, this.coord);
    };


    MoveLine.prototype.getCurrentDirection = function (aClockTime) {
        // возвращает угол относительно севера и не разворачивает машинку
        return this.direction;
    };


    MoveLine.prototype.getCurrentSpeedAbs = function (aClockTime) {
        var t = this.getRelativelyTime(aClockTime);

        // Вычисляем текущую скорость Vt = A*t + V
        return summVector(mulScalVector(this.acceleration, t), this.speedV).abs();
    };


    return MoveLine;
})(MoveTrack);


var MoveCircle = (function (_super) {
    __extends(MoveCircle, _super);


    function MoveCircle(aTimeStart, aFuelStart, aFuelDec, aCenterCircle, aRadiusVector, aAngleStart, aSpeedA, aAccelerationA, aCCW, aLinearSpeed) {
        _super.call(this, aTimeStart, aFuelStart, aFuelDec, 0);
        this.centerCircle = aCenterCircle;
        this.angleStart = aAngleStart;
        this.speedA = aSpeedA;
        this.accelerationA = aAccelerationA;
        this.radiusVector = aRadiusVector;
        this.CCW = aCCW;
        this.linearSpeed = aLinearSpeed;
    }


    MoveCircle.prototype.getCurrentCoord = function (aClockTime) {
        return summVector(rotateVector(this.radiusVector, this._getCurrentRadiusAngle(aClockTime)), this.centerCircle);
    };


    MoveCircle.prototype.getCurrentDirection = function (aClockTime) {
        // перпендикуляр текущего угла поворота радиус-Вектора
        return this.angleStart + (this.CCW == 0 ? -1 : 1) * Math.PI / 2 + this._getCurrentRadiusAngle(aClockTime);
    };


    MoveCircle.prototype._getCurrentRadiusAngle = function (aClockTime) {
        var t = this.getRelativelyTime(aClockTime);

        //return this.angleStart + this.speedA * t + this.accelerationA * t * t;
        return this.speedA * t + this.accelerationA * t * t;
    };


    MoveCircle.prototype.getCurrentSpeedAbs = function (aClockTime) {
        return this.linearSpeed;
    };


    return MoveCircle;
})(MoveTrack);


var User = (function () {
    function User(aID, aCredit) {
        this.ID = aID;
        this.credit = aCredit;
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



// Класс State - станет заменой MoveTrack
var State = (function () {
    function State(t, position, direct, velocity, acceleration, center_point){
        this.t0 = t;                // Время начала движения (состояния)
        this.p0 = position;         // Начальная позиция - вектор!
        this.fi0 = direct;          // Начальный угол
        this.v0 = velocity;         // Начальная скорость - число, а не вектор
        this.a = acceleration;      // Начальное ускорение - число!
        this.c = center_point;     // Центр разворота - точка!

        if (this.c) {
            var pc = subVector(this.p0, this.c);
            this._r = absVector(pc);
            this._turn_sign = mulVectVectors2D(polarPoint(1, this.fi0), pc) > 0 ? 1 : -1;
        }
        else {
            this._r = null;
            this._turn_sign = 0;
        }
    }

    State.prototype.fix = function(t, dt) {
        t = (t ? t : this.t0) + dt;
        if (t != this.t0) {
            this.p0 = this.getCurrentCoord(t);
            this.v0 = this.getCurrentSpeed(t);
            this.fi0 = this.getCurrentDirection(t);
            this.t0 = t;
        }
    };

    State.prototype.getCurrentSpeed = function(t){
        return this.v0 + this.a * (t - this.t0);
    };

    State.prototype.getCurrentDirection = function(t){
        if(! this.c) {
            return this.fi0;
        }
        dt = t - this.t0;
        return this.fi0 + (0.5 * this.a * dt * dt + this.v0 * dt) / this._r;
    };

    State.prototype.getCurrentCoord = function(t) {
        if (this.c) {
            return summVector(this.c, polarPoint(this._r, this.getCurrentDirection(t) - this._turn_sign * Math.PI * 0.5));
        }
        else {
            dt = t - this.t0;
            return summVector(this.p0, polarPoint(0.5 * this.a * dt * dt + this.v0 * dt, this.fi0));
        }
    };

    return State;
})();
