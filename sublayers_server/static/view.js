function redrawMap() {
    var tempPoint;
    var tempAngleGrad;

    // работа с юзеркаром
    if (user.userCar) {
        tempPoint = user.userCar.getCurrentCoord(clock.getCurrentTime());
        tempAngleGrad = user.userCar.getCurrentDirection(clock.getCurrentTime());
        addDivToDiv("console", "rm1", "Игрок: координаты = " + tempPoint.x.toFixed(2) + " " + tempPoint.y.toFixed(2) +
            " угол = " + tempAngleGrad.toFixed(5), true);
        // Перенос центра карты в центр маркера пользовательской машинки
        myMap.panTo(myMap.unproject([tempPoint.x, tempPoint.y], 16), {animate: false});
        // Установка угла в для поворота иконки маркера (в градусах)
        userCarMarker.options.angle = tempAngleGrad * 180 / Math.PI;
        // Установка новых координат маркера
        userCarMarker.setLatLng(myMap.unproject([tempPoint.x, tempPoint.y], 16));
    }

    // работа со списком машинок
    addDivToDiv("console", "rm8", "Кол-во машинок = " + listMapObject.objects.length, true);
    for (var i in listMapObject.objects) { // переписать for на forEach метод у массива
        if (listMapObject.exist(i)) {//... сделать что-то с arr[i] ...
            // пересчёт координат
            tempPoint = listMapObject.objects[i].getCurrentCoord(clock.getCurrentTime());
            // пересчёт угла
            tempAngleGrad = listMapObject.objects[i].getCurrentDirection(clock.getCurrentTime());
            // Установка угла в для поворота иконки маркера (в градусах)
            listMapObject.objects[i].marker.options.angle = tempAngleGrad * 180 / Math.PI;
            // Установка новых координат маркера);
            listMapObject.objects[i].marker.setLatLng(myMap.unproject([tempPoint.x, tempPoint.y], 16));
        }
    }
}

function onMouseClickMap(mouseEventObject) {
    sendNewPoint(myMap.project(mouseEventObject.latlng, 16), user.userCar.ID);
}

function onMouseMoveMap(mouseEventObject) {
    addDivToDiv("console", "mm4", "Курсор = " + myMap.project(mouseEventObject.latlng, myMap.getZoom()), true);
    addDivToDiv("console", "mm5", "Масштаб = " + myMap.getZoom(), true);
}

function onZoomStart(Event) {
    clearInterval(timer);
}

function onZoomEnd(Event) {
    timer = setInterval(timerRepaint, timerDelay);
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

    myMap = L.map('map',
        {
            minZoom: 10,
            maxZoom: 16,
            zoomControl: true,
            attributionControl: false,
            keyboard: false,
            scrollWheelZoom: "center",
            dragging: false,
            doubleClickZoom: false,
            maxBounds: ([
                [50.21, 35.42],
                [51.43, 39.44]
            ])}).setView([50.6041, 36.5954], 13);

    //Переключение в полноэкранный режим и обратно по кнопке
    var btnFS = document.getElementById("buttonFullScreen");
    var html = document.documentElement;

    btnFS.onclick = function () {
        if (RunPrefixMethod(document, "FullScreen") || RunPrefixMethod(document, "IsFullScreen")) {
            RunPrefixMethod(document, "CancelFullScreen");
        }
        else {
            RunPrefixMethod(html, "RequestFullScreen");
        }
    }

    myMap.on('click', onMouseClickMap);
    myMap.on('mousemove', onMouseMoveMap);
    myMap.on('zoomstart', onZoomStart);
    myMap.on('zoomend', onZoomEnd);

    userCarMarker = L.rotatedMarker([50.21, 35.42]).addTo(myMap);
    userCarMarker.setIcon(L.icon({
        iconUrl: 'img/usercar_20.png',
        iconSize: [20, 20]
    }));

    userCarMarker.on('popupopen', onMarkerPopupOpen);
    userCarMarker.bindPopup("<input type=" + '"image"' + "src=" + '"img/green-info-icon.png"' + " height=15 width=15 " + " value=" +
            '"Информация" onclick="getTestInfo(lastIDPopupOpen);">'
    );

    // тест Easy Button
    L.easyButton(
        'easy-footer',
        footerToggle,
        "Скрыть/Показать консоль",
        myMap
    );

    $('#footer').hide();

    // для скрытия тайлов, чтобы быстрее грузилось
    L.easyButton(
        'easy-button-show-tile',
        function () {
            tileLayerShow.addTo(myMap);
        },
        "Показать слой тайлов",
        myMap
    );

    L.easyButton(
        'easy-button-hide-tile',
        function () {
            myMap.removeLayer(tileLayerShow);
        },
        "Скрыть слой тайлов",
        myMap
    );

    wsjson = new WSJSON();
    rpcCallList = new RPCCallList();

    // Добавление Города
    var tempPoint = new Point(10093693, 5646447);
    testTownMarker = L.marker([50.21, 35.42]).addTo(myMap);
    testTownMarker.setIcon(L.icon({
        iconUrl: 'img/city_50.png',
        iconSize: [50, 50]
    }));

    testTownMarker.setLatLng(myMap.unproject([10093715, 5646350], 16));
    testTownMarker.bindPopup("Город Белгород!");

    // создание чата
    createViewMessenger("chatArea");

    // создание слайдера зума
    zoomSetSlider = new SliderZoom({
        parentDiv: "zoomSetDivForSpeedSlider",
        carriageHeight: 0.4,
        height: 60,
        parentCss: 'slider-zoom-parent',
        max: myMap.getMaxZoom(),
        min: myMap.getMinZoom(),
        step: 1,
        onChange: changeZoomOnSlider
    });
    zoomSetSlider.setZoom(myMap.getZoom());
    // чтобы при изменении зума на карте менялся и слайдер.
    myMap.on('zoomend', function () {
        zoomSetSlider.setZoom(myMap.getZoom());
    });

    // создание слайдера скорости
    speedSetSlider = new SliderSpeed({
        parent: "speedSetDivForSpeedSlider",
        height: 320,
        parentCss: 'slider-speed-main',
        max: 125,
        min: 0,
        step: 1,
        onChange: changeSpeedOnSlider
    });


});

function onMarkerPopupOpen(e) {
    lastIDPopupOpen = this.carID;
}

function getTestInfo(aid) {
    var mark;
    if (listMapObject.objects[aid])
        mark = listMapObject.objects[aid].marker;
    else {
        mark = userCarMarker;
    }

    var popup = L.popup()
        .setLatLng(mark.getLatLng())
        .setContent('<p>Hello world!<br /> ID = ' + mark.carID + '</p>')
        .openOn(myMap);

}

// скрыть показать footer
function footerToggle(e) {
    $('#footer').slideToggle('slow');
}

function delCar() {
    myMap.removeLayer(listMapObject.objects[lastIDPopupOpen].marker);
    listMapObject.del(lastIDPopupOpen);
}

function changeSpeedOnSlider() {
    if (user.userCar)
        sendSetSpeed(speedSetSlider.getSpeed(), user.userCar.ID);
}

function changeZoomOnSlider() {
    myMap.setZoom(zoomSetSlider.getZoom());
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
var lastIDPopupOpen;
var userCarMarker;
var testTownMarker;
var wsjson;
var rpcCallList;
var speedSetSlider;
var zoomSetSlider;

var tileLayerShow;

//Префиксы для подстановки к методам для работы полноэкранного режима в различных браузерах
var pfx = ["webkit", "moz", "ms", "o", ""];
