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

    EditorManager.prototype._sendMessage = function(msg){
        //console.log('EditorManager.prototype._sendMessage');
        message_stream.sendMessage({
            type: 'ws_message_send',
            body: msg
        });
    };

    EditorManager.prototype.receiveMessage = function (self, params) {
        //console.log('EditorManager.prototype.receiveMessage');
        self._setIdInObject(params.obj);
        if (typeof(self[params.cls]) === 'function')
            self[params.cls](params);
        else
            console.log('Error: неизвестная апи-команда для клиента: ', params.cls);
        return true;
    };

    // Методы отправки сообщений

    EditorManager.prototype.sendAddObject = function(obj){
        var mes = {
            call: "addObject",
            params: obj
        };
        this._sendMessage(mes);
    };

    EditorManager.prototype.sendDelObject = function(id){
        var mes = {
            call: "delObject",
            params: {id: id}
        };
        this._sendMessage(mes);
    };

    EditorManager.prototype.sendChangeObject = function(obj){
        var mes = {
            call: "changeObject",
            params: obj
        };
        this._sendMessage(mes);
    };

    EditorManager.prototype.sendSelectAreaByRect = function(obj){
        var mes = {
            call: "selectAreaByRect",
            params: obj
        };
        this._sendMessage(mes);
    };

    EditorManager.prototype.sendIntersectTest = function(point, angle) {
        var mes = {
            call: 'intersectTest',
            params: {
                point: point,
                angle: angle
            }
        };
        this._sendMessage(mes);
    };

    // Методы приема сообщений

    EditorManager.prototype.receiveAddObject = function(params) {
        //console.log('EditorManager.prototype.receiveAddObject');
        repositoryMO.addObjectFromServer(params.obj);
    };

    EditorManager.prototype.receiveDelObject = function(params) {
        //console.log('EditorManager.prototype.receiveDelObject');
        repositoryMO.delObjectFromServer(params.obj.id);
    };

    EditorManager.prototype.receiveDelObjects = function(params) {
        //console.log('EditorManager.prototype.receiveDelObjects');
        for (var i = 0; i < params.obj.length; i++)
            repositoryMO.delObjectFromServer(params.obj[i]._id['$oid']);
    };

    EditorManager.prototype.receiveChangeObject = function(params) {
        //console.log('EditorManager.prototype.receiveChangeObject');
        repositoryMO.changeObjectFromServer(params.obj);
    };

    EditorManager.prototype.receiveAddTiles = function(params) {
        //console.log('EditorManager.prototype.receiveAddTiles');
        repositoryMO.addTilesFromServer(params.obj);
    };

    EditorManager.prototype.receiveDelTiles = function(params) {
        //console.log('EditorManager.prototype.receiveDelTiles');
        repositoryMO.delTilesFromServer(params.obj);
    };

    EditorManager.prototype.receiveRects = function(params) {
        //console.log('EditorManager.prototype.receiveRects');
        rects = params.obj;
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

            var map_rect = L.rectangle(L.latLngBounds([lt1, lt2]),
                {color: '#333333', weight: 2, clickable:false, fillOpacity: 0.0});
            this.tiles.push(map_rect);
            map_rect.addTo(myMap);
        }
    };

    EditorManager.prototype.receiveSelectAreaByRect = function(params) {
        //console.log('EditorManager.prototype.receiveSelectAreaByRect');
        objects = params.obj;
        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            this._setIdInObject(obj);
            repositoryMO.addObjectFromServer(obj);
        }
    };

    EditorManager.prototype.receiveIntersectResult = function(params) {
        //console.log('EditorManager.prototype.receiveIntersectResult');
        editorIntersectTest.setResultPoints(params.obj);
    };

    return EditorManager;
})();


