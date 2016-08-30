/*
* Синглтон для работы с картой
* В данный модуль писать все методы и функции для работы с картой
*/

//Максимальный и минимальный зумы карты
var ConstStartZoom = 17;
var ConstMaxMapZoom = 18;
var ConstMinMapZoom = 14;
var ConstDurationAnimation = 500;
var ConstZoomCameraShift = {
    18: {angleX: 45, centerShift: -35},
    17: {angleX: 30, centerShift: -20},
    16: {angleX: 15, centerShift: -10},
    15: {angleX: 0, centerShift: 0},
    14: {angleX: 0, centerShift: 0}
};


var MapManager = (function(_super){
    __extends(MapManager, _super);

    function MapManager(){
        _super.call(this);

        this.inZoomChange = false;
        this.oldZoomForCalcZoom = 0;
        this.startZoomChangeTime = 0;

        this.tileLayerPath = '';
        this.tileLayer = null;

        this.size_koeff = 2.0;
        this.max_size = 0;

        // Параметры карты для имитации 3D
        this.map_angleX = 0;
        this.map_angleZ = 0;
        this.map_perspective = 500;

        this.jq_map = null;
    }

    MapManager.prototype.init = function () {
        this.jq_map = $('#map');

        this.max_size = this.size_koeff * Math.max(window.screen.width, window.screen.height);
        $('.global-size').css({'width': this.max_size, 'height': this.max_size});
        this.resize_window();

        this.tileLayerPath = $('#settings_map_link').text();
        map = L.map('map', {
            minZoom: ConstMinMapZoom,
            maxZoom: ConstMaxMapZoom,
            zoomControl: false,
            attributionControl: false,
            scrollWheelZoom: "center",
            dragging: false,
            zoomAnimationThreshold: (ConstMaxMapZoom - ConstMinMapZoom),
            doubleClickZoom: false
        }).setView([50.5717, 36.5705], ConstStartZoom);
        map.keyboard.disable();

        this.anim_zoom = map.getZoom();
        this.createTileLayer();

        // Обработчики событий карты
        this.jq_map.on('keydown', this.onKeyDownMap);
        this.jq_map.on('keyup', this.onKeyUpMap);

        map.on('zoomstart', this.onZoomStart);
        map.on('zoomend', this.onZoomEnd);
        map.on('zoomanim', this.onZoomAnimation);

        mapManager.setRotate(mapManager.getCameraState(mapManager.getZoom()).angleX);
    };

    MapManager.prototype.createTileLayer = function() {
        //console.log('MapManager.prototype.createTileLayer', storage);
        this.tileLayer = L.tileLayer(
            //this.tileLayerPath,
            'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw',
            {
                continuousWorld: true,
                opacity: 1.0,
                errorTileUrl: '/static/img/map_404.jpg',
                maxZoom: ConstMaxMapZoom,
                id: 'mapbox.streets' // не забыть убрать
            }).addTo(map);
    };

    MapManager.prototype.setRotate = function(angleX, angleZ) {
        this.map_angleX = ((angleX === undefined) || (angleX === null)) ? this.map_angleX : angleX;
        this.map_angleZ = ((angleZ === undefined) || (angleZ === null)) ? this.map_angleZ : angleZ;
        this._setRotate();
    };

    MapManager.prototype._setRotate = function() {
        var cos = Math.cos(gradToRad(-this.map_angleZ));
        var sin = Math.sin(gradToRad(-this.map_angleZ));
        $('canvas').css('transform', 'rotateZ(' + this.map_angleZ + 'deg) rotate3d(' + cos + ', ' + sin + ', 0, ' + this.map_angleX + 'deg)');
        this.jq_map.css('transform', 'rotateZ(' + this.map_angleZ + 'deg) rotate3d(' + cos + ', ' + sin + ', 0, ' + this.map_angleX + 'deg)');
    };

    MapManager.prototype.resize_window = function () {
        var current_width = $(window).width();
        var current_height = $(window).height();
        $('.global-shift').css({
            'left': (current_width - this.max_size) / 2.0,
            'top': (current_height - this.max_size) / 2.0
        });

    };

    MapManager.prototype.redraw = function(time) {
        //console.log('MapManager.prototype.redraw');
        if (this.inZoomChange)
            this.setRotate(this.getCameraState(this.getRealZoom(time)).angleX);

        visualManager.changeModelObject(this);
    };

    MapManager.prototype.setCenter = function(point) {
        //console.log('MapManager.prototype.setCenter');
        var tempLatLng = this.unproject([point.x, point.y], this.getMaxZoom());
        map.setView(tempLatLng, map.getZoom(), {
            reset: false,
            animate: false,
            pan: {
                animate: false,
                duration: 0.05,
                easeLinearity: 0.05,
                noMoveStart: true
            }
        });
    };

    MapManager.prototype.project = function(latlng, zoom) {
        return map.project(latlng, zoom);
    };

    MapManager.prototype.unproject = function(latlng, zoom) {
        return map.unproject(latlng, zoom);
    };

    // =============================== Map Coords

    MapManager.prototype.getMapCenter = function () {
        var c = mapManager.project(map.getCenter(), this.getMaxZoom());
        return new Point(c.x, c.y);
    };

    MapManager.prototype.getMapSize = function() {
        var s = map.getSize();
        return new Point(s.x, s.y);
    };

    MapManager.prototype.getTopLeftCoords = function(zoom) {
        var c = this.getMapCenter();
        var map_size = mulScalVector(this.getMapSize(), 0.5);
        var koeff = Math.pow(2., (ConstMaxMapZoom - zoom));
        return subVector(c, mulScalVector(map_size, koeff));
    };

    // =============================== Zoom

    MapManager.prototype.getRealZoom = function (time) {
        if ((this.inZoomChange) && (time >= this.startZoomChangeTime)) {
            // todo: пока будет считаться по линейной функции
            var path_time = (time - this.startZoomChangeTime) / (ConstDurationAnimation / 1000.0);
            if (path_time > 1.0) path_time = 1.0;
            var zoom_diff = this.anim_zoom - this.oldZoomForCalcZoom;
            return this.oldZoomForCalcZoom + zoom_diff * path_time;
        }
        else {
            return this.getZoom();
        }
    };

    MapManager.prototype.getCameraState = function (zoom) {
        var zoom_less = Math.floor(zoom);
        if (zoom_less < ConstMinMapZoom) return ConstZoomCameraShift[ConstMinMapZoom];
        if (zoom_less >= ConstMaxMapZoom) return ConstZoomCameraShift[ConstMaxMapZoom];
        var zoom_great = zoom_less + 1;
        var zoom_koef = zoom - zoom_less;
        return {
            angleX: ConstZoomCameraShift[zoom_less].angleX + (ConstZoomCameraShift[zoom_great].angleX - ConstZoomCameraShift[zoom_less].angleX) * zoom_koef,
            centerShift: ConstZoomCameraShift[zoom_less].centerShift + (ConstZoomCameraShift[zoom_great].centerShift - ConstZoomCameraShift[zoom_less].centerShift) * zoom_koef
        };
    };

    MapManager.prototype.getMaxZoom = function() {
        return ConstMaxMapZoom
    };

    MapManager.prototype.getZoom = function() {
        return map.getZoom();
    };

    MapManager.prototype.setZoom = function(zoom) {
        //console.log('MapManager.prototype.setZoom');
        if (zoom == map.getZoom()) return;
        map.setZoom(zoom);
    };

    MapManager.prototype.onZoomAnimation = function(event) {
        //console.log('MapManager.prototype.zoomAnim', event);
        if (!event.zoom) return;
        mapManager.anim_zoom = event.zoom;
    };

    MapManager.prototype.onZoomStart = function (event) {
        //console.log('MapManager.prototype.onZoomStart', map.getZoom());
        mapManager.inZoomChange = true;
        mapManager.oldZoomForCalcZoom = map.getZoom();
        mapManager.startZoomChangeTime = clock.getCurrentTime();
    };

    MapManager.prototype.onZoomEnd = function (event) {
        //console.log('MapManager.prototype.onZoomEnd');
        mapManager.inZoomChange = false;
        mapManager.setRotate( mapManager.getCameraState(mapManager.getZoom()).angleX);
        visualManager.changeModelObject(mapManager);
    };

    MapManager.prototype.onKeyDownMap = function(event) {
        //console.log('MapManager.prototype.onKeyDownMap', event.keyCode);
        switch (event.keyCode) {
            case 37:  // pressedArrowLeft
                mapManager.setRotate(null, mapManager.map_angleZ - 1);
                break;
            case 39:  // pressedArrowRight
                mapManager.setRotate(null, mapManager.map_angleZ + 1);
                break;
            case 38:  // pressedArrowUp
                mapManager.setRotate(mapManager.map_angleX + 1, null);
                break;
            case 40:  // pressedArrowDown
                mapManager.setRotate(mapManager.map_angleX - 1, null);
                break;
        }
    };

    MapManager.prototype.onKeyUpMap = function(event) {
        //console.log('MapManager.prototype.onKeyUpMap');
        switch (event.keyCode) {
            default:
                break;
        }
    };

    return MapManager;
})(ClientObject);

