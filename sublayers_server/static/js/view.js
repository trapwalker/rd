function redrawMap() {
    var tempPointMain;
    var tempAngleRad;

    // работа с юзеркаром
    if (user.userCar) {
        userCarMarker.draw(clock.getCurrentTime());
        // перерисовка всех контроллеров
        controllers.draw(userCarMarker.currentUserCarAngle, user.userCar);
    }

    // работа со списком машинок
    carMarkerList.draw(clock.getCurrentTime());

    // Перенос центра карты в центр маркера-спектракуса - выбранный маркер - по умолчанию - userCarMarker.marker
    if (!flagDebug)
        if (userCarMarker)
            myMap.panTo(userCarMarker.marker.getLatLng(), {animate: false});

}

function onMouseClickMap(mouseEventObject) {
    if(user.userCar)
        sendNewPoint(myMap.project(mouseEventObject.latlng, 16), user.userCar.ID);
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
        }).setView([50.595, 36.59], 16);

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
    buttonMapOnOffBtn.onclick = TileLayerToggle;

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
    //chat.setVisible(false);




    carMarkerList = new CarMarkerList({_map: myMap});


    // Запуск тамера
    timer = setInterval(redrawMap, timerDelay);





    window.onbeforeunload = function (e) {
        setCookie('flagDebug', (flagDebug ? 1 : 0));
        setCookie('chatVisible', (chat.getVisible() ? 1 : 0));
        setCookie('chatActiveID', chat._activeChatID);
        setCookie('zoom', myMap.getZoom());

        // Ловим событие для Interner Explorer
       // var e = e || window.event;
       // var myMessage= "Вы действительно хотите покинуть страницу, не сохранив данные?";
        // Для Internet Explorer и Firefox
     //   if (e) {
     //       e.returnValue = myMessage;
     //   }
        // Для Safari и Chrome
        //return myMessage;
    };


});





function onGetInitMessage() {
  //  setParamsFromCookie();
}


function TileLayerToggle(){
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

// Функции для работы с cookie
// возвращает cookie с именем name, если есть, если нет, то undefined
function getCookie(name) {
    var matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

// устанавливает cookie c именем name и значением value
// options - объект с свойствами cookie (expires, path, domain, secure)
function setCookie(name, value, options) {
    options = options || {};

    var expires = options.expires;

    if (typeof expires == "number" && expires) {
        var d = new Date();
        d.setTime(d.getTime() + expires*1000);
        expires = options.expires = d;
    }
    if (expires && expires.toUTCString) {
        options.expires = expires.toUTCString();
    }

    value = encodeURIComponent(value);

    var updatedCookie = name + "=" + value;

    for(var propName in options) {
        updatedCookie += "; " + propName;
        var propValue = options[propName];
        if (propValue !== true) {
            updatedCookie += "=" + propValue;
        }
    }

    document.cookie = updatedCookie;
}

// удаляет cookie с именем name
function deleteCookie(name) {
    setCookie(name, "", { expires: -1 })
}

// Читает Cookie, устанавливает параметры из неё
function setParamsFromCookie(){
    // Прочесть параметр flagDebug и установить его
    var cFlagDebug = getCookie('flagDebug');
    if(cFlagDebug != undefined) flagDebug = (cFlagDebug == 1);

    // прочесть параметр Видимости чата и установить его
    var chatVisible = getCookie('chatVisible');
    if (chatVisible != undefined)
        chat.setVisible((chatVisible == 1));
     //   if (chatVisible == 1) // Нужно показывать чат - пришлось делать так глупо, потому что там вверху стоит false по умолчанию
     //   {
     //       alert('Показать!');
     //       chat.setVisible(true);
     //   }


    // Прочесть параметр последнего активного чата
    var chatActiveID = getCookie('chatActiveID');
    if(chatActiveID != undefined) chat.setActiveChat(chatActiveID);


    // Запомнить последний зум
    var zoom = getCookie('zoom');
    if (zoom)
        if (zoom <= myMap.getMaxZoom() && zoom >= myMap.getMinZoom()) myMap.setZoom(zoom);
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
var carMarkerList;


//Префиксы для подстановки к методам для работы полноэкранного режима в различных браузерах
var pfx = ["webkit", "moz", "ms", "o", ""];
