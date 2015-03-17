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
        this.marker = marker;

        // todo: сделать доступ к иконнке через car.cls
        marker.setIcon(iconsLeaflet.getIcon('icon_moving_V2'));
        if(car.cls == 'Rocket')
            marker.setIcon(iconsLeaflet.getIcon('icon_rocket_V1'));

        // todo: разобраться с owner машинки. Возможно будет OwnerManager !!!

        this.updateLabel();

        marker.on('mouseover', onMouseOverForLabels);
        marker.on('mouseout', onMouseOutForLabels);
        marker.addTo(map);
        marker.carID = car.ID;


        //if (car == user.userCar)
        marker.on('click', onClickUserCarMarker);
        marker.on('contextmenu', function(){alert('Номер текущей иконки: ' + this._old_icon_id)});
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
        if (!mapManager.inZoomChange)
            this.marker.setLatLng(tempLatLng);
        else
            this.marker.update();

    };

    WCarMarker.prototype.updateLabel = function(new_label){
        this.marker.unbindLabel();

        if(new_label){ // если нужно просто что-то написать, то передаём это сюда

        }else { // иначе будет установлена стандартная надпись
            if (this.car.owner || this.car == user.userCar) {
                var owner = this.car.owner || user;
                var party_str = "";
                if(owner.party != null) {
                    console.log(owner.party);
                    party_str = '[' + owner.party.name + ']';
                }
                this.marker.bindLabel(owner.login + party_str, {direction: 'right'}).setLabelNoHide(cookieStorage.visibleLabel());
            }
            else
                this.marker.bindLabel(this.car.ID.toString(), {direction: 'right'}).setLabelNoHide(cookieStorage.visibleLabel());
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

// todo: внести следующие функции в класс WCarMarker

function onMouseOverForLabels(){
    if(this._labelNoHide) return false;
    this.setLabelNoHide(true);
}

function onMouseOutForLabels(){
    this.setLabelNoHide(cookieStorage.visibleLabel());
}


function onClickUserCarMarker(){
    //alert('click to my marker');
    if(! this._old_icon_id) this._old_icon_id = 0;
    this._old_icon_id++;
    this.setIcon(iconsLeaflet.getIconByID(this._old_icon_id));

}

