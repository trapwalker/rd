$(document).ready(function () {
    // инициализация карты
    myMap = L.map('map', {
        zoomControl: true,      // добавить стандартные кнопки изменения масштаба
        boxZoom: false          // отключить зумирование через прямоугольник
    }).setView([50.595, 36.59], 6);
    tileLayerShow = L.tileLayer(mapBasePath).addTo(myMap);

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
    changeCurrentEditor(editorFreeCam);

    // создание репазиториев (пока он один)
    repositoryMO = new MapObjectsRepository();

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
var mapBasePath = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';