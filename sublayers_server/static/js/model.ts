class Point {
    x:number;
    y:number;

    constructor(ax, ay:number) {
        this.x = ax;
        this.y = ay;
    }

    abs():number {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }
}

//Поворот вектора на угол aAngle(в радианах) по часовой стрелке
function rotateVector(aPoint:Point, aAngle:number):Point {
    return new Point((aPoint.x * Math.cos(aAngle) - aPoint.y * Math.sin(aAngle)),
                     (aPoint.x * Math.sin(aAngle) + aPoint.y * Math.cos(aAngle)));
}

function normVector(aPoint:Point):Point {
    return mulScalVector(aPoint, 1 / aPoint.abs());
}

function summVector(aPoint1, aPoint2:Point):Point {
    return new Point((aPoint1.x + aPoint2.x), (aPoint1.y + aPoint2.y));
}

function subVector(aPoint1, aPoint2:Point):Point {
    return new Point((aPoint1.x - aPoint2.x), aPoint1.y - aPoint2.y)
}

function mulScalVector(aPoint:Point, aMul:number):Point {
    return new Point((aPoint.x * aMul), (aPoint.y * aMul));
}

function mulScalVectors(aPoint1, aPoint2:Point):number {
    return (aPoint1.x * aPoint2.x) + (aPoint1.y * aPoint2.y);
}

function getPerpendicular(aPoint:Point) {
    return new Point(aPoint.y, - aPoint.x);
}

function absVector(aPoint:Point):number {
    return aPoint.abs();
}

function angleVector(aPoint1, aPoint2:Point):number {
    return Math.acos(mulScalVectors(aPoint1, aPoint2) / (aPoint1.abs() * aPoint2.abs())) * 180 / Math.PI;
}

function angleVectorRad(aPoint1, aPoint2:Point):number {
    return Math.acos(mulScalVectors(aPoint1, aPoint2) / (aPoint1.abs() * aPoint2.abs()));
}

// Возвращает угол против часовой стрелки от положительного направления оси X
function angleVectorRadCCW(aPoint: Point):number {
    var angle = angleVectorRad(aPoint, new Point(1, 0));
    if (aPoint.y < 0) angle = 2 * Math.PI - angle;
    return normalizeAngleRad(angle);
}

function normalizeAngleRad(angle: number): number{
    var pi2 = Math.PI * 2;
    var znak = (angle > 0) ? -1 : 1;
    for(;Math.abs(angle) > pi2;)
        angle += znak * pi2;
    return angle;
}

function radToGrad(rad:number):number {
    return rad * 180 / Math.PI;
}

function gradToRad(grad:number):number {
    return grad * Math.PI / 180.;
}

function distancePoints(aPoint1, aPoint2:Point):number {
    return subVector(aPoint1, aPoint2).abs();
}

class MoveTrack {
    timeStart:number; // UTC милисекунды делённые на 1000 => UTC секунды
    fuelStart:number;
    fuelDec:number;
    direction:number; // если машинка стоит на месте, то направление = direction

    constructor(aTimeStart, aFuelStart, aFuelDec, aDirection:number) {
        this.timeStart = aTimeStart;
        this.fuelStart = aFuelStart;
        this.fuelDec = aFuelDec;
        this.direction = aDirection;
    }

    getCurrentFuel(aCurrentTime:number):number {
        return this.fuelStart - this.fuelDec * ((aCurrentTime - this.timeStart));
    }

    getCurrentCoord(aClockTime:number):Point {
        return null;
    }

    getCurrentDirection(aClockTime:number):number {
        return null;
    }

    getRelativelyTime(aClockTime:number):number {
        return aClockTime - this.timeStart;
    }

    getCurrentSpeedAbs(aClockTime:number):number {
        return null;
    }
}

class MoveLine extends MoveTrack {
    coord:Point;
    speedV:Point;
    acceleration:Point;

    constructor(aTimeStart, aFuelStart, aFuelDec, aDirection:number, aCoord, aSpeedV, aAcceleration:Point) {
        super(aTimeStart, aFuelStart, aFuelDec, aDirection);
        this.coord = aCoord;
        this.speedV = aSpeedV;
        this.acceleration = aAcceleration;
    }

    getCurrentCoord(aClockTime:number):Point {
        // Pv = Av * t2 + Vv * t + S   =  acceleration * t * t    +   speedV * t   +   coord ;
        var t = this.getRelativelyTime(aClockTime);
        var a = mulScalVector(this.acceleration, t * t);
        var v = mulScalVector(this.speedV, t);
        var sum = summVector(a, v);
        return summVector(sum, this.coord);
    }

