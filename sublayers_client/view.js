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
}

function onMouseClickMap(mouseEventObject) {
    //sendPoint(myMap.project(mouseEventObject.latlng, 16));
    sendNewPoint(myMap.project(mouseEventObject.latlng, 16),user.userCar.ID);
}

function onMouseMoveMap(mouseEventObject) {
    //addDivToDiv("console", "mm1", "mouseEventObject.latlng = " + mouseEventObject.latlng);
    //addDivToDiv("console", "mm2", "mouseEventObject.layerPoint = " + mouseEventObject.layerPoint);
    //addDivToDiv("console", "mm3", "mouseEventObject.containerPoint = " + mouseEventObject.containerPoint);
    addDivToDiv("console", "mm4", "project = " + myMap.project(mouseEventObject.latlng, myMap.getZoom()));
    addDivToDiv("console", "mm5", "zoom = " + myMap.getZoom());
}

function onMouseClickMarker(mouseEventObject) {
    //addDivToDiv("console", "mt1", "testID = " + this.testID);
    sendChatMessage("My marker ID = " + this.testID, user.ID);

}

$(document).ready(function() {

    myMap = L.map('map',
        {minZoom: 10,
         maxZoom: 16,
         zoomControl: true,
         attributionControl: false,
         keyboard: false,
         scrollWheelZoom: "center",
         dragging: false,
         doubleClickZoom: false,
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

    // Управление машинкой стрелками (тестовый вариант)
    document.body.addEventListener('keydown', function(e) {
        if (e.which == 38) {// поднять скорость
            sendSetSpeed(user.userCar.track.speedV.abs()+2,user.userCar.ID);
            addDivToDiv("console", "st1", "текущая скорость = " + user.userCar.track.speedV.abs());
        }
        if (e.which == 40) {// снизить скорость
            if (user.userCar.track.speedV.abs() > 0) {
                if (user.userCar.track.speedV.abs() < 5) {
                    user.userCar.track.direction = normVector(user.userCar.track.speedV);
                    user.userCar.track.coord = user.userCar.getCurrentCoord(clock.getCurrentTime());
                    user.userCar.track.speedV = new Point(0, 0);
                }
                else {
                    sendSetSpeed(user.userCar.track.speedV.abs() - 2, user.userCar.ID);
                }
            }
            addDivToDiv("console", "st1", "текущая скорость = " + user.userCar.track.speedV.abs());
        }
        if (e.which == 37) {// повернуть налево
            user.userCar.track.coord = user.userCar.getCurrentCoord(clock.getCurrentTime());
            user.userCar.track.timeStart = clock.getCurrentTime();
            user.userCar.track.speedV = rotateVector(user.userCar.track.speedV, -0.1745); //10 градусов
        }
        if (e.which == 39) {// повернуть направо
            user.userCar.track.coord = user.userCar.getCurrentCoord(clock.getCurrentTime());
            user.userCar.track.timeStart = clock.getCurrentTime();
            user.userCar.track.speedV = rotateVector(user.userCar.track.speedV, 0.1745);
        }
    }, true);
});




var myMap;
var userCarMarker;