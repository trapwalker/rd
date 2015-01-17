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

    WMapPosition.prototype.change = function(time){
        //console.log('WMapPosition.prototype.change');
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        map.panTo(tempLatLng, {animate: false});
    };

    return WMapPosition;
})(VisualObject);