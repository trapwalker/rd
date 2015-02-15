/*
 * Виджет для отрисовки области видимости машинки
 * todo: Виджет должен исчезать перед зумом и появляться после!
 * todo: Когда-нибудь сделать, если нам этот виджет будет нужен не только для отладки
 */


var WViewRadius = (function (_super) {
    __extends(WViewRadius, _super);

    function WViewRadius(car, radius) {
        _super.call(this, [car, mapManager]);
        this.car = car;
        this.r = radius;
        this.lastZoom = 1;

        this.marker = L.circleMarker([0, 0], {
            fill: false,
            color: '#0f0',
            dashArray: '5, 15',
            opacity: car == user.userCar ? 1.0 : 0.5
        });
        this.marker.setRadius(this._calcRadius());
        this.marker.addTo(map);
        console.log(this._calcRadius());
        this.change(clock.getCurrentTime());
    }

    WViewRadius.prototype._calcRadius = function(){
        return this.r / Math.pow(2., (map.getMaxZoom() - map.getZoom()));
    };

    WViewRadius.prototype.change = function(t){
        //console.log('WViewRadius.prototype.change');
        // todo: радиус может меняться. всегда запрашивать его у машинки, позже !!! если появится state для радиуса
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        // Установка новых координат маркера);
        this.marker.setLatLng(tempLatLng);
        // если был изменён зум, то изменить радиус
        if(map.getZoom() != this.lastZoom) {
            this.lastZoom = map.getZoom();
            var r = this._calcRadius();
            console.log('r = ', r);
            this.marker.setRadius(r);
        }
    };

    WViewRadius.prototype.delFromVisualManager = function () {
        //console.log('WViewRadius.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WViewRadius;
})(VisualObject);
