/*
 * Виджет для отрисовки маркеров
*/

var WCarMarker = (function (_super) {
    __extends(WCarMarker, _super);

    function WCarMarker(car) {
        _super.call(this, [car]);
        this.car = car;
        this.marker = null;
        this._createMarker();
        this._lastRotateAngle = 0.0;
        this.old_position = {x: 0, y: 0};
        this.circle = null;
        this.change();
    }

    WCarMarker.prototype._createMarker = function() {
        var car = this.car;
        var marker;
        var marker_options = this._get_marker_options({});
        marker = L.marker([0, 0], marker_options);
        this.marker = marker;
        marker.carID = car.ID;

        // todo: сделать доступ к иконнке через car.cls
        this.updateIcon();

        marker.addTo(map);
        marker.obj_id = car.ID;
    };

    WCarMarker.prototype._get_marker_options = function(options) {
        return options.zIndexOffset = 9999;
    };

    WCarMarker.prototype.change = function() {
        //console.log('WCarMarker.prototype.change');
        return;
        if (mapManager.inZoomChange && this.car != user.userCar) return;
        var need_rotate = false;
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        var tempAngle = this.car.getCurrentDirection(time);
        if (Math.abs(this._lastRotateAngle - tempAngle) > 0.01) {
            this.marker.options.angle = tempAngle;
            this._lastRotateAngle = tempAngle;
            need_rotate = true;
        }

        if ((Math.abs(this.old_position.x - tempPoint.x) >= 0.5) || (Math.abs(this.old_position.y - tempPoint.y) >= 0.5) || need_rotate) {
            this.old_position = tempPoint;
            if (!mapManager.inZoomChange)
                this.marker.setLatLng(tempLatLng);
            else
                this.marker.update();
        }
    };

    WCarMarker.prototype.updateIcon = function() {
        //console.log('WCarMarker.prototype.updateIcon', this.car);
        var car = this.car;
        var marker = this.marker;
        if (car == user.userCar) {
            marker.setIcon(iconsLeaflet.getIcon('icon_party_car', 'icon'));
        }
        else {
            marker.setIcon(iconsLeaflet.getIcon('icon_neutral_car', 'icon'));
        }
    };

    WCarMarker.prototype.delFromVisualManager = function () {
        //console.log('WCarMarker.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCarMarker;
})(VisualObject);
