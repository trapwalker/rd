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

function getPerpendicular(aPoint) {
    return new Point(aPoint.y, -aPoint.x);
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

// Возвращает угол против часовой стрелки от положительного направления оси X
function angleVectorRadCCW(aPoint) {
    var angle = angleVectorRad(aPoint, new Point(1, 0));
    if (aPoint.y < 0)
        angle = 2 * Math.PI - angle;
    return normalizeAngleRad(angle);
}

function normalizeAngleRad(angle) {
    var pi2 = Math.PI * 2;
    var znak = (angle > 0) ? -1 : 1;
    for (; (angle > pi2) || (angle < 0);)
        angle += znak * pi2;
    return angle;
}

function getDiffAngle(angle1, angle2) {
    var res = normalizeAngleRad(angle1) - normalizeAngleRad(angle2);
    if (Math.abs(res) <= Math.PI)
        return res;
    else
        return (2 * Math.PI - Math.abs(res)) * (res > 0 ? -1 : 1);
}

function radToGrad(rad) {
    return rad * 180 / Math.PI;
}

function gradToRad(grad) {
    return grad * Math.PI / 180.;
}

function distancePoints(aPoint1, aPoint2) {
    return subVector(aPoint1, aPoint2).abs();
}

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
    function MoveCircle(aTimeStart, aFuelStart, aFuelDec, aCenterCircle, aRadiusVector, aAngleStart, aSpeedA, aAccelerationA, aCCW) {
        _super.call(this, aTimeStart, aFuelStart, aFuelDec, 0);
        this.centerCircle = aCenterCircle;
        this.angleStart = aAngleStart;
        this.speedA = aSpeedA;
        this.accelerationA = aAccelerationA;
        this.radiusVector = aRadiusVector;
        this.CCW = aCCW;
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
        return 0;
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

var User = (function () {
    function User(aID, aCredit) {
        this.ID = aID;
        this.credit = aCredit;
    }
    return User;
})();

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

// Владелец машины
// TODO переписать так, чтобы у одного овнера был список его машин и при клике на Owner в чате они все подсвечивались
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
                this.cars.splice(i, 1); // TODO: проверить, ту ли машинку здесь мы удаляем
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
        this.owners = new Array();
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
//# sourceMappingURL=model.js.map
