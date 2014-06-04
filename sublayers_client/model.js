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

var MoveTrack = (function () {
    function MoveTrack(aTimeStart, aFuelStart, aFuelDec, aReliefType) {
        this.timeStart = aTimeStart;
        this.fuelStart = aFuelStart;
        this.fuelDec = aFuelDec;
        this.reliefType = aReliefType;
    }
    MoveTrack.prototype.getCurrentFuel = function (aCurrentTime) {
        return this.fuelStart - this.fuelDec * ((aCurrentTime - this.timeStart) / 1000);
    };

    MoveTrack.prototype.getCurrentCoord = function () {
        return null;
    };

    MoveTrack.prototype.getCurrentDirection = function () {
        return null;
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
    MoveLine.prototype.getCurrentCoord = function () {
        var result;

        return null;
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

    MoveCircle.prototype.getCurrentCoord = function () {
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
    MapObject.prototype.getCurrentCoord = function () {
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
    StaticObject.prototype.getCurrentCoord = function () {
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

    DynamicObject.prototype.getCurrentCoord = function () {
        return this.track.getCurrentCoord();
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
    function Clock(aDelay) {
        this.delay = aDelay;
        this.dt = 0;
    }
    Clock.prototype.getCurrentTime = function () {
        return new Date().getTime() + this.dt;
    };

    Clock.prototype.setDt = function (aTimeServer) {
        this.dt = aTimeServer - new Date().getTime();
    };
    return Clock;
})();

window.onload = function () {
    alert(123);
    var s = new ListMapObject();
    var town1 = new MapTown(1, new Point(2, 3), 3);
    var town2 = new MapTown(2, new Point(2, 3), 3);
    var town3 = new MapTown(8888, new Point(2, 4), 3);
    var gs1 = new MapGasStation(4, new Point(2, 4));
    var gs2 = new MapGasStation(5, new Point(2, 4));
    var gs3 = new MapGasStation(6565, new Point(2, 4));

    s.addObject(town1);
    s.addObject(town2);
    s.addObject(town3);
    s.addObject(gs1);
    s.addObject(gs2);
    s.addObject(gs3);

    //alert(123123123);
    s.delObject(3);
    s.delObject(2);

    s.addObject(town2);

    for (var key in s.objects) {
        if (s.objects[key] != null) {
            alert(s.objects[key].ID);
        }
    }
};
//# sourceMappingURL=model.js.map
