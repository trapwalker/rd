var EditorMapObjects = (function (_super) {
    __extends(EditorMapObjects, _super);

    function EditorMapObjects() {
        _super.call(this);
        this.isShiftDown = false;
    }

    EditorMapObjects.prototype._turnOn = function () {
        //alert('EditorFreeCam.prototype._turnOn');
        return null;
    };

    EditorMapObjects.prototype._turnOff = function () {
        //alert('EditorFreeCam.prototype._turnOff');
        return null;
    };

    return EditorMapObjects;
})(EditorBase);











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
    myMap.off('mousemove', addRoadMapMouseMove);
    clearRoad();
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
var startPoint = null;
var trajectory = null;
var tempMarkers = [];

function clearRoad() {
    if (trajectory) myMap.removeLayer(trajectory);
    trajectory = null;
    for (var i = 0; i < tempMarkers.length; i++)
        myMap.removeLayer(tempMarkers[i]);
    tempMarkers = [];
    startPoint = null;
}

function addRoadMapClick(event) {
    //alert('addRoadMapClick');
    if (startPoint) {

        if (tempMarkers.length > 0) {
            var point1 = myMap.project(tempMarkers[tempMarkers.length - 1].getLatLng(), myMap.getMaxZoom());
            var point2 = myMap.project(event.latlng, myMap.getMaxZoom());
            if (distancePoints(point1, point2) < repositoryMO.roadStepsMin) {
                myMap.removeLayer(tempMarkers[tempMarkers.length - 1]);
                tempMarkers.pop();
            }
            // Очистка tempMarkers без удаления с карты
            for (var i = 0; i < tempMarkers.length; i++)
                repositoryMO.addObject('road', {coord: tempMarkers[i].getLatLng()});
        }
        // очистка
        myMap.removeLayer(trajectory);
        for (var i = 0; i < tempMarkers.length; i++)
            myMap.removeLayer(tempMarkers[i]);
        tempMarkers = [];
    }
    startPoint = event.latlng;
    repositoryMO.addObject('road', {coord: event.latlng});
    trajectory = L.polyline([startPoint, startPoint], {color: '#333333', weight: 1}).addTo(myMap);
}

function addRoadMapMouseMove(event) {
    //alert('addRoadMapMouseMove');
    if (startPoint) {
        trajectory.setLatLngs([startPoint, event.latlng]);
        for (var i = 0; i < tempMarkers.length; i++)
            myMap.removeLayer(tempMarkers[i]);
        tempMarkers = [];
        var projStartPoint = myMap.project(startPoint, myMap.getMaxZoom());
        var projEndPoint = myMap.project(event.latlng, myMap.getMaxZoom());
        var vector = subVector(projEndPoint, projStartPoint);
        var length = vector.abs();
        vector = normVector(vector);
        var shift = repositoryMO.roadStepsMax;
        while (shift < length) {
            var coord = summVector(projStartPoint, mulScalVector(vector, shift));
            tempMarkers.push(L.marker(myMap.unproject([coord.x, coord.y], myMap.getMaxZoom()), {
                icon: repositoryMO.roadIcon,
                clickable: true,
                keyboard: false}).addTo(myMap));
            shift += repositoryMO.roadStepsMax;
        }
    }
}

function addRoadToolButtonClick() {
    //alert('addRoadToolButtonClick');
    clearEditorMapObjects();
    editorMapObjects.toolButtons['tbRoad'].setChecked(true);
    myMap.on('click', addRoadMapClick);
    myMap.on('mousemove', addRoadMapMouseMove);
}



// Удаление выбранных объектов
function delToolButtonClick() {
    repositoryMO.delAllSelectedObjects();
}