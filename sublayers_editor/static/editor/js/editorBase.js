var EditorBase = (function () {
    function EditorBase() {
        this.toolButtons = [];
        this.activateButton = null;

        // Механизм рисование прямоугольника выбора
        this.isShiftDown = false;
        this.isStartDraw = false;
        this.startLatLng = {};
        this.selectRect = {};
        this.selectRectBound = {};
    }

    EditorBase.prototype.turnOn = function () {
        for (var i in this.toolButtons)
            this.toolButtons[i].addTo(myMap);
        this.activateButton.setChecked(true);
        if (typeof(this._turnOn) === 'function') return this._turnOn()
        else return null;
    };

    EditorBase.prototype.turnOff = function () {
        for (var i in this.toolButtons)
            this.toolButtons[i].removeFrom(myMap);
        this.activateButton.setChecked(false);
        if (typeof(this._turnOff) === 'function') return this._turnOff()
        else return null;
    };

    EditorBase.prototype.unCheckAllToolButtons = function () {
        for (var i in this.toolButtons)
            this.toolButtons[i].setChecked(false);
    };

    EditorBase.prototype.onKeyDown = function (event) {
        //alert('EditorSelectArea.prototype.onKeyDown');
        if (!this.isShiftDown && (event.keyCode === 16)) {
            this.isShiftDown = true;
            myMap.dragging.disable();
            myMap.on('mousedown', mouseDownMain);
            myMap.on('mousemove', mouseMoveMain);
            myMap.on('mouseup', mouseUpMain);
        }
    };

    EditorBase.prototype.onKeyUp = function (event) {
        //alert('EditorSelectArea.prototype.onKeyUp');
        if (this.isShiftDown) {
            this.isShiftDown = false;
            myMap.dragging.enable();
            myMap.off('mousedown', mouseDownMain);
            myMap.off('mousemove', mouseMoveMain);
            myMap.off('mouseup', mouseUpMain);
            this.mouseUp();
        }
    };

    EditorBase.prototype.mouseDown = function (event) {
        //alert('EditorBase.prototype.mouseDown');
        this.isStartDraw = true;
        this.startLatLng = event.latlng;
        this.selectRectBound = L.latLngBounds([this.startLatLng, this.startLatLng]);
        this.selectRect = L.rectangle(this.selectRectBound, {color: '#333333', weight: 1}).addTo(myMap);
    }

    EditorBase.prototype.mouseMove = function (event) {
        //alert('EditorBase.prototype.mouseMove');
        if (this.isStartDraw) {
            this.selectRectBound = L.latLngBounds([this.startLatLng, event.latlng]);
            this.selectRect.setBounds(this.selectRectBound);
        }
    }

    EditorBase.prototype.mouseUp = function (event) {
        //alert('EditorBase.prototype.mouseUp');
        if (this.isStartDraw) {
            myMap.removeLayer(this.selectRect);
            this.isStartDraw = false;
        }
    }

    return EditorBase;
})();

// Инициализация редакторов
function initEditors(){
    editorFreeCam = new EditorFreeCam();
    editorSelectArea = new EditorSelectArea();
    editorMapObjects = new EditorMapObjects();
    editorIntersectTest = new EditorIntersectTest();
}

// Обработчики событий мыши и клавиатуры
function onKeyDownMain(event) {
    //alert('onKeyDownMain');
    if (typeof(currentEditor.onKeyDown) === 'function')
        currentEditor.onKeyDown(event);
}

function onKeyUpMain(event) {
    //alert('onKeyUpMain');
    if (typeof(currentEditor.onKeyUp) === 'function')
        currentEditor.onKeyUp(event);
}

function mouseDownMain(event) {
    //alert('mouseDownMain');
    if (typeof(currentEditor.mouseDown) === 'function')
        currentEditor.mouseDown(event);
}

function mouseMoveMain(event) {
    //alert('mouseMoveMain');
    if (typeof(currentEditor.mouseMove) === 'function')
        currentEditor.mouseMove(event);
}

function mouseUpMain(event) {
    //alert('mouseUpMain');
    if (typeof(currentEditor.mouseUp) === 'function')
        currentEditor.mouseUp(event);
}

function mouseClickMain(event) {
    //alert('mouseClickMain');
    if (typeof(currentEditor.mouseClick) === 'function')
        currentEditor.mouseClick(event);
}

// Механизм переключения между редакторами
// Включение режима свободной камеры
function onClickFreeCam() {
    if (currentEditor != editorFreeCam)
        changeCurrentEditor(editorFreeCam);
}

// Включение режима выбора запрашиваемой области
function onClickSelectArea() {
    if (currentEditor === editorSelectArea)
        changeCurrentEditor(editorFreeCam);
    else
        changeCurrentEditor(editorSelectArea)
}

// Включение режима редактирования дорог
function onClickMapObjects() {
    if (currentEditor === editorMapObjects)
        changeCurrentEditor(editorFreeCam);
    else
        changeCurrentEditor(editorMapObjects)
}

function onClickIntersectTest() {
    if (currentEditor === editorIntersectTest)
        changeCurrentEditor(editorFreeCam);
    else
        changeCurrentEditor(editorIntersectTest)
}

// Изменение текущего режима работы редактора
function changeCurrentEditor(newEditor) {
    if (currentEditor) currentEditor.turnOff();
    currentEditor = newEditor;
    currentEditor.turnOn();
}

var currentEditor;
