/*
 * Виджет для указания пункта назначения пользовательской машинки
 * Виджет находится на карте, поэтому ссылка на него находится в map_manager
 * для того, чтобы им было легко управлять (включать и выключать)
 */

var WTargetPointMarker = (function (_super) {
    __extends(WTargetPointMarker, _super);

    function WTargetPointMarker(car) {
        _super.call(this, [car]);
        this.car = car;
        this.target_point = null;
        this.ltln_tp = null;
        this.active = false;
        var temp_coord = car.getCurrentCoord(clock.getCurrentTime());
        var carLatLng = map.unproject([temp_coord.x, temp_coord.y], map.getMaxZoom());
        this.line = L.polyline([carLatLng, carLatLng], {
            color: '#00ff54',
            weight: 2,
            opacity: 0.2,
            clickable: false,
            lineCap: 'round',
            dashArray: '8, 5' // для пунктира
        });
        this.old_position = {x: 0, y: 0};
    }

    WTargetPointMarker.prototype.change = function(t){
        //console.log('WMapPosition.prototype.change');
        if(! this.active) return;
        if (mapManager.inZoomChange) return;
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);

        if ((Math.abs(this.old_position.x - tempPoint.x) >= 0.5) || (Math.abs(this.old_position.y - tempPoint.y) >= 0.5)) {
            this.old_position = tempPoint;
            var carLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
            this.line.setLatLngs([this.ltln_tp, carLatLng]);
        }
    };

    WTargetPointMarker.prototype.equals_target_points = function(target){
        if (!this.target_point) return false;
        return Math.abs(this.target_point.x - target.x) < 0.1 &&
            Math.abs(this.target_point.y - target.y) < 0.1;
    };

    WTargetPointMarker.prototype.activate = function(target_point){
        // если таргет поинт не сменился, то выход
        if (this.equals_target_points(target_point))
            return;
        this.target_point = target_point;
        this.ltln_tp = map.unproject([target_point.x, target_point.y], map.getMaxZoom());
        if (! this.active) {
            this.line.addTo(map);
            this.active = true;
        }
    };

    WTargetPointMarker.prototype.deactivate = function(){
        this.target_point = null;
        this.ltln_tp = null;
        if (this.active) {
            map.removeLayer(this.line);
            this.active = false;
        }
    };

    WTargetPointMarker.prototype.delFromVisualManager = function () {
        //console.log('WTargetPointMarker.prototype.delFromVisualManager');
        this.deactivate();
        _super.prototype.delFromVisualManager.call(this);
    };

    return WTargetPointMarker;
})(VisualObject);