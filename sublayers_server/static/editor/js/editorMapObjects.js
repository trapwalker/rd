function initMapObjects(editor) {

    // добавление функциональный кнопок
    editor.toolButtons.push(L.easyButton({
        btnPos: 'topright',
        btnFunct: null,
        btnTitle: 'Выбор и перемещение объектов',
        btnIcon: 'toolSelect-icon'})
    );

    editor.toolButtons.push(L.easyButton({
        btnPos: 'topright',
        btnFunct: null,
        btnTitle: 'Ввод дорог',
        btnIcon: 'toolRoad-icon'})
    );

    editor.toolButtons.push(L.easyButton({
        btnPos: 'topright',
        btnFunct: null,
        btnTitle: 'Ввод гордов',
        btnIcon: 'toolTown-icon'})
    );

    editor.toolButtons.push(L.easyButton({
        btnPos: 'topright',
        btnFunct: null,
        btnTitle: 'Ввод заправок',
        btnIcon: 'toolGas-icon'})
    );

    editor.toolButtons.push(L.easyButton({
            btnPos: 'topright',
            btnFunct: null,
            btnTitle: 'Удаление объектов',
            btnIcon: 'toolDel-icon'})
    );


    editor._turnOn = turnOnMapObjects;
    editor._turnOff = turnOffMapObjects;
    editor._onMouseDown = mouseDownMapObjects;
    editor._onMouseMove = mouseMoveMapObjects;
    editor._onMouseUp = mouseUpMapObjects;
    editor._onKeyPress = keyPressMapObjects;
}

function turnOnMapObjects() {
    return null;
}

function turnOffMapObjects() {
    return null;
}

function mouseDownMapObjects() {
    return null;
}

function mouseMoveMapObjects() {
    return null;
}

function mouseUpMapObjects() {
    return null;
}

function keyPressMapObjects() {
    return null;
}


