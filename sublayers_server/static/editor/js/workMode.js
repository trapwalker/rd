var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var Editor = (function () {
    function Editor(initEditor) {
        initEditor(this);
    }

    Editor.prototype.onClick = function () {
        if (typeof(this._onClick) === 'function') this._onClick();
    };

    return Editor;
})();




function initEditors(){
    editorFreeCam = new WorkMode(freeCamOnSet, freeCamOffSet, clickFreeCam);
}

var editorRoad;
var editorQuest;
var editorTown;
var editorFreeCam;