// менеджеры могут быть не актуальны
//var MapManagerMB = (function(_super){
//    __extends(MapManagerMB, _super);
//
//    function MapManagerMB(){
//        _super.call(this);
//
//        this.inZoomChange = false;
//        this.oldZoomForCalcZoom = 0;
//        this.startZoomChangeTime = 0;
//
//        this.tileLayerPath = '';
//        this.tileLayer = null;
//
//        this.size_koeff = 2.0;
//        this.max_size = 0;
//
//        // Параметры карты для имитации 3D
//        this.map_angleX = 0;
//        this.map_angleZ = 0;
//        this.map_perspective = 500;
//
//        this.jq_map = null;
//    }
//
//    MapManagerMB.prototype.init = function () {
//        this.jq_map = $('#map');
//        this.max_size = this.size_koeff * Math.max(window.screen.width, window.screen.height);
//
//        $('.global-size').css({'width': this.max_size, 'height': this.max_size});
//        this.resize_window();
//
//        if (!mapboxgl.supported()) {
//            alert('Your browser does not support Mapbox GL');
//            return;
//        }
//        mapboxgl.accessToken = "pk.eyJ1IjoibWVnYWJ5dGVhbSIsImEiOiJZNWQ5ODVFIn0.eRVYkGmKSZn54ibSsFuf0w";
//        map = new mapboxgl.Map({
//            container: 'map',
//            style: 'mapbox://styles/mapbox/dark-v9',
//            center: [50.5717, 36.5705],
//            zoom: ConstStartZoom,
//            hash: true
//        });
//
//        this.anim_zoom = map.getZoom();
//
//        // Обработчики событий карты
//        this.jq_map.on('keydown', this.onKeyDownMap);
//        this.jq_map.on('keyup', this.onKeyUpMap);
//
//        map.on('zoomstart', this.onZoomStart);
//        map.on('zoomend', this.onZoomEnd);
//        map.on('zoom', this.onZoomAnimation);
//
//        mapManager.setRotate(mapManager.getCameraState(mapManager.getZoom()).angleX);
//    };
//
//    MapManagerMB.prototype.setCenter = function(point) {
//        //console.log('MapManager.prototype.setCenter');
//        var tempLatLng = this.unproject([point.x, point.y], this.getMaxZoom());
//        map.setCenter(tempLatLng);
//    };
//
//    MapManagerMB.prototype.setRotate = function(angleX, angleZ) {
//        this.map_angleX = ((angleX === undefined) || (angleX === null)) ? this.map_angleX : angleX;
//        this.map_angleZ = ((angleZ === undefined) || (angleZ === null)) ? this.map_angleZ : angleZ;
//        this._setRotate();
//    };
//
//    MapManagerMB.prototype._setRotate = function() {
//        var cos = Math.cos(gradToRad(-this.map_angleZ));
//        var sin = Math.sin(gradToRad(-this.map_angleZ));
//        $('canvas').css('transform', 'rotateZ(' + this.map_angleZ + 'deg) rotate3d(' + cos + ', ' + sin + ', 0, ' + this.map_angleX + 'deg)');
//        this.jq_map.css('transform', 'rotateZ(' + this.map_angleZ + 'deg) rotate3d(' + cos + ', ' + sin + ', 0, ' + this.map_angleX + 'deg)');
//    };
//
//    MapManagerMB.prototype.resize_window = function () {
//        var current_width = $(window).width();
//        var current_height = $(window).height();
//        $('.global-shift').css({
//            'left': (current_width - this.max_size) / 2.0,
//            'top': (current_height - this.max_size) / 2.0
//        });
//    };
//
//    MapManagerMB.prototype.redraw = function(time) {
//        //console.log('MapManager.prototype.redraw');
//        if (!this.inZoomChange) return;
//        this.setRotate(this.getCameraState(this.getRealZoom(time)).angleX);
//    };
//
//    MapManagerMB.prototype.project = function(latlng, zoom) {
//        var MAX_LATITUDE = 85.0511287798;
//        var scale = 256 * Math.pow(2, zoom);
//
//        var x = latlng.lng * DEG_TO_RAD;
//        var y = Math.max(Math.min(MAX_LATITUDE, latlng.lat), -MAX_LATITUDE) * DEG_TO_RAD;
//        y = Math.log(Math.tan((Math.PI / 4) + (y / 2)));
//
//	    return {x: scale * ((0.5 / Math.PI) * x + 0.5), y: scale * ((-0.5 / Math.PI) * y + 0.5)};
//    };
//
//    MapManagerMB.prototype.unproject = function(point, zoom) {
//        var scale = 256 * Math.pow(2, zoom);
//        var x = point.x || point[0];
//        var y = point.y || point[1];
//        x = (x / scale - 0.5) / (0.5 / Math.PI);
//        y = (y / scale - 0.5) / (-0.5 / Math.PI);
//        return {lat: (2 * Math.atan(Math.exp(y)) - (Math.PI / 2)) * RAD_TO_DEG, lng: x * RAD_TO_DEG};
//    };
//
//    // =============================== Map Coords
//
//    MapManagerMB.prototype.getMapCenter = function () {
//        var c = mapManager.project(map.getCenter(), ConstMaxMapZoom);
//        return new Point(c.x, c.y);
//    };
//
//    MapManagerMB.prototype.getMapSize = function() {
//        return new Point(this.max_size, this.max_size);
//    };
//
//    MapManagerMB.prototype.getTopLeftCoords = function(zoom) {
//        var c = this.getMapCenter();
//        var map_size = mulScalVector(this.getMapSize(), 0.5);
//        var koeff = Math.pow(2., (ConstMaxMapZoom - zoom));
//        return subVector(c, mulScalVector(map_size, koeff));
//    };
//
//    // =============================== Zoom
//
//    MapManagerMB.prototype.getRealZoom = function (time) {
//        if ((this.inZoomChange) && (time >= this.startZoomChangeTime)) {
//            // todo: пока будет считаться по линейной функции
//            var path_time = (time - this.startZoomChangeTime) / (ConstDurationAnimation / 1000.0);
//            if (path_time > 1.0) path_time = 1.0;
//            var zoom_diff = this.anim_zoom - this.oldZoomForCalcZoom;
//            return this.oldZoomForCalcZoom + zoom_diff * path_time;
//        }
//        else {
//            return this.getZoom();
//        }
//    };
//
//    MapManagerMB.prototype.getCameraState = function (zoom) {
//        var zoom_less = Math.floor(zoom);
//        if (zoom_less < ConstMinMapZoom) return ConstZoomCameraShift[ConstMinMapZoom];
//        if (zoom_less >= ConstMaxMapZoom) return ConstZoomCameraShift[ConstMaxMapZoom];
//        var zoom_great = zoom_less + 1;
//        var zoom_koef = zoom - zoom_less;
//        return {
//            angleX: ConstZoomCameraShift[zoom_less].angleX + (ConstZoomCameraShift[zoom_great].angleX - ConstZoomCameraShift[zoom_less].angleX) * zoom_koef,
//            centerShift: ConstZoomCameraShift[zoom_less].centerShift + (ConstZoomCameraShift[zoom_great].centerShift - ConstZoomCameraShift[zoom_less].centerShift) * zoom_koef
//        };
//    };
//
//    MapManagerMB.prototype.getMaxZoom = function() {
//        return ConstMaxMapZoom
//    };
//
//    MapManagerMB.prototype.getZoom = function() {
//        return map.getZoom();
//    };
//
//    MapManagerMB.prototype.setZoom = function(zoom) {
//        //console.log('MapManager.prototype.setZoom');
//        if (zoom == map.getZoom()) return;
//        map.zoomTo(zoom, {duration: ConstDurationAnimation, animate: true});
//    };
//
//    MapManagerMB.prototype.onZoomAnimation = function(event) {
//        //console.log('MapManager.prototype.zoomAnim', event);
//        if (!event.zoom) return;
//        mapManager.anim_zoom = event.zoom;
//    };
//
//    MapManagerMB.prototype.onZoomStart = function (event) {
//        //console.log('MapManager.prototype.onZoomStart', map.getZoom());
//        mapManager.inZoomChange = true;
//        mapManager.oldZoomForCalcZoom = map.getZoom();
//        mapManager.startZoomChangeTime = clock.getCurrentTime();
//    };
//
//    MapManagerMB.prototype.onZoomEnd = function (event) {
//        //console.log('MapManager.prototype.onZoomEnd');
//        mapManager.inZoomChange = false;
//        mapManager.setRotate( mapManager.getCameraState(mapManager.getZoom()).angleX);
//        visualManager.changeModelObject(mapManager);
//    };
//
//    MapManagerMB.prototype.onKeyDownMap = function(event) {
//        //console.log('MapManager.prototype.onKeyDownMap', event.keyCode);
//        switch (event.keyCode) {
//            case 37:  // pressedArrowLeft
//                mapManager.setRotate(null, mapManager.map_angleZ - 1);
//                break;
//            case 39:  // pressedArrowRight
//                mapManager.setRotate(null, mapManager.map_angleZ + 1);
//                break;
//            case 38:  // pressedArrowUp
//                mapManager.setRotate(mapManager.map_angleX + 1, null);
//                break;
//            case 40:  // pressedArrowDown
//                mapManager.setRotate(mapManager.map_angleX - 1, null);
//                break;
//        }
//    };
//
//    MapManagerMB.prototype.onKeyUpMap = function(event) {
//        //console.log('MapManager.prototype.onKeyUpMap');
//        switch (event.keyCode) {
//            default:
//                break;
//        }
//    };
//
//    return MapManagerMB;
//})(ClientObject);
//
//
//var MapManagerOL = (function(_super){
//    __extends(MapManagerOL, _super);
//
//    function MapManagerOL(){
//        _super.call(this);
//
//        this.inZoomChange = false;
//        this.oldZoomForCalcZoom = 0;
//        this.startZoomChangeTime = 0;
//
//        this.tileLayerPath = '';
//        this.tileLayer = null;
//
//        this.size_koeff = 2.0;
//        this.max_size = 0;
//
//        // Параметры карты для имитации 3D
//        this.map_angleX = 0;
//        this.map_angleZ = 0;
//        this.map_perspective = 500;
//
//        this.jq_map = null;
//    }
//
//    MapManagerOL.prototype.init = function () {
//        this.jq_map = $('#map');
//        this.max_size = this.size_koeff * Math.max(window.screen.width, window.screen.height);
//
//        $('.global-size').css({'width': this.max_size, 'height': this.max_size});
//        this.resize_window();
//
//        var initCenter = ol.proj.fromLonLat([36.57048927116396, 50.57170681401324]);
//
//        var myStyle = new ol.style.Style ({
//          fill: new ol.style.Fill({
//             color: 'rgba(255,100,50,0.5)'
//           })
//        });
//
//        // create a vector source that loads a GeoJSON file
//        var vectorSource = new ol.source.Vector({
//            projection: 'EPSG:3857',
//            url: 'http://192.168.1.12:8080/planet_2016-06-20_3d4cb571d3d0d828d230aac185281e97_z0-z14/index.json',
//            format: new ol.format.GeoJSON()
//        });
//
//        // a vector layer to render the source
//        var vectorLayer = new ol.layer.Vector({
//            source: vectorSource,
//            style: myStyle
//        });
//
//        //map = new ol.Map({
//        //    layers: [vectorLayer],
//        //    renderer: 'canvas',
//        //    target: 'map',
//        //    view: new ol.View({
//        //        center: initCenter,
//        //        zoom: 15
//        //    })
//        //});
//
//        map = new ol.Map({
//            layers: [
//                new ol.layer.Tile({
//                    source: new ol.source.TileJSON({
//                        url: 'http://192.168.1.12:8080/planet_2016-06-20_3d4cb571d3d0d828d230aac185281e97_z0-z14/index.json',
//                        crossOrigin: 'anonymous'
//                    }),
//                    style: new ol.style.Style({
//                        fill: new ol.style.Fill({
//                            color: 'rgba(255, 255, 255, 0.6)'
//                        }),
//                        stroke: new ol.style.Stroke({
//                            color: '#319FD3',
//                            width: 1
//                        })
//                    })
//                })
//            ],
//            target: 'map',
//            renderer: 'canvas',
//            view: new ol.View({
//                center: initCenter,
//                zoom: 15
//            })
//        });
//
//
//
//        this.anim_zoom = this.getZoom();
//
//        // Обработчики событий карты
//        this.jq_map.on('keydown', this.onKeyDownMap);
//        this.jq_map.on('keyup', this.onKeyUpMap);
//
//        map.on('zoomstart', this.onZoomStart);
//        map.on('zoomend', this.onZoomEnd);
//        map.on('zoom', this.onZoomAnimation);
//
//        mapManager.setRotate(mapManager.getCameraState(mapManager.getZoom()).angleX);
//    };
//
//    MapManagerOL.prototype.setCenter = function(point) {
//        //console.log('MapManager.prototype.setCenter');
//        map.getView().setCenter([point.y, point.x]);
//    };
//
//    MapManagerOL.prototype.setRotate = function(angleX, angleZ) {
//        this.map_angleX = ((angleX === undefined) || (angleX === null)) ? this.map_angleX : angleX;
//        this.map_angleZ = ((angleZ === undefined) || (angleZ === null)) ? this.map_angleZ : angleZ;
//        this._setRotate();
//    };
//
//    MapManagerOL.prototype._setRotate = function() {
//        var cos = Math.cos(gradToRad(-this.map_angleZ));
//        var sin = Math.sin(gradToRad(-this.map_angleZ));
//        $('canvas').css('transform', 'rotateZ(' + this.map_angleZ + 'deg) rotate3d(' + cos + ', ' + sin + ', 0, ' + this.map_angleX + 'deg)');
//        this.jq_map.css('transform', 'rotateZ(' + this.map_angleZ + 'deg) rotate3d(' + cos + ', ' + sin + ', 0, ' + this.map_angleX + 'deg)');
//    };
//
//    MapManagerOL.prototype.resize_window = function () {
//        var current_width = $(window).width();
//        var current_height = $(window).height();
//        $('.global-shift').css({
//            'left': (current_width - this.max_size) / 2.0,
//            'top': (current_height - this.max_size) / 2.0
//        });
//    };
//
//    MapManagerOL.prototype.redraw = function(time) {
//        //console.log('MapManager.prototype.redraw');
//        if (!this.inZoomChange) return;
//        this.setRotate(this.getCameraState(this.getRealZoom(time)).angleX);
//    };
//
//    MapManagerOL.prototype.project = function(latlng, zoom) {
//        return ol.proj.fromLonLat([latlng.lon, latlng.lat]);
//    };
//
//    MapManagerOL.prototype.unproject = function(point, zoom) {
//        return ol.proj.toLonLat([point.x, point.y]);
//    };
//
//    // =============================== Map Coords
//
//    MapManagerOL.prototype.getMapCenter = function () {
//        return map.getView().getCenter();
//    };
//
//    MapManagerOL.prototype.getMapSize = function() {
//        return new Point(this.max_size, this.max_size);
//    };
//
//    MapManagerOL.prototype.getTopLeftCoords = function(zoom) {
//        var c = this.getMapCenter();
//        var map_size = mulScalVector(this.getMapSize(), 0.5);
//        var koeff = Math.pow(2., (ConstMaxMapZoom - zoom));
//        return subVector(c, mulScalVector(map_size, koeff));
//    };
//
//    // =============================== Zoom
//
//    MapManagerOL.prototype.getRealZoom = function (time) {
//        if ((this.inZoomChange) && (time >= this.startZoomChangeTime)) {
//            // todo: пока будет считаться по линейной функции
//            var path_time = (time - this.startZoomChangeTime) / (ConstDurationAnimation / 1000.0);
//            if (path_time > 1.0) path_time = 1.0;
//            var zoom_diff = this.anim_zoom - this.oldZoomForCalcZoom;
//            return this.oldZoomForCalcZoom + zoom_diff * path_time;
//        }
//        else {
//            return this.getZoom();
//        }
//    };
//
//    MapManagerOL.prototype.getCameraState = function (zoom) {
//        var zoom_less = Math.floor(zoom);
//        if (zoom_less < ConstMinMapZoom) return ConstZoomCameraShift[ConstMinMapZoom];
//        if (zoom_less >= ConstMaxMapZoom) return ConstZoomCameraShift[ConstMaxMapZoom];
//        var zoom_great = zoom_less + 1;
//        var zoom_koef = zoom - zoom_less;
//        return {
//            angleX: ConstZoomCameraShift[zoom_less].angleX + (ConstZoomCameraShift[zoom_great].angleX - ConstZoomCameraShift[zoom_less].angleX) * zoom_koef,
//            centerShift: ConstZoomCameraShift[zoom_less].centerShift + (ConstZoomCameraShift[zoom_great].centerShift - ConstZoomCameraShift[zoom_less].centerShift) * zoom_koef
//        };
//    };
//
//    MapManagerOL.prototype.getMaxZoom = function() {
//        return ConstMaxMapZoom
//    };
//
//    MapManagerOL.prototype.getZoom = function() {
//        return map.getView().getZoom()
//    };
//
//    MapManagerOL.prototype.setZoom = function(zoom) {
//        //console.log('MapManager.prototype.setZoom');
//        if (zoom == this.getZoom()) return;
//        //map.zoomTo(zoom, {duration: ConstDurationAnimation, animate: true});
//        map.getView().setZoom(zoom);
//    };
//
//    MapManagerOL.prototype.onZoomAnimation = function(event) {
//        //console.log('MapManager.prototype.zoomAnim', event);
//        if (!event.zoom) return;
//        mapManager.anim_zoom = event.zoom;
//    };
//
//    MapManagerOL.prototype.onZoomStart = function (event) {
//        //console.log('MapManager.prototype.onZoomStart', map.getZoom());
//        mapManager.inZoomChange = true;
//        mapManager.oldZoomForCalcZoom = map.getZoom();
//        mapManager.startZoomChangeTime = clock.getCurrentTime();
//    };
//
//    MapManagerOL.prototype.onZoomEnd = function (event) {
//        //console.log('MapManager.prototype.onZoomEnd');
//        mapManager.inZoomChange = false;
//        mapManager.setRotate( mapManager.getCameraState(mapManager.getZoom()).angleX);
//        visualManager.changeModelObject(mapManager);
//    };
//
//    MapManagerOL.prototype.onKeyDownMap = function(event) {
//        //console.log('MapManager.prototype.onKeyDownMap', event.keyCode);
//        switch (event.keyCode) {
//            case 37:  // pressedArrowLeft
//                mapManager.setRotate(null, mapManager.map_angleZ - 1);
//                break;
//            case 39:  // pressedArrowRight
//                mapManager.setRotate(null, mapManager.map_angleZ + 1);
//                break;
//            case 38:  // pressedArrowUp
//                mapManager.setRotate(mapManager.map_angleX + 1, null);
//                break;
//            case 40:  // pressedArrowDown
//                mapManager.setRotate(mapManager.map_angleX - 1, null);
//                break;
//        }
//    };
//
//    MapManagerOL.prototype.onKeyUpMap = function(event) {
//        //console.log('MapManager.prototype.onKeyUpMap');
//        switch (event.keyCode) {
//            default:
//                break;
//        }
//    };
//
//    return MapManagerOL;
//})(ClientObject);

var map;
var mapManager = new MapManager();





