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
    Point.prototype.abs = function () {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    };
    return Point;
})();

//Поворот вектора на угол aAngle(в радианах) по часовой стрелке
function rotateVector(aPoint, aAngle) {
    return new Point((aPoint.x * Math.cos(aAngle) - aPoint.y * Math.sin(aAngle)), (aPoint.x * Math.sin(aAngle) + aPoint.y * Math.cos(aAngle)));
}

function normVector(aPoint) {
    return mulScalVector(aPoint, 1 / aPoint.abs());
}

function summVector(aPoint1, aPoint2) {
    return new Point((aPoint1.x + aPoint2.x), (aPoint1.y + aPoint2.y));
}

function subVector(aPoint1, aPoint2) {
    return new Point((aPoint1.x - aPoint2.x), aPoint1.y - aPoint2.y);
}

function mulScalVector(aPoint, aMul) {
    return new Point((aPoint.x * aMul), (aPoint.y * aMul));
}

function mulScalVectors(aPoint1, aPoint2) {
    return (aPoint1.x * aPoint2.x) + (aPoint1.y * aPoint2.y);
}

function absVector(aPoint) {
    return aPoint.abs();
}

function angleVector(aPoint1, aPoint2) {
    return Math.acos(mulScalVectors(aPoint1, aPoint2) / (aPoint1.abs() * aPoint2.abs())) * 180 / Math.PI;
}

function angleVectorRad(aPoint1, aPoint2) {
    return Math.acos(mulScalVectors(aPoint1, aPoint2) / (aPoint1.abs() * aPoint2.abs()));
}

function radToGrad(rad) {
    return rad * 180 / Math.PI;
}

function gradToRad(grad) {
    return grad * Math.PI / 180.;
}

var MoveTrack = (function () {
    function MoveTrack(aTimeStart, aFuelStart, aFuelDec) {
        this.timeStart = aTimeStart;
        this.fuelStart = aFuelStart;
        this.fuelDec = aFuelDec;
        this.direction = new Point(0, -1);
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
    function MoveLine(aTimeStart, aFuelStart, aFuelDec, aCoord, aSpeedV, aAcceleration) {
        _super.call(this, aTimeStart, aFuelStart, aFuelDec);
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
        // Машинка всегда развёрнута по текущей скорости
        // Вычисляем относительное время t
        //var t = this.getRelativelyTime(aClockTime);
        // Вычисляем текущую скорость Vt = A*t + V
        //var Vt = summVector(mulScalVector(this.acceleration, t), this.speedV);
        // Угол в радианах равен углу между единичным вектором и текущей скоростью
        //return angleVectorRad(Vt, new Point(1,0));
        // Вариант 2: возвращает угол относительно севера и не разворачивает машинку
        if (this.speedV.abs() != 0) {
            var res = angleVectorRad(this.speedV, new Point(0, -1));
            if (this.speedV.x < 0)
                return -res;
            return res;
        } else {
            var res1 = angleVectorRad(this.direction, new Point(0, -1));
            if (this.direction.x < 0)
                return -res1;
            return res1;
        }
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
    function MoveCircle(aTimeStart, aFuelStart, aFuelDec, aCenterCircle, aAngleStart, aSpeedA, aAccelerationA, aRadius) {
        _super.call(this, aTimeStart, aFuelStart, aFuelDec);
        this.centerCircle = aCenterCircle;
        this.angleStart = aAngleStart;
        this.speedA = aSpeedA;
        this.accelerationA = aAccelerationA;
        this.radius = aRadius;
    }
    MoveCircle.prototype.getCurrentCoord = function (aClockTime) {
        return null;
    };

    MoveCircle.prototype.getCurrentDirection = function (aClockTime) {
        return null;
    };

    MoveCircle.prototype.getCurrentSpeedAbs = function (aClockTime) {
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
    }
    MapCar.prototype.AddFireSector = function (aDirectionAngle, aWidthAngle, aRadius) {
        this.fireSectors.push(new FireSector(aDirectionAngle, aWidthAngle, aRadius));
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

var User = (function () {
    function User(aID, aCredit) {
        this.ID = aID;
        this.credit = aCredit;
    }
    return User;
})();

var FireSector = (function () {
    function FireSector(aDirectionAngle, aWidthAngle, aRadius) {
        this.directionAngle = aDirectionAngle;
        this.widthAngle = aWidthAngle;
        this.radius = aRadius;
    }
    return FireSector;
})();

var ListMapObject = (function () {
    function ListMapObject() {
        this.objects = new Array();
    }
    ListMapObject.prototype.add = function (aObject) {
        this.objects[aObject.ID] = aObject;
    };

    ListMapObject.prototype.del = function (aID) {
        delete this.objects[aID];
        //this.objects[aID] = null;
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

    ListMapObject.prototype.getCarHP = function (aID, aHP) {
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
