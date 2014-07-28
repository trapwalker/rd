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
    newMarker.setIcon(L.icon({
        iconUrl: 'img/car_20.png',
        iconSize: [20, 20],
        labelAnchor: [-65, -20] // центровка в пикселях относительно центра маркера
    }));
    newMarker.bindLabel(aCar.owner.login+test_html_str, {direction: 'right'});
    newMarker.on('popupopen', onMarkerPopupOpen);
    newMarker.on('mouseover', onMouseOverForLabels);
    newMarker.on('mouseout', onMouseOutForLabels);
    newMarker.bindPopup('popUp');
    newMarker.addTo(aMap);
    newMarker.carID = aCar.ID;

    return newMarker;
}


function onMouseOverForLabels(){
    if(this._labelNoHide) return false;
    this.setLabelNoHide(true);
}

function onMouseOutForLabels(){
    this.setLabelNoHide(myMap.getZoom() > 14);
}

function carInfoClickEvent2(event){
    var car = event.data.car;
    //alert('Я машинка номер' + car.ID + '   Мой хозяин зовут '+ car.owner.login);
    //alert('aaaaaaaaaaaaaaaaaaaaaaaaaeeeeeeeeeeeeeeeeeeeeee');
    return false;
}

function carInfoClickEvent(event){
    var car = listMapObject.objects[event.target.id.split('_')[1]];
    alert('Я машинка номер' + car.ID + '  Мой хозяин зовут '+ car.owner.login);
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