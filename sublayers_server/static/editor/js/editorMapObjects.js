var EditorMapObjects = (function (_super) {
    __extends(EditorMapObjects, _super);

    function EditorMapObjects() {
        _super.call(this);
        this.toolButtons['tbSelect'] = L.easyButton({
            btnFunct: selectToolButtonClick,
            btnPos: 'topright',
            btnTitle: 'Выбор и перемещение объектов',
            btnIcon: 'toolSelect-icon',
            btnEnbChckd: true
        });
        this.toolButtons['tbRoad'] = L.easyButton({
            btnFunct: addRoadToolButtonClick,
            btnPos: 'topright',
            btnTitle: 'Ввод дорог',
            btnIcon: 'toolRoad-icon',
            btnEnbChckd: true});
        this.toolButtons['tbTown'] = L.easyButton({
            btnFunct: addTownToolButtonClick,
            btnPos: 'topright',
            btnTitle: 'Ввод гордов',
            btnIcon: 'toolTown-icon',
            btnEnbChckd: true});
        this.toolButtons['tbGasStation'] = L.easyButton({
            btnFunct: addGasStationToolButtonClick,
            btnPos: 'topright',
            btnTitle: 'Ввод заправок',
            btnIcon: 'toolGas-icon',
            btnEnbChckd: true});
        this.toolButtons['tbDel'] =L.easyButton({
            btnFunct: delToolButtonClick,
            btnPos: 'topright',
            btnTitle: 'Удаление выбранных объектов',
            btnIcon: 'toolDel-icon'});

        // Механизм ввода дорог
        this.startPoint = null;
        this.trajectory = null;
        this.tempMarkers = [];
    }

    EditorMapObjects.prototype._turnOn = function () {
        //alert('EditorMapObjects.prototype._turnOn');
        document.getElementById('map').onkeydown = onKeyDownMain;
        document.getElementById('map').onkeyup = onKeyUpMain;
        myMap.on('click', mouseClickMain);
        selectToolButtonClick();
    };

    EditorMapObjects.prototype._turnOff = function () {
        //alert('EditorMapObjects.prototype._turnOff');
        //TODO: сделать проверку на предмет не сохраненных данных
        this.clear();
        document.getElementById('map').onkeydown = null;
        document.getElementById('map').onkeyup = null;
        myMap.off('click', mouseClickMain);
    };

    EditorMapObjects.prototype.setToolButton = function(type) {
        if (this.toolButtons[type]) {
            this.clear();
            this.toolButtons[type].setChecked(true);
            this.currentToolButton = type;
            if (type === 'tbSelect') {
                repositoryMO.onObjectMarkerEvent('click', this.markerClick);
                repositoryMO.onObjectMarkerDragging(this.markerDragEnd);
            }
            if (type === 'tbRoad') myMap.on('mousemove', mouseMoveMain);
        }
    };

    EditorMapObjects.prototype.clear = function() {
        //alert('EditorMapObjects.prototype.clear');
        if (this.isKeyDown) this.onKeyUp();
        this.unCheckAllToolButtons();
        repositoryMO.offObjectMarkerEvent('click', this.markerClick);
        repositoryMO.offObjectMarkerDragging();
        repositoryMO.clearSelection();
        myMap.off('mousemove', mouseMoveMain);
        this.clearRoad();
    };

    EditorMapObjects.prototype.clearRoad = function() {
        //alert('EditorMapObjects.prototype.clearRoad');
        if (this.trajectory) myMap.removeLayer(this.trajectory);
        this.trajectory = null;
        for (var i = 0; i < this.tempMarkers.length; i++)
            myMap.removeLayer(this.tempMarkers[i]);
        this.tempMarkers = [];
        this.startPoint = null;
    };

    EditorMapObjects.prototype.mouseClick = function(event) {
        //alert('EditorMapObjects.prototype.mouseClick');
        if (this.currentToolButton)
            switch (this.currentToolButton) {
                case 'tbSelect':
                    repositoryMO.clearSelection();
                    return;
                case 'tbTown':
                    repositoryMO.addObject('town', {coord: event.latlng});
                    return;
                case 'tbGasStation':
                    repositoryMO.addObject('gasStation', {coord: event.latlng});
                    return;
                case 'tbRoad':
                    if (this.startPoint) {
                        if (this.tempMarkers.length > 0) {
                            var point1 = myMap.project(this.tempMarkers[this.tempMarkers.length - 1].getLatLng(), myMap.getMaxZoom());
                            var point2 = myMap.project(event.latlng, myMap.getMaxZoom());
                            if (distancePoints(point1, point2) < repositoryMO.roadStepsMin) {
                                myMap.removeLayer(this.tempMarkers[this.tempMarkers.length - 1]);
                                this.tempMarkers.pop();
                            }
                            // Очистка tempMarkers без удаления с карты
                            for (var i = 0; i < this.tempMarkers.length; i++)
                                repositoryMO.addObject('road', {coord: this.tempMarkers[i].getLatLng()});
                        }
                        // очистка
                        myMap.removeLayer(this.trajectory);
                        for (var i = 0; i < this.tempMarkers.length; i++)
                            myMap.removeLayer(this.tempMarkers[i]);
                        this.tempMarkers = [];
                    }
                    this.startPoint = event.latlng;
                    repositoryMO.addObject('road', {coord: event.latlng});
                    this.trajectory = L.polyline([this.startPoint, this.startPoint], {color: '#333333', weight: 1}).addTo(myMap);
                    return;
                default:
                    return;
            }
    };

    // Выбор объектов
    EditorMapObjects.prototype.markerClick = function(event) {
        //alert('EditorMapObjects.prototype.markerClick');
        repositoryMO.changeSelectObject(event.target.type, event.target.objectID);
    }

    // Перемещения объектов
    EditorMapObjects.prototype.markerDragEnd = function(event) {
        //alert('EditorMapObjects.prototype.markerDragEnd');
        repositoryMO.clearSelection();
        var newCoord = event.target.getLatLng();
        event.target.setLatLng(event.target.objectCoord);
        repositoryMO.changeObject(event.target.type, {coord: newCoord, id: event.target.objectID});
    }

    EditorMapObjects.prototype.onKeyDown = function (event) {
        //alert('EditorMapObjects.prototype.onKeyDown');
        if (this.currentToolButton === 'tbSelect')
            _super.prototype.onKeyDown.apply(this, event);
    };

    EditorMapObjects.prototype.mouseUp = function (event) {
        //alert('EditorMapObjects.prototype.mouseUp');
        if (this.isStartDraw)
            repositoryMO.selectByRect(this.selectRectBound);
        _super.prototype.mouseUp.apply(this, event);
    };

    EditorMapObjects.prototype.mouseMove = function (event) {
        //alert('EditorMapObjects.prototype.mouseMove');
        switch (this.currentToolButton) {
            case 'tbSelect':
                if (this.isStartDraw)
                    _super.prototype.mouseMove.apply(this, event);
                return;
            case 'tbRoad':
                if (this.startPoint) {
                    this.trajectory.setLatLngs([this.startPoint, event.latlng]);
                    for (var i = 0; i < this.tempMarkers.length; i++)
                        myMap.removeLayer(this.tempMarkers[i]);
                    this.tempMarkers = [];
                    var projStartPoint = myMap.project(this.startPoint, myMap.getMaxZoom());
                    var projEndPoint = myMap.project(event.latlng, myMap.getMaxZoom());
                    var vector = subVector(projEndPoint, projStartPoint);
                    var length = vector.abs();
                    vector = normVector(vector);
                    var shift = repositoryMO.roadStepsMax;
                    while (shift < length) {
                        var coord = summVector(projStartPoint, mulScalVector(vector, shift));
                        this.tempMarkers.push(L.marker(myMap.unproject([coord.x, coord.y], myMap.getMaxZoom()), {
                            icon: repositoryMO.roadIcon,
                            clickable: true,
                            keyboard: false}).addTo(myMap));
                        shift += repositoryMO.roadStepsMax;
                    }
                }
        }
    };

    return EditorMapObjects;
})(EditorBase);


// Обработчик тулБаттонов, не получилось внести в класс, из-за проблемы с this
function selectToolButtonClick() {
    editorMapObjects.setToolButton('tbSelect');
}

function addTownToolButtonClick() {
    editorMapObjects.setToolButton('tbTown');
}

function addGasStationToolButtonClick() {

    editorMapObjects.setToolButton('tbGasStation');
}

function addRoadToolButtonClick() {

    editorMapObjects.setToolButton('tbRoad');
}

function delToolButtonClick() {
    repositoryMO.delAllSelectedObjects();
}

var editorMapObjects;