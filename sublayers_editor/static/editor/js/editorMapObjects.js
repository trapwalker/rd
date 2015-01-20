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
        this.currentToolButton = null;
    }

    EditorMapObjects.prototype._turnOn = function () {
        //console.log('EditorMapObjects.prototype._turnOn');
        document.getElementById('map').onkeydown = onKeyDownMain;
        document.getElementById('map').onkeyup = onKeyUpMain;
        myMap.on('click', mouseClickMain);
        selectToolButtonClick();
    };

    EditorMapObjects.prototype._turnOff = function () {
        //console.log('EditorMapObjects.prototype._turnOff');
        this.clear();
        document.getElementById('map').onkeydown = null;
        document.getElementById('map').onkeyup = null;
        myMap.off('click', mouseClickMain);
    };

    EditorMapObjects.prototype.clear = function() {
        //console.log('EditorMapObjects.prototype.clear');
        if (this.isKeyDown) this.onKeyUp();
        this.unCheckAllToolButtons();
        repositoryMO.offObjectMarkerEvent('click', this.markerClick);
        repositoryMO.offObjectMarkerDragging(this.markerDragEnd);
        repositoryMO.clearSelection();
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
        }
    };

    EditorMapObjects.prototype.mouseClick = function(event) {
        //console.log('EditorMapObjects.prototype.mouseClick');
        switch (this.currentToolButton) {
            case 'tbSelect':
                repositoryMO.clearSelection();
                return;
            case 'tbTown':
                repositoryMO.addObject({coord: event.latlng, type: 'town'});
                return;
            case 'tbGasStation':
                repositoryMO.addObject({coord: event.latlng, type: 'gasStation'});
                return;
            default:
                return;
        }
    };

    // Выбор объектов
    EditorMapObjects.prototype.markerClick = function(event) {
        //console.log('EditorMapObjects.prototype.markerClick');
        repositoryMO.changeSelectObject(event.target);
    };

    // Перемещения объектов
    EditorMapObjects.prototype.markerDragEnd = function(event) {
        //console.log('EditorMapObjects.prototype.markerDragEnd');
        repositoryMO.clearSelection();
        repositoryMO.changeObject(event.target);
        event.target.setLatLng(event.target.objectCoord);
    };

    EditorMapObjects.prototype.onKeyDown = function (event) {
        //console.log('EditorMapObjects.prototype.onKeyDown');
        if (this.currentToolButton === 'tbSelect')
            _super.prototype.onKeyDown.call(this, event);
    };

    EditorMapObjects.prototype.mouseUp = function (event) {
        //console.log('EditorMapObjects.prototype.mouseUp');
        if (this.isStartDraw)
            repositoryMO.selectByRect(this.selectRectBound);
        _super.prototype.mouseUp.call(this, event);
    };

    EditorMapObjects.prototype.mouseMove = function (event) {
        //console.log('EditorMapObjects.prototype.mouseMove');
        if (this.currentToolButton === 'tbSelect')
            _super.prototype.mouseMove.call(this, event);
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

function delToolButtonClick() {
    repositoryMO.delAllSelectedObjects();
}

var editorMapObjects;