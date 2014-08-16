// Подсветка отдельного выбранного маркера
var BackLight = (function () {
    function BackLight(options) {
        this.options = {
            _map: null,
            color: '#ffff00',
            radius: 20,
            weight: 2,
            fillColor: '#ffff00',
            fillOpacity: 0.2
        };

        if (options) {
            if (options._map) this.options._map = options._map;
            if (options.color) this.options.color = options.color;
            if (options.radius) this.options.radius = options.radius;
            if (options.weight) this.options.weight = options.weight;
            if (options.fillColor) this.options.fillColor = options.fillColor;
            if (options.fillOpacity) this.options.fillOpacity = options.fillOpacity;
        }

        this.backCircle = L.circleMarker([0, 0], {
            weight: this.options.weight,
            color: this.options.color,
            fillColor: this.options.fillColor,
            fillOpacity: this.options.fillOpacity,
            clickable: false
        })
            .setRadius(this.options.radius)
            .addTo(this.options._map);

        this.pathSVG = [];
    }


    BackLight.prototype.del = function () {
        // TODO добавить удаление SVG
        //alert('сработал delete у беклайта');
        if (this.pathSVG)
            for(var i in this.pathSVG)
                controllers.fireControl.deleteCarInSector(this.pathSVG[i]);

        // Удаление кружка подсветки
        this.options._map.removeLayer(this.backCircle);
    };


    BackLight.prototype.draw = function (position) {
        this.backCircle.setLatLng(position);
        // TODO рисовать радар
    };


    return BackLight;
})();

// Подсветка выбранных маркеров
var BackLightList = (function () {
    function BackLightList(options) {
        this.options = {
            _map: null
        };
        if(options)
            if(options._map) this.options._map = options._map;
        this.backLightCars = [];
    }

    // Добавление машинки в список выделенных
    BackLightList.prototype.add = function (car) {
        if (!car.backLight) {
            car.backLight = new BackLight({_map: this.options._map});
            this.backLightCars.push(car);
        }
    };

    // Удаление машинки из списка выделеннных
    BackLightList.prototype.del = function(car) {
        var index = this.getIndexCarByID(car.ID);
        if (index >= 0 ){
            this.backLightCars.splice(index, 1);
            car.backLight.del();
            car.backLight = null;
        }
    };


    BackLightList.prototype.getIndexCarByID = function(uID){
        for (var i = 0; i < this.backLightCars.length; i++)
            if (this.backLightCars[i].ID == uID)
                return i;
        return -1;
    };


    BackLightList.prototype._getListIDsForShoot = function (sectorUid) {
        var listIDs = [];
        for (var i = 0; i < this.backLightCars.length; i++)
            // TODO: Проверить: является ли это верным решением
            if (this.backLightCars[i].backLight.pathSVG[sectorUid])
                listIDs.push(this.backLightCars[i].ID);
        return listIDs;
    };


    BackLightList.prototype.clearList = function () {
        for (; this.backLightCars.length > 0;)
            this.backLightCars.pop().backLight.del();
    };


    return BackLightList;
})();

// Общий класс для перерисовки всех машинок
var CarMarkerList = (function () {
    function CarMarkerList(options){
        this.options = {
            _map: myMap
        };

        if(options) {
            if(options._map) this.options._map = options._map;
        }

        this.backLightList = new BackLightList({_map: this.options._map});
    }

    CarMarkerList.prototype.clearList = function () {
        // очистить backLightList
        this.backLightList.clearList();
        // очистить listMapObject
        for(var i in listMapObject.objects){
            this.del(listMapObject.objects[i].ID);
        }
    }

    // Добавление машинки
    CarMarkerList.prototype.add = function (aCar, aOwner) {
        // Бинд машинки и её хозяина
        aOwner.bindCar(aCar);
        // Добавление машинки в listMapObject
        listMapObject.add(aCar);
        // И сразу же добавить маркер
        aCar.marker = getCarMarker(aCar, this.options._map);
    };

    // Удаление машинки
    CarMarkerList.prototype.del = function(uid){
        if (listMapObject.exist(uid)) {
            var car = listMapObject.objects[uid];
            car.unbindOwner();
            this.options._map.removeLayer(car.marker);

            this.backLightList.del(car);
            delete car.marker;
            listMapObject.del(uid);
        }
    };


    CarMarkerList.prototype.draw = function(aClockTime) {
        for (var i in listMapObject.objects) {
            if (listMapObject.exist(i)) {
                // пересчёт координат
                var car = listMapObject.objects[i];
                var tempPoint = car.getCurrentCoord(aClockTime);
                var tempLatLng = this.options._map.unproject([tempPoint.x, tempPoint.y],
                                                             this.options._map.getMaxZoom());
                // пересчёт угла
                // Установка угла в для поворота иконки маркера (в градусах)
                car.marker.options.angle = car.getCurrentDirection(aClockTime);
                // Установка новых координат маркера);
                car.marker.setLatLng(tempLatLng);
                // Отрисовка backLight
                if (car.backLight){
                    car.backLight.draw(tempLatLng);
                    this.drawCarInSector(car, tempPoint);
                }
            }
        }
    };

    // Метод, который управляет добавлением/удалением/апдейтом машинок в секторах радара
    // Сделано тут, т.к. для перерисовки нужны distance и угол fi - а они тут сразу и вычисляются
    // TODO потестить попадание машинок в каждый из секторов, отключая сектора на сервере
    CarMarkerList.prototype.drawCarInSector = function(car, position) {
        // Проверить на вхождение в сектора
        var distance = distancePoints(userCarMarker.currentUserCarPoint, position);
        var targetAngle = angleVectorRadCCW(subVector(position, userCarMarker.currentUserCarPoint));

        for (var i = 0; i < user.userCar.fireSectors.length; i++) {
            var sector = user.userCar.fireSectors[i];
            var fi = getDiffAngle((userCarMarker.currentUserCarAngle + sector.directionAngle), targetAngle);

            var distBool = distance <= sector.radius;
            var fiBool = Math.abs(fi) <= (sector.widthAngle / 2.);

            // TODO при частом change_car() на сервер car.owner.login начинает глючить
            if (distBool && fiBool) {
                //chat.addMessageToSystem(car.owner.login + (sector.uid), "car in sector " + (sector.uid) + " login=" + car.owner.login);
                // если машинка в секторе, то... если её там раньше не было, то добавить (и только добавить!)
                if (!car.backLight.pathSVG[sector.uid]) {
                    // добавление SVG-path в fireControl
                    car.backLight.pathSVG[sector.uid] = controllers.fireControl.addCarInSector(sector, (distance / sector.radius), -fi);
                    return;
                } else {
                    // Отрисовать машинку в радаре с новыми относительными координатами
                    controllers.fireControl.updateCarInSector(sector, car.backLight.pathSVG[sector.uid], (distance / sector.radius), -fi);
                    return;
                }
            }
            else {
                // Если машинка вне сектора, то если она там была, убрать её оттуда
                if (car.backLight.pathSVG[sector.uid]) {
                    // удаление SVG-path из fireControl
                    car.backLight.pathSVG[sector.uid] = controllers.fireControl.deleteCarInSector(car.backLight.pathSVG[sector.uid]);
                    return;

                }

            }
        }
    }

    CarMarkerList.prototype.getListIDsForShoot = function (sectorUid) {
        return this.backLightList._getListIDsForShoot(sectorUid);
    };

    return CarMarkerList;
})();
