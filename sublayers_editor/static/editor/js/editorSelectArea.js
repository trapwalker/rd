var EditorSelectArea = (function (_super) {
    __extends(EditorSelectArea, _super);

    function EditorSelectArea() {
        _super.call(this);
    }

    EditorSelectArea.prototype._turnOn = function () {
        //console.log('EditorSelectArea.prototype._turnOn');
        document.getElementById('map').onkeydown = onKeyDownMain;
        document.getElementById('map').onkeyup = onKeyUpMain;
    };

    EditorSelectArea.prototype._turnOff = function () {
        //console.log('EditorSelectArea.prototype._turnOff');
        document.getElementById('map').onkeydown = null;
        document.getElementById('map').onkeyup = null;
    };

    EditorSelectArea.prototype.mouseUp = function (event) {
        if (this.isStartDraw) {
            var p1 = myMap.project(latLngRect.getNorthWest(), map_max_zoom);
            var p2 = myMap.project(latLngRect.getSouthEast(), map_max_zoom);
            var mes_obj = {
                min_point: {
                    x: p1.x,
                    y: p1.y,
                    z: map_max_zoom + 8
                },
                max_point: {
                    x: p2.x,
                    y: p2.y,
                    z: map_max_zoom + 8
                },
                select_zoom: myMap.getZoom()
            };
            editor_manager.sendSelectAreaByRect(mes_obj);
        }
        _super.prototype.mouseUp.call(this, event);
    };

    return EditorSelectArea;
})(EditorBase);

var editorSelectArea;