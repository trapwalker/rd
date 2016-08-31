/*
* Виджет для позиционирования карты по пользовательской машинке
*/

var ConstMinShiftPosition = 0.5;
var ConstMaxShiftPosition = 20;
var ConstThresholdShiftPosition = 750;


var ConstMinShiftAngle = 0.02;
var ConstMaxShiftAngle = 0.04;


var WMapPosition = (function (_super) {
    __extends(WMapPosition, _super);

    function WMapPosition(car) {
        _super.call(this, [car, mapManager]);
        this.car = car;
        this.old_position = {x: 0, y: 0};

        this._camera_position_animation = true;
        this._camera_rotate_animation = true;

        this.change(clock.getCurrentTime());
    }

    WMapPosition.prototype.change = function(t){
        //console.log('WMapPosition.prototype.change', this);
        if (mapManager.inZoomChange) return;

        var time = clock.getCurrentTime();

        // смещение карты
        var carPoint = this.car.getCurrentCoord(time);
        var mapPointCurrent = mapManager.getMapCenter();
        var diff_pos = distancePoints2(carPoint, mapPointCurrent);
        if (diff_pos > ConstThresholdShiftPosition * ConstThresholdShiftPosition || !this._camera_position_animation) {
            // Мгновенно установить карту в новую позицию
            mapManager.setCenter(carPoint);
        }
        else {
            if (diff_pos > ConstMinShiftPosition * ConstMinShiftPosition) {
                if (diff_pos < ConstMaxShiftPosition * ConstMaxShiftPosition) {
                    mapManager.setCenter(carPoint);
                }
                else {
                    // Плавно двигаем карту в направлении carPoint
                    var diff_pos_vect = normVector(subVector(carPoint, mapPointCurrent), ConstMaxShiftPosition);
                    mapManager.setCenter(summVector(mapPointCurrent, diff_pos_vect));
                }
            }
        }

        // поворот карты
        var car_direction_real = -this.car.getCurrentDirection(time) - Math.PI / 2.;
        if (this._camera_rotate_animation) { // Если разрешён доворот карты
            var map_angle_z = gradToRad(mapManager.map_angleZ);
            var diff_angle = getDiffAngle2(car_direction_real, map_angle_z);
            var target_angle = 0;
            if (Math.abs(diff_angle) > ConstMinShiftAngle) {
                if (Math.abs(diff_angle) <= ConstMaxShiftAngle)
                    target_angle = map_angle_z + diff_angle;
                else
                    target_angle = map_angle_z + ConstMaxShiftAngle * Math.sign(diff_angle);
                mapManager.setRotate(null, radToGrad(target_angle));
            }
        }
        else { // Если доворот запрещён, то сразу повернуть по направлению машинки
            mapManager.setRotate(null, radToGrad(car_direction_real));
        }

    };

    WMapPosition.prototype.delFromVisualManager = function () {
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WMapPosition;
})(VisualObject);