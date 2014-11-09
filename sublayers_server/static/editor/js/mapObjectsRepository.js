MapObjectsRepository = (function () {
    function MapObjectsRepository() {
        // Временный счетчик ID объектов, нужен для добавления объектов в обход сервера (см. getTempID)
        this._tempID = 0;

        this.rollBackButton = null;
        this.roads = [];
        this.towns = [];
        this.gasStations = [];
        this.rollBackProtocol = [];
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
    };

    MapObjectsRepository.prototype.offObjectMarkerEvent = function (eventName, eventFunction) {
        //alert('offObjectMarkerEvent');
        for (var id in this.towns)
            this.towns[id].off(eventName, eventFunction);
        for (var id in this.gasStations)
            this.gasStations[id].off(eventName, eventFunction);
    };

    // Включение / выключение возможности перетаскивания маркеров городов и заправок

    MapObjectsRepository.prototype.onObjectMarkerDragging = function () {
        //alert('onObjectMarkerDragging');
        this.markerDragging = true;
        for (var id in this.towns)
            this.towns[id].dragging.enable();
        for (var id in this.gasStations)
            this.gasStations[id].dragging.enable();
    };

    MapObjectsRepository.prototype.offObjectMarkerDragging = function () {
        //alert('offObjectMarkerDragging');
        this.markerDragging = false;
        for (var id in this.towns)
            this.towns[id].dragging.disable();
        for (var id in this.gasStations)
            this.gasStations[id].dragging.disable();
    };

    // Механизм выбора объектов

    MapObjectsRepository.prototype.selectObject = function (type, id) {
        //alert('selectObject');
        switch (type) {
            case 'town':
                if (id in this.towns) {
                    this.towns[id].isSelect = true;
                    this.towns[id].setIcon(repositoryMO.selectTownIcon);
                }
                break;
            case 'gasStation':
                if (id in this.gasStations) {
                    this.gasStations[id].isSelect = true;
                    this.gasStations[id].setIcon(repositoryMO.selectGasStationIcon);
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
                    this.towns[id].setIcon(repositoryMO.townIcon);
                }
                break;
            case 'gasStation':
                if (id in this.gasStations) {
                    this.gasStations[id].isSelect = false;
                    this.gasStations[id].setIcon(repositoryMO.gasStationIcon);
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
        };
    };

    MapObjectsRepository.prototype.clearSelection = function () {
        //alert('clearSelection');
        for (var id in this.towns) this.unSelectObject('town', id);
        for (var id in this.gasStations) this.unSelectObject('gasStation', id)
    };

    MapObjectsRepository.prototype.delAllSelectedObjects = function () {
        //alert('delAllSelectedTowns');
        this.delAllSelectedTowns();
        this.delAllSelectedGasStations();
    };

    MapObjectsRepository.prototype.selectByRect = function (boundsRect) {
        //alert('selectByRect');
        for (var id in this.towns)
            if (boundsRect.contains(this.towns[id].objectCoord))
                this.selectObject('town', id);
        for (var id in this.gasStations)
            if (boundsRect.contains(this.gasStations[id].objectCoord))
                this.selectObject('gasStation', id);
    };

    // Города

    MapObjectsRepository.prototype.addTown = function (object) {
        // временная заглушка: города добавляются в обход сервера
        object.id = this.getTempID();
        this.addTownFromServer(object, false);
    };

    MapObjectsRepository.prototype.delAllSelectedTowns = function () {
        //alert('delAllSelectedTowns');
        for (var id in this.towns)
            if (this.towns[id].isSelect) this.delTown(id);
    };

    MapObjectsRepository.prototype.delTown = function (id) {
        // временная заглушка: города удаляются в обход сервера
        //alert('delTown');
        this.delTownFromServer(id, false);
    };

    MapObjectsRepository.prototype.changeTown = function (object) {
        // временная заглушка: города изменяются в обход сервера
        this.changeTownFromServer(object, false);
    };

    MapObjectsRepository.prototype.addTownFromServer = function (object, withRollBack) {
        // если входные данные не корректны то вывалиться отсюда
        if (!((object) && (object.id) && (object.coord))) return;

        // создать маркер города и добавить его на карту
        this.towns[object.id] = L.marker(object.coord, {
            icon: this.townIcon,
            clickable: true,
            draggable: true,
            keyboard: false}).addTo(myMap);
        if (!this.markerDragging) this.towns[object.id].dragging.disable();

        // сохраняем в маркере дополнительные параметры из object
        this.towns[object.id].isSelect = false;
        this.towns[object.id].type = 'town';
        this.towns[object.id].objectCoord = object.coord;
        this.towns[object.id].objectID = object.id;
    };

    MapObjectsRepository.prototype.delTownFromServer = function (id, withRollBack) {
        //alert('delTownFromServer');

        // если города нет то выйти
        if (!(id in this.towns)) return;

        // удаляем маркер
        myMap.removeLayer(this.towns[id]);

        // удаляем запись о городе
        delete this.towns[id];
    };

    MapObjectsRepository.prototype.changeTownFromServer = function (object, withRollBack) {
        //alert('changeTownFromServer');
        // если входные данные не корректны то вывалиться отсюда
        if (!((object) && (object.id) && (object.coord))) return;
        this.delTownFromServer(object.id);
        this.addTownFromServer(object);
    };

    // Заправки

    MapObjectsRepository.prototype.addGasStation = function (object) {
        // временная заглушка: заправки добавляются в обход сервера
        object.id = this.getTempID();
        this.addGasStationFromServer(object, false);
    };

    MapObjectsRepository.prototype.delAllSelectedGasStations = function () {
        for (var id in this.gasStations)
            if (this.gasStations[id].isSelect) this.delGasStation(id);
    };

    MapObjectsRepository.prototype.delGasStation = function (id) {
        // временная заглушка: заправки удаляются в обход сервера
        this.delGasStationFromServer(id, false);
    };

    MapObjectsRepository.prototype.changeGasStation = function (object) {
        // временная заглушка: заправки изменяются в обход сервера
        this.changeGasStationFromServer(object, false);
    };

    MapObjectsRepository.prototype.addGasStationFromServer = function (object, withRollBack) {
        // если входные данные не корректны то выйти
        if (!((object) && (object.id) && (object.coord))) return;

        // создать маркер заправки и добавить его на карту
        this.gasStations[object.id] = L.marker(object.coord, {
            icon: this.gasStationIcon,
            clickable: true,
            draggable: true,
            keyboard: false}).addTo(myMap);
        if (!this.markerDragging) this.gasStations[object.id].dragging.disable();

        // сохраняем в маркере дополнительные параметры из object
        this.gasStations[object.id].isSelect = false;
        this.gasStations[object.id].type = 'gasStation';
        this.gasStations[object.id].objectCoord = object.coord;
        this.gasStations[object.id].objectID = object.id;
    };

    MapObjectsRepository.prototype.delGasStationFromServer = function (id, withRollBack) {
        // если заправки нет то выйти
        if (!(id in this.gasStations)) return;

        // удаляем маркер
        myMap.removeLayer(this.gasStations[id]);

        // удаляем запись о городе
        delete this.gasStations[id];
    };

    MapObjectsRepository.prototype.changeGasStationFromServer = function (object, withRollBack) {
        //alert('changeGasStationFromServer');
        if (!((object) && (object.id) && (object.coord))) return;
        this.delGasStationFromServer(object.id, false);
        this.addGasStationFromServer(object, false);
    };

    return MapObjectsRepository;
})();