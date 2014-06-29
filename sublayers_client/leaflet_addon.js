// Файл предназначен для надстроек над leaflet'ом


/* Маркер с поворотом иконки на любой угол.
Использование:
    создание: var marker = L.rotatedMarker(<как обычный маркер>);
    добавление на карту: marker.addTo(map);
    установка угла в градусах: marker.options.angle = direction;
    поворот картинки осуществляется при переустановке координат!
    перерисовка маркера: marker.setLatLng(marker.getLatLng() - или нужные координаты);
 */
L.RotatedMarker = L.Marker.extend({
    options: { angle: 0 },
    _setPos: function(pos) {
        L.Marker.prototype._setPos.call(this, pos);
        if (L.DomUtil.TRANSFORM) {
            this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'deg)';
        }
    }
});
L.rotatedMarker = function(pos, options) {
    return new L.RotatedMarker(pos, options);
};




// Список маркеров
var MarkerList = (function () {
    function MarkerList() {
        this.markers = new Array();
    };

    MarkerList.prototype.add = function(aid, amarker) {
        this.markers[aid] = amarker;
        this.markers[aid].carID = aid;
        // добавить на карту
        //amarker.addTo(myMap);
        myMap.addLayer(this.markers[aid]);
    };

    MarkerList.prototype.del = function(aid) {
        // убрать с карты
        myMap.removeLayer(this.markers[aid]);
        // обнулить
        this.markers[aid] = null;
    };

    return MarkerList;
})();


// создание маркера
function getCarMarker(aid){
    var newmarker = L.rotatedMarker([0, 0]);
    newmarker.setIcon(L.icon({
        iconUrl: 'img/car_20.png',
        iconSize: [20, 20]
    }));
    //newmarker.on('click', removeCar_test);
    //newmarker.on('click', onMouseClickMarker);
    newmarker.on('popupopen', onMarkerPopupOpen);
    newmarker.bindPopup(
            "<input type="+'"image"' + "src=" + '"img/green-info-icon.png"' + " height=15 width=15 " +" value="+'"Информация" onclick="getTestInfo(lastIDPopupOpen);">'
    );
    return newmarker;
}
