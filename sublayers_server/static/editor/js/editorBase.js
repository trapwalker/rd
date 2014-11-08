var EditorBase = (function () {
    function EditorBase(initEditor) {
        this.toolButtons = [];
        this.activateButton = null;
        initEditor(this);
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

    return EditorBase;
})();


function initEditors(){
    editorFreeCam = new EditorBase(initFreeCam);
    editorMapObjects = new EditorBase(initMapObjects);
}

var editorFreeCam;
var editorMapObjects;