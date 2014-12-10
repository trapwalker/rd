var EditorManager = (function(){
    function EditorManager(){
        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: this.receiveMessage,
            subject: this
        });

        this.tiles = []
    }

    EditorManager.prototype._setIdInObject = function(obj){
        if (obj._id)
            obj.id = obj._id['$oid'];
    };

    EditorManager.prototype.sendMessage = function(msg){
        //alert('EditorManager  sendMessage');
        // TODO: сейчас данная функция вызывается из функций wsjson.js, позже переделать!

        // формирование и отправка мессаджа
        message_stream.sendMessage({
            type: 'ws_message_send',
            body: msg
        });
    };

    EditorManager.prototype.receiveMessage = function (self, params) {
        //alert('EditorManager receiveMessage');
        self._setIdInObject(params.obj);
        //if (params.obj._id)
        //    params.obj.id = params.obj._id['$oid'];

        switch (params.cls){
            case 'addObject':
                repositoryMO.addObjectFromServer(params.obj.object_type, params.obj);
                break;
            case 'delObject':
                repositoryMO.delObjectFromServer(params.obj.object_type, params.obj.id);
                break;
            case 'delObjects':
                for (var i = 0; i < params.obj.length; i++) {
                    var obj = params.obj[i];
                    repositoryMO.delObjectFromServer(obj.object_type, obj._id['$oid']);
                }
                break;
            case 'changeObject':
                repositoryMO.changeObjectFromServer(params.obj.object_type, params.obj);
                break;
            case 'sendRects':
                self.paintTiles(params.obj);
                break;
            case 'answerSelectAreaByRect':
                self.answerSelectAreaByRect(params.obj);
                break;
            case 'roads':
                console.log(params.obj);
                self._paint_roads(params.obj);
                break;
            default:
                break;
        }

        return true;
    };

    EditorManager.prototype.addObject = function(obj){
        var mes = {
            call: "addObject",
            params: obj
        };
        this.sendMessage(mes);
    };

    EditorManager.prototype.delObject = function(id){
        var mes = {
            call: "delObject",
            params: {id: id}
        };
        this.sendMessage(mes);
    };

    EditorManager.prototype.changeObject = function(obj){
        var mes = {
            call: "changeObject",
            params: obj
        };
        this.sendMessage(mes);
    };

    EditorManager.prototype.selectAreaByRect = function(obj){
        var mes = {
            call: "selectAreaByRect",
            params: obj
        };
        this.sendMessage(mes);
    };

    EditorManager.prototype.paintTiles = function(rects){
        while(this.tiles.length > 0){
            // Стереть старые
            tile = this.tiles.pop();
            myMap.removeLayer(tile)
        }
        for (var i = 0; i < rects.length; i++) {
            var rect = rects[i];
            var x = rect.point.x;
            var y = rect.point.y;
            var z = rect.point.z;
            var lt1 = myMap.unproject([x << (26 - z), y << (26 - z)], map_max_zoom);
            var lt2 = myMap.unproject([(x + 1) << (26 - z), (y + 1) << (26 - z)], map_max_zoom);
            //console.log(rect.point.x, rect.point.y, rect.point.z);
            //console.log(x << (26 - z), y << (26 - z), z);
            //console.log(lt1);

            /*
            L.circleMarker(lt1, {color: '#777777'})
                .setRadius(16)
                .bindPopup(
                    'LatLng: ' + lt1 + '</br>'
            )
                .addTo(myMap);
            */

            var map_rect = L.rectangle(L.latLngBounds([lt1, lt2]),
                {color: '#333333', weight: 1, clickable:false, fillOpacity: 0.1});
            this.tiles.push(map_rect);
            map_rect.addTo(myMap);

        }

    };

    EditorManager.prototype.answerSelectAreaByRect = function(objects){
        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            this._setIdInObject(obj);
            repositoryMO.addObjectFromServer(obj.object_type, obj);
        }
    };

    EditorManager.prototype._paint_roads = function (roads) {
        for (var i = 0; i < roads.length; i++) {
            var road = roads[i];
            for (var j = 0; j < road.points.length; j++) {
                var p = road.points[j];
                L.circleMarker([p.lat, p.lng], {color: '#FF3333'})
                    .setRadius(6)
                    .bindPopup(
                        'Road id: ' + road.id + '</br>'+
                        'Road tag: ' + road.tag_road + '</br>'+
                        'LatLng: ' + p.lat + '    ' + p.lng + '</br>'
                )
                    .addTo(myMap);
            }
        }
    }

    return EditorManager;
})();


