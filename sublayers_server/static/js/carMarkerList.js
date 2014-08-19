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
    }


    BackLight.prototype.del = function () {
        // Удаление кружка подсветки
        this.options._map.removeLayer(this.backCircle);
    };


    BackLight.prototype.draw = function (position) {
        this.backCircle.setLatLng(position);
    };


    return BackLight;
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
    }

    CarMarkerList.prototype.clearList = function () {
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

        // Если Owner с User в одной пати, то подстветить машинку (чтобы потом её не дамажить)
        if(aCar.owner.party.id == user.party.id)
            this.addToBackLight(aCar);

        aCar.pathSVG = [];
    };

    // Добавление машинки в список выделенных
    CarMarkerList.prototype.addToBackLight = function (car) {
        if (!car.backLight) {
            car.backLight = new BackLight({_map: this.options._map});
        }
    };

    // Удаление машинки
    CarMarkerList.prototype.del = function(uid){
        if (listMapObject.exist(uid)) {
            var car = listMapObject.objects[uid];

            // Удаление машинки из радара
            if (car.pathSVG)
                for(var i in car.pathSVG)
                    controllers.fireControl.deleteCarInSector(car.pathSVG[i]);

            car.unbindOwner();
            this.options._map.removeLayer(car.marker);

            this.delFromBackLight(car);
            delete car.marker;
            listMapObject.del(uid);
        }
    };

    // Удаление машинки из списка выделеннных
    CarMarkerList.prototype.delFromBackLight = function(car) {
        if (car.backLight) {
            car.backLight.del();
            car.backLight = null;
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
                }
                // Отрисовка радара
                this.drawCarInSector(car, tempPoint);
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

            if (distBool && fiBool) {
                // если машинка в секторе, то... если её там раньше не было, то добавить (и только добавить!)
                if (!car.pathSVG[sector.uid]) {
                    // добавление SVG-path в fireControl
                    car.pathSVG[sector.uid] = controllers.fireControl.addCarInSector(sector, (distance / sector.radius), -fi);
                    return;
                } else {
                    // Отрисовать машинку в радаре с новыми относительными координатами
                    controllers.fireControl.updateCarInSector(sector, car.pathSVG[sector.uid], (distance / sector.radius), -fi);
                    return;
                }
            }
            else {
                // Если машинка вне сектора, то если она там была, убрать её оттуда
                if (car.pathSVG[sector.uid]) {
                    // удаление SVG-path из fireControl
                    car.pathSVG[sector.uid] = controllers.fireControl.deleteCarInSector(car.pathSVG[sector.uid]);
                    return;
                }
            }
        }
    }

    CarMarkerList.prototype.getListIDsForShoot = function (sectorUid) {
        //TODO: Переделать выстрел по Пати
        var listIDs = [];
        for (var i in listMapObject.objects)
            if (listMapObject.exist(i) &&  listMapObject.objects[i].backLight && listMapObject.objects[i].pathSVG[sectorUid])
                listIDs.push(listMapObject.objects[i].ID);
       // {carID: car.ID,
       // damage_factor: 1 | 0.0}
        return listIDs;
    };

    return CarMarkerList;
})();
