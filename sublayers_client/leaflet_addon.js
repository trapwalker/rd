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
    options: { angle: 0 },
    _setPos: function (pos) {
        L.Marker.prototype._setPos.call(this, pos);
        if (L.DomUtil.TRANSFORM) {
            this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'deg)';
        }
    }
});

L.rotatedMarker = function (pos, options) {
    return new L.RotatedMarker(pos, options);
};


// создание маркера
function getCarMarker(aID, aMap) {
    var newMarker = L.rotatedMarker([0, 0]);
    newMarker.setIcon(L.icon({
        iconUrl: 'img/car_20.png',
        iconSize: [20, 20]
    }));
    //newmarker.on('click', removeCar_test);
    //newmarker.on('click', onMouseClickMarker);
    newMarker.on('popupopen', onMarkerPopupOpen);
    newMarker.bindPopup(
            "<input type=" + '"image"' + "src=" + '"img/green-info-icon.png"' + " height=15 width=15 " + " value=" + '"Информация" onclick="getTestInfo(lastIDPopupOpen);">' +
            "<input type=" + '"image"' + "src=" + '"img/green-minus-for-speed.png"' + " height=15 width=15 " + " value=" + '"Удалить" onclick="delCar();">'
    );
    newMarker.addTo(aMap);
    newMarker.carID = aID;

    return newMarker;
}


// кнопка
L.Control.EasyButtons = L.Control.extend({
    options: {
        position: 'topleft',
        title: '',
        intentedIcon: 'default-easy-button'
    },

    onAdd: function () {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');

        this.link = L.DomUtil.create('a', 'leaflet-bar-part default-easy-button ' + this.options.intentedIcon, container); // Сюда вешается правильная картинка!
        //L.DomUtil.create('i', 'fa fa-lg ' + this.options.intentedIcon , this.link); // test-easy-button
        //L.DomUtil.create('i', 'test-easy-button' , this.link); // test-easy-button
        this.link.href = '#';

        L.DomEvent.on(this.link, 'click', this._click, this);
        this.link.title = this.options.title;

        return container;
    },

    intendedFunction: function () {
        alert('no function selected');
    },

    _click: function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.intendedFunction();
    }
});

L.easyButton = function (btnIcon, btnFunction, btnTitle, btnMap) {
    var newControl = new L.Control.EasyButtons;
    if (btnIcon) newControl.options.intentedIcon = btnIcon;

    if (typeof btnFunction === 'function') {
        newControl.intendedFunction = btnFunction;
    }

    if (btnTitle) newControl.options.title = btnTitle;

    if (btnMap) {
        newControl.addTo(btnMap);
    }
    return newControl;
};