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
        iconSize: [20, 20]
    }));
    newMarker.bindLabel(aCar.owner.login+test_html_str, {direction: 'right'});
    //newMarker.on('popupopen', onMarkerPopupOpen);
    newMarker.on('mouseover', onMouseOverForLabels);
    newMarker.on('mouseout', onMouseOutForLabels);
    newMarker.on('click', onMouseClickMarker);
    //newMarker.bindPopup('popUp');
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

function onMouseClickMarker(){
    //alert('click '+this.carID);
    backLightList.toggle(this);
   // backLight.on(this);


    // тест эффекта мигания маркера
    this.setOpacity(0.5); // Если нужно мигания и Label, то передать вторым параметром true
    var self = this;
    setTimeout(function(){self.setOpacity(1);}, 500);
}


function onMarkerPopupOpen(e) {
    if (this.carID === user.userCar.ID)
        this.setPopupContent('My name is ' + user.login + '<br>' + 'My Car ID = '+ user.userCar.ID);
    else
        this.setPopupContent('My name is ' + listMapObject.objects[this.carID].owner.login+ '<br>' + 'My Car ID = '+ this.carID);
}