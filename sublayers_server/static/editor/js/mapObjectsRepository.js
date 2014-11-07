var MapObjectRepository = (function () {
    function MapObjectRepository() {
        this.rollBackButton = null;
        this.roads = [];
        this.towns = [];
        this.gasStation = [];
        this.rollBackProtocol = [];


        // создание иконок маркеров
        this.townIcon = L.icon({
            iconUrl: '/static/img/map_ico_city.png',
            iconSize: [26, 29],
            iconAnchor: [14, 29]
        });

        this.gasStationIcon = L.icon({
            iconUrl: '/static/img/map_ico_fuelstation.png',
            iconSize: [26, 29],
            iconAnchor: [14, 29]
        });

    }


    MapObjectRepository.prototype.addTown = function () {
    };

    MapObjectRepository.prototype.delTown = function () {
    };

    MapObjectRepository.prototype.changeTown = function () {
    };

    /*  Андрюха,
        Во все методы от сервера я добавил withRollBack затем чтоб определить нужно ли добавлять отмену действия
        или нет. Я предпологаю что если мы получим от сервера ансвер, то тогда withRollBack = true, если же от
        сервера пришол пуш, то withRollBack = false (исключением является ансвер на сам ролбэк, если ты понял
        о чем я))) ).
        в массив роллбеков таким образом всегда нужно заносить object и тот метод который должен быть вызвван
        (addTown, delTown, changeTown). Както так. Все, я пошел спать)))
     */

    MapObjectRepository.prototype.addTownFromServer = function (object, withRollBack) {
        // если входные данные не корректны то вывалиться отсюда
        if (!((object) && (object.id) && (object.coord))) return;

        // создать маркер города и добавить его на карту
        object.marker = L.marker([object.coord.x, object.coord.y], {
            icon: this.townIcon,
            clickable: false,
            keyboard: false}).add(myMap);

        // сохранить запись о городе
        this.towns[object.id] = object;
    };

    MapObjectRepository.prototype.delTownFromServer = function (id, withRollBack) {
        // если города нет то вывалиться отсюда
        if (!(id in this.towns)) return;

        // удаляем маркер
        this.towns[id].marker.remove(myMap);

        // удаляем запись о городе
        delete this.towns[id];
    };

    MapObjectRepository.prototype.changeTownFromServer = function (object, withRollBack) {
        // если входные данные не корректны то вывалиться отсюда
        if (!((object) && (object.id) && (object.coord))) return;
        this.delTownFromServer(object.id);
        this.addTownFromServer(object);
    };

    return MapObjectRepository;
})();
