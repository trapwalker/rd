var EditorSelectArea = (function (_super) {
    __extends(EditorSelectArea, _super);

    function EditorSelectArea() {
        _super.call(this);
    }

    EditorSelectArea.prototype._turnOn = function () {
        //alert('EditorSelectArea.prototype._turnOn');
        document.getElementById('map').onkeydown = onKeyDownMain;
        document.getElementById('map').onkeyup = onKeyUpMain;
    };

    EditorSelectArea.prototype._turnOff = function () {
        //alert('EditorSelectArea.prototype._turnOff');
        document.getElementById('map').onkeydown = null;
        document.getElementById('map').onkeyup = null;
    };

    EditorSelectArea.prototype.mouseUp = function (event) {
        if (this.isStartDraw)
            repositoryMO.requestArea(this.selectRectBound);
        _super.prototype.mouseUp.call(this, event);
    };

    return EditorSelectArea;
})(EditorBase);

var editorSelectArea;