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
        btnFunct: addRoadToolButtonClick,
        btnPos: 'topright',
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
    // перехватчики Shift
    document.getElementById('map').onkeydown = onKeyDown;
    document.getElementById('map').onkeyup = onKeyUp;
    selectToolButtonClick();
}

function turnOffMapObjects() {
    // тут должна быть проверка на предмет не сохраненных данных
    clearEditorMapObjects();
    document.getElementById('map').onkeydown = null;
    document.getElementById('map').onkeyup = null;
    return null;
}

/* Очищение редактора (как сделать красивее я не придумал):
    + сброс прямоугнольника выбора;
    + сброс все ивенто повешенных на маркера репозитория;
    + очищение результата выбора;
    + сброс всех ивентов повешенных на карту;
 */
function clearEditorMapObjects() {
    //alert('clearEditorMapObjects');
    if (isKeyDown) onKeyUp();
    editorMapObjects.unCheckAllToolButtons();
    repositoryMO.offObjectMarkerEvent('click', markerClick);
    repositoryMO.offObjectMarkerDragging();
    repositoryMO.clearSelection();
    myMap.off('click', selectMapClick);
    myMap.off('click', addTownMapClick);
    myMap.off('click', addGasStationMapClick);
    myMap.off('click', addRoadMapClick);
}



// Режим выбора и перемещения объектов

function markerClick(event) {
    //alert('markerClick');
    repositoryMO.changeSelectObject(event.target.type, event.target.objectID);
}

function markerDragEnd(event) {
    //alert('markerDragEnd');
    repositoryMO.clearSelection();
    var newCoord = event.target.getLatLng();
    event.target.setLatLng(event.target.objectCoord);
    repositoryMO.changeObject(event.target.type, {coord: newCoord, id: event.target.objectID});
}

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

function selectMapClick(event) {
    //alert('selectMapClick');
    repositoryMO.clearSelection();
}

function selectToolButtonClick() {
    //alert('selectToolButtonClick');
    clearEditorMapObjects();
    repositoryMO.onObjectMarkerEvent('click', markerClick);
    repositoryMO.onObjectMarkerDragging(markerDragEnd);
    editorMapObjects.toolButtons['tbSelect'].setChecked(true);
    myMap.on('click', selectMapClick);
}



// Добавление городов
function addTownMapClick(event) {
    //alert('addTownMapClick');
    repositoryMO.addObject('town', {coord: event.latlng});
}

function addTownToolButtonClick() {
    //alert('addTownToolButtonClick');
    clearEditorMapObjects();
    editorMapObjects.toolButtons['tbTown'].setChecked(true);
    myMap.on('click', addTownMapClick);
}



// Добавление заправок
function addGasStationMapClick(event) {
    //alert('addGasStationMapClick');
    repositoryMO.addObject('gasStation', {coord: event.latlng});
}

function addGasStationToolButtonClick() {
    //alert('addGasStationToolButtonClick');
    clearEditorMapObjects();
    editorMapObjects.toolButtons['tbGasStation'].setChecked(true);
    myMap.on('click', addGasStationMapClick);
}



// Добавление дорог
function addRoadMapClick(event) {
    //alert('addRoadMapClick');
    repositoryMO.addObject('road', {coord: event.latlng});
}

function addRoadToolButtonClick() {
    //alert('addRoadToolButtonClick');
    clearEditorMapObjects();
    editorMapObjects.toolButtons['tbRoad'].setChecked(true);
    myMap.on('click', addRoadMapClick);
}



// Удаление выбранных объектов
function delToolButtonClick() {
    repositoryMO.delAllSelectedObjects();
}