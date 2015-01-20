// Файл предназначен для надстроек над leaflet'ом

/* Маркер с поворотом иконки на любой угол.
 Использование:
 создание: var marker = L.rotatedMarker(<как обычный маркер>);
 добавление на карту: marker.addTo(map);
 установка угла в радианах: marker.options.angle = direction;
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


// создание маркера Машинки
function getCarMarker(aCar, aMap) {
    //var test_html_str = '<div id="idCar_' + aCar.ID +
    //    '" class="car-label-info-class sublayers-clickable" onClick="carInfoClickEvent(event)"></div>';
    var test_html_str = "";
    var newMarker = L.rotatedMarker([0, 0]);
    if(aCar.cls === 'Rocket'){
        newMarker.setIcon(iconsLeaflet.icon_rocket_V1);
    }
    else {
        newMarker.setIcon(iconsLeaflet.icon_moving_V2);
    }
    if (aCar.owner) {
        var party_str = "";
        if (aCar.owner.party.name.length > 2)party_str = '[' + aCar.role + '@' + aCar.owner.party.name + ']';
        newMarker.bindLabel(aCar.owner.login + test_html_str + party_str, {direction: 'right'}).setLabelNoHide(cookieStorage.visibleLabel());
    }
    else
        newMarker.bindLabel(aCar.ID + test_html_str, {direction: 'right'}).setLabelNoHide(cookieStorage.visibleLabel());
    //newMarker.on('popupopen', onMarkerPopupOpen);
    newMarker.on('mouseover', onMouseOverForLabels);
    newMarker.on('mouseout', onMouseOutForLabels);
    // TODO ради радиального меню здесь не клик, а маусдаун
    newMarker.on('mousedown', onMouseClickMarker);
    newMarker.addTo(aMap);
    newMarker.carID = aCar.ID;

    return newMarker;
}


// создание маркера
function getTownMarker(aTown, aMap) {
    var newMarker = L.marker(aMap.unproject([aTown.coord.x, aTown.coord.y], aMap.getMaxZoom()));
    newMarker.setIcon(iconsLeaflet.icon_city);
    // Лейбл города всегда видим
    newMarker.bindLabel(aTown.name, {direction: 'right'});
    // Здесь будут висеть обработчики кликов

    // Добавляем город на карту
    newMarker.addTo(aMap);
    // Помещаем id города в newMarker. Пока город нигде не хранится, есть только его ID
    newMarker.townID = aTown.ID;

    return newMarker;
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



function onMarkerPopupOpen(e) {
    if (this.carID === user.userCar.ID)
        this.setPopupContent('My name is ' + user.login + '<br>' + 'My Car ID = '+ user.userCar.ID);
    else
        this.setPopupContent('My name is ' + listMapObject.objects[this.carID].owner.login+ '<br>' + 'My Car ID = '+ this.carID);
}




