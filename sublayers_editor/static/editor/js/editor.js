function requestViewRect(event) {
    var bounds = myMap.getPixelBounds();
    var tileBounds = L.bounds(
        bounds.min.divideBy(256)._floor(),
        bounds.max.divideBy(256)._floor());
    var zoom = myMap.getZoom();
    var mes_obj = {
        min_point: {
            x: tileBounds.min.x,
            y: tileBounds.min.y,
            z: zoom
        },
        max_point: {
            x: tileBounds.max.x,
            y: tileBounds.max.y,
            z: zoom
        },
        select_zoom: zoom
    };
    editor_manager.sendSelectAreaByRect(mes_obj);
}


$(document).ready(function () {
    // инициализация карты
    myMap = L.map('map', {
        zoomControl: true,      // добавить стандартные кнопки изменения масштаба
        boxZoom: false,          // отключить зумирование через прямоугольник
        minZoom: 4
    }).setView([33.02732, -112.97], 16);
    tileLayerShow = L.tileLayer(mapBasePath).addTo(myMap);
    myMap.on('moveend', requestViewRect);

    // инициализация клиент-серверного взаимодействия
    message_stream = new MessageConnector();
    ws_connector = new WSConnector();
    editor_manager = new EditorManager();

    // инициализация редакторов
    initEditors();
    editorFreeCam.activateButton = L.easyButton({
        btnFunct: onClickFreeCam,
        btnTitle: 'Свободная камера',
        btnIcon: 'editorFreeCam-icon',
        btnEnbChckd: true,
        btnMap: myMap});

    editorSelectArea.activateButton = L.easyButton({
        btnFunct: onClickSelectArea,
        btnTitle:  'Выбор запрашиваемой области',
        btnIcon: 'editorSelectArea-icon',
        btnEnbChckd: true,
        btnMap: myMap});

    editorMapObjects.activateButton = L.easyButton({
        btnFunct: onClickMapObjects,
        btnTitle:  'Редактор картографии',
        btnIcon: 'editorMapObjects-icon',
        btnEnbChckd: true,
        btnMap: myMap});

    editorIntersectTest.activateButton = L.easyButton({
        btnFunct: onClickIntersectTest,
        btnTitle:  'Тестирование пересечения с тайлами',
        btnIcon: 'editorSelectArea-icon',
        btnEnbChckd: true,
        btnMap: myMap});

    changeCurrentEditor(editorFreeCam);

    // создание репазиториев (пока он один)
    repositoryMO = new MapObjectsRepository();

    // подключение к серверу
    ws_connector.connect();
    myMap.setView([33.02732, -112.97], 16);


    /* Рисовалка на канвасе
     var canvasTiles = L.tileLayer.canvas();
     canvasTiles.drawTile = function(canvas, tilePoint, zoom) {
     var ctx = canvas.getContext('2d');
     ctx.fillText(tilePoint.toString(), 50, 50);
     ctx.globalAlpha = 0.05;
     var l = 0, s = 255;
     ctx.fillStyle = '#000';
     ctx.fillRect(l, l, s, s);
     setInterval(function(){
     if(l >= s) {
     ctx.clearRect(0,0,255,255);
     l=0;
     s = 255;
     }
     l+=2;
     s-=4;
     console.log(l, s);
     ctx.fillRect(l, l, s, s);
     }, 100)
     };
     canvasTiles.addTo(myMap);
     */


    // Тест окон
    /*
    var window2 = new Window({
        parentDiv: 'desktopDiv',
        name: 'editor_toolbar',
        isModal: false,
        mainDivCSSClass: 'modal-window-editor-toolbar'
    });

    window2.loadHTML('/static/modal_window/editorToolbar.html', function(event) {
        window2.setupDragElement($('#editorToolbarMoveDiv'));
    });

    window2.showWindow();

    var tb1 = new Toolbar({
        contentDiv: 'editorToolbarContentDiv',
        checkTypeMarkers: true
    });
    */
});

var myMap;
// Репозитории я решил выносить сюда
var repositoryMO;
// Путь к карте на сервере
var mapBasePath = 'http://185.58.206.115/map/{z}/{x}/{y}.jpg';

var message_stream;
var ws_connector;
var editor_manager;

// todo: узнать откуда брать это число, так как на клиенте оно не должно инициализироваться!
var map_max_zoom = 18;