function redrawMap() {
    var tempPointMain;
    var tempAngleRad;

    // работа с юзеркаром
    if (user.userCar) {
        tempPointMain = user.userCar.getCurrentCoord(clock.getCurrentTime());
        tempAngleRad = user.userCar.getCurrentDirection(clock.getCurrentTime());
        chat.addMessageToSystem("cn21", "Игрок: X = " + tempPointMain.x.toFixed(2));
        chat.addMessageToSystem("cn22", "Игрок: Y = " + tempPointMain.y.toFixed(2));
        // перерисовка машинки и её обвесов (окружения)
        userCarMarker.draw(myMap.unproject([tempPointMain.x, tempPointMain.y], 16),tempAngleRad);
        // перерисовка всех контроллеров
        controllers.draw(tempAngleRad, user.userCar);
    }

    // работа со списком машинок
    for (var i in listMapObject.objects) {
        if (listMapObject.exist(i)) {//... сделать что-то с arr[i] ...
            // пересчёт координат
            var tempPoint = listMapObject.objects[i].getCurrentCoord(clock.getCurrentTime());
            // пересчёт угла
            var tempAngleRadCars = listMapObject.objects[i].getCurrentDirection(clock.getCurrentTime());
            // Установка угла в для поворота иконки маркера (в градусах)
            listMapObject.objects[i].marker.options.angle = tempAngleRadCars;
            // Установка новых координат маркера);
            listMapObject.objects[i].marker.setLatLng(myMap.unproject([tempPoint.x, tempPoint.y], 16));
        }
    }

    // Перенос центра карты в центр маркера-спектракуса - выбранный маркер - по умолчанию - userCarMarker.marker
    if (!flagDebug)
        if (userCarMarker)
            myMap.panTo(userCarMarker.marker.getLatLng(), {animate: false});

    backLight.draw();
    backLightList.draw();


}

function onMouseClickMap(mouseEventObject) {
    if(user.userCar)
        sendNewPoint(myMap.project(mouseEventObject.latlng, 16), user.userCar.ID);

    backLight.off();

    //myMap.panTo(mouseEventObject.latlng);
/*
    // Нарисовать здесь что-то!
    // Попытка нарисовать что-нибудь в SVG в лефлете
    // Координаты в лифлете считаются от изначального SetView - проверить, будут ли они меняться
    //alert(L.Path.SVG_NS);
    var NS="http://www.w3.org/2000/svg";
    var svgPane = myMap.getPanes().overlayPane.childNodes[0];
    var g = document.createElementNS(NS,"g");
    var svgObj = document.createElementNS(NS,"circle");
    //alert(mouseEventObject.originalEvent.clientX);
    svgObj.setAttribute('fill-rule', 'evenodd');
    //svgObj.setAttribute('d', 'M 300 300 L 200 200 L 200 300 z');
    svgObj.setAttribute('r', 30);
    var p = myMap.mouseEventToContainerPoint(mouseEventObject.originalEvent);
    //var p = myMap.latLngToContainerPoint(mouseEventObject.latlng);
    svgObj.setAttribute('cx', p.x);
    svgObj.setAttribute('cy', p.y);
    svgObj.style.fill = "blue";
    svgPane.appendChild(g);
    //svgPane.appendChild(svgObj);
    g.appendChild(svgObj);
*/
}

function onZoomStart(event) {
    clearInterval(timer);
}

function onZoomEnd(event) {
    timer = setInterval(redrawMap, timerDelay);
    if(controllers.isActive)  // чтобы при изменении зума карты  менялся и слайдер.
        controllers.zoomSetSlider.setZoom(myMap.getZoom());

    // если мы отдалились далеко, то скрыть все лейблы и показывать их только по наведению
    var noHide = myMap.getZoom() > 14;
    for (var i in listMapObject.objects) {
        if (listMapObject.exist(i)) {
            listMapObject.objects[i].marker.setLabelNoHide(noHide);
/*
            if(noHide)
            // повесить клик на кнопочку инфо
                $('#idCar'+listMapObject.objects[i].ID).on('click', {car: listMapObject.objects[i]}, carInfoClickEvent);
            else
                $('#idCar'+listMapObject.objects[i].ID).off('click', carInfoClickEvent);
*/
        }
    }
}

function createTileLayer(storage) {
    if (storage) {
        tileLayerShow = new StorageTileLayer('http://d.sm.mapstack.stamen.com/(watercolor,$fff[difference],$000[@65],$fff[hsl-saturation@20],$64c864[hsl-color])/{z}/{x}/{y}.png', {
            maxZoom: 16,
            storage: storage,
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="http://mapbox.com">Mapbox</a>',
            id: 'examples.map-i86knfo3'});
    }
    else {
        tileLayerShow = L.tileLayer('http://d.sm.mapstack.stamen.com/(watercolor,$fff[difference],$000[@65],$fff[hsl-saturation@20],$64c864[hsl-color])/{z}/{x}/{y}.png', {
            maxZoom: 16,
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="http://mapbox.com">Mapbox</a>',
            id: 'examples.map-i86knfo3'});
    }
    tileLayerShow.addTo(myMap);
}

