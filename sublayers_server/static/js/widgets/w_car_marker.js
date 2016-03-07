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
        this.change();
    }

    WCarMarker.prototype._createMarker = function() {
        var car = this.car;
        var marker;
        marker = L.rotatedMarker([0, 0], {zIndexOffset: 9999});
        this.marker = marker;
        marker.carID = car.ID;

        // todo: сделать доступ к иконнке через car.cls
        this.updateIcon();

        marker.on('mouseover', onMouseOverForLabels);
        marker.on('mouseout', onMouseOutForLabels);
        marker.addTo(map);
        switch (car.cls) {
            case 'Town':
            case 'GasStation':
                marker.on('click', onClickLocationMarker);
                marker.obj_id = car.ID;
                break;
            case 'POILoot':
                marker.obj_id = car.ID;
                marker.on('click', onClickPOILootMarker);
                break;
            case 'POIContainer':
                marker.obj_id = car.ID;
                marker.on('click', onClickPOIContainerMarker);
                break;
            default:
                marker.on('click', onClickUserCarMarker);
        }

        this.updateLabel();

        marker.on('contextmenu', function () {
            var car = visualManager.getModelObject(this.carID);
            if (car && car.getCurrentHP) {
                var hp = car.getCurrentHP(clock.getCurrentTime());
                console.info(this.carID, '  have  ', hp, ' hp points', '  car dps = ', car._hp_state.dps);
            }
            //alert('Номер текущей иконки: ' + this._old_icon_id + '   ' + this.carID)
        });
    };

    WCarMarker.prototype.change = function() {
        //console.log('WCarMarker.prototype.change');
        //return;
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
        var car = this.car;
        var marker = this.marker;
        var icon_id = 1;
        // 1 - стрелка-машинка // для всех, кроме себя
        // 4 - одинарная стрелка // своих сапортийцев
        // 5 - двойная стрелка  // своя

        if (car == user.userCar)
            icon_id = 5;
        else {
            if (car.owner)
                if (user.party && car.owner.party)
                    if (car.owner.party.name == user.party.name)
                        icon_id = 4;
        }

        if(car.cls == 'Rocket') {
            icon_id = 17;
        }

        if(car.cls == 'ScoutDroid') {
            icon_id = 21;
        }

        if(car.cls == 'StationaryTurret') {
            icon_id = 7;
        }

        if(car.cls == 'SlowMine') {
            icon_id = 31;
        }

        if(car.cls == 'RadioPoint') {
            icon_id = 7;
        }

        if(car.cls == 'POILoot') {
            icon_id = 3;
        }

        if(car.cls == 'POIContainer') {
            icon_id = 3;
        }

        if(car.cls == 'Town') {
            marker.setIcon(iconsLeaflet.getIcon('icon_city'));
            return;
        }

        if(car.cls == 'GasStation') {
            marker.setIcon(iconsLeaflet.getIcon('icon_station'));
            return;
        }

        marker.setIcon(iconsLeaflet.getIconByID(icon_id));
    };

    WCarMarker.prototype.updateLabel = function(new_label) {
        this.marker.unbindLabel();
        var label_str1 = '<span style="color: #2afd0a; font: 8pt MICRADI; letter-spacing: 1px">';
        //var label_str1 = '<span>';
        var label_str2 = '</span>';
        var label_str = "";

        if(new_label){ // если нужно просто что-то написать, то передаём это сюда
            label_str = label_str1 + new_label + label_str2;
        }else { // иначе будет установлена стандартная надпись
            if (this.car.owner || this.car == user.userCar) {
                var owner = this.car.owner || user;
                var party_str = "";
                if(owner.party != null) {
                    //console.log(owner.party);
                    party_str = '[' + owner.party.name + ']';
                }

                // info: кнопочка информация добавлена здесь
                var info_btn_span = '<span onclick="' +
                    'getCarInfoFrom('+this.marker.carID+'); stopEvent(event);' +
                    '" style="pointer-events: auto">(i)</span>';

                label_str = label_str1 + owner.login + party_str + info_btn_span + label_str2;
            }
            else { // значит объект не имеет владельца, нужно использовать main_agent_login
                if (this.car.cls == 'Rocket' || this.car.cls == 'SlowMine')
                    label_str = label_str = label_str1 + label_str2;
                else {
                    if (this.car.main_agent_login)
                        label_str = label_str1 + '-=by ' + this.car.main_agent_login + '=-' + label_str2;
                    else
                        label_str = label_str1 + '-=' + this.car.cls + '=-' + label_str2;

                }
            }
        }
        this.marker.bindLabel(label_str, {direction: 'right', opacity: 0.5}).setLabelNoHide(cookieStorage.visibleLabel());
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

function getCarInfoFrom(car_id) {
    alert('Вы запросили информацию о ' + car_id);

}

function onMouseOverForLabels() {
    //if(this._labelNoHide) return false;
    this.setLabelNoHide(true);
    this.getLabel().setOpacity(0.95);
}

function onMouseOutForLabels() {
    this.setLabelNoHide(cookieStorage.visibleLabel());
    this.getLabel().setOpacity(0.4);
}

function onClickLocationMarker() {
    clientManager.sendEnterToLocation(this.obj_id)
}

function onClickUserCarMarker() {
    //console.log('Смена иконки -', this._old_icon_id);
//    if(! this._old_icon_id) this._old_icon_id = 0;
//    this._old_icon_id++;
//    this.setIcon(iconsLeaflet.getIconByID(this._old_icon_id));
    var car = visualManager.getModelObject(this.carID);
    if ((car != user.userCar) && (car.owner))
        clientManager.sendInitBarter(car.owner.login)
}

function onClickPOILootMarker() {
    //console.log('клик на лут! ', this.obj_id);
    clientManager.sendGetLoot(this.obj_id)
}

function onClickPOIContainerMarker() {
    //console.log('клик на onClickPOIContainerMarker! ', this.obj_id);
    windowTemplateManager.openUniqueWindow('container', '/container', {container_id: this.obj_id});
    returnFocusToMap();
}