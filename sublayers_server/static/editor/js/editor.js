// Включение режима свободной камеры
function onClickFreeCam() {
    if (currentEditor != editorFreeCam)
        changeCurrentEditor(editorFreeCam);
}

// Включение режима редактирования дорог
function onClickRoad() {
    if (currentEditor === editorRoad)
        changeCurrentEditor(editorFreeCam);
    else
        changeCurrentEditor(editorRoad)
}

// Изменение текущего режима работы редактора
function changeCurrentEditor(newEditor) {
    currentEditor.turnOff();
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
    currentEditor = initEditors();
    editorFreeCam.activateButton = L.easyButton({
        btnFunct: onClickFreeCam,
        btnTitle: 'Свободная камера',
        btnMap: myMap});

    editorRoad.activateButton = L.easyButton({
        btnFunct: onClickRoad,
        btnTitle:  'Редактор дорог',
        btnMap: myMap});
});

var myMap;
var currentEditor;

//Путь к карте на сервере
var mapBasePath = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';