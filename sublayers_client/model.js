/**
* Created by Admin on 04.06.2014.
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Point = (function () {
    function Point(ax, ay) {
        this.x = ax;
        this.y = ay;
    }
    return Point;
})();

function summVector(aPoint1, aPoint2) {
    return new Point((aPoint1.x + aPoint2.x), (aPoint1.y + aPoint2.y));
}

function mulScalVector(aPoint, aMul) {
    return new Point((aPoint.x * aMul), (aPoint.y * aMul));
}

function absVector(aPoint) {
    return Math.sqrt((aPoint.x * aPoint.x) + (aPoint.y * aPoint.y));
}

//function угол между векторами
var MoveTrack = (function () {
    function MoveTrack(aTimeStart, aFuelStart, aFuelDec, aReliefType) {
        this.timeStart = aTimeStart;
        this.fuelStart = aFuelStart;
        this.fuelDec = aFuelDec;
        this.reliefType = aReliefType;
    }
    MoveTrack.prototype.getCurrentFuel = function (aCurrentTime) {
        return this.fuelStart - this.fuelDec * ((aCurrentTime - this.timeStart));
    };

    MoveTrack.prototype.getCurrentCoord = function (aClockTime) {
        return null;
    };

    MoveTrack.prototype.getCurrentDirection = function () {
        return null;
    };

    MoveTrack.prototype.getRelativelyTime = function (aClockTime) {
        return aClockTime - this.timeStart;
    };
    return MoveTrack;
})();

var MoveLine = (function (_super) {
    __extends(MoveLine, _super);
    function MoveLine(aTimeStart, aFuelStart, aFuelDec, aReliefType, aCoord, aSpeedV, aAcceleration) {
        _super.call(this, aTimeStart, aFuelStart, aFuelDec, aReliefType);
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

    MoveLine.prototype.getCurrentDirection = function () {
        return null;
    };
    return MoveLine;
})(MoveTrack);

var MoveCircle = (function (_super) {
    __extends(MoveCircle, _super);
    function MoveCircle(aTimeStart, aFuelStart, aFuelDec, aReliefType, aCenterCircle, aAngleStart, aSpeedA, aAccelerationA, aRadius) {
        _super.call(this, aTimeStart, aFuelStart, aFuelDec, aReliefType);
        this.centerCircle = aCenterCircle;
        this.angleStart = aAngleStart;
        this.speedA = aSpeedA;
        this.accelerationA = aAccelerationA;
        this.radius = aRadius;
    }
    MoveCircle.prototype.refresh = function () {
        return false;
    };

    MoveCircle.prototype.getCurrentCoord = function (aClockTime) {
        return null;
    };

    MoveCircle.prototype.getCurrentDirection = function () {
        return null;
    };
    return MoveCircle;
})(MoveTrack);

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
    function MapTown(aID, aCoord, aSize) {
        _super.call(this, aID, aCoord);
        this.size = aSize;
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
    DynamicObject.prototype.getCurrentDirection = function () {
        return this.track.getCurrentDirection();
    };

    DynamicObject.prototype.getCurrentCoord = function (aClockTime) {
        return this.track.getCurrentCoord(aClockTime);
    };
    return DynamicObject;
})(MapObject);

var MapCar = (function (_super) {
    __extends(MapCar, _super);
    function MapCar(aID, aTrack, aType, aHP) {
        _super.call(this, aID, aTrack);
        this.type = aType;
        this.hp = aHP;
    }
    return MapCar;
})(DynamicObject);

var UserCar = (function (_super) {
    __extends(UserCar, _super);
    function UserCar(aID, aTrack, aType, aHP, aMaxSpeed, aSpeed) {
        _super.call(this, aID, aTrack, aType, aHP);
        this.maxSpeed = aMaxSpeed;
        this.speed = aSpeed;
    }
    return UserCar;
})(MapCar);

var User = (function () {
    function User(aID, aCredit) {
        this.ID = aID;
        this.credit = aCredit;
    }
    return User;
})();

var ListMapObject = (function () {
    function ListMapObject() {
        this.objects = new Array();
    }
    ListMapObject.prototype.addObject = function (aMapObject) {
        this.objects[aMapObject.ID] = aMapObject;
    };

    ListMapObject.prototype.delObject = function (aID) {
        this.objects[aID] = null;
    };
    return ListMapObject;
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
//# sourceMappingURL=model.js.map
