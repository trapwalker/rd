MapObjectsRepository = (function () {
    function MapObjectsRepository() {
        this.pylons = [];
        this.tsTiles = [];

        this.markerEventList = [];
        this.markerDragging = false;

        // создание иконок маркеров
        this.pylonIcon = {
            'town': {
                main: L.icon({
                    iconUrl: '/static/editor/img/city.png',
                    iconSize: [35, 50],
                    iconAnchor: [18, 50]
                }),
                select: L.icon({
                    iconUrl: '/static/editor/img/city_select.png',
                    iconSize: [35, 50],
                    iconAnchor: [18, 50]
                })
            },
            'gasStation': {
                main:L.icon({
                    iconUrl: '/static/editor/img/gasstation.png',
                    iconSize: [35, 50],
                    iconAnchor: [18, 50]
                }),
                select: L.icon({
                    iconUrl: '/static/editor/img/gasstation_select.png',
                    iconSize: [35, 50],
                    iconAnchor: [18, 50]
                })
            },
            'defPylon': {
                main:L.icon({
                    iconUrl: '/static/editor/img/roadpoint.png',
                    iconSize: [35, 50],
                    iconAnchor: [18, 50]
                }),
                select: L.icon({
                    iconUrl: '/static/editor/img/roadpoint_select.png',
                    iconSize: [35, 50],
                    iconAnchor: [18, 50]
                })
            }
        };
    };

    // Добавление/удаление событий для маркеров

    MapObjectsRepository.prototype.setupMarkerIcon = function (marker, icon) {
        //console.log('MapObjectsRepository.prototype.setupMarkerIcon');
        var dragging = marker.dragging.enabled();
        marker.setIcon(icon);
        if (dragging) marker.dragging.enable();
    };

    MapObjectsRepository.prototype.onObjectMarkerEvent = function (eventName, eventFunction) {
        //console.log('MapObjectsRepository.prototype.onObjectMarkerEvent');
        this.markerEventList.push({eventName: eventName, eventFunc: eventFunction});
        for (var key in this.pylons)
            this.pylons[key].on(eventName, eventFunction);
    };

    MapObjectsRepository.prototype.offObjectMarkerEvent = function (eventName, eventFunction) {
        //console.log('MapObjectsRepository.prototype.offObjectMarkerEvent');
        var indexes = [];
        for(var i = 0; i < this.markerEventList.length; i++)
            if((this.markerEventList[i].eventName == eventName) &&
               (this.markerEventList[i].eventFunc == eventFunction))
                    indexes.push(i);
        for(var i = indexes.length - 1; i >= 0; i--)
            this.markerEventList.splice(indexes[i], 1);
        for (var key in this.pylons)
            this.pylons[key].off(eventName, eventFunction);
    };

    // Включение / выключение возможности перетаскивания маркеров городов и заправок

    MapObjectsRepository.prototype.onObjectMarkerDragging = function (eventFunction) {
        //console.log('MapObjectsRepository.prototype.onObjectMarkerDragging');
        this.markerDragging = true;
        this.onObjectMarkerEvent('dragend', eventFunction);
        for (var key in this.pylons)
            this.pylons[key].dragging.enable();
    };

    MapObjectsRepository.prototype.offObjectMarkerDragging = function (eventFunction) {
        //console.log('MapObjectsRepository.prototype.offObjectMarkerDragging');
        this.markerDragging = false;
        this.offObjectMarkerEvent('dragend', eventFunction);
        for (var key in this.pylons)
            this.pylons[key].dragging.disable();
    };

    // Объекты (дорогиб города, заправки)

    MapObjectsRepository.prototype.selectObject = function (object) {
        //console.log('MapObjectsRepository.prototype.selectObject');
        object.isSelect = true;
        this.setupMarkerIcon(object, this.pylonIcon[object.type].select);
    };

    MapObjectsRepository.prototype.unSelectObject = function (object) {
        //console.log('MapObjectsRepository.prototype.unSelectObject');
        object.isSelect = false;
        this.setupMarkerIcon(object, this.pylonIcon[object.type].main);
    };

    MapObjectsRepository.prototype.changeSelectObject = function (object) {
        //console.log('MapObjectsRepository.prototype.changeSelectObject');
        if (object.isSelect)
            this.unSelectObject(object);
        else
            this.selectObject(object);
    };

    MapObjectsRepository.prototype.clearSelection = function () {
        //console.log('MapObjectsRepository.prototype.clearSelection');
        for (var key in this.pylons)
            if (this.pylons[key].isSelect)
                this.unSelectObject(this.pylons[key]);
    };

    MapObjectsRepository.prototype.delAllSelectedObjects = function () {
        //console.log('MapObjectsRepository.prototype.delAllSelectedObjects');
        for (var key in this.pylons)
            if (this.pylons[key].isSelect)
                this.delObject(key);
    };

    MapObjectsRepository.prototype.selectByRect = function (boundsRect) {
        //console.log('MapObjectsRepository.prototype.selectByRect');
        for (var key in this.pylons)
            if (boundsRect.contains(this.pylons[key].objectCoord))
                this.selectObject(this.pylons[key]);
    };

    MapObjectsRepository.prototype.addObject = function (object) {
        //console.log('MapObjectsRepository.prototype.addObject');
        var p = myMap.project(object.coord, map_max_zoom);
        var mes_obj = {
            object_type: object.type,
            position: {
                x: p.x,
                y: p.y,
                z: map_max_zoom + 8
            }
        };
        editor_manager.sendAddObject(mes_obj);
    };

    MapObjectsRepository.prototype.delObject = function (id) {
        //console.log('MapObjectsRepository.prototype.delObject');
        editor_manager.sendDelObject(id);
    };

    MapObjectsRepository.prototype.changeObject = function (object) {
        //console.log('MapObjectsRepository.prototype.changeObject');
        var p = myMap.project(object.getLatLng(), map_max_zoom);
        var mes_obj = {
            object_type: object.type,
            id: object.objectID,
            position: {
                x: p.x,
                y: p.y,
                z: map_max_zoom + 8
            }
        };
        editor_manager.sendChangeObject(mes_obj);
    };

    MapObjectsRepository.prototype.addTilesFromServer = function (objects) {
        //console.log('MapObjectsRepository.prototype.addTileFromServer');
        for (var i = 0; i < objects.length; i++) {
            var x = objects[i].position.x;
            var y = objects[i].position.y;
            var z = objects[i].position.z;
            var lt1 = myMap.unproject([x << (26 - z), y << (26 - z)], map_max_zoom);
            var lt2 = myMap.unproject([(x + 1) << (26 - z), (y + 1) << (26 - z)], map_max_zoom);

            var map_rect = L.rectangle(L.latLngBounds([lt1, lt2]), {
                color: objects[i].color,
                weight: 2,
                clickable:false,
                fillOpacity: 0.1});

            this.tsTiles[objects[i]._id['$oid']] = map_rect;
            map_rect.addTo(myMap);
        }
    };

    MapObjectsRepository.prototype.delTilesFromServer = function (objects) {
        //console.log('MapObjectsRepository.prototype.delTileFromServer');
        for (var i = 0; i < objects.length; i++)
            if (this.tsTiles[objects[i]._id['$oid']]) {
                myMap.removeLayer(this.tsTiles[objects[i]._id['$oid']]);
                delete this.tsTiles[objects[i]._id['$oid']];
            }
    };

    MapObjectsRepository.prototype.addObjectFromServer = function (object) {
        //console.log('MapObjectsRepository.prototype.addObjectFromServer', object);
        if (!((object) && (object.id) && (object.position))) return;
        if (!object.object_type)
            object.object_type = 'defPylon';
        object.coord = myMap.unproject([object.position.x, object.position.y], map_max_zoom);
        var marker = L.marker(object.coord, {
            clickable: true,
            keyboard: false}).addTo(myMap);
        // сохраняем в маркере дополнительные параметры из object
        marker.isSelect = false;
        marker.objectCoord = object.coord;
        marker.objectID = object.id;
        marker.type = object.object_type;
        for (var index in this.markerEventList)
            marker.on(this.markerEventList[index].eventName, this.markerEventList[index].eventFunc);
        if (this.markerDragging)
            marker.dragging.enable();
        this.setupMarkerIcon(marker, this.pylonIcon[object.object_type].main);
        this.pylons[object.id] = marker;
    };

    MapObjectsRepository.prototype.delObjectFromServer = function (id) {
        //console.log('MapObjectsRepository.prototype.delObjectFromServer');
        if (!this.pylons[id]) return;
        myMap.removeLayer(this.pylons[id]);
        delete this.pylons[id];
    };

    MapObjectsRepository.prototype.changeObjectFromServer = function (object) {
        //console.log('MapObjectsRepository.prototype.changeObjectFromServer');
        if (!((object) && (object.id) && (object.position))) return;
        object.coord = myMap.unproject([object.position.x, object.position.y], map_max_zoom);
        if (!this.pylons[object.id]) return;
        this.pylons[object.id].objectCoord = object.coord;
        this.pylons[object.id].setLatLng(object.coord);
    };

    return MapObjectsRepository;
})();