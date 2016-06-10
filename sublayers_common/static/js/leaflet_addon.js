// Файл предназначен для надстроек над leaflet'ом

/* Маркер с поворотом иконки на любой угол.
 Использование:
 создание: var marker = L.rotatedMarker(<как обычный маркер>);
 добавление на карту: marker.addTo(map);
 установка угла в радианах: marker.options.angle = direction;
 поворот картинки осуществляется при переустановке координат!
 перерисовка маркера: marker.setLatLng(marker.getLatLng() - или нужные координаты);
 */
L.RotatedMarker = L.Marker.extend({
    options: {
        angle: 0
    },
    _setPos: function (pos) {
        L.Marker.prototype._setPos.call(this, pos);
        if (L.DomUtil.TRANSFORM) {
            this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'rad)';
        }
    }
});

L.rotatedMarker = function (pos, options) {
    return new L.RotatedMarker(pos, options);
};



