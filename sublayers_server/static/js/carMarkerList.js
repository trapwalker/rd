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
            car.inSector = null;
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
                //if (controllers.fireControl.getVisible())
                    this.drawCarInSector(car, tempPoint);
            }
        }
    };

    // Метод, который управляет добавлением/удалением/апдейтом машинок в секторах радара
    // Сделано тут, т.к. для перерисовки нужны distance и угол fi - а они тут сразу и вычисляются
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
                // Добавляем объект в car, чтобы быстро можно было посчитать его вхождение в сектор или крит-сектор
                car.inSector = {
                    dist: distance,
                    fi: fi,
                    sector: sector
                };
                // если машинка в секторе, то... если её там раньше не было, то добавить (и только добавить!)
                if (!car.pathSVG[sector.uid]) {
                    // visibleMode - свой/чужой/пати
                    var visibleMode;
                    if(car.backLight){
                        if (car.owner.party.id == user.party.id)
                            visibleMode = 'party';
                        else
                            visibleMode = 'friend';
                    }
                    else
                        visibleMode = null;
                    // добавление SVG-path в fireControl
                    car.pathSVG[sector.uid] = controllers.fireControl.addCarInSector(sector, (distance / sector.radius), -fi, visibleMode);
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
                    // очищаем объект быстрого определения вхождения в сектор
                    car.inSector = null;
                    return;
                }
            }
        }
    }

    CarMarkerList.prototype.getListIDsForShoot = function (sectorUid) {
        var listIDs = [];
        // Для всех машинок
        for (var i in listMapObject.objects)
            // у которых нет backLight
            if (listMapObject.exist(i) && !(listMapObject.objects[i].backLight)) {
                var car = listMapObject.objects[i];
                // которые находятся в каком-нибудь секторе
                if (car.inSector)
                // Которые находятся в нужном секторе
                    if (car.inSector.sector.uid == sectorUid)
                    // Если попадает в крит-зону
                        if (this._inCritZoneOnSector(car.inSector.sector, car.inSector.dist, car.inSector.fi))
                            listIDs.push({carID: car.ID, damage_factor: 1});
                        else // если не попали в зону крита
                            listIDs.push({carID: car.ID, damage_factor: 0.5});
            }
        return listIDs;
    };


    CarMarkerList.prototype._inCritZoneOnSector = function (sector, distance, fi) {
        var distBool = distance <= (sector.radius * 0.75);
        var fiBool = Math.abs(fi) <= (sector.widthAngle / 4.);
        return distBool && fiBool;
    };

    return CarMarkerList;
})();
