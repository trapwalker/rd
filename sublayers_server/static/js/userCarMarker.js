// Класс очередь
var SubLayersQueue = (function () {
    function SubLayersQueue() {
        this._queue = [];
        this._queueLength = 30;
    }

    SubLayersQueue.prototype.addPoint = function (aPoint) {
        this._queue.unshift(aPoint); // добавить точку в начало массива
        if (this._queue.length > this._queueLength)
            this._queue.pop(); // убрать послдений элемент, если больше 20.
    }

    SubLayersQueue.prototype.getPointA = function () {
        if (this._queue.length >= this._queueLength)
            return this._queue[(1 * this._queueLength / 3).toFixed(0)];
    }

    SubLayersQueue.prototype.getPointB = function () {
        if (this._queue.length >= this._queueLength)
            return this._queue[(2 * this._queueLength / 3).toFixed(0)];
    }

    SubLayersQueue.prototype.getPointC = function () {
        if (this._queue.length >= this._queueLength)
            return this._queue[(3 * this._queueLength / 3).toFixed(0) - 1];
    }

    SubLayersQueue.prototype.getPoints = function () {
        if (this._queue.length >= this._queueLength) {
            var points = [];
            points[0] = this.getPointA();
            points[1] = this.getPointB();
            points[2] = this.getPointC();
            return points;
        }
    }

    return SubLayersQueue;
})();

// Шлейф от машинки.
// Передавать в качетсве точек только latlng - точки !
// Метод setActive нужно повесить в кол-бек на изменение зума
var CarTail = (function () {
    function CarTail(options) {
        this.options = {
            aStartPoint: null,
            _map: null,
            _enable: false
        };

        if (options) {
            if (options.aStartPoint) this.options.aStartPoint = options.aStartPoint;
            if (options._map) this.options._map = options._map;
            if (options._enable) this.options._enable = options._enable;
        }

        // Создание очереди
        this._tail = new SubLayersQueue();
        // заполнение очереди (изначально одинаковыми значениями)
        for (var i = 0; i < this._tail._queueLength; i++)
            this._tail.addPoint(this.options.aStartPoint);

        // Создание сразу трёх маркеров
        this._tailPath1 = L.circleMarker([0, 0], {color: '#11FF11', clickable: false}).setRadius(5);
        this._tailPath2 = L.circleMarker([0, 0], {color: '#11FF11', clickable: false}).setRadius(3.5);
        this._tailPath3 = L.circleMarker([0, 0], {color: '#11FF11', clickable: false}).setRadius(2);

        // Добавить или не доавбить маркеры на карту
        this.setActive(this.options._enable);
    }

    CarTail.prototype.drawTail = function (newPoint) {
        // пересчёт новой точки
        this._tail.addPoint(newPoint);
        if (this.options._enable) {
            // перерисовка трёх маркеров
            var tempPoints = this._tail.getPoints();
            this._tailPath1.setLatLng(tempPoints[0]);
            this._tailPath2.setLatLng(tempPoints[1]);
            this._tailPath3.setLatLng(tempPoints[2]);
        }
    }

    CarTail.prototype.setActive = function (enable) {
        this.options._enable = enable;
        if (enable) {
            var tempPoints = this._tail.getPoints();
            this._tailPath1.setLatLng(tempPoints[0]).addTo(this.options._map);
            this._tailPath2.setLatLng(tempPoints[1]).addTo(this.options._map);
            this._tailPath3.setLatLng(tempPoints[2]).addTo(this.options._map);
        }
        else {
            this.options._map.removeLayer(this._tailPath1);
            this.options._map.removeLayer(this._tailPath2);
            this.options._map.removeLayer(this._tailPath3);
        }
    }

    return CarTail;
})();

//Сектора стрельбы
var SectorsView = (function () {
    function SectorsView(options) {
        this.options = {
            _map: null,
            rotateAngle: 0,
            sectors: [],
            countPoints: 10
        };

        if (options) {
            if (options._map) this.options._map = options._map;
            if (options.countPoints) this.options.countPoints = options.countPoints;
        }

        // Сделать addSector для каждого элемента массива options.sectors
        if (options.sectors)
            for (var i = 0; i < options.sectors.length; i++) {
                this.addSector(options.sectors[i]);
            }
    }

    SectorsView.prototype.addSector = function (fireSector) {
        var sector = {};
        var tempWidth = fireSector.widthAngle / 2;
        var vertV = new Point(fireSector.radius, 0);
        var vertVIn = new Point(25, 0);

        //внесли центр сектора
        sector._points = [];
        //sector._points.push(new Point(0, 0));

        //добавление точек сектора
        for (var angle = -tempWidth; angle <= tempWidth;
             angle += fireSector.widthAngle / (this.options.countPoints - 1)) {
            sector._points.push(new rotateVector(vertV, angle));
        }

        //внутренние точки
        //добавление точек сектора
        for (var angle = tempWidth; angle >= -tempWidth;
             angle -= fireSector.widthAngle / (this.options.countPoints - 1)) {
            sector._points.push(new rotateVector(vertVIn, angle));
        }

        sector._fireSector = fireSector;
        this.options.sectors.push(sector);
    }

    SectorsView.prototype.drawSectors = function (aNewPoint, aNewAngle) {
        this.options.sectors.forEach(function (sector) {
            if (this.map.hasLayer(sector.polygon)) {
                this.map.removeLayer(sector.polygon);
            }

            var tempCenter = this.map.project(this.center, 16);
            var tempAngle = this.angle + sector._fireSector.directionAngle;

            var tempPoints = [];

            for(var i = 0; i < sector._points.length; i++) {
                var tempPoint = summVector(tempCenter, rotateVector(sector._points[i], tempAngle));
                tempPoints.push(this.map.unproject([tempPoint.x, tempPoint.y], 16));
            }

            sector.polygon = L.polygon(tempPoints, {
                    weight: 0,
                    fillColor: '#32cd32',
                    fillOpacity: 0.2,
                    clickable: false
                });

            this.map.addLayer(sector.polygon);

        }, {center: aNewPoint, angle: aNewAngle, map: this.options._map});

    };

    return SectorsView;
})();


