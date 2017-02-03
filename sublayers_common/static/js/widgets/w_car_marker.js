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
        marker = L.rotatedMarker([0, 0], marker_options);
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
                marker.obj_id = car.ID;
                break;
            case 'POILoot':
            case 'POICorpse':
                marker.obj_id = car.ID;
                marker.on('click', onClickPOIContainerMarker);
                break;
            case 'POIContainer':
                marker.obj_id = car.ID;
                marker.on('click', onClickPOIContainerMarker);
                break;
            default:
                marker.on('click', onClickUserCarMarker);
        }

        this.updateLabel();

        //if (this.car.direction) {
        //    this.marker.options.angle = this.car.direction;
        //    this.marker.update();
        //}

        marker.on('contextmenu', function () {
            var car = visualManager.getModelObject(this.carID);
            if (car && car.getCurrentHP) {
                var hp = car.getCurrentHP(clock.getCurrentTime());
                console.info(this.carID, '  have  ', hp, ' hp points', '  car dps = ', car._hp_state.dps);
            }
            //alert('Номер текущей иконки: ' + this._old_icon_id + '   ' + this.carID)
        });
    };

    WCarMarker.prototype._get_marker_options = function(options) {
        return options.zIndexOffset = 9999;
    };

    WCarMarker.prototype.change = function() {
        //console.log('WCarMarker.prototype.change');
        //return;
        if (mapManager.inZoomChange && this.car != user.userCar) return;
        var need_rotate = false;
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = mapManager.unproject([tempPoint.x, tempPoint.y], mapManager.getMaxZoom());
        var tempAngle = 0; //this.car.getCurrentDirection(time); --- так как пока что используется только для трупов
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

        if (car == user.userCar)
             marker.setIcon(iconsLeaflet.getIconByID(5));
        else {
            if (car.owner)
                if (user.party && car.owner.party)
                    if (car.owner.party.name == user.party.name)
                         marker.setIcon(iconsLeaflet.getIconByID(4));
        }

        if(car.cls == 'Rocket') {
            marker.setIcon(iconsLeaflet.getIconByID(17));
        }

        if(car.cls == 'ScoutDroid') {
            marker.setIcon(iconsLeaflet.getIconByID(21));
        }

        if(car.cls == 'StationaryTurret') {
            marker.setIcon(iconsLeaflet.getIconByID(7));
        }

        if(car.cls == 'SlowMine' || car.cls == 'BangMine') {
            marker.setIcon(iconsLeaflet.getIcon("mine_001"));
        }

        if(car.cls == 'RadioPoint') {
            marker.setIcon(iconsLeaflet.getIconByID(7));
        }

        if(car.cls == 'POILoot') {
            marker.setIcon(iconsLeaflet.getIcon('icon_killed_V1'));
        }

        if(car.cls == 'POIContainer') {
            marker.setIcon(iconsLeaflet.getIconByID(3));
        }

        if(car.cls == 'Town') {
            switch (car.example.id) {
                case 'reg://registry/poi/locations/towns/prior':
                    marker.setIcon(iconsLeaflet.getIcon('icon_city_prior'));
                    break;
                case 'reg://registry/poi/locations/towns/whitehill':
                    marker.setIcon(iconsLeaflet.getIcon('icon_city_whitehill'));
                    break;
                default:
                    marker.setIcon(iconsLeaflet.getIcon('icon_city'));
            }
        }

        if(car.cls == 'GasStation') {
            marker.setIcon(iconsLeaflet.getIcon('icon_station'));
        }

        if(car.cls == 'POICorpse') {
            marker.setIcon(iconsLeaflet.getIcon('icon_dead_' + WCarMarker._get_icon_by_sub_class(car.sub_class_car), 'icon'));
        }
    };

    WCarMarker.prototype.updateLabel = function(new_label) {
        if (this.car.cls == 'Town' || this.car.cls == 'GasStation') return;
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
        //this.marker.bindLabel(label_str, {direction: 'right', opacity: 0.5}).setLabelNoHide(cookieStorage.visibleLabel());
    };

    WCarMarker._get_icon_by_sub_class = function(sub_class) {
        var icon_name = null;
        switch (sub_class) {
            case 'artillery':
                icon_name = 'art';
                break;
            case 'armored':
                icon_name = 'bm';
                break;
            case 'btrs':
                icon_name = 'btr';
                break;
            case 'buggies':
                icon_name = 'buggy';
                break;
            case 'buses':
                icon_name = 'bus';
                break;
            case 'cars':
                icon_name = 'car';
                break;
            case 'trucks':
                icon_name = 'cargo';
                break;
            case 'motorcycles':
                icon_name = 'moto';
                break;
            case 'quadbikes':
                icon_name = 'quadro';
                break;
            case 'sports':
                icon_name = 'sport';
                break;
            case 'offroad':
                icon_name = 'suv';
                break;
            case 'tanks':
                icon_name = 'tank';
                break;
            case 'tractors':
                icon_name = 'truck';
                break;
            case 'vans':
                icon_name = 'van';
                break;
            default:
                console.log('Не найдена иконка. Установлена стандартная. ', sub_class);
                icon_name = 'car';
        }
        return icon_name;
    };

    WCarMarker.prototype.delFromVisualManager = function () {
        //console.log('WCarMarker.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCarMarker;
})(VisualObject);


