/**
 * Created by Admin on 04.06.2014.
 */

class Point {
    x: number;
    y: number;

    constructor(ax: number, ay: number) {
        this.x = ax;
        this.y = ay;
    }

    abs():number{
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }
}

function summVector(aPoint1, aPoint2: Point): Point {
    return new Point((aPoint1.x + aPoint2.x), (aPoint1.y + aPoint2.y));
}

function mulScalVector(aPoint: Point, aMul: number) {
    return new Point((aPoint.x * aMul), (aPoint.y * aMul));
}

function mulScalVectors(aPoint1: Point, aPoint2: Point) {
    return (aPoint1.x * aPoint2.x) + (aPoint1.y * aPoint2.y);
}

function absVector(aPoint: Point):number{
    return aPoint.abs();
}

function angleVector(aPoint1: Point, aPoint2: Point): number{
    return Math.acos(mulScalVectors(aPoint1, aPoint2) /(aPoint1.abs() * aPoint2.abs()))*180/Math.PI;
}

function angleVectorRad(aPoint1: Point, aPoint2: Point): number{
    return Math.acos(mulScalVectors(aPoint1, aPoint2) /(aPoint1.abs() * aPoint2.abs()));
}

class MoveTrack {
    timeStart: number; // UTC милисекунды делённые на 1000 => UTC секунды
    fuelStart: number;
    fuelDec: number;
    reliefType: number; // 0,1,2,3

    constructor(aTimeStart: number, aFuelStart: number, aFuelDec: number, aReliefType: number) {
        this.timeStart = aTimeStart;
        this.fuelStart = aFuelStart;
        this.fuelDec = aFuelDec;
        this.reliefType = aReliefType;
    }

    getCurrentFuel(aCurrentTime: number): number {
        return this.fuelStart - this.fuelDec * ((aCurrentTime - this.timeStart));
    }

    getCurrentCoord(aClockTime: number): Point {
        return null;
    }

    getCurrentDirection(aClockTime: number): number {
        return null;
    }

    getRelativelyTime(aClockTime: number): number {
        return aClockTime - this.timeStart;
    }
}

class MoveLine extends MoveTrack {
    coord: Point;
    speedV: Point;
    acceleration: Point;

    constructor(aTimeStart: number, aFuelStart: number, aFuelDec: number, aReliefType: number,
                aCoord: Point, aSpeedV: Point, aAcceleration: Point) {
        super(aTimeStart, aFuelStart, aFuelDec, aReliefType);
        this.coord = aCoord;
        this.speedV = aSpeedV;
        this.acceleration = aAcceleration;
    }

    getCurrentCoord(aClockTime: number): Point {
        // Pv = Av * t2 + Vv * t + S   =  acceleration * t * t    +   speedV * t   +   coord ;
        var t = this.getRelativelyTime(aClockTime);
        var a = mulScalVector(this.acceleration, t*t);
        var v = mulScalVector(this.speedV, t);
        var sum = summVector(a, v);
        return summVector(sum, this.coord);
    }

    getCurrentDirection(aClockTime: number): number { // Машинка всегда развёрнута по текущей скорости
        // Вычисляем относительное время t
        var t = this.getRelativelyTime(aClockTime);
        // Вычисляем текущую скорость Vt = A*t + V
        var Vt = summVector(mulScalVector(this.acceleration, t), this.speedV);
        // Угол в радианах равен углу между единичным вектором и текущей скоростью
        return angleVectorRad(Vt, new Point(1,0));
    }

}

class MoveCircle extends MoveTrack {
    centerCircle: Point;
    angleStart: number;
    speedA: number;
    accelerationA: number;
    radius: number;

    constructor(aTimeStart: number, aFuelStart: number, aFuelDec: number, aReliefType: number,
                aCenterCircle: Point, aAngleStart: number, aSpeedA: number, aAccelerationA: number,
                aRadius: number) {
        super(aTimeStart, aFuelStart, aFuelDec, aReliefType);
        this.centerCircle = aCenterCircle;
        this.angleStart = aAngleStart;
        this.speedA = aSpeedA;
        this.accelerationA = aAccelerationA;
        this.radius = aRadius;
    }

    refresh(): boolean {
        return false;
    }

    getCurrentCoord(aClockTime: number): Point {
        return null;
    }

    getCurrentDirection(aClockTime: number): number {
        return null;
    }

}

class MapObject {
    ID: number;

    constructor(aID: number) {
        this.ID = aID;
    }

    getCurrentCoord(aClockTime: number): Point {
        return null;
    }
}

class StaticObject extends MapObject {
    coord: Point;

    constructor(aID: number, aCoord: Point) {
        super(aID);
        this.coord = aCoord;
    }

    getCurrentCoord(aClockTime: number): Point {
        return this.coord;
    }
}

class MapTown extends StaticObject {
    size: number;

    constructor(aID: number, aCoord: Point, aSize: number)
    {
        super(aID, aCoord);
        this.size = aSize;
    }
}

class MapGasStation extends StaticObject {
    constructor(aID: number, aCoord: Point) {
        super(aID, aCoord);
    }
}

class DynamicObject extends MapObject {
    track: MoveTrack;

    constructor(aID: number, aTrack: MoveTrack) {
        super(aID);
        this.track = aTrack;
    }

    getCurrentDirection(aClockTime: number): number {
        return this.track.getCurrentDirection(aClockTime);
    }

    getCurrentCoord(aClockTime: number): Point {
        return this.track.getCurrentCoord(aClockTime);
    }

    getCurrentFuel(aClockTime: number): number {
        return this.track.getCurrentFuel(aClockTime);
    }
}

class MapCar extends DynamicObject {
    type: number; // 1..5
    hp: number;

    constructor(aID: number, aTrack: MoveTrack, aType: number, aHP: number) {
        super(aID, aTrack);
        this.type = aType;
        this.hp = aHP;
    }

}

class UserCar extends MapCar {
    maxSpeed: number;
    speed: number;

    constructor(aID: number, aTrack: MoveTrack, aType: number, aHP: number, aMaxSpeed: number, aSpeed: number) {
        super(aID, aTrack, aType, aHP);
        this.maxSpeed = aMaxSpeed;
        this.speed = aSpeed;
    }

}

class User {
    ID: number;
    credit: number;
    userCar: UserCar;

    constructor(aID: number, aCredit: number) {
        this.ID = aID;
        this.credit = aCredit;
    }

}

class ListMapObject {
    //objects: MapObject[];
    objects: Array<MapObject>;

    constructor() {
        this.objects = new Array<MapObject>();
    }

    addObject(aMapObject: MapObject) {
        this.objects[aMapObject.ID] = aMapObject;
    }

    delObject(aID: number) {
        this.objects[aID] = null;
    }
}

class Clock {
    dt: number; //разница между серверным и клиентским временем в секундах

    constructor() {
        this.dt = 0;
    }

    getCurrentTime(): number {
        return new Date().getTime()/1000. + this.dt;
    }

    // Для установки dt необходимо серверное время передать в секундах = UTC/1000.
    setDt(aTimeServer: number) {
        this.dt = aTimeServer - new Date().getTime()/1000.;
    }

}


