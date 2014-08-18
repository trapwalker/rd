// Файл предназначен для надстроек над leaflet'ом

/* Маркер с поворотом иконки на любой угол.
 Использование:
 создание: var marker = L.rotatedMarker(<как обычный маркер>);
 добавление на карту: marker.addTo(map);
 установка угла в градусах: marker.options.angle = direction;
 поворот картинки осуществляется при переустановке координат!
 перерисовка маркера: marker.setLatLng(marker.getLatLng() - или нужные координаты);
 */
L.RotatedMarker = L.Marker.extend({
    options: {
        angle: 0
    },
    _setPos: function (pos) {
        L.Marker.prototype._setPos.call(this, pos);
        if (L.DomUtil.TRANSFORM) {
            this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'rad)';
        }
    }
});

L.rotatedMarker = function (pos, options) {
    return new L.RotatedMarker(pos, options);
};


// создание маркера
function getCarMarker(aCar, aMap) {
    var test_html_str = '<div id="idCar_' + aCar.ID +
        '" class="car-label-info-class sublayers-clickable" onClick="carInfoClickEvent(event)"></div>';
    var newMarker = L.rotatedMarker([0, 0]);
    //newMarker.setIcon(L.icon({
    //    iconUrl: 'img/car_20.png',
    //    iconSize: [20, 20]
    //}));
    newMarker.setIcon(iconsLeaflet.icon_moving_V2);
    if (aCar.owner)
        newMarker.bindLabel(aCar.owner.login + test_html_str, {direction: 'right'}).setLabelNoHide(aMap.getZoom() > levelZoomForVisible);
    else
        newMarker.bindLabel(aCar.ID + test_html_str, {direction: 'right'}).setLabelNoHide(aMap.getZoom() > levelZoomForVisible);
    //newMarker.on('popupopen', onMarkerPopupOpen);
    newMarker.on('mouseover', onMouseOverForLabels);
    newMarker.on('mouseout', onMouseOutForLabels);
    // TODO ради радиального меню здесь не клик, а маусдаун
    newMarker.on('mousedown', onMouseClickMarker);
    newMarker.addTo(aMap);
    newMarker.carID = aCar.ID;

    return newMarker;
}


function onMouseOverForLabels(){
    if(this._labelNoHide) return false;
    this.setLabelNoHide(true);
}

function onMouseOutForLabels(){
    this.setLabelNoHide(myMap.getZoom() > levelZoomForVisible);
}

function carInfoClickEvent2(event){
    var car = event.data.car;
    //alert('Я машинка номер' + car.ID + '   Мой хозяин зовут '+ car.owner.login);
    //alert('aaaaaaaaaaaaaaaaaaaaaaaaaeeeeeeeeeeeeeeeeeeeeee');
    return false;
}

function carInfoClickEvent(event){
    var car = listMapObject.objects[event.target.id.split('_')[1]];
    alert('Я машинка номер' + car.ID + '  HP '+ car.hp);
    //alert(car.owner.login);

    // остановка всплытия события, чтобы не считался клик на карте
    if (event.stopPropagation) {
        // Вариант стандарта W3C:
        event.stopPropagation()
    } else {
        // Вариант Internet Explorer:
        event.cancelBubble = true
    }
}

// Мигание любого маркера
function flashMarker(marker){
    marker.setOpacity(0.5); // Если нужно мигания и Label, то передать вторым параметром true
    setTimeout(function () {
        marker.setOpacity(1);
    }, 500);
}

function onMouseClickMarker(event){
    if (listMapObject.exist(this.carID)) {
        var car = listMapObject.objects[this.carID];
        if(car.backLight)
            carMarkerList.delFromBackLight(car);
        else
            carMarkerList.addToBackLight(car);

        // тест эффекта мигания маркера
        this.setOpacity(0.5); // Если нужно мигания и Label, то передать вторым параметром true
        var self = this;
        setTimeout(function () {
            self.setOpacity(1);
        }, 500);
    }

    if (event.originalEvent.stopPropagation) {
        // Вариант стандарта W3C:
        event.originalEvent.stopPropagation()
    } else {
        // Вариант Internet Explorer:
        event.originalEvent.cancelBubble = true
    }

}


function onMarkerPopupOpen(e) {
    if (this.carID === user.userCar.ID)
        this.setPopupContent('My name is ' + user.login + '<br>' + 'My Car ID = '+ user.userCar.ID);
    else
        this.setPopupContent('My name is ' + listMapObject.objects[this.carID].owner.login+ '<br>' + 'My Car ID = '+ this.carID);
}



// Формирование списка Иконок для всех видов маркеров леафлета
function iconLeafletInit(){
    iconsLeaflet = {};

    // Создание иконки города
    iconsLeaflet.icon_city = new L.icon({
        iconUrl: 'img/map_icons/map_ico_city.png',
        iconSize: [26, 29]
    });

    // Создание иконки заправочной станции
    iconsLeaflet.icon_station = new L.icon({
        iconUrl: 'img/map_icons/map_ico_fuelstation.png',
        iconSize: [26, 29]
    });


    // Создание иконки движущейся машинки V 1
    iconsLeaflet.icon_moving_V1 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v1_moving.png',
        iconSize: [51, 28]
    });

    // Создание иконки стоящей машинки V 1
    iconsLeaflet.icon_stopped_V1 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v1_stopped.png',
        iconSize: [51, 28]
    });

    // Создание иконки убитой машинки V 1
    iconsLeaflet.icon_killed_V1 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v1_killed.png',
        iconSize: [51, 28]
    });

    // Создание иконки движущейся машинки V 2
    iconsLeaflet.icon_moving_V2 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v2_moving_slow.png',
        iconSize: [51, 28]
    });

    // Создание иконки БЫСТРО движущейся машинки V 2
    iconsLeaflet.icon_moving_fast_V2 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v2_moving_fast.png',
        iconSize: [51, 28]
    });

    // Создание иконки стоящей машинки V 2
    iconsLeaflet.icon_stopped_V2 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v2_stopped.png',
        iconSize: [51, 28]
    });

    // Создание иконки убитой машинки V 2
    iconsLeaflet.icon_killed_V2 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v2_killed.png',
        iconSize: [51, 28]
    });


    // Создание иконки движущейся машинки V 3
    iconsLeaflet.icon_moving_V3 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v3_moving.png',
        iconSize: [51, 28]
    });

    // Создание иконки стоящей машинки V 3
    iconsLeaflet.icon_stopped_V3 = new L.icon({
        iconUrl: 'img/map_icons/map_icon_player_v3_stopped.png',
        iconSize: [51, 28]
    });
}