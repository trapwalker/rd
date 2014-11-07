function initRoad(editor) {

    // добавление функциональный кнопок
    editor.toolButtons.push(L.easyButton({
        btnPos: 'topright',
        btnFunct: null,
        btnTitle: 'Режим выбора'})
    );

    editor.toolButtons.push(L.easyButton({
            btnPos: 'topright',
            btnFunct: null,
            btnTitle: 'Ввод дороги'})
    );

    editor.toolButtons.push(L.easyButton({
            btnPos: 'topright',
            btnFunct: null,
            btnTitle: 'Удаление выбранных элементов'})
    );

    editor._turnOn = turnOnRoad;
    editor._turnOff = turnOffRoad;
    editor._onMouseDown = mouseDownRoad;
    editor._onMouseMove = mouseMoveRoad;
    editor._onMouseUp = mouseUpRoad;
    editor._onKeyPress = keyPressRoad;
}

function turnOnRoad() {
    return null;
}

function turnOffRoad() {
    return null;
}

function mouseDownRoad() {
    return null;
}

function mouseMoveRoad() {
    return null;
}

function mouseUpRoad() {
    return null;
}

function keyPressRoad() {
    return null;
}


