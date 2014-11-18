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
            countPoints: 10,
            shootDelay: 15    // количество "тиков" перерисовки состояния "выстрел" (до перезарядки)
        };

        if (options) {
            if (options._map) this.options._map = options._map;
            if (options.countPoints) this.options.countPoints = options.countPoints;
            if (options.shootDelay) this.options.shootDelay = Math.round(options.shootDelay);
        }

        // Сделать addSector для каждого элемента массива options.sectors
        if (options.sectors)
            for (var i = 0; i < options.sectors.length; i++) {
                this.addSector(options.sectors[i]);
            }
    }

    SectorsView.prototype.addSector = function (fireSector) {
        var angle;
        var sector = {};
        var tempWidthAll = fireSector.widthAngle / 2;
        var tempWidthCrit = fireSector.widthAngle / 4;

        var vertAll = new Point(fireSector.radius, 0);
        var vertCrit = new Point(fireSector.radius * 0.75, 0);
        var vertVIn = new Point(25, 0);

        var dAngleAll = fireSector.widthAngle / (this.options.countPoints - 1);
        var dAngleCrit = tempWidthAll / (this.options.countPoints - 1);

        sector._pointsAll = [];
        sector._pointsCrit = [];

        //добавление точек сектора
        //внешнии точки
        for (angle = -tempWidthAll; angle <= tempWidthAll; angle += dAngleAll)
            sector._pointsAll.push(rotateVector(vertAll, angle));
        //внутренние точки
        for (angle = tempWidthAll; angle >= -tempWidthAll; angle -= dAngleAll)
            sector._pointsAll.push(rotateVector(vertVIn, angle));

        //добавление точек области крита
        //внешнии точки
        for (angle = -tempWidthCrit; angle <= tempWidthCrit; angle += dAngleCrit)
            sector._pointsCrit.push(rotateVector(vertCrit, angle));
        //внутренние точки
        for (angle = tempWidthCrit; angle >= -tempWidthCrit; angle -= dAngleCrit)
            sector._pointsCrit.push(rotateVector(vertVIn, angle));

        sector.shootState = 0; // Состояние выстрела/перезарядки/нормальное
        sector._fireSector = fireSector;
        this.options.sectors.push(sector);
    }

    SectorsView.prototype.drawSectors = function (aNewPoint, aNewAngle) {
        this.options.sectors.forEach(function (sector) {
            var tempCenter = this.center;
            var tempAngle = this.angle + sector._fireSector.directionAngle;

            var tempPointsAll = [];
            var tempPointsCrit = [];

            var tempPoint;

            for(var i = 0; i < sector._pointsAll.length; i++) {
                tempPoint = summVector(tempCenter, rotateVector(sector._pointsAll[i], tempAngle));
                tempPointsAll.push(this.map.unproject([tempPoint.x, tempPoint.y], this.map.getMaxZoom()));
            }

            for(var i = 0; i < sector._pointsCrit.length; i++) {
                tempPoint = summVector(tempCenter, rotateVector(sector._pointsCrit[i], tempAngle));
                tempPointsCrit.push(this.map.unproject([tempPoint.x, tempPoint.y], this.map.getMaxZoom()));
            }

            if (this.map.hasLayer(sector.polygonAll)) {
                sector.polygonAll.setLatLngs(tempPointsAll);
                sector.polygonCrit.setLatLngs(tempPointsCrit);

                if (sector.shootState > 0) { // Если был выстрел, т.е. сейчас жёлтый(оранжевый) сектор
                    sector.shootState--;

                    sector.polygonAll.setStyle({
                        fillOpacity: (this.shootDelay - sector.shootState) / this.shootDelay * 0.8
                    });

                    if(sector.shootState == 0) { // "Анимация" выстрела прошла, началась перезарядка
                        // Сделать серым - т.е. сектор перезаряжается
                        sector.polygonAll.setStyle({
                            fillColor: '#666666',
                            fillOpacity: 0.4
                        });
                    }
                }
            }
            else {
                sector.polygonAll = L.polygon(tempPointsAll, {
                    weight: 0,
                    fillColor: '#32cd32',
                    fillOpacity: 0.2,
                    clickable: false
                });
                sector.polygonCrit = L.polygon(tempPointsCrit, {
                    weight: 0,
                    fillColor: '#32cd32',
                    fillOpacity: 0.08,
                    clickable: false
                });
                this.map.addLayer(sector.polygonAll);
                this.map.addLayer(sector.polygonCrit);
            }
        }, {center: aNewPoint, angle: aNewAngle, map: this.options._map, shootDelay: this.options.shootDelay});
    };

    SectorsView.prototype.setNormalState = function (fireSector) {
        var sector = this._getSectorByID(fireSector);
        if (sector) {
            // Установить нормальное состояние - сделать зелёным
            sector.polygonAll.setStyle({
                fillColor: '#32cd32',
                fillOpacity: 0.2
            });
        }
    };

    SectorsView.prototype.setAllNormalState = function () {
        this.options.sectors.forEach(function (sector) {
            // Установить нормальное состояние - сделать зелёным
            sector.polygonAll.setStyle({
                fillColor: '#32cd32',
                fillOpacity: 0.2
            });
        });
    };

    SectorsView.prototype.setShootState = function (fireSector) {
        var sector = this._getSectorByID(fireSector);
        if (sector) {
            // Установить состояние выстрела
            sector.shootState = this.options.shootDelay;
            sector.polygonAll.setStyle({
                fillColor: '#9acd32',
                fillOpacity: 0
            });
        }
    };

    SectorsView.prototype.setSelectedState = function (fireSector) {
        var sector = this._getSectorByID(fireSector);
        if(sector == null) return;

        if (sector != null) {
            if (!this.currSectorActive && sector) {
                this.currSectorActive = sector;
                // Установить заселекченное состояние
                sector.polygonAll.setStyle({fillOpacity: 0.6});
            }
            else {
                var uid1 = this.currSectorActive._fireSector.uid;
                var uid2 = fireSector.uid;
                if (uid1 != uid2) { // если новый сектор
                    // сначала сделать нормальным старый сектор
                    this.currSectorActive.polygonAll.setStyle({fillOpacity: 0.2});
                    // присвоить новый
                    this.currSectorActive = sector;
                    // сделать выделение
                    this.currSectorActive.polygonAll.setStyle({fillOpacity: 0.5});
                }
            }
        }
    };

    SectorsView.prototype.setSelectedToNormalState = function () {
        // сделать нормальным старый сектор
        if (this.currSectorActive)
            if (this.currSectorActive.polygonAll) {
                this.currSectorActive.polygonAll.setStyle({fillOpacity: 0.2});
                this.currSectorActive = null;
            }
    };

    SectorsView.prototype._getSectorByID = function(fireSector){
        for(var i in this.options.sectors){
            if (this.options.sectors[i]._fireSector.uid == fireSector.uid)
                return this.options.sectors[i];
        }
        return null;
    };

    SectorsView.prototype.clearSectors = function(){
        for(;this.options.sectors.length > 0;){
            var sector = this.options.sectors.pop();
            // Удалить сначала с карты
            this.options._map.removeLayer(sector.polygonAll);
            this.options._map.removeLayer(sector.polygonCrit);
            // Удалить присвоенные структуры
            sector._pointsAll = null;
            sector._pointsCrit = null;
            sector._fireSector = null;
            sector.polygonAll = null;
            sector.polygonCrit = null;
        }
        this.options.sectors = [];
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
            bl: this.map.unproject([aTrack.b.x, aTrack.b.y], this.map.getMaxZoom())
        };

        obj.line = L.polyline([
            this.map.unproject([obj.a.x, obj.a.y], this.map.getMaxZoom()),
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
        var tempPoint = this.map.project(aPos, this.map.getMaxZoom());
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
        this.marker.setIcon(iconsLeaflet.icon_moving_V1);
        //this.marker.setIcon(L.icon({
        //    iconUrl: 'img/car_user.png',
        //    iconSize: [35, 35]
        //}));
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
        this.circleView = L.circleMarker(this.options.position,
            {
                weight: 0,
                color: '#32cd32',
                fillOpacity: 0.12,
                clickable: false,
                className: 'sublayers_unclickable'
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


        // Инициализация переменных
        this.currentUserCarPoint = {};
        this.currentUserCarAngle = 0;
        this.currentUserCarLatLng = [];

        //
        this.setNewZoom();
    }

    UserCarMarker.prototype.setNewParams = function(options){
        // переопределение опций
        if (options) {
            if (options.position) this.options.position = options.position;
            if (options.tailEnable) this.options.tailEnable = options.tailEnable;
            if (options._map) this.options._map = options._map;
            if (options.carID) this.options.carID = options.carID;
            if (options.radiusView) this.options.radiusView = options.radiusView;
            if (options.countSectorPoints) this.options.countSectorPoints = options.countSectorPoints;
        }

        // Создание Маркера не требуется, только установить ему новый carID
        this.marker.carID = this.options.carID;
        this.marker.setIcon(iconsLeaflet.icon_moving_V1);

        // Создание шлейфа не требуется, только обновить параметр отображения
        //TODO: Хвостик. Потом рзобраься с хвостиком: переделать или удалить. Вынесено на обсуждение после демоверсии
        //this.tail.setActive(this.options.tailEnable);
        this.tail.setActive(false);

        // Изменение радиуса круга обзора
        this.setNewZoom();

        // Очистка секторов и добавление новых
        this.sectorsView.clearSectors();
        for(var i in options.sectors)
            this.sectorsView.addSector(options.sectors[i]);

        // TrackView убрать старую траекторию
        this.trackView.empty();

    }

    UserCarMarker.prototype.draw = function (aClockTime) {
        this.currentUserCarPoint = user.userCar.getCurrentCoord(aClockTime);
        this.currentUserCarAngle = user.userCar.getCurrentDirection(aClockTime);
        this.currentUserCarLatLng = this.options._map.unproject([this.currentUserCarPoint.x, this.currentUserCarPoint.y],
            this.options._map.getMaxZoom());


        // Перерисовка маркера
        // Установка угла в для поворота иконки маркера (в градусах)
        this.marker.options.angle = this.currentUserCarAngle;

        // Установка новых координат маркера
        this.marker.setLatLng(this.currentUserCarLatLng);

        // Перерисовка шлейфа
        // TODO: Хвостик. Позже раскоментить, когда решим что с ним делать
        //this.tail.drawTail(this.currentUserCarLatLng); // только на максимальных приближениях будет рисоваться хвост

        // Перерисовка круга обзора
        this.circleView.setLatLng(this.currentUserCarLatLng);

        // Перерисовка секторов стрельбы
        this.sectorsView.drawSectors(this.currentUserCarPoint, this.currentUserCarAngle);

        // Перерисовка траектории
        if(! cookieStorage.debugMode())
            this.trackView.draw(this.currentUserCarLatLng);


        // TODO: Отрисовать свои дебаг линии
        // отрисовка линий
        if (cookieStorage.optionsShowDebugLine) {// если нужно рисовать
            if (user.userCar.debugLines)
                for (var line in user.userCar.debugLines) {
                    if(line.plln)
                    line.plln.setLatLngs([line.m1.getLatLng(), line.m2.getLatLng()]);
                }
        }
    }

    UserCarMarker.prototype.addContactLine = function(objID){
        // TODO: разобраться почему не обновляет линии и насколько правилно он их добавляет
        var carO;
        var m1, m2;
        if(listMapObject.exist(objID))
            carO= listMapObject.objects[objID];
        else {
            alert('Ошибка! Объект контакта не найден!');
            return;
        }
        m1 = this.marker;
        m2 = carO.marker;

        var plln = L.polyline([m1.getLatLng(),m2.getLatLng()], {color: 'red'});

        user.userCar.debugLines[objID] = {
            m1: m1,
            m2: m2,
            plln: plln
        };
        if(cookieStorage.optionsShowDebugLine)// если рисовать линию
            plln.addTo(myMap);


    };

    UserCarMarker.prototype.delContactLine = function(){

    };

    UserCarMarker.prototype.setNewZoom = function(){
        // Изменение радиуса viewCircle
        if(this.options._map){
            var koeff = 1 / (Math.pow(2, (this.options._map.getMaxZoom() - this.options._map.getZoom())));
            this.circleView.setRadius(this.options.radiusView * koeff);
        }
    };

    return UserCarMarker;
})();


