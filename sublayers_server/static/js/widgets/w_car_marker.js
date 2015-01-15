var WCarMarker = (function (_super) {
    __extends(WCarMarker, _super);

    function WCarMarker(car) {
        _super.call(this, [car]);
        this.car = car;
        this.marker = null;
        this._createMarker();
    }


    WCarMarker.prototype._createMarker = function(){
        var car = this.car;
        var marker;
        marker = L.rotatedMarker([0, 0]);

        // todo: сделать IconManager
        //newMarker.setIcon(iconsLeaflet.getIcon(car.cls));
        marker.setIcon(iconsLeaflet.icon_moving_V2);

        // todo: разобраться с owner машинки. Возможно будет OwnerManager !!!
        if (car.owner) {
            var party_str = "";
            if (car.owner.party.name.length > 2)party_str = '[' + aCar.role + '@' + car.owner.party.name + ']';
            marker.bindLabel(car.owner.login + party_str, {direction: 'right'}).setLabelNoHide(cookieStorage.visibleLabel());
        }
        else
            marker.bindLabel(car.ID, {direction: 'right'}).setLabelNoHide(cookieStorage.visibleLabel());

        marker.on('mouseover', onMouseOverForLabels);
        marker.on('mouseout', onMouseOutForLabels);
        marker.addTo(map);
        marker.carID = car.ID;

        this.marker = marker;

    };

    WCarMarker.prototype.change = function(time){
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        // Установка угла для поворота иконки маркера
        this.marker.options.angle = this.car.getCurrentDirection(time);
        // Установка новых координат маркера);
        this.marker.setLatLng(tempLatLng);
    };

    VisualObject.prototype.delFromVisualManager = function () {
        var car = this.car;
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

