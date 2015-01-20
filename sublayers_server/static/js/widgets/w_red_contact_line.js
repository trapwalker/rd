/*
 * Отладочный виджет для отрисовки линий-контактов машинок (кто кого видет)
 */

var WRedContactLine = (function (_super) {
    __extends(WRedContactLine, _super);

    function WRedContactLine(scar, ocar) {
        _super.call(this, [scar, ocar]);
        this.scar = scar;
        this.ocar = ocar;
        this.plln = null;
        this._init();
    }

    WRedContactLine.prototype._init = function(){
        //console.log('WRedContactLine.prototype._init');
        var time = clock.getCurrentTime();
        var tempPoint1 = this.scar.getCurrentCoord(time);
        var tempLatLng1 = map.unproject([tempPoint1.x, tempPoint1.y], map.getMaxZoom());
        var tempPoint2 = this.ocar.getCurrentCoord(time);
        var tempLatLng2 = map.unproject([tempPoint2.x, tempPoint2.y], map.getMaxZoom());
        this.plln = L.polyline([tempLatLng1, tempLatLng2], {color: 'red'});
        this.plln.bindPopup(
            'uid объекта: ' + this.ocar.ID + '</br>' +
            'subject_id: ' + this.scar.ID + '</br>');
        this.plln.addTo(map);
    };

    WRedContactLine.prototype.change = function(time){
        //console.log('WRedContactLine.prototype.change');
        var tempPoint1 = this.scar.getCurrentCoord(time);
        var tempLatLng1 = map.unproject([tempPoint1.x, tempPoint1.y], map.getMaxZoom());
        var tempPoint2 = this.ocar.getCurrentCoord(time);
        var tempLatLng2 = map.unproject([tempPoint2.x, tempPoint2.y], map.getMaxZoom());
        this.plln.setLatLngs([tempLatLng1, tempLatLng2]);
    };

    WRedContactLine.prototype.delFromVisualManager = function () {
        // если вызван данный метод, то клиент переставл видеть какую-то из машинок.
        // А значит нужно вычистить виджет из второй машинки...
        visualManager.delVisualObject(this, this._model_objects);

        if (map.hasLayer(this.plln))
            map.removeLayer(this.plln);
    };

    return WRedContactLine;
})(VisualObject);