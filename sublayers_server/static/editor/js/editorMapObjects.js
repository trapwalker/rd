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
    selectToolButtonClick();
}

function turnOffMapObjects() {
    dropAllEventsEditorMapObjects();

    // тут должна быть проверка на предмет не сохраненных данных

    return null;
}

// Сброс всех ивентов повешенных на карту в этом редакторе (как сделать красивее я не придумал)
function dropAllEventsEditorMapObjects() {
    myMap.off('click', selectMapClick);
    myMap.off('click', addTownMapClick);
    myMap.off('click', addGasStationMapClick);
}

// Режим выбора и перемещения объектов
function selectMapClick(e) {
    //alert('selectMapClick');
}

function selectToolButtonClick() {
    //alert('selectToolButtonClick');
    editorMapObjects.unCheckAllToolButtons();
    repositoryMO.onObjectsSelected();
    dropAllEventsEditorMapObjects();
    editorMapObjects.toolButtons['tbSelect'].setChecked(true);
    myMap.on('click', selectMapClick);
}

// Добавление городов
function addTownMapClick(e) {
    //alert('addTownMapClick');
    repositoryMO.addTown({coord: {x: e.latlng.lat, y: e.latlng.lng}});
}

function addTownToolButtonClick() {
    //alert('addTownToolButtonClick');
    editorMapObjects.unCheckAllToolButtons();
    repositoryMO.offObjectsSelected();
    dropAllEventsEditorMapObjects();
    editorMapObjects.toolButtons['tbTown'].setChecked(true);
    myMap.on('click', addTownMapClick);
}

// Добавление заправок
function addGasStationMapClick(e) {
    //alert('addGasStationMapClick');
    repositoryMO.addGasStation({coord: {x: e.latlng.lat, y: e.latlng.lng}});
}

function addGasStationToolButtonClick() {
    //alert('addGasStationToolButtonClick');
    editorMapObjects.unCheckAllToolButtons();
    repositoryMO.offObjectsSelected();
    dropAllEventsEditorMapObjects();
    editorMapObjects.toolButtons['tbGasStation'].setChecked(true);
    myMap.on('click', addGasStationMapClick);
}

// Удаление выбранных объектов
function delToolButtonClick() {
    repositoryMO.delAllSelectedObjects();
}