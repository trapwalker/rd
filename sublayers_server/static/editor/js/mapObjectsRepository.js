MapObjectsRepository = (function () {
    function MapObjectsRepository() {
        // Временный счетчик ID объектов, нужен для добавления объектов в обход сервера (см. getTempID)
        this._tempID = 0;

        this.rollBackButton = null;
        this.roads = [];
        this.towns = [];
        this.gasStations = [];
        this.rollBackProtocol = [];

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

    // Механизм выбора объектов

    MapObjectsRepository.prototype.onObjectsSelected = function () {
        //alert('onObjectsSelected');
        for (var id in this.towns)
            this.towns[id].marker.on('click', markerClick);
        for (var id in this.gasStations)
            this.gasStations[id].marker.on('click', markerClick);
    };

    MapObjectsRepository.prototype.offObjectsSelected = function () {
        //alert('offObjectsSelected');
        for (var id in this.towns)
            this.towns[id].marker.off('click', markerClick);
        for (var id in this.gasStations)
            this.gasStations[id].marker.off('click', markerClick);
    };

    MapObjectsRepository.prototype.clearSelection = function () {
        //alert('clearSelection');
        for (var id in this.towns) {
            this.towns[id].marker.isSelect = false;
            this.towns[id].marker.setIcon(repositoryMO.townIcon);
            }
        for (var id in this.gasStations) {
            this.gasStations[id].marker.isSelect = false;
            this.gasStations[id].marker.setIcon(repositoryMO.gasStationIcon);
        }
    };

    MapObjectsRepository.prototype.delAllSelectedObjects = function () {
        //alert('delAllSelectedTowns');
        this.delAllSelectedTowns();
        this.delAllSelectedGasStations();
    };

    MapObjectsRepository.prototype.selectByRect = function (boundsRect) {
        //alert('onObjectsSelected');
        for (var id in this.towns)
            if (boundsRect.contains(this.towns[id].coord)) {
                this.towns[id].marker.isSelect = true;
                this.towns[id].marker.setIcon(repositoryMO.selectTownIcon);
            }
        for (var id in this.gasStations)
            if (boundsRect.contains(this.gasStations[id].coord)) {
                this.gasStations[id].marker.isSelect = true;
                this.gasStations[id].marker.setIcon(repositoryMO.selectGasStationIcon);
            }
    };

    /*  Андрюха,
     Во все методы от сервера я добавил withRollBack затем чтоб определить нужно ли добавлять отмену действия
     или нет. Я предпологаю что если мы получим от сервера ансвер, то тогда withRollBack = true, если же от
     сервера пришол пуш, то withRollBack = false (исключением является ансвер на сам ролбэк, если ты понял
     о чем я))) ).
     в массив роллбеков таким образом всегда нужно заносить object и тот метод который должен быть вызвван
     (addTown, delTown, changeTown). Както так. Все, я пошел спать)))
     */

    // Города

    MapObjectsRepository.prototype.addTown = function (object) {
        // временная заглушка: города добавляются в обход сервера
        object.id = this.getTempID();
        this.addTownFromServer(object, false);
    };

    MapObjectsRepository.prototype.delAllSelectedTowns = function () {
        //alert('delAllSelectedTowns');
        for (var id in this.towns)
            if (this.towns[id].marker.isSelect) this.delTown(id);
    };

    MapObjectsRepository.prototype.delTown = function (id) {
        // временная заглушка: города удаляются в обход сервера
        //alert('delTown');
        this.delTownFromServer(id, false);
    };

    MapObjectsRepository.prototype.changeTown = function () {
    };

    MapObjectsRepository.prototype.addTownFromServer = function (object, withRollBack) {
        // если входные данные не корректны то вывалиться отсюда
        if (!((object) && (object.id) && (object.coord))) return;

        // создать маркер города и добавить его на карту
        object.marker = L.marker(object.coord, {
            icon: this.townIcon,
            clickable: true,
            keyboard: false}).addTo(myMap);
        object.marker.isSelect = false;
        object.marker.type = 1;

        // сохранить запись о городе
        this.towns[object.id] = object;
    };

    MapObjectsRepository.prototype.delTownFromServer = function (id, withRollBack) {
        //alert('delTownFromServer');

        // если города нет то вывалиться отсюда
        if (!(id in this.towns)) return;

        // удаляем маркер
        myMap.removeLayer(this.towns[id].marker);

        // удаляем запись о городе
        delete this.towns[id];
    };

    MapObjectsRepository.prototype.changeTownFromServer = function (object, withRollBack) {
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
            if (this.gasStations[id].marker.isSelect) this.delGasStation(id);
    };

    MapObjectsRepository.prototype.delGasStation = function (id) {
        // временная заглушка: заправки удаляются в обход сервера
        this.delGasStationFromServer(id, false);
    };

    MapObjectsRepository.prototype.changeGasStation = function () {
    };

    MapObjectsRepository.prototype.addGasStationFromServer = function (object, withRollBack) {
        // если входные данные не корректны то выйти
        if (!((object) && (object.id) && (object.coord))) return;
        // создать маркер заправки и добавить его на карту
        object.marker = L.marker(object.coord, {
            icon: this.gasStationIcon,
            clickable: true,
            keyboard: false}).addTo(myMap);
        object.marker.isSelect = false;
        object.marker.type = 2;

        // сохранить запись о городе
        this.gasStations[object.id] = object;
    };

    MapObjectsRepository.prototype.delGasStationFromServer = function (id, withRollBack) {
        if (!(id in this.gasStations)) return;
        // удаляем маркер
        myMap.removeLayer(this.gasStations[id].marker);
        // удаляем запись о городе
        delete this.gasStations[id];
    };

    MapObjectsRepository.prototype.changeGasStationFromServer = function (object, withRollBack) {
        if (!((object) && (object.id) && (object.coord))) return;
        this.delGasStationFromServer(object.id);
        this.addGasStationFromServer(object);
    };

    return MapObjectsRepository;
})();

function markerClick(e) {
    //alert('markerClick');
    e.target.isSelect = !e.target.isSelect;
    switch (e.target.type) {
        case 1:
            if (e.target.isSelect) e.target.setIcon(repositoryMO.selectTownIcon);
            else e.target.setIcon(repositoryMO.townIcon);
            break;
        case 2:
            if (e.target.isSelect) e.target.setIcon(repositoryMO.selectGasStationIcon);
            else e.target.setIcon(repositoryMO.gasStationIcon);
            break;
    }
}
