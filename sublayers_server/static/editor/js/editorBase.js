var EditorBase = (function () {
    function EditorBase(initEditor) {
        initEditor(this);
    }

    EditorBase.prototype.turnOn = function () {
        if (typeof(this._onMouseDown) === 'function') return this._onMouseDown()
        else return null;
    };

    EditorBase.prototype.turnOff = function () {
        if (typeof(this._onMouseDown) === 'function') return this._onMouseDown()
        else return null;
    };

    EditorBase.prototype.onMouseDown = function () {
        if (typeof(this._onMouseDown) === 'function') return this._onMouseDown()
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
    editorFreeCam = new WorkEditor(initFreeCam);
    editorRoad = new WorkEditor(initRoad);
}

var editorFreeCam;
var editorRoad;