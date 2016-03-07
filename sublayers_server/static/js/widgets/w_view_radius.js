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
        this.r = car.radius_visible;
        this.lastZoom = 1;
        this.old_position = {x: 0, y: 0};

        this.marker = L.circleMarker([0, 0], {
            fill: false,
            color: '#0f0',
            dashArray: '5, 15',
            opacity: car == user.userCar ? 1.0 : 0.5
        });
        this.marker.setRadius(this._calcRadius());
        this.marker.addTo(map);
        this.change(clock.getCurrentTime());
    }

    WViewRadius.prototype._calcRadius = function(){
        return this.r / Math.pow(2., (map.getMaxZoom() - map.getZoom()));
    };

    WViewRadius.prototype.change = function(t){
        //console.log('WViewRadius.prototype.change');
        //return;
        // todo: радиус может меняться. всегда запрашивать его у машинки, позже !!! если появится state для радиуса
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);

        // Установка новых координат маркера);
        if ((Math.abs(this.old_position.x - tempPoint.x) >= 0.5) || (Math.abs(this.old_position.y - tempPoint.y) >= 0.5)) {
            this.old_position = tempPoint;
            var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
            this.marker.setLatLng(tempLatLng);
        }

        // если был изменён зум, то изменить радиус
        if(map.getZoom() != this.lastZoom) {
            this.lastZoom = map.getZoom();
            this.marker.setRadius(this._calcRadius());
        }
        // если радиус обзора машинки изменился, то изменить круг
        if(Math.abs(this.r - this.car.radius_visible) > 1.0) {
            this.r = this.car.radius_visible;
            this.marker.setRadius(this._calcRadius());
        }
    };

    WViewRadius.prototype.delModelObject = function (mobj) {
        //console.log('WViewRadius.prototype.delModelObject');
        if (mobj == this.car) {
            this.delFromVisualManager();
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