// Траектория движения (TrackView)
var TrackView = (function (){
    function TrackView(options){
        this.trackes = [];
        this.currentTrack = null;
        this.isActive;
        this.map = options.map;
    }


    TrackView.prototype.empty = function () {
        for (var i = 0; i < this.trackes.length; i++) {
            this.map.removeLayer(this.trackes[i].line);
        }
        if (this.currentTrack)
            this.map.removeLayer(this.currentTrack.line);

        // TODO: Проверить, будет ли здесь течь память, так как просто присваивается 0 массиву
        this.trackes.length = 0;
        this.currentTrack = null;
    };


    TrackView.prototype.addLinear = function(aTrack){
        var obj = {
            a: aTrack.a,
            b: aTrack.b,
            dist: distancePoints(aTrack.a, aTrack.b),
            bl: this.map.unproject([aTrack.b.x, aTrack.b.y], 16)
        };

        obj.line = L.polyline([
            this.map.unproject([obj.a.x, obj.a.y], 16),
            obj.bl
        ],{
            stroke: true,
            color: '#00FF00',
            weight: '1px',
            dashArray: "5, 5"
        }).addTo(this.map);

        this.trackes.push(obj);
    };


    TrackView.prototype.draw  = function(aPos){
        var tempPoint = this.map.project(aPos, 16);
        if (!this.currentTrack) {
            if (this.trackes.length >= 1) {
                this.currentTrack = this.trackes.shift();
            }
        }
        else if (distancePoints(tempPoint, this.currentTrack.a) >= this.currentTrack.dist) {
            this.map.removeLayer(this.currentTrack.line);
            if (this.trackes.length >= 1) {
                this.currentTrack = this.trackes.shift();
            }
            else {
                this.currentTrack = null;
            }
        }

        if(this.currentTrack){
            // перерисовываем текущую линию
            this.currentTrack.line.setLatLngs([
                this.currentTrack.bl,
                aPos
            ]);
        }

}


    return TrackView;
})();

// Класс нужен для централизованного рисования машинки пользователя и сопутствующих объектов
var UserCarMarker = (function () {
    function UserCarMarker(options) {
        this.options = {
            position: null,
            tailEnable: false,
            _map: null,
            radiusView: 0,
            carID: null,
            countSectorPoints: 10
        }

        if (options) {
            if (options.position) this.options.position = options.position;
            if (options.tailEnable) this.options.tailEnable = options.tailEnable;
            if (options._map) this.options._map = options._map;
            if (options.carID) this.options.carID = options.carID;
            if (options.radiusView) this.options.radiusView = options.radiusView;
            if (options.countSectorPoints) this.options.countSectorPoints = options.countSectorPoints;
        }

        // Создание Маркера
        this.marker = L.rotatedMarker(this.options.position).addTo(this.options._map);
        this.marker.setIcon(L.icon({
            iconUrl: 'img/car_user.png',
            iconSize: [35, 35]
        }));
        this.marker.carID = this.options.carID;

        // Повесить PopUp и ивент на него
        //this.marker.on('popupopen', onMarkerPopupOpen);
        //this.marker.bindPopup('popUp');

        // Создание шлейфа
        this.tail = new CarTail({
            aStartPoint: this.options.position,
            _map: this.options._map,
            _enable: this.options.tailEnable
        });

        // Создание круга обзора
        this.circleView = L.circle(this.options.position, this.options.radiusView * 1.5,
            {
                weight: 0,
                fillColor: '#32cd32',
                fillOpacity: 0.2,
                clickable: false
            }
        ).addTo(this.options._map);

        // Создание секторов стрельбы
        this.sectorsView = new SectorsView({
            _map: this.options._map,
            sectors: options.sectors,
            countPoints: this.options.countSectorPoints
        });

        // Создание траекторий движения (TrackView)
        this.trackView = new TrackView({
            map: this.options._map
        });
    }

    UserCarMarker.prototype.draw = function (aNewPoint, aNewAngle) {
        // Перерисовка маркера
        // Установка угла в для поворота иконки маркера (в градусах)
        this.marker.options.angle = aNewAngle;
        // Установка новых координат маркера
        this.marker.setLatLng(aNewPoint);

        // Перерисовка шлейфа
        this.tail.drawTail(aNewPoint); // только на максимальных приближениях будет рисоваться хвост

        // Перерисовка круга обзора
        this.circleView.setLatLng(aNewPoint);

        // Перерисовка секторов стрельбы
        this.sectorsView.drawSectors(aNewPoint, aNewAngle);

        // Перерисовка траектории
        if(! flagDebug)
            this.trackView.draw(aNewPoint);
    }

    return UserCarMarker;
})();


