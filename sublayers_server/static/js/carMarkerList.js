// Подсветка отдельного выбранного маркера
var BackLight = (function () {
    function BackLight(options) {
        this.options = {
            _map: null,
            color: '#ff0000',
            radius: 20,
            weight: 5,
            fillColor: '#AA0000',
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

        this.pathSVG = {};
    }


    BackLight.prototype.delete = function () {
        // TODO добавить удаление SVG

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
    };


    // Добавление машинки в список выделенных
    BackLightList.prototype.add = function (car) {
        if(! car.backLight) {
            this.backLightCars.push(car);
            car.backLight = new BackLight({_map: this.options._map});
        }
    };

    // Удаление машинки из списка выделеннных
    BackLightList.prototype.del = function(car) {
        var index = this.getIndexCarByID(car.ID);
        if (index){
            this.backLightCars.splice(index, 1);
            car.backLight.delete();
            car.backLight = null;
        }
    };


    BackLightList.prototype.getIndexCarByID = function(uID){
        for (var i = 0; i < this.backLightCars.length; i++)
            if (this.backLightCars[i].ID == uID)
                return i;
        return null;
    };



    BackLightList.prototype.getListIDs = function() {
        var listIDs = [];
        for (var i = 0; i < this.backLights.length; i++)
            if (this.backLights[i].isActive)
                listIDs.push(this.backLights[i].marker.carID);
        return listIDs;
    }


    return BackLightList;
})();


// Общий класс для перерисовки всех машинок
var CarMarkerList = (function () {
    function CarMarkerList(options){
        this.options = {
            _map: myMap
        };

        if(options) {
            if(options.map) this.options._map = options.map;
        };

        this.backLightList = new BackLightList();
    }

    // Добавление машинки
    CarMarkerList.prototype.add = function (aCar, aOwner) {
        // Бинд машинки и её хозяина
        aOwner.bindCar(aCar);
        // Добавление машинки в listMapObject
        listMapObject.add(car);
        // И сразу же добавить маркер
        listMapObject.objects[uid].marker = getCarMarker(car, this.options._map);
    };

    // Удаление машинки
    CarMarkerList.prototype.del = function(uid){
        if (listMapObject.exist(uid)) {
            var car = listMapObject.objects[uid];
            car.unbindOwner();
            this.options._map.removeLayer(car.marker);

            // TODO правильно выключить беклайты
            this.backLightList.del(car);
            delete car.marker;
            listMapObject.del(uid);
        }
    };


    CarMarkerList.prototype.draw = function(currentTime) {
        for (var i in listMapObject.objects) {
            if (listMapObject.exist(i)) {//... сделать что-то с arr[i] ...
                // пересчёт координат
                var car = listMapObject.objects[i];
                var tempPoint = car.getCurrentCoord(currentTime);
                var tempLatLng = this.options._map.unproject([tempPoint.x, tempPoint.y],
                                                             this.options._map.getMaxZoom());
                // пересчёт угла
                var tempAngleRadCars = car.getCurrentDirection(currentTime);
                // Установка угла в для поворота иконки маркера (в градусах)
                car.marker.options.angle = tempAngleRadCars;
                // Установка новых координат маркера);
                car.marker.setLatLng(tempLatLng);
                // Отрисовка backLight
                if (car.backLight) car.backLight.draw(tempLatLng);
            }
        }
    };



    return CarMarkerList;
})();
