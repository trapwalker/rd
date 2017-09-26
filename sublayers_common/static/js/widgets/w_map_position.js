/*
* Виджет для позиционирования карты по пользовательской машинке
*/

var WMapPosition = (function (_super) {
    __extends(WMapPosition, _super);

    function WMapPosition() {
        _super.call(this, []);
        this.old_position = {x: 0, y: 0};
    }

    WMapPosition.prototype.redraw = function(t) {
        var time = clock.getCurrentTime();
        if (!this._model_objects.length) return;
        var car = this._model_objects[0];
        var tempPoint = car.getCurrentCoord(time);
        tempPoint = summVector(tempPoint, mapCanvasManager.current_mouse_shift);
        if ((Math.abs(this.old_position.x - tempPoint.x) >= 0.5) || (Math.abs(this.old_position.y - tempPoint.y) >= 0.5)) {
            this.old_position = tempPoint;
            mapManager.set_coord({x: tempPoint.x, y:tempPoint.y});
        }
    };

    WMapPosition.prototype.delFromVisualManager = function () {};

    return WMapPosition;
})(VisualObject);

var wMapPosition;