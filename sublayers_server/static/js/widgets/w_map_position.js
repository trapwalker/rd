/*
* Виджет для позиционирования карты по пользовательской машинке
*/

var WMapPosition = (function (_super) {
    __extends(WMapPosition, _super);

    function WMapPosition(car) {
        _super.call(this, [car]);
        this.car = car;
        this.change(clock.getCurrentTime())
    }

    WMapPosition.prototype.change = function(t){
        //console.log('WMapPosition.prototype.change');
        if (mapManager.inZoomChange) return;
        // если разрешено движение карты, то ничего не делать
        if (map.dragging._enabled) return;

        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
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

    WMapPosition.prototype.delFromVisualManager = function () {
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WMapPosition;
})(VisualObject);