/*
 * Виджет для отрисовки маркера машинки
*/


var WCarMarker = (function (_super) {
    __extends(WCarMarker, _super);

    function WCarMarker(car) {
        _super.call(this, [car]);
        this.car = car;
        this.marker = null;
        this._createMarker();
        this._lastRotateAngle = 0.0;
        this.change();
    }

    WCarMarker.prototype._createMarker = function(){
        var car = this.car;
        var marker;
        marker = L.rotatedMarker([0, 0], {zIndexOffset: 9999});

        // todo: сделать доступ к иконнке через car.cls
        marker.setIcon(iconsLeaflet.getIcon('icon_moving_V2'));
        if(car.cls == 'Rocket')
            marker.setIcon(iconsLeaflet.getIcon('icon_rocket_V1'));

        // todo: разобраться с owner машинки. Возможно будет OwnerManager !!!

        if (car.owner || car == user.userCar) {
            var owner = car.owner || user;
            var party_str = "";
            if (owner.party.name.length > 2)
                party_str = '[' + (car.role || user.role)+ '@' + owner.party.name + ']';
            marker.bindLabel(owner.login + party_str, {direction: 'right'}).setLabelNoHide(cookieStorage.visibleLabel());
        }
        else {
            marker.bindLabel(car.ID.toString(), {direction: 'right'}).setLabelNoHide(cookieStorage.visibleLabel());
        }


        marker.on('mouseover', onMouseOverForLabels);
        marker.on('mouseout', onMouseOutForLabels);
        marker.addTo(map);
        marker.carID = car.ID;
        this.marker = marker;
    };

    WCarMarker.prototype.change = function(){
        //console.log('WCarMarker.prototype.change');
        if (mapManager.inZoomChange && this.car != user.userCar) return;

        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        var tempAngle = this.car.getCurrentDirection(time);
        if (Math.abs(this._lastRotateAngle - tempAngle) > 0.01) {
            this.marker.options.angle = tempAngle;
            this._lastRotateAngle = tempAngle;
        }
        this.marker.setLatLng(tempLatLng);

    };

    WCarMarker.prototype.delFromVisualManager = function () {
        //console.log('WCarMarker.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCarMarker;
})(VisualObject);

// todo: внести следующие функции в класс WCarMarker

function onMouseOverForLabels(){
    if(this._labelNoHide) return false;
    this.setLabelNoHide(true);
}

function onMouseOutForLabels(){
    this.setLabelNoHide(cookieStorage.visibleLabel());
}

