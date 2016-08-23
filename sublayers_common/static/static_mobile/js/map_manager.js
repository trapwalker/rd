/*
* Синглтон для работы с картой
* В данный модуль писать все методы и функции для работы с картой
*/

console.log('m_m');

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
        if (!this.inZoomChange) return;
        this.setRotate(this.getCameraState(this.getRealZoom(time)).angleX);
    };

    // =============================== Map Coords

    MapManager.prototype.getMapCenter = function () {
        var c = map.project(map.getCenter(), map.getMaxZoom());
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

var map;
var mapManager = new MapManager();





