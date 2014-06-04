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
}

function summVector(aPoint1, aPoint2: Point): Point {
    return new Point((aPoint1.x + aPoint2.x), (aPoint1.y + aPoint2.y));
}

function mulScalVector(aPoint: Point, aMul: number) {
    return new Point((aPoint.x * aMul), (aPoint.y * aMul));
}

class MoveTrack {
    timeStart: number;
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
        return this.fuelStart - this.fuelDec * ((aCurrentTime - this.timeStart) / 1000);
    }

    getCurrentCoord(aClockTime: number): Point {
        return null;
    }

    getCurrentDirection(): Point {
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

    getCurrentDirection(): Point {
        return null;
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

    getCurrentDirection(): Point {
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

    getCurrentDirection(): Point {
        return this.track.getCurrentDirection();
    }

    getCurrentCoord(aClockTime: number): Point {
        return this.track.getCurrentCoord(aClockTime);
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
    maxSpeed: number; // 1..5
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
    delay: number;
    dt: number; //разница между серверным и клиентским временем

    constructor(aDelay: number) {
        this.delay = aDelay;
        this.dt = 0;
    }

    getCurrentTime(): number {
        return new Date().getTime() + this.dt;
    }

    setDt(aTimeServer: number) {
        this.dt = aTimeServer - new Date().getTime();
    }

}


window.onload = () => {


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