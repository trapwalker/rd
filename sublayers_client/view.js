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



    addDivToDiv("console", "rm8", "Кол-во машинок = " +listMapObject.objects.length);
    // работа со списком машинок
    for(var i in listMapObject.objects) {
        if (!listMapObject.hasOwnProperty(i)) {//... сделать что-то с arr[i] ...
            // пересчёт координат
            tempPoint = listMapObject.objects[i].getCurrentCoord(clock.getCurrentTime());
            // пересчёт угла
            tempAngleGrad = listMapObject.objects[i].getCurrentDirection(clock.getCurrentTime());
            // Установка угла в для поворота иконки маркера (в градусах)
            listMarkers.markers[i].options.angle = tempAngleGrad * 180 / Math.PI;
            // Установка новых координат маркера);
            listMarkers.markers[i].setLatLng(myMap.unproject([tempPoint.x, tempPoint.y], 16));
        }
    }

}

function onMouseClickMap(mouseEventObject) {
    //sendPoint(myMap.project(mouseEventObject.latlng, 16));
    sendNewPoint(myMap.project(mouseEventObject.latlng, 16),user.userCar.ID);
}

function onMouseMoveMap(mouseEventObject) {
    addDivToDiv("console", "mm4", "project = " + myMap.project(mouseEventObject.latlng, myMap.getZoom()));
    addDivToDiv("console", "mm5", "zoom = " + myMap.getZoom());
}

function onMouseClickMarker(mouseEventObject) {
    //sendChatMessage("My marker ID = " + this.carID, user.ID);

    listMarkers.markers[this.carID].bindPopup("мой номер "+this.carID + "!").openPopup().unbindPopup();
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

 //   L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
 //       maxZoom: 16,
 //       attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
 //          '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
 //           'Imagery © <a href="http://mapbox.com">Mapbox</a>',
 //       id: 'examples.map-i86knfo3'}).addTo(myMap);

    L.tileLayer('http://d.sm.mapstack.stamen.com/(watercolor,$fff[difference],$000[@65],$fff[hsl-saturation@20],$64c864[hsl-color])/{z}/{x}/{y}.png', {
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

    userCarMarker.carID = newIDForTestCar();


    // Добавление Города
    var tempPoint = user.userCar.getCurrentCoord(clock.getCurrentTime());
    testTownMarker = L.marker([50.21, 35.42]).addTo(myMap);
    testTownMarker.setIcon(L.icon({
        iconUrl: 'img/city_50.png',
        iconSize: [50, 50]
    }));

    testTownMarker.setLatLng(myMap.unproject([10093715, 5646350], 16));
    testTownMarker.bindPopup("Город Белгород!");
    //testTownMarker.on('click',function(){ myMap.removeLayer(testTownMarker); }  );


    // Тест списка маркеров
    listMarkers = new MarkerList();


    // Управление машинкой стрелками (тестовый вариант)
    document.body.addEventListener('keydown', function(e) {
        if (e.which == 38) {// поднять скорость
            addSpeed();
        }
        if (e.which == 40) {// снизить скорость
            subSpeed();
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


function subSpeed(){
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

function addSpeed(){
    sendSetSpeed(user.userCar.track.speedV.abs()+2,user.userCar.ID);
    addDivToDiv("console", "st1", "текущая скорость = " + user.userCar.track.speedV.abs());
}

// просто генерирует рандомную машинку и отправляет её сразу в ресив, чтобы клиент добавил её в модель через серверное взаимодействие
function createTestCar(){
    var ans = {
        message_type: "push",
        event: {
            kind: "see",
            object: {
                uid: newIDForTestCar(),
                class: "car",
                position: {
                    x: 10093700 + Math.random()*100,
                    y: 5646400 + Math.random()*100
                },
                server_time: clock.getCurrentTime(),
                liner_motion: {
                    velocity: {
                        x: Math.random()*30 - 15,
                        y: Math.random()*30 - 15
                    },
                    acceleration: {
                        x: 0,
                        y: 0
                    },
                    fuel_start: 100,
                    fuel_decrement: 1
                }
            }
        }
    };
    receiveMesFromServ(JSON.stringify(ans));
};

// проходит по списку рандомных машинок, меняет вектор скорости, осталяя тот же айдишник
function newRandSpeed() {
    for (var i in listMapObject.objects) {
        if (Math.random() < 0.05) {
            if (!listMapObject.hasOwnProperty(i)) {//... сделать что-то с arr[i] ...
                // пересчёт координат
                var tempPoint = listMapObject.objects[i].getCurrentCoord(clock.getCurrentTime());
                // пересчёт угла
                var ans = {
                    message_type: "push",
                    event: {
                        kind: "see",
                        object: {
                            uid: listMapObject.objects[i].ID,
                            class: "car",
                            position: {
                                x: tempPoint.x,
                                y: tempPoint.y
                            },
                            server_time: clock.getCurrentTime(),
                            liner_motion: {
                                velocity: {
                                    x: Math.random() * 30 - 15,
                                    y: Math.random() * 30 - 15
                                },
                                acceleration: {
                                    x: 0,
                                    y: 0
                                },
                                fuel_start: 100,
                                fuel_decrement: 1
                            }
                        }
                    }
                };
                receiveMesFromServ(JSON.stringify(ans));
            }
        }
    }
}

// Почему-то маркеры останавливаются и глючат
function removeCar_test(){
    var uid = this.carID;
    listMapObject.del(uid);
    listMarkers.del(uid);
}

var myMap;
var userCarMarker;
var testTownMarker;
var listMarkers;
