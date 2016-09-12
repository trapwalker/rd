/*
* Виджет для позиционирования карты по пользовательской машинке
*/

var WMapPosition = (function (_super) {
    __extends(WMapPosition, _super);

    function WMapPosition(car) {
        _super.call(this, [car]);
        this.car = car;
        this.old_position = {x: 0, y: 0};
        this.change(clock.getCurrentTime());
    }

    WMapPosition.prototype.change = function(t){
        //console.log('WMapPosition.prototype.change');
        //return;

        if (mapManager.inZoomChange) return;
        // если разрешено движение карты, то ничего не делать
        if (map.dragging._enabled) return;

        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        if ((Math.abs(this.old_position.x - tempPoint.x) >= 0.5) || (Math.abs(this.old_position.y - tempPoint.y) >= 0.5)) {
            this.old_position = tempPoint;
            var tempLatLng = mapManager.unproject([tempPoint.x, tempPoint.y], mapManager.getMaxZoom());
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
        }
    };

    WMapPosition.prototype.delFromVisualManager = function () {
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WMapPosition;
})(VisualObject);