var WStaticObjectMarker = (function (_super) {
    __extends(WStaticObjectMarker, _super);

    function WStaticObjectMarker(car) {
        this.current_opacity = null;
        _super.call(this, car);

        var tempPoint = this.car.getCurrentCoord();
        var tempLatLng = mapManager.unproject([tempPoint.x, tempPoint.y], mapManager.getMaxZoom());
        this.marker.setLatLng(tempLatLng);

        this.addModelObject(mapManager);

        this.current_opacity = 0.5;
        this.change();
    }

    WStaticObjectMarker.prototype._get_marker_options = function(options) {
        if (this.car.cls == 'Town' || this.car.cls == 'GasStation') {
            options.clickable = false;
        }
        return _super.prototype._get_marker_options.call(this, options);
    };

    WStaticObjectMarker.prototype.updateLabel = function(new_label) {
        if (this.car.cls == 'Town' || this.car.cls == 'GasStation') return;
        this.marker.unbindLabel();
        var title = this.car.title || ('-=' + this.car.cls + '=-');
        var label_str = '<span style="color: #2afd0a; font: 8pt MICRADI; letter-spacing: 1px">' + title + '</span>';
        this.marker.bindLabel(label_str, {direction: 'right', opacity: 0.5}).setLabelNoHide(cookieStorage.visibleLabel());
    };

    WStaticObjectMarker.prototype.change = function() {
        //console.log('WCarMarker.prototype.change');
        if(this.current_opacity == null) return;
        var new_opacity = mapManager.getZoom() >= 15. ? 0.0 : 1.0;
        // info: можно было просто удалять и добавлять маркеры, но это накладнее
        
        if (new_opacity != this.current_opacity) {
            this.current_opacity = new_opacity;
            this.marker.setOpacity(new_opacity);
            if (new_opacity == 0) {
                this.marker.setLatLng(mapManager.unproject([0, 0], mapManager.getMaxZoom()));
            }
            else {
                var tempPoint = this.car.getCurrentCoord();
                this.marker.setLatLng(mapManager.unproject([tempPoint.x, tempPoint.y], mapManager.getMaxZoom()));
            }
        }
    };

    WStaticObjectMarker.prototype.delFromVisualManager = function () {
        //console.log('WCarMarker.prototype.delFromVisualManager');
        this.delModelObject(mapManager);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WStaticObjectMarker;
})(WCarMarker);

// todo: внести следующие функции в класс WCarMarker

function getCarInfoFrom(car_id) {
    alert('Вы запросили информацию о ' + car_id);

}

function onMouseOverForLabels() {
    //if(this._labelNoHide) return false;
    this.setLabelNoHide(true);
    var label =  this.getLabel();
    if (label)
        label.setOpacity(0.95);
}

function onMouseOutForLabels() {
    this.setLabelNoHide(cookieStorage.visibleLabel());
    var label =  this.getLabel();
    if (label)
        label.setOpacity(0.4);
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

function onClickPOIContainerMarker() {
    //console.log('клик на onClickPOIContainerMarker! ', this.obj_id);
    windowTemplateManager.openUniqueWindow('container' + this.obj_id, '/container', {container_id: this.obj_id});
    returnFocusToMap();
}