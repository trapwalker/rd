var EditorIntersectTest = (function (_super) {
    __extends(EditorIntersectTest, _super);

    function EditorIntersectTest() {
        _super.call(this);

        this.startPoint = null;
        this.trajectory = null;
        this.resultPoints = [];
    }

    EditorIntersectTest.prototype._turnOn = function () {
        //console.log('EditorIntrersectTest.prototype._turnOn');
        myMap.on('click', mouseClickMain);
    };

    EditorIntersectTest.prototype._turnOff = function () {
        //console.log('EditorIntrersectTest.prototype._turnOff');
        myMap.off('click', mouseClickMain);
        myMap.off('mousemove', mouseMoveMain);

        if (this.trajectory && myMap.hasLayer(this.trajectory))
            myMap.removeLayer(this.trajectory);
    };

    EditorIntersectTest.prototype.mouseClick = function (event) {
        //console.log('EditorIntersectTest.prototype.mouseClick');
        if (!this.startPoint) {
            this.startPoint = event.latlng;
            if (this.trajectory && myMap.hasLayer(this.trajectory))
                myMap.removeLayer(this.trajectory);
            this.trajectory = L.polyline([this.startPoint, this.startPoint], {color: '#0000FF', weight: 2}).addTo(myMap);
            myMap.on('mousemove', mouseMoveMain);
        }
        else {
            var _pnt1 = myMap.project(this.startPoint, map_max_zoom);
            var _pnt2 = myMap.project(event.latlng, map_max_zoom);
            var angle = normalizeAngleRad(angleVectorRadCCW(subVector(_pnt2, _pnt1)) + Math.PI / 2.);
            editor_manager.sendIntersectTest({
                    x: _pnt1.x,
                    y: _pnt1.y,
                    z: map_max_zoom + 8
                },
                angle);
            this.startPoint = null;
            myMap.off('mousemove', mouseMoveMain);
        }

    };

    EditorIntersectTest.prototype.mouseMove = function (event) {
        this.trajectory.setLatLngs([this.startPoint, event.latlng]);
    };

    EditorIntersectTest.prototype.setResultPoints = function (points) {
        //console.log('EditorIntersectTest.prototype.setResultPoints', points);
        while(this.resultPoints.length)
            myMap.removeLayer(this.resultPoints.pop());

        for(var i=0; i < points.length; i++)
            this.resultPoints.push(
                L.circleMarker(myMap.unproject([points[i].x, points[i].y], (points[i].z - 8)), {color: '#FF3333'})
                    .setRadius(6)
                    .bindPopup(
                        'Tileset Name: ' + points[i].key + '</br>')
                    .addTo(myMap));
    };

    return EditorIntersectTest;
})(EditorBase);

var editorIntersectTest;
