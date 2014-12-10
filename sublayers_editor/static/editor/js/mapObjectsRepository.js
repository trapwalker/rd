//TODO: перевести добавление объектов на пуши

MapObjectsRepository = (function () {
    function MapObjectsRepository() {
        // Временный счетчик ID объектов, нужен для добавления объектов в обход сервера (см. getTempID)
        this._tempID = 0;

        // Парапметры рисования дорог
        this.roadStepsMax = 500;
        this.roadStepsMin = 200;

        this.roads = [];
        this.towns = [];
        this.gasStations = [];

        this.markerEventList = [];
        this.markerDragging = false;

        // создание иконок маркеров
        this.townIcon = L.icon({
            iconUrl: '/static/editor/img/city.png',
            iconSize: [35, 50],
            iconAnchor: [18, 50]
        });

        this.selectTownIcon = L.icon({
            iconUrl: '/static/editor/img/city_select.png',
            iconSize: [35, 50],
            iconAnchor: [18, 50]
        });

        this.gasStationIcon = L.icon({
            iconUrl: '/static/editor/img/gasstation.png',
            iconSize: [35, 50],
            iconAnchor: [18, 50]
        });

        this.selectGasStationIcon = L.icon({
            iconUrl: '/static/editor/img/gasstation_select.png',
            iconSize: [35, 50],
            iconAnchor: [18, 50]
        });

        this.roadIcon = L.icon({
            iconUrl: '/static/editor/img/roadpoint.png',
            iconSize: [35, 50],
            iconAnchor: [18, 50]
        });

        this.selectRoadIcon = L.icon({
            iconUrl: '/static/editor/img/roadpoint_select.png',
            iconSize: [35, 50],
            iconAnchor: [18, 50]
        });
    };

    MapObjectsRepository.prototype.getTempID = function () {
        return this._tempID++;
    };

    // Работа с областью

    MapObjectsRepository.prototype.requestArea = function (latLngRect, filter) {
    //TODO: запрос к серверу, по выделенной области вернуть объекты по фильтру
        var p1 = myMap.project(latLngRect.getNorthWest(), map_max_zoom);
        var p2 = myMap.project(latLngRect.getSouthEast(), map_max_zoom);
        var mes_obj = {
            min_point: {
                x: p1.x,
                y: p1.y,
                z: map_max_zoom + 8
            },
            max_point: {
                x: p2.x,
                y: p2.y,
                z: map_max_zoom + 8
            },
            select_zoom: myMap.getZoom()
        };
        editor_manager.selectAreaByRect(mes_obj);

/*
        L.circleMarker(latLngRect.getNorthWest(), {color: '#FFBA12'})
            .setRadius(16)
            .bindPopup(
                'LatLng: ' + latLngRect.getNorthWest() + '</br>' +
                'Point:' + p1 + '</br>'
        )
            .addTo(myMap);

        L.circleMarker(latLngRect.getSouthEast(), {color: '#FFBA12'})
            .setRadius(16)
            .bindPopup(
                'LatLng: ' + latLngRect.getSouthEast() + '</br>' +
                'Point:' + p1 + '</br>'
        )
            .addTo(myMap)
            */
    };

    MapObjectsRepository.prototype.dropArea = function () {
    //TODO: збросить все выделенные объекты
    }

    // Добавление/удаление событий для маркеров

    MapObjectsRepository.prototype.setupMarkerIcon = function (marker, icon) {
        //alert('setupMarkerIcon');
        var dragging = marker.dragging.enabled();
        marker.setIcon(icon);
        if (dragging) marker.dragging.enable();
    }

    MapObjectsRepository.prototype.onObjectMarkerEvent = function (eventName, eventFunction) {
        //alert('onObjectMarkerEvent');
        this.markerEventList.push({eventName: eventName, eventFunc: eventFunction});
        for (var id in this.towns)
            this.towns[id].on(eventName, eventFunction);
        for (var id in this.gasStations)
            this.gasStations[id].on(eventName, eventFunction);
        for (var id in this.roads)
            this.roads[id].on(eventName, eventFunction);
    };

    MapObjectsRepository.prototype.offObjectMarkerEvent = function (eventName, eventFunction) {
        //alert('offObjectMarkerEvent');
        var indexes = [];
        for(var i = 0; i < this.markerEventList.length; i++)
            if((this.markerEventList[i].eventName == eventName) &&
               (this.markerEventList[i].eventFunc == eventFunction))
                    indexes.push(i);
        for(var i in indexes)
            this.markerEventList.splice(indexes[i], 1);
        for (var id in this.towns)
            this.towns[id].off(eventName, eventFunction);
        for (var id in this.gasStations)
            this.gasStations[id].off(eventName, eventFunction);
        for (var id in this.roads)
            this.roads[id].off(eventName, eventFunction);
    };

    // Включение / выключение возможности перетаскивания маркеров городов и заправок

    MapObjectsRepository.prototype.onObjectMarkerDragging = function (eventFunction) {
        //console.log('onObjectMarkerDragging');
        this.markerDragging = true;
        this.onObjectMarkerEvent('dragend', eventFunction);
        for (var id in this.towns)
            this.towns[id].dragging.enable();
        for (var id in this.gasStations)
            this.gasStations[id].dragging.enable();
        for (var id in this.roads)
            this.roads[id].dragging.enable();
    };

    MapObjectsRepository.prototype.offObjectMarkerDragging = function (eventFunction) {
        //console.log('offObjectMarkerDragging');
        this.markerDragging = false;
        this.offObjectMarkerEvent('dragend', eventFunction);
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
                    this.setupMarkerIcon(this.towns[id], this.selectTownIcon);
                }
                break;
            case 'gasStation':
                if (id in this.gasStations) {
                    this.gasStations[id].isSelect = true;
                    this.setupMarkerIcon(this.gasStations[id], this.selectGasStationIcon);
                }
                break;
            case 'road':
                if (id in this.roads) {
                    this.roads[id].isSelect = true;
                    this.setupMarkerIcon(this.roads[id], this.selectRoadIcon);
                }
                break;
        };
    };

    MapObjectsRepository.prototype.unSelectObject = function (type, id) {
        //alert('unSelectObject');
        switch (type) {
            case 'town':
                if (id in this.towns) {
                    this.towns[id].isSelect = false;
                    this.setupMarkerIcon(this.towns[id], this.townIcon);
                }
                break;
            case 'gasStation':
                if (id in this.gasStations) {
                    this.gasStations[id].isSelect = false;
                    this.setupMarkerIcon(this.gasStations[id], this.gasStationIcon);
                }
                break;
            case 'road':
                if (id in this.roads) {
                    this.roads[id].isSelect = false;
                    this.setupMarkerIcon(this.roads[id], this.roadIcon);
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
        //alert('addObject');
        var p = myMap.project(object.coord, map_max_zoom);
        var mes_obj = {
            object_type: type,
            position: {
                x: p.x,
                y: p.y,
                z: map_max_zoom + 8
            }
        };
        editor_manager.addObject(mes_obj);
    };

    MapObjectsRepository.prototype.delObject = function (type, id) {
        //alert('delObject');
        editor_manager.delObject(id);
    };

    MapObjectsRepository.prototype.changeObject = function (type, object) {
        //console.log('changeObject');
        var p = myMap.project(object.coord, map_max_zoom);
        var mes_obj = {
            object_type: type,
            id: object.id,
            position: {
                x: p.x,
                y: p.y,
                z: map_max_zoom + 8
            }
        };

        editor_manager.changeObject(mes_obj);
    };

    MapObjectsRepository.prototype.addObjectFromServer = function (type, object) {
        // если входные данные не корректны то вывалиться отсюда
        if (!((object) && (object.id) && (object.position))) return;
        object.coord = myMap.unproject([object.position.x, object.position.y], map_max_zoom);
        var marker = L.marker(object.coord, {
            clickable: true,
            keyboard: false}).addTo(myMap);
        // сохраняем в маркере дополнительные параметры из object
        marker.isSelect = false;
        marker.objectCoord = object.coord;
        marker.objectID = object.id;
        marker.type = type;
        for (var index in this.markerEventList)
            marker.on(this.markerEventList[index].eventName, this.markerEventList[index].eventFunc);
        if (this.markerDragging)
            marker.dragging.enable();
        switch (type) {
            case 'town':
                this.setupMarkerIcon(marker, this.townIcon);
                this.towns[object.id] = marker;
                break;
            case 'gasStation':
                this.setupMarkerIcon(marker, this.gasStationIcon);
                this.gasStations[object.id] = marker;
                break;
            case 'road':
                this.setupMarkerIcon(marker, this.roadIcon);
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
        //alert('changeObjectFromServer');
        if (!((object) && (object.id) && (object.position))) return;
        object.coord = myMap.unproject([object.position.x, object.position.y], map_max_zoom);
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

    // Стили дорог

    MapObjectsRepository.prototype.setRoadStepsMax = function (value) {
        if (value > this.roadStepsMin) this.roadStepsMax = value;
    };

    MapObjectsRepository.prototype.setRoadStepsMin = function (value) {
        if (value < this.roadStepsMax) this.roadStepsMin = value;
    };

    return MapObjectsRepository;
})();