$(document).ready(function () {
    var storage = getIndexedDBStorage(createTileLayer) || getWebSqlStorage(createTileLayer) || createTileLayer(null);
    if (!storage) {
        alert('Storage not loading!');
    }

    // Инициализация.
    ModelInit();
    wsjson = new WSJSON();
    rpcCallList = new RPCCallList();

    myMap = L.map('map',
        {
            minZoom: 10,
            maxZoom: 16,
            zoomControl: false,
            attributionControl: false,
            keyboard: false,
            scrollWheelZoom: "center",
            dragging: flagDebug,
            doubleClickZoom: false
            //    maxBounds: ([
            //        [50.21, 35.42],
            //        [51.43, 39.44]
            //    ])
        }).setView([50.6041, 36.5954], 13);

    //Переключение в полноэкранный режим и обратно по кнопке
    var html = document.documentElement;

    buttonFullScreen.onclick = function () {
        if (RunPrefixMethod(document, "FullScreen") || RunPrefixMethod(document, "IsFullScreen")) {
            RunPrefixMethod(document, "CancelFullScreen");
            buttonFullScreen.src = "img/button_fullscreen_unclicked.png";
        }
        else {
            RunPrefixMethod(html, "RequestFullScreen");
            buttonFullScreen.src = "img/button_fullscreen_clicked.png";
        }
    };

    // Включение/Выключение отображения карты
    buttonMapOnOffBtn.onclick = TileLayerToogle;

    // Кнопка Debug
    buttonDebugOnOff.onclick = DegugToggle;


    iconConnectServer.src = "img/connect.png";


    myMap.on('click', onMouseClickMap);
    myMap.on('zoomstart', onZoomStart);
    myMap.on('zoomend', onZoomEnd);

    // Добавление Города
    var testTownMarker = L.marker([0, 0]).bindLabel("Belgorod City").addTo(myMap);
    testTownMarker.setIcon(L.icon({
        iconUrl: 'img/city.png',
        iconSize: [50, 50]
    }));

    testTownMarker.setLatLng(myMap.unproject([10093715, 5646350], 16));
    testTownMarker.bindPopup("Город Белгород!");

    // создание чата
    chat = new ViewMessenger({
            parentDiv: 'chatArea',
            height: 550,
            width: 400});
    chat.addChat(0, 'broadcast');
    chat.addChat(-1, 'log-push');
    chat.addChat(-3, 'log-answer');
    chat.addChat(-4, 'log-rpc');
    chat.addChat(-2, 'system');
    chat.setActiveChat(0);
    chat.setVisible(false);


    backLight = new BackLight({
        _map: myMap
    });

    backLightList = new BackLightList();

    // Запуск тамера
    timer = setInterval(redrawMap, timerDelay);


    // location - Настройка параметров в URL#Hash
   // urlHashSetup(window.location.toString().split('?')[1]);

});
/*
function urlHashSetup(location){
    // бьём location по признакам ',' и '='
    var loc = location.split('=');

    alert(loc.length);
};
*/

function TileLayerToogle(){
    var jSelector = $('#buttonMapOnOffStatus');
    if(myMap.hasLayer(tileLayerShow)){
        myMap.removeLayer(tileLayerShow);
        jSelector.removeClass('buttonMapOnOffStatusOn');
        jSelector.addClass('buttonMapOnOffStatusOff');
    }
    else {
        tileLayerShow.addTo(myMap);
        jSelector.removeClass('buttonMapOnOffStatusOff');
        jSelector.addClass('buttonMapOnOffStatusOn');
    }
}



function DegugToggle(){
    if(flagDebug){
        // Выключить всю Debug информацию
        flagDebug=false;
        // Очистиить debugMapList и удалить всё с карты
        for(;debugMapList.length;)
            myMap.removeLayer(debugMapList.pop());
        // Включить dragging
        myMap.dragging.disable();

    }
    else {
        // Включить всю Debug информацию
        flagDebug = true;
        // Выключить dragging
        myMap.dragging.enable();


    }


}

//Подстановка префиксов к методам для работы полноэкранного режима в различных браузерах
function RunPrefixMethod(obj, method) {
    var p = 0, m, t;
    while (p < pfx.length && !obj[m]) {
        m = method;
        if (pfx[p] == "") {
            m = m.substr(0, 1).toLowerCase() + m.substr(1);
        }
        m = pfx[p] + m;
        t = typeof obj[m];
        if (t != "undefined") {
            pfx = [pfx[p]];
            return (t == "function" ? obj[m]() : obj[m]);
        }
        p++;
    }

}

var myMap;
var chat;
var userCarMarker;
var wsjson;
var rpcCallList;
var tileLayerShow;
var controllers;
var flagDebug = true;
var debugMapList = [];
var ownerList;
var backLight;

//Префиксы для подстановки к методам для работы полноэкранного режима в различных браузерах
var pfx = ["webkit", "moz", "ms", "o", ""];
