/**
 * Created by Abbir on 22.06.2014.
 */



function redrawMap() {
    var tempPoint = user.userCar.getCurrentCoord(clock.getCurrentTime());
    var tempAngleGrad = user.userCar.getCurrentDirection(clock.getCurrentTime());
    addDivToDiv("console", "rm1", "Машинка = " + tempPoint.x + " " + tempPoint.y + "   угол = "+ tempAngleGrad);
    myMap.panTo(myMap.unproject([tempPoint.x, tempPoint.y], 16), {animate: false});

    userCarMarker.setLatLng(myMap.unproject([tempPoint.x, tempPoint.y], 16));

    userCarMarker.setIcon(L.divIcon({html: '<img src="img/usercar_20.png" ' +
       'style="-webkit-transform: rotate(' + tempAngleGrad +'rad); opacity: 1;" />', className: 'markerDiv'})); // градусы в deg
    userCarMarker.on('click', onMouseClickMarker);
}

function onMouseClickMap(mouseEventObject) {
    sendPoint(myMap.project(mouseEventObject.latlng, 16));
}

function onMouseMoveMap(mouseEventObject) {
    addDivToDiv("console", "mm1", "mouseEventObject.latlng = " + mouseEventObject.latlng);
    addDivToDiv("console", "mm2", "mouseEventObject.layerPoint = " + mouseEventObject.layerPoint);
    addDivToDiv("console", "mm3", "mouseEventObject.containerPoint = " + mouseEventObject.containerPoint);
    addDivToDiv("console", "mm4", "project = " + myMap.project(mouseEventObject.latlng, myMap.getZoom()));
    addDivToDiv("console", "mm5", "zoom = " + myMap.getZoom());
}

function onMouseClickMarker(mouseEventObject) {
    alert(1);
}

$(document).ready(function() {

    myMap = L.map('map',
        {minZoom: 10,
         maxZoom: 16,
         zoomControl: true,
         attributionControl: false,
         maxBounds: ([[50.21, 35.42], [51.43, 39.44]])}).setView([50.6041, 36.5954], 13);

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
        maxZoom: 16,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
            '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="http://mapbox.com">Mapbox</a>',
        id: 'examples.map-i86knfo3'}).addTo(myMap);

    myMap.on('click', onMouseClickMap);
    myMap.on('mousemove', onMouseMoveMap);

    userCarMarker = L.marker([50.21, 35.42]).addTo(myMap);
    userCarMarker.on('click', onMouseClickMarker);
    //userCarMarker.testID = 15;
//    var divicon = L.divIcon({html:'<img src="bolid_small.jpg" ' +
//    'style="-webkit-transform: rotate(-1rad);" />' }, {className: 'markerDiv'});

//    mark.setIcon(divicon);

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
});

var myMap;
var userCarMarker;