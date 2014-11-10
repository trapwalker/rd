//TODO: перевести добавление объектов на пуши
//TODO: переписать change

MapObjectsRepository = (function () {
    function MapObjectsRepository() {
        // Временный счетчик ID объектов, нужен для добавления объектов в обход сервера (см. getTempID)
        this._tempID = 0;

        this.roads = [];
        this.towns = [];
        this.gasStations = [];
        this.markerDragging = false;

        // создание иконок маркеров
        this.townIcon = L.icon({
            iconUrl: '/static/editor/img/city.png',
            iconSize: [26, 29],
            iconAnchor: [14, 29]
        });

        this.selectTownIcon = L.icon({
            iconUrl: '/static/editor/img/city_select.png',
            iconSize: [26, 29],
            iconAnchor: [14, 29]
        });

        this.gasStationIcon = L.icon({
            iconUrl: '/static/editor/img/gasstation.png',
            iconSize: [26, 29],
            iconAnchor: [14, 29]
        });

        this.selectGasStationIcon = L.icon({
            iconUrl: '/static/editor/img/gasstation_select.png',
            iconSize: [26, 29],
            iconAnchor: [14, 29]
        });

        this.roadIcon = L.icon({
            iconUrl: '/static/editor/img/city.png',
            iconSize: [26, 29],
            iconAnchor: [14, 29]
        });

        this.selectRoadIcon = L.icon({
            iconUrl: '/static/editor/img/city_select.png',
            iconSize: [26, 29],
            iconAnchor: [14, 29]
        });

    };

    MapObjectsRepository.prototype.getTempID = function () {
        return this._tempID++;
    };

    // Добавление/удаление событий для маркеров городов и заправок

    MapObjectsRepository.prototype.onObjectMarkerEvent = function (eventName, eventFunction) {
        //alert('onObjectMarkerEvent');
        for (var id in this.towns)
            this.towns[id].on(eventName, eventFunction);
        for (var id in this.gasStations)
            this.gasStations[id].on(eventName, eventFunction);
        for (var id in this.roads)
            this.roads[id].on(eventName, eventFunction);
    };

    MapObjectsRepository.prototype.offObjectMarkerEvent = function (eventName, eventFunction) {
        //alert('offObjectMarkerEvent');
        for (var id in this.towns)
            this.towns[id].off(eventName, eventFunction);
        for (var id in this.gasStations)
            this.gasStations[id].off(eventName, eventFunction);
        for (var id in this.roads)
            this.roads[id].off(eventName, eventFunction);
    };

    // Включение / выключение возможности перетаскивания маркеров городов и заправок

    MapObjectsRepository.prototype.onObjectMarkerDragging = function () {
        //alert('onObjectMarkerDragging');
        this.markerDragging = true;
        for (var id in this.towns)
            this.towns[id].dragging.enable();
        for (var id in this.gasStations)
            this.gasStations[id].dragging.enable();
        for (var id in this.roads)
            this.roads[id].dragging.enable();
    };

    MapObjectsRepository.prototype.offObjectMarkerDragging = function () {
        //alert('offObjectMarkerDragging');
        this.markerDragging = false;
        for (var id in this.towns)
            this.towns[id].dragging.disable();
        for (var id in this.gasStations)
            this.gasStations[id].dragging.disable();
        for (var id in this.roads)
            this.roads[id].dragging.disable();
    };

    // Объекты (дорогиб города, заправки)

    MapObjectsRepository.prototype.selectObject = function (type, id) {
        //alert('selectObject');
        switch (type) {
            case 'town':
                if (id in this.towns) {
                    this.towns[id].isSelect = true;
                    this.towns[id].setIcon(this.selectTownIcon);
                }
                break;
            case 'gasStation':
                if (id in this.gasStations) {
                    this.gasStations[id].isSelect = true;
                    this.gasStations[id].setIcon(this.selectGasStationIcon);
                }
                break;
            case 'road':
                if (id in this.roads) {
                    this.roads[id].isSelect = true;
                    this.roads[id].setIcon(this.selectRoadIcon);
                }
                break;
        };
    };

    MapObjectsRepository.prototype.unSelectObject = function (type, id) {
       // alert('unSelectObject');
        switch (type) {
            case 'town':
                if (id in this.towns) {
                    this.towns[id].isSelect = false;
                    this.towns[id].setIcon(this.townIcon);
                }
                break;
            case 'gasStation':
                if (id in this.gasStations) {
                    this.gasStations[id].isSelect = false;
                    this.gasStations[id].setIcon(this.gasStationIcon);
                }
                break;
            case 'road':
                if (id in this.roads) {
                    this.roads[id].isSelect = false;
                    this.roads[id].setIcon(this.roadIcon);
                }
                break;
        };
    };

    MapObjectsRepository.prototype.changeSelectObject = function (type, id) {
        //alert('changeSelectObject');
        switch (type) {
            case 'town':
                if (id in this.towns)
                    if (this.towns[id].isSelect) this.unSelectObject(type, id);
                    else this.selectObject(type, id);
                break;
            case 'gasStation':
                if (id in this.gasStations)
                    if (this.gasStations[id].isSelect) this.unSelectObject(type, id);
                    else this.selectObject(type, id);
                break;
            case 'road':
                if (id in this.roads)
                    if (this.roads[id].isSelect) this.unSelectObject(type, id);
                    else this.selectObject(type, id);
                break;
        };
    };

    MapObjectsRepository.prototype.clearSelection = function () {
        //alert('clearSelection');
        for (var id in this.towns) this.unSelectObject('town', id);
        for (var id in this.gasStations) this.unSelectObject('gasStation', id);
        for (var id in this.roads) this.unSelectObject('road', id);
    };

    MapObjectsRepository.prototype.delAllSelectedObjects = function () {
        //alert('delAllSelectedObjects');
        for (var id in this.towns)
            if (this.towns[id].isSelect) this.delObject('town', id);
        for (var id in this.gasStations)
            if (this.gasStations[id].isSelect) this.delObject('gasStation', id);
        for (var id in this.roads)
            if (this.roads[id].isSelect) this.delObject('road', id);
    };

    MapObjectsRepository.prototype.selectByRect = function (boundsRect) {
        //alert('selectByRect');
        for (var id in this.towns)
            if (boundsRect.contains(this.towns[id].objectCoord))
                this.selectObject('town', id);
        for (var id in this.gasStations)
            if (boundsRect.contains(this.gasStations[id].objectCoord))
                this.selectObject('gasStation', id);
        for (var id in this.roads)
            if (boundsRect.contains(this.roads[id].objectCoord))
                this.selectObject('road', id);
    };

    MapObjectsRepository.prototype.addObject = function (type, object) {
        // временная заглушка: объекты добавляются в обход сервера
        //alert('addObject');
        object.id = this.getTempID();
        this.addObjectFromServer(type, object);
    };

    MapObjectsRepository.prototype.delObject = function (type, id) {
        // временная заглушка: объекты удаляются в обход сервера
        //alert('delObject');
        this.delObjectFromServer(type, id);
    };

    MapObjectsRepository.prototype.changeObject = function (type, object) {
        // временная заглушка: города изменяются в обход сервера
        this.changeObjectFromServer(type, object);
    };

    MapObjectsRepository.prototype.addObjectFromServer = function (type, object) {
        // если входные данные не корректны то вывалиться отсюда
        if (!((object) && (object.id) && (object.coord))) return;
        var marker = L.marker(object.coord, {
            clickable: true,
            keyboard: false}).addTo(myMap);
        // сохраняем в маркере дополнительные параметры из object
        marker.isSelect = false;
        marker.objectCoord = object.coord;
        marker.objectID = object.id;
        marker.type = type;
        if (!this.markerDragging) marker.dragging.disable();

        switch (type) {
            case 'town':
                marker.setIcon(this.townIcon);
                this.towns[object.id] = marker;
                break;
            case 'gasStation':
                marker.setIcon(this.gasStationIcon);
                this.gasStations[object.id] = marker;
                break;
            case 'road':
                marker.setIcon(this.roadIcon);
                this.roads[object.id] = marker;
                break;
        }
    };

    MapObjectsRepository.prototype.delObjectFromServer = function (type, id) {
        //alert('delObjectFromServer');
        var list;
        switch (type) {
            case 'town':
                if (id in this.towns) list = this.towns;
                break;
            case 'gasStation':
                if (id in this.gasStations) list = this.gasStations;
                break;
            case 'road':
                if (id in this.roads) list = this.roads;
                break;
        }
        // если объект не найден ни в одном из списков, то выйти
        if (!list[id]) return;
        // удаляем маркер
        myMap.removeLayer(list[id]);
        // удаляем запись о городе
        delete list[id];
    };

    MapObjectsRepository.prototype.changeObjectFromServer = function (type, object) {
        alert('changeObjectFromServer');
        if (!((object) && (object.id) && (object.coord))) return;
        var list;
        switch (type) {
            case 'town':
                if (object.id in this.towns) list = this.towns;
                break;
            case 'gasStation':
                if (object.id in this.gasStations) list = this.gasStations;
                break;
            case 'road':
                if (object.id in this.roads) list = this.roads;
                break;
        }
        if (!list[object.id]) return;

        list[object.id].objectCoord = object.coord;
        list[object.id].setLatLng(object.coord);
    };


    return MapObjectsRepository;
})();