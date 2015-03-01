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
    };

    // Добавление машинки
    CarMarkerList.prototype.add = function (aCar, aOwner) {
        // Бинд машинки и её хозяина
        if(aOwner)
            aOwner.bindCar(aCar);
        // Добавление машинки в listMapObject
        listMapObject.add(aCar);
        // И сразу же добавить маркер
        aCar.marker = getCarMarker(aCar, this.options._map);

        // Если Owner с User в одной пати, то подстветить машинку (чтобы потом её не дамажить)
        if(aCar.owner)
            if (aCar.owner.party.id == user.party.id)
                this.addToBackLight(aCar);

        aCar.pathSVG = [];

        // Инициализация списка отладочных линий
        aCar.debugLines = [];
    };

    // Добавление машинки в список выделенных
    CarMarkerList.prototype.addToBackLight = function (car) {
        if (!car.backLight) {
            car.backLight = new BackLight({_map: this.options._map});
        }
    };

    CarMarkerList.prototype.addContactLine = function(subjID, objID){
        var carS;
        var m1, m2;
        if(user.userCar.ID == subjID) {
            userCarMarker.addContactLine(objID);
            //carS = user.userCar;
            //m1 = userCarMarker.marker;
            return;
        }
        else {
            if (listMapObject.exist(subjID)) {
                carS = listMapObject.objects[subjID];
                m1 = carS.marker;
            }
            else {
                alert('Ошибка! Субъект контакта не найден!');
                return;
            }
        }

        var carO;
        if(listMapObject.exist(objID))
            carO= listMapObject.objects[objID];
        else {
            alert('Ошибка! Объект контакта не найден!');
            return;
        }
        m2 = carO.marker;

        var plln = L.polyline([m1.getLatLng(),m2.getLatLng()], {color: 'red'});

        // добавление линии в субъект
        carS.debugLines.push({
            m1: m1,
            m2: m2,
            plln: plln
        });

        if(cookieStorage.optionsShowDebugLine())// если рисовать линию
            plln.addTo(this.options._map);

    };

    CarMarkerList.prototype.delContactLine = function(subjID, objID){
        var lines; // список линий, полученный из какого либо источника
        var objM;

        if (user.userCar.ID == subjID) {
            //userCarMarker.delContactLine(objID);
            lines = user.userCar.debugLines;
        }
        else {
            if (listMapObject.exist(subjID)) {
                lines = listMapObject.objects[subjID].debugLines;
            }
            else {
                alert('Ошибка! Субъект контакта не найден!');
                return;
            }
        }

        if(listMapObject.exist(objID))
            objM = listMapObject.objects[objID].marker;
        else {
            alert('Ошибка! Объект выхода из контакта не найден!');
            return;
        }

        for(var i = 0; i< lines.length; i++){
            var line = lines[i];
            if(line.m2 == objM){
                // удалить линию
                line.m1 = null;
                line.m1 = null;
                if (myMap.hasLayer(line.plln))
                    myMap.removeLayer(line.plln);
                delete line.plln;
                // сделать сплайс в массиве
                lines.splice(i, 1);
            }
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

            // Удаление линии машинки с карты
            //if(this.options._map.hasLayer(car.debugLine))
            //    this.options._map.removeLayer(car.debugLine);
            // Удаление всех линий машинки с карты

            for(var line in car.debugLines){
                if(this.options._map.hasLayer(line.plln))
                    this.options._map.removeLayer(line.plln);
                line.m1 = null;
                line.m2 = null;
            }


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

                // отрисовка линий
                if (cookieStorage.optionsShowDebugLine) {// если нужно рисовать
                    for (var j = 0; j < car.debugLines.length; j++) {
                        var line = car.debugLines[j];
                        line.plln.setLatLngs([line.m1.getLatLng(), line.m2.getLatLng()]);
                    }

                }
            }
        }
    };

    CarMarkerList.prototype.getListIDsForShoot = function (sectorUid) {
        var listIDs = [];
        // Для всех машинок
        for (var i in listMapObject.objects)
            // у которых нет backLight
            if (listMapObject.exist(i) && !(listMapObject.objects[i].backLight)) {
                var car = listMapObject.objects[i];
                if (car.hp > 0) // Которые живы
                    if (car.inSector) // которые находятся в каком-нибудь секторе
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


    CarMarkerList.prototype.getListIDsForShootAll = function (sectorUid) {
        var listIDs = [];
        // Для всех машинок
        for (var i in listMapObject.objects)
            if (listMapObject.exist(i)) {
                var car = listMapObject.objects[i];
                if (car.hp > 0) // Которые живы
                    if (car.inSector) // которые находятся в каком-нибудь секторе
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
