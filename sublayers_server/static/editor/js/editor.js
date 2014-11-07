// Включение режима свободной камеры
function onClickFreeCam() {
    if (currentEditor != editorFreeCam)
        changeCurrentEditor(editorFreeCam);
}

// Включение режима редактирования дорог
function onClickRoad() {
    if (currentEditor === editorMapObjects)
        changeCurrentEditor(editorFreeCam);
    else
        changeCurrentEditor(editorMapObjects)
}

// Изменение текущего режима работы редактора
function changeCurrentEditor(newEditor) {
    if (currentEditor) currentEditor.turnOff();
    currentEditor = newEditor;
    currentEditor.turnOn();
}

$(document).ready(function () {
    // инициализация карты
    myMap = L.map('map', {
        zoomControl: true
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

    editorMapObjects.activateButton = L.easyButton({
        btnFunct: onClickRoad,
        btnTitle:  'Редактор картографии',
        btnIcon: 'editorMapObjects-icon',
        btnEnbChckd: true,
        btnMap: myMap});
    changeCurrentEditor(editorFreeCam);
});

var myMap;
var currentEditor;

//Путь к карте на сервере
var mapBasePath = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';