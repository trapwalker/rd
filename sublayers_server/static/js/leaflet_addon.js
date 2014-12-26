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


// создание маркера Машинки
function getCarMarker(aCar, aMap) {
    //var test_html_str = '<div id="idCar_' + aCar.ID +
    //    '" class="car-label-info-class sublayers-clickable" onClick="carInfoClickEvent(event)"></div>';
    var test_html_str = "";
    var newMarker = L.rotatedMarker([0, 0]);
    if(aCar.cls === 'Rocket'){
        newMarker.setIcon(iconsLeaflet.icon_moving_V1);
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


function onMouseOverForLabels(){
    if(this._labelNoHide) return false;
    this.setLabelNoHide(true);
}

function onMouseOutForLabels(){
    this.setLabelNoHide(cookieStorage.visibleLabel());
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
    if(cookieStorage.optionsSelectAnybody) {
        if (listMapObject.exist(this.carID)) {
            var car = listMapObject.objects[this.carID];
            if (car.backLight)
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



var Bang = (function(){
    function Bang(position){
        this._r = 1;
        //this.marker = L.circleMarker(myMap.unproject([position.x, position.y], myMap.getMaxZoom()), {color: '#FFFFFF'})
        //    .setRadius(this._r);
        var bang_power = 50;
        var bang_duration = 1500;
        var bang_end_duration = 1000;


        this.myIcon = L.divIcon({
            className: 'my-bang-icon',
            iconSize: [bang_power, bang_power],
            iconAnchor: [bang_power, bang_power],
            html: '<svg height="'+bang_power * 2 +'px" width="'+bang_power*2+'px">' +
                '<circle cx="' + bang_power + '" cy="'+bang_power+'" r="2" fill="#FFAF21">' +
                '<animate attributeName="r" repeatCount="1" fill="freeze"' +
                    'dur="' + bang_duration + 'ms" ' +
                    'from="1" to="' + bang_power + '"' +
                    'values="1; ' + bang_power * 0.5 + '; ' + bang_power * 0.8 + '; ' + bang_power + ';" ' +
                    '/>' +
                '<animate attributeType="CSS" attributeName="opacity"'+
                    'from="1" to="0" dur="'+bang_end_duration+'ms" repeatCount="1" fill="freeze"' +
                     'begin="' + bang_duration + 'ms"/>' +              
                '</circle>' +
                '</svg>'
        });
        this.marker = L.marker(myMap.unproject([position.x, position.y]), {icon: this.myIcon});//.addTo(myMap);
        //marker.valueOf()._icon.style.backgroundColor = 'green'; //or any color
        console.log('on map', this.marker);
        //this._map = myMap;
        this.duration = bang_duration + bang_end_duration;
    };

    Bang.prototype.start = function(){
        var self = this;
        var r = this._r;
        //myMap.addLayer(this.marker);
        this.marker.addTo(myMap);

        setTimeout(function(){
            console.log('now_remove', self);
            myMap.removeLayer(self.marker);
        }, this.duration);

    };

    return Bang
})();


