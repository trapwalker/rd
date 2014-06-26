/**
 * Created by Abbir on 22.06.2014.
 */



function redrawMap() {
    var tempPoint = user.userCar.getCurrentCoord(clock.getCurrentTime());
    var tempAngleGrad = user.userCar.getCurrentDirection(clock.getCurrentTime());
    addDivToDiv("console", "rm1", "Машинка = " + tempPoint.x + " " + tempPoint.y + "   угол = "+ tempAngleGrad);

    // Перенос центра карты в центр маркера пользовательской машинки
    myMap.panTo(myMap.unproject([tempPoint.x, tempPoint.y], 16), {animate: false});

    // Установка угла в для поворота иконки маркера (в градусах)
    userCarMarker.options.angle = tempAngleGrad * 180 / Math.PI;
    // Установка новых координат маркера
    userCarMarker.setLatLng(myMap.unproject([tempPoint.x, tempPoint.y], 16));



 //   userCarMarker.setIcon(L.divIcon({html: '<img src="img/usercar_20.png" ' +
 //      'style="-webkit-transform: rotate(' + tempAngleGrad +'rad); opacity: 1;" />', className: 'markerDiv'})); // градусы в deg
 //   userCarMarker.on('click', onMouseClickMarker);
}

function onMouseClickMap(mouseEventObject) {
    sendPoint(myMap.project(mouseEventObject.latlng, 16));
}

function onMouseMoveMap(mouseEventObject) {
    //addDivToDiv("console", "mm1", "mouseEventObject.latlng = " + mouseEventObject.latlng);
    //addDivToDiv("console", "mm2", "mouseEventObject.layerPoint = " + mouseEventObject.layerPoint);
    //addDivToDiv("console", "mm3", "mouseEventObject.containerPoint = " + mouseEventObject.containerPoint);
    addDivToDiv("console", "mm4", "project = " + myMap.project(mouseEventObject.latlng, myMap.getZoom()));
    addDivToDiv("console", "mm5", "zoom = " + myMap.getZoom());
}

function onMouseClickMarker(mouseEventObject) {
    addDivToDiv("console", "mt1", "testID = " + this.testID);
}

$(document).ready(function() {

    myMap = L.map('map',
        {minZoom: 10,
         maxZoom: 16,
         zoomControl: true,
         attributionControl: false,
         keyboard: false,
         maxBounds: ([[50.21, 35.42], [51.43, 39.44]])}).setView([50.6041, 36.5954], 13);

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
        maxZoom: 16,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
            '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="http://mapbox.com">Mapbox</a>',
        id: 'examples.map-i86knfo3'}).addTo(myMap);

    myMap.on('click', onMouseClickMap);
    myMap.on('mousemove', onMouseMoveMap);

    userCarMarker = L.rotatedMarker([50.21, 35.42]).addTo(myMap);
    userCarMarker.setIcon(L.icon({
        iconUrl: 'img/usercar_20.png',
        iconSize: [20, 20]
    }));

    userCarMarker.on('click', onMouseClickMarker);

    userCarMarker.testID = 15;


    /*
    //Тест однородности координат
    myMap = L.map('map').setView([50.6041, 36.5954], 13);
    L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
        maxZoom: 16,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>',
        id: 'examples.map-i86knfo3'}).addTo(myMap);
    myMap.on('click', OnMouseClickMap);
    myMap.on('mousemove', OnMouseMoveMap);
    //for (var j = 0; j <= 330; j+= 10)
    //    for (var i = -90; i <= 90; i+= 10) {L.marker([i, j]).addTo(myMap);}
    */
    // Add manual control of the airplane with left and right arrow keys, just because
    document.body.addEventListener('keydown', function(e) {
        if (e.which == 38) {
            // поднять скорость
            user.userCar.track = new MoveLine(
                    clock.getCurrentTime(),       //Время начала движения
                    100,                          //Запас топлива
                    1,                            //Расход топлива
                    user.userCar.getCurrentCoord(clock.getCurrentTime()), //Начальная точка
                    mulScalVector(user.userCar.track.speedV, 1.1),        //Скорость
                    new Point(0, 0)             //Ускорение
            );
            addDivToDiv("console", "st1", "текущая скорость = " + user.userCar.track.speedV.abs());
        }
        if (e.which == 40) {
            // снизить скорость
            user.userCar.track = new MoveLine(
                clock.getCurrentTime(),       //Время начала движения
                100,                          //Запас топлива
                1,                            //Расход топлива
                user.userCar.getCurrentCoord(clock.getCurrentTime()), //Начальная точка
                mulScalVector(user.userCar.track.speedV, 0.9),        //Скорость
                new Point(0, 0)             //Ускорение
            );
            addDivToDiv("console", "st1", "текущая скорость = " + user.userCar.track.speedV.abs());
        }
    }, true);
});




var myMap;
var userCarMarker;