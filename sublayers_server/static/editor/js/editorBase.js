var EditorBase = (function () {
    function EditorBase(initEditor) {
        this.toolButtons = [];
        this.activateButton = null;
        initEditor(this);
    }

    EditorBase.prototype.turnOn = function () {
        for (var i in this.toolButtons)
            this.toolButtons[i].addTo(myMap);
        if (typeof(this._turnOn) === 'function') return this._turnOn()
        else return null;
    };

    EditorBase.prototype.turnOff = function () {
        for (var i in this.toolButtons)
            this.toolButtons[i].removeFrom(myMap);
        if (typeof(this._turnOff) === 'function') return this._turnOff()
        else return null;
    };

    EditorBase.prototype.onMouseDown = function () {
        if (typeof(this._onMouseDown) === 'function') return this._onMouseDown()
        else return null;
    };

    EditorBase.prototype.onMouseMove = function () {
        if (typeof(this._onMouseMove) === 'function') return this._onMouseMove()
        else return null;
    };

    EditorBase.prototype.onMouseUp = function () {
        if (typeof(this._onMouseUp) === 'function') return this._onMouseUp()
        else return null;
    };

    EditorBase.prototype.onKeyPressFreeCam = function () {
        if (typeof(this._keyPressFreeCam) === 'function') return this._keyPressFreeCam()
        else return null;
    };

    return EditorBase;
})();


function initEditors(){
    editorFreeCam = new EditorBase(initFreeCam);
    editorRoad = new EditorBase(initRoad);
    return editorFreeCam;
}

var editorFreeCam;
var editorRoad;