    getCurrentDirection(aClockTime:number):number {
        // возвращает угол относительно севера и не разворачивает машинку
       return this.direction;
    }

    getCurrentSpeedAbs(aClockTime:number):number {
        var t = this.getRelativelyTime(aClockTime);
        // Вычисляем текущую скорость Vt = A*t + V
        return summVector(mulScalVector(this.acceleration, t), this.speedV).abs();
    }
}

class MoveCircle extends MoveTrack {
    centerCircle:Point;
    angleStart:number;
    speedA:number;
    accelerationA:number;
    radiusVector: Point;
    CCW: number; // По часовой стрелке движение или против неё

    constructor(aTimeStart, aFuelStart, aFuelDec:number, aCenterCircle, aRadiusVector:Point, aAngleStart, aSpeedA, aAccelerationA, aCCW:number) {
        super(aTimeStart, aFuelStart, aFuelDec, 0);
        this.centerCircle = aCenterCircle;
        this.angleStart = aAngleStart;
        this.speedA = aSpeedA;
        this.accelerationA = aAccelerationA;
        this.radiusVector = aRadiusVector;
        this.CCW = aCCW;
    }

    getCurrentCoord(aClockTime:number):Point {
        return summVector(rotateVector(this.radiusVector, this._getCurrentRadiusAngle(aClockTime)),
                          this.centerCircle);
    }

    getCurrentDirection(aClockTime:number):number {
        // перпендикуляр текущего угла поворота радиус-Вектора
        return this.angleStart + (this.CCW == 0 ? -1 : 1) * Math.PI / 2 + this._getCurrentRadiusAngle(aClockTime) ;
    }

    _getCurrentRadiusAngle(aClockTime:number):number {
        var t = this.getRelativelyTime(aClockTime);
        //return this.angleStart + this.speedA * t + this.accelerationA * t * t;
        return this.speedA * t + this.accelerationA * t * t;
    }

    getCurrentSpeedAbs(aClockTime:number):number {
        return 0;
    }

}

class MapObject {
    ID:number;

    constructor(aID:number) {
        this.ID = aID;
    }

    getCurrentCoord(aClockTime:number):Point {
        return null;
    }
}

class StaticObject extends MapObject {
    coord:Point;

    constructor(aID:number, aCoord:Point) {
        super(aID);
        this.coord = aCoord;
    }

    getCurrentCoord(aClockTime:number):Point {
        return this.coord;
    }
}

class MapTown extends StaticObject {
    size:number;

    constructor(aID:number, aCoord:Point, aSize:number) {
        super(aID, aCoord);
        this.size = aSize;
    }
}

class MapGasStation extends StaticObject {
    constructor(aID:number, aCoord:Point) {
        super(aID, aCoord);
    }
}

class DynamicObject extends MapObject {
    track:MoveTrack;

    constructor(aID:number, aTrack:MoveTrack) {
        super(aID);
        this.track = aTrack;
    }

    getCurrentDirection(aClockTime:number):number {
        return this.track.getCurrentDirection(aClockTime);
    }

    getCurrentCoord(aClockTime:number):Point {
        return this.track.getCurrentCoord(aClockTime);
    }

    getCurrentFuel(aClockTime:number):number {
        return this.track.getCurrentFuel(aClockTime);
    }

    getCurrentSpeedAbs(aClockTime:number):number {
        return this.track.getCurrentSpeedAbs(aClockTime);
    }
}

class MapCar extends DynamicObject {
    type:number; // 1..5
    hp:number;
    fireSectors: Array<FireSector>;
    owner: Owner;

    constructor(aID, aType, aHP:number, aTrack:MoveTrack) {
        super(aID, aTrack);
        this.type = aType;
        this.hp = aHP;
        this.fireSectors = new Array<FireSector>();
    }

    AddFireSector(aFireSector) {
        this.fireSectors.push(aFireSector);
    }

    AddFireSectors(aSectors: Array<FireSector>) {
        for(var i=0; i<aSectors.length; i++)
            this.AddFireSector(aSectors[i]);
    }

    unbindOwner():MapCar {
        if(this.owner)
            this.owner.unbindCar(this);
        return this;
    }
}

class UserCar extends MapCar {
    maxSpeed:number;

    constructor(aID, aType, aHP, aMaxSpeed:number, aTrack:MoveTrack) {
        super(aID, aType, aHP, aTrack);
        this.maxSpeed = aMaxSpeed;
    }

}

class User {
    ID:number;
    credit:number;
    login: string;
    userCar:UserCar;

    constructor(aID, aCredit:number) {
        this.ID = aID;
        this.credit = aCredit;
    }
}

class FireSector {
    directionAngle:number;
    widthAngle:number;
    radius: number;
    uid: number;
    recharge: number;

    constructor(aDirectionAngle, aWidthAngle, aRadius, aUid, aRecharge: number) {
        this.directionAngle = aDirectionAngle;
        this.widthAngle = aWidthAngle;
        this.radius = aRadius;
        this.uid = aUid;
        this.recharge = aRecharge;
    }
}

class ListMapObject {
    objects:Array<MapObject>;

    constructor() {
        this.objects = new Array<MapObject>();
    }

    add(aObject:MapObject) {
        this.objects[aObject.ID] = aObject;
    }

    del(aID:number) {
        delete this.objects[aID];
        //this.objects[aID] = null;
    }

    exist(aID:number):boolean {
        if (this.objects[aID] != null) {
            return true;
        } else {
            return false;
        }
    }

    setCarHP(aID:number, aHP:number) {
        if (!(this.objects[aID] == null) && (this.objects[aID].hasOwnProperty("hp"))) {
            (<MapCar> this.objects[aID]).hp = aHP;
        }
    }

    getCarHP(aID:number, aHP:number):number {
        if (!(this.objects[aID] == null) && (this.objects[aID].hasOwnProperty("hp"))) {
            return (<MapCar> this.objects[aID]).hp;
        }
        return -1;
    }

    setTrack(aID:number, aTrack:MoveTrack) {
        if (!(this.objects[aID] == null) && (this.objects[aID].hasOwnProperty("track"))) {
            (<DynamicObject> this.objects[aID]).track = aTrack;
        }
    }
}

class Clock {
    dt:number; //разница между серверным и клиентским временем в секундах

    constructor() {
        this.dt = 0;
    }

    getCurrentTime():number {
        return new Date().getTime() / 1000. + this.dt;
    }

    // Для установки dt необходимо серверное время передать в секундах = UTC/1000.
    setDt(aTimeServer:number) {
        this.dt = aTimeServer - new Date().getTime() / 1000.;
    }

}

// Владелец машины
// TODO переписать так, чтобы у одного овнера был список его машин и при клике на Owner в чате они все подсвечивались
class Owner {
    uid:number;
    login:string;
    cars: Array <MapCar>;

    constructor(uid:number, login:string) {
        this.uid = uid;
        this.login = login;
        this.cars = new Array<MapCar>();
    }

    bindCar(aCar:MapCar):Owner {
        if(! this.car(aCar.ID)){
            aCar.owner = this;
            this.cars.push(aCar);
        }
        return this;
    }

    unbindCar(aCar):Owner {

        for(var i=0 ;i < this.cars.length; i++)
            if(this.cars[i].ID == aCar.ID){
                this.cars.splice(i, 1); // TODO: проверить, ту ли машинку здесь мы удаляем
                aCar.owner = null;
            }
        return this;
    }

    unbindAllCars():Owner {
        for(;this.cars.length > 0;) {
            var tcar = this.cars.pop();
            tcar.owner = null;
        }
        return this;
    }

    car(aID: number): MapCar {
        for(var i=0; i < this.cars.length; i++)
        if(this.cars[i].ID === aID)
            return this.cars[i];
        return null;
    }
}

// Список владельцев машин
class OwnerList {
    owners:Array<Owner>;

    constructor() {
        this.owners = new Array<Owner>();
    }

    add(owner:Owner):Owner {
        var exstOwner = this.getOwnerByUid(owner.uid);
        if (!exstOwner) {
            this.owners.push(owner);
            return owner;
        }
        return exstOwner;
    }

    getOwnerByUid(uid:number):Owner {
        for (var i = 0; i < this.owners.length; i++) {
            if (this.owners[i].uid === uid) {
                return this.owners[i];
            }
        }
        return null;
    }

    getOwnerByLogin(login:string):Owner {
        for (var i = 0; i < this.owners.length; i++) {
            if (this.owners[i].login === login) {
                return this.owners[i];
            }
        }
        return null;
    }

    clearOwnerList() {
        //for(;this.owners.length > 0;) this.owners.pop().unbindAllCars();
        for(var i=0; i < this.owners.length; i++) this.owners[i].unbindAllCars();

    }
}

