function initMapObjects(editor) {

    /* добавление функциональный кнопок (здесь убрал push чтобы можно было обратиться к конкретной кнопке через
       именованую константу: tbSelct, tbRoad, tbTown, tbGasStation, tbDel)
    */
    editor.toolButtons['tbSelect'] = L.easyButton({
        btnFunct: selectToolButtonClick,
        btnPos: 'topright',
        btnTitle: 'Выбор и перемещение объектов',
        btnIcon: 'toolSelect-icon',
        btnEnbChckd: true
    });

    editor.toolButtons['tbRoad'] = L.easyButton({
        btnPos: 'topright',
        btnFunct: null,
        btnTitle: 'Ввод дорог',
        btnIcon: 'toolRoad-icon',
        btnEnbChckd: true});

    editor.toolButtons['tbTown'] = L.easyButton({
        btnFunct: addTownToolButtonClick,
        btnPos: 'topright',
        btnTitle: 'Ввод гордов',
        btnIcon: 'toolTown-icon',
        btnEnbChckd: true});

    editor.toolButtons['tbGasStation'] = L.easyButton({
        btnFunct: addGasStationToolButtonClick,
        btnPos: 'topright',
        btnTitle: 'Ввод заправок',
        btnIcon: 'toolGas-icon',
        btnEnbChckd: true});

    editor.toolButtons['tbDel'] =L.easyButton({
        btnFunct: delToolButtonClick,
        btnPos: 'topright',
        btnTitle: 'Удаление выбранных объектов',
        btnIcon: 'toolDel-icon'});

    editor._turnOn = turnOnMapObjects;
    editor._turnOff = turnOffMapObjects;
}

function turnOnMapObjects() {
    /* при запускке картографического редактора по умолчанию
       включается режим выбора и перемещения объектов */
    document.getElementById('map').onkeydown = onKeyDown;
    document.getElementById('map').onkeyup = onKeyUp;
    selectToolButtonClick();
}

function turnOffMapObjects() {
    // тут должна быть проверка на предмет не сохраненных данных
    dropAllEventsEditorMapObjects();
    document.getElementById('map').onkeydown = null;
    document.getElementById('map').onkeyup = null;
    return null;
}

// Сброс всех ивентов повешенных на карту в этом редакторе (как сделать красивее я не придумал)
// + очищение результата выбора и сброс прямоугнольника выбора
function dropAllEventsEditorMapObjects() {
    //alert('dropAllEventsEditorMapObjects');
    editorMapObjects.unCheckAllToolButtons();
    if (isKeyDown) onKeyUp();
    repositoryMO.offObjectsSelected();
    repositoryMO.clearSelection();
    myMap.off('click', selectMapClick);
    myMap.off('click', addTownMapClick);
    myMap.off('click', addGasStationMapClick);
}

// Режим выбора и перемещения объектов

// Обработчик Shift
var isKeyDown = false;

function onKeyDown(event) {
    //alert('onKeyDown');
    if (!isKeyDown && (event.keyCode === 16) &&
        editorMapObjects.toolButtons['tbSelect'].options.checked) {
        isKeyDown = true;
        myMap.dragging.disable();
        myMap.on('mousedown', drawSelectRectMouseDown);
        myMap.on('mousemove', drawSelectRectMouseMove);
        myMap.on('mouseup', drawSelectRectMouseUp);
    }
}

function onKeyUp(event) {
    //alert('onKeyUp');
    if (isKeyDown) {
        isKeyDown = false;
        myMap.dragging.enable();
        myMap.off('mousedown', drawSelectRectMouseDown);
        myMap.off('mousemove', drawSelectRectMouseMove);
        myMap.off('mouseup', drawSelectRectMouseUp);
        drawSelectRectMouseUp();
    }
}

// Рисование прямоугольника выбора
var isStartDraw = false;
var startLatLng;
var selectRect;
var selectRectBound;

function drawSelectRectMouseDown(event) {
    //alert('drawSelectRectMouseDown');
    isStartDraw = true;
    startLatLng = event.latlng;
    selectRectBound = L.latLngBounds([startLatLng, startLatLng]);
    selectRect = L.rectangle(selectRectBound, {color: '#333333', weight: 1}).addTo(myMap);
}

function drawSelectRectMouseMove(event) {
    //alert('drawSelectRectMouseMove');
    if (isStartDraw) {
        selectRectBound = L.latLngBounds([startLatLng, event.latlng]);
        selectRect.setBounds(selectRectBound);
    }
}

function drawSelectRectMouseUp(event) {
    //alert('drawSelectRectMouseUp');
    if (isStartDraw) {
        repositoryMO.selectByRect(selectRectBound);
        myMap.removeLayer(selectRect);
        isStartDraw = false;
    }
}

function selectMapClick(e) {
    //alert('selectMapClick');
    repositoryMO.clearSelection();
}

function selectToolButtonClick() {
    //alert('selectToolButtonClick');
    dropAllEventsEditorMapObjects();
    repositoryMO.onObjectsSelected();
    editorMapObjects.toolButtons['tbSelect'].setChecked(true);
    myMap.on('click', selectMapClick);
}


// Добавление городов
function addTownMapClick(e) {
    //alert('addTownMapClick');
    repositoryMO.addTown({coord: e.latlng});
}

function addTownToolButtonClick() {
    //alert('addTownToolButtonClick');
    dropAllEventsEditorMapObjects();
    editorMapObjects.toolButtons['tbTown'].setChecked(true);
    myMap.on('click', addTownMapClick);
}


// Добавление заправок
function addGasStationMapClick(e) {
    //alert('addGasStationMapClick');
    repositoryMO.addGasStation({coord: e.latlng});
}

function addGasStationToolButtonClick() {
    //alert('addGasStationToolButtonClick');
    dropAllEventsEditorMapObjects();
    editorMapObjects.toolButtons['tbGasStation'].setChecked(true);
    myMap.on('click', addGasStationMapClick);
}


// Удаление выбранных объектов
function delToolButtonClick() {
    repositoryMO.delAllSelectedObjects();
}