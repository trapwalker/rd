function redrawMap() {
    var tempPointMain;
    var tempAngleRad;


    // работа с юзеркаром
    if (user.userCar) {
        tempPointMain = user.userCar.getCurrentCoord(clock.getCurrentTime());
        tempAngleRad = user.userCar.getCurrentDirection(clock.getCurrentTime());
        addDivToDiv("console2", "cn21", "Игрок: X = " + tempPointMain.x.toFixed(2), true);
        addDivToDiv("console2", "cn22", "Игрок: Y = " + tempPointMain.y.toFixed(2), true);

        // Перенос центра карты в центр маркера пользовательской машинки
        //myMap.panTo(myMap.unproject([tempPointMain.x, tempPointMain.y], 16), {animate: false});
        //myMap.setView();
        // Установка угла в для поворота иконки маркера (в градусах)
        userCarMarker.options.angle = tempAngleRad * 180 / Math.PI;
        // Установка новых координат маркера
        userCarMarker.setLatLng(myMap.unproject([tempPointMain.x, tempPointMain.y], 16));

        //userCarMarker.update();

        // добавление области видимости машинки
        if(userCarMarker._visibleCircle){
            userCarMarker._visibleCircle.setLatLng(userCarMarker.getLatLng());
        } else {
            userCarMarker._visibleCircle = L.circle(userCarMarker.getLatLng(), 500,
                {
                    color: '#11FF11',
                    opacity: 0.3
                }
            ).addTo(myMap);
        }

        // перерисовка контроллеров пользователя
        redrawUserControllers(tempAngleRad);
        // перерисовка следа (шлейфа) за машинкой
        if (userCarTail)
            userCarTail.drawTail(tempPointMain, myMap.getZoom() > 14); // только на максимальных приближениях будет рисоваться хвост
    }

    // работа со списком машинок

    for (var i in listMapObject.objects) { // переписать for на forEach метод у массива
        if (listMapObject.exist(i)) {//... сделать что-то с arr[i] ...
            // пересчёт координат
            var tempPoint = listMapObject.objects[i].getCurrentCoord(clock.getCurrentTime());
            // пересчёт угла
            var tempAngleRadCars = listMapObject.objects[i].getCurrentDirection(clock.getCurrentTime());
            // Установка угла в для поворота иконки маркера (в градусах)
            listMapObject.objects[i].marker.options.angle = tempAngleRadCars * 180 / Math.PI;
            // Установка новых координат маркера);
            listMapObject.objects[i].marker.setLatLng(myMap.unproject([tempPoint.x, tempPoint.y], 16));
        }
    }

/*   // Данный способ безосновательно грузит систему, что не логично... Когда будем делать push, тогда и воспользуемся им
    listMapObject.objects.forEach(function(car){
        // пересчёт координат
        var tempP = car.getCurrentCoord(clock.getCurrentTime());
        // пересчёт угла
        var tempA = car.getCurrentDirection(clock.getCurrentTime());
        // Установка угла в для поворота иконки маркера (в градусах)
        car.marker.options.angle = tempA * 180 / Math.PI;
        // Установка новых координат маркера);
        car.marker.setLatLng(myMap.unproject([tempP.x, tempP.y], 16));

        addDivToDiv("console2", car.ID,     "Игрок"+car.ID+": X = " + tempP.x.toFixed(2), true);
        addDivToDiv("console2", car.ID+'1', "Игрок"+car.ID+": Y = " + tempP.y.toFixed(2), true);

    });
*/

    addDivToDiv("console2", "cn28", "Кол-во машинок = " + listMapObject.objects.length, true);
}

function redrawUserControllers(directionCar) {
    // Отрисовка контролера скорости
    redrawSliderSpeedController();

    // Отрисовка контроллера хп
    // hpController.setValue(user.userCar.hp);
    // Отрисовка контроллера Fuel
    // var tfuel = user.userCar.getCurrentFuel(clock.getCurrentTime());
    // fuelController.setValue(tfuel, tfuel * user.userCar.track.fuelDec);

    // Отрисовка контроллера стрельбы
    if (!(directionCar == 0)) // Пока присылаются два стопа, нужно это условие
        if (fireControl)
            if (Math.abs(fireControl.options.rotateAngle - directionCar) > 0.1) {
                //alert('Povorot na = '+directionCar.toFixed(2)+ '    tekPovorot='+fireControl.options.rotateAngle.toFixed(2));
                fireControl.setRotate(directionCar);
            }
}

function redrawSliderSpeedController() {
    speedSetSlider.setRealSpeed(user.userCar.getCurrentSpeedAbs(clock.getCurrentTime()));
};

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

    // Инициализация.
    ModelInit();


    myMap = L.map('map',
        {
            minZoom: 10,
            maxZoom: 16,
            zoomControl: false,
            attributionControl: false,
            keyboard: false,
            scrollWheelZoom: "center",
        //    dragging: false,
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
    }

    //Включение отображения карты
    buttonMapOn.onclick = function () {
        tileLayerShow.addTo(myMap);
    }

    //Выключение отображения карты
    buttonMapOff.onclick = function () {
        myMap.removeLayer(tileLayerShow);
    }

    //Изначальное скрытие консоли
    $('#footer').hide();

    //Открытие/закрытие консоли
    buttonConsole.onclick = function () {
        footerToggle();
    }

    myMap.on('click', onMouseClickMap);
    myMap.on('mousemove', onMouseMoveMap);
    myMap.on('zoomstart', onZoomStart);
    myMap.on('zoomend', onZoomEnd);

    userCarMarker = L.rotatedMarker([50.21, 35.42]).addTo(myMap);
    userCarMarker.setIcon(L.icon({
        iconUrl: 'img/car_user.png',
        iconSize: [35, 35]
    }));

    userCarMarker.on('popupopen', onMarkerPopupOpen);
    userCarMarker.bindPopup("<input type=" + '"image"' + "src=" + '"img/green-info-icon.png"' + " height=15 width=15 " + " value=" +
            '"Информация" onclick="getTestInfo(lastIDPopupOpen);">'
    );

    wsjson = new WSJSON();
    rpcCallList = new RPCCallList();

    // Добавление Города
    testTownMarker = L.marker([0, 0]).addTo(myMap);
    testTownMarker.setIcon(L.icon({
        iconUrl: 'img/city.png',
        iconSize: [50, 50]
    }));

    testTownMarker.setLatLng(myMap.unproject([10093715, 5646350], 16));
    testTownMarker.bindPopup("Город Белгород!");

    // создание чата и моментальное сворачивание его.
    createViewMessenger("chatArea");
    viewMessengerSlideButton.click();

    // создание слайдера зума
    zoomSetSlider = new SliderZoom({
        parentDiv: "zoomSetDivForZoomSlider",
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
        onChange: changeSpeedOnSlider,
        onStop: stopSpeedOnSlider
    });



    // Тестовые вектора для контролера стрельбы
    var sectors = [
        new FireSector(gradToRad(0), gradToRad(30), 40, 1, 6 * 1000),
        new FireSector(gradToRad(180), gradToRad(50), 40, 2, 4 * 1000),
        new FireSector(gradToRad(90), gradToRad(70), 40, 3, 2 * 1000),
        new FireSector(gradToRad(-90), gradToRad(70), 40, 3, 2 * 1000)
    ];

    // Инициализация контролера стрельбы
    fireControl = new FireControl({
        parentDiv: 'fireControlArea',
        diameter: 150,
        sectors: sectors,
        sectorCallBack: cbForSectors,
        allCallBack: cbForAllBtn
    });





    // Запуск тамера
    timer = setInterval(timerRepaint, timerDelay);
});

function onMarkerPopupOpen(e) {
    lastIDPopupOpen = this.carID;

    this.setPopupContent('My ID = ' + this.carID);
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

function stopSpeedOnSlider() {
    if (user.userCar) sendStopCar();
}

function changeZoomOnSlider() {
    myMap.setZoom(zoomSetSlider.getZoom());
}

// колл бек для выстрела того или иного сектора
function cbForSectors(fs){
    //alert('Выстрел из сектора id = '+fs.uid + '   Перезарядка = '+ fs.recharge);
}
// коллбек для кнопки All
function cbForAllBtn(){
    //alert('Дан залп из всех орудий своей машинки (user.userCar.id)');
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
var userCarTail;
var fireControl;

//Префиксы для подстановки к методам для работы полноэкранного режима в различных браузерах
var pfx = ["webkit", "moz", "ms", "o", ""];
