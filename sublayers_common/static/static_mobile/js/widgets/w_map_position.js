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
        //console.log('WMapPosition.prototype.change', this);
        if (mapManager.inZoomChange) return;

        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        if ((Math.abs(this.old_position.x - tempPoint.x) >= 0.5) || (Math.abs(this.old_position.y - tempPoint.y) >= 0.5)) {
            this.old_position = tempPoint;
            mapManager.setCenter(tempPoint);
        }

        // поворот карты через mapManager.setRotate()
        var car_direction_real = this.car.getCurrentDirection(time) + Math.PI / 2.;
        mapManager.setRotate(null, radToGrad(-car_direction_real));
    };

    WMapPosition.prototype.delFromVisualManager = function () {
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WMapPosition;
})(VisualObject);