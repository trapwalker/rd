var RPCCallList = ( function () {
    function RPCCallList() {
        this.calls = [];
        this._generator = 0;
    }

    RPCCallList.prototype.getID = function() {
        this._generator++;
        return this._generator;
    }

    RPCCallList.prototype.add = function(aCall) {
        this.calls[aCall.rpc_call_id] = aCall;
    }

    RPCCallList.prototype.execute = function (aCallID) {
        if(this.calls[aCallID]) {
            //this.calls[aCallID]=null;
            delete this.calls[aCallID];
        }
    }

    return RPCCallList;
})();


// Шлейф от машинки. Сначала класс очередь, а затем непосредственно хвост
var SubLayersQueue = ( function () {
    function SubLayersQueue() {
        this._queue = [];
        this._queueLength = 30;
    }

    SubLayersQueue.prototype.addPoint = function(aPoint) {
        this._queue.unshift(aPoint); // добавить точку в начало массива
        if(this._queue.length > this._queueLength)
            this._queue.pop(); // убрать послдений элемент, если больше 20.
    }

    SubLayersQueue.prototype.getPointA = function () {
        if(this._queue.length >= this._queueLength)
            return this._queue[(1*this._queueLength/3).toFixed(0)];
    }

    SubLayersQueue.prototype.getPointB = function () {
        if(this._queue.length >= this._queueLength)
            return this._queue[(2*this._queueLength/3).toFixed(0)];
    }

    SubLayersQueue.prototype.getPointC = function () {
        if(this._queue.length >= this._queueLength)
            return this._queue[(3*this._queueLength/3).toFixed(0)-1];
    }

    SubLayersQueue.prototype.getPoints = function () {
        if(this._queue.length >= this._queueLength){
            var points = [];
            points[0] = this.getPointA();
            points[1] = this.getPointB();
            points[2] = this.getPointC();
            return points;
        }
    }

    return SubLayersQueue;
})();

var CarTail = ( function () {
    function CarTail(aCar, aMap, aClock) {
        this._car = aCar;
        this._tail = new SubLayersQueue();
        this._map = aMap;
        this._clock = aClock;
        // заполнение очереди (изначально одинаковыми значениями)
        var tempPoint = this._car.getCurrentCoord(this._clock.getCurrentTime());
        for(var i=0; i< this._tail._queueLength; i++) {
            this._tail.addPoint(tempPoint);
        }
        // Создание сразу трёх маркеров
        this._tailPath1 = L.circleMarker([0, 0], {color: '#11FF11'}).setRadius(5).addTo(this._map);
        this._tailPath2 = L.circleMarker([0, 0], {color: '#11FF11'}).setRadius(3.5).addTo(this._map);
        this._tailPath3 = L.circleMarker([0, 0], {color: '#11FF11'}).setRadius(2).addTo(this._map);
    }

    CarTail.prototype.drawTail = function(needDraw) {
        // пересчёт новой точки
        this._tail.addPoint(this._car.getCurrentCoord(this._clock.getCurrentTime()));
        if(needDraw){
            // перерисовка трёх маркеров
            var tempPoints = this._tail.getPoints();
            // Переделать и жёстко привязать к зуму!
            if (this._map.hasLayer(this._tailPath1)) {
                this._tailPath1.setLatLng(this._map.unproject([tempPoints[0].x, tempPoints[0].y], 16));
            }
            else {
                this._tailPath1.setLatLng(this._map.unproject([tempPoints[0].x, tempPoints[0].y], 16)).addTo(this._map);
            }

            if (this._map.hasLayer(this._tailPath2)) {
                this._tailPath2.setLatLng(this._map.unproject([tempPoints[1].x, tempPoints[1].y], 16));
            }
            else {
                this._tailPath2.setLatLng(this._map.unproject([tempPoints[1].x, tempPoints[1].y], 16)).addTo(this._map);
            }

            if (this._map.hasLayer(this._tailPath3)) {
                this._tailPath3.setLatLng(this._map.unproject([tempPoints[2].x, tempPoints[2].y], 16));
            }
            else {
                this._tailPath3.setLatLng(this._map.unproject([tempPoints[2].x, tempPoints[2].y], 16)).addTo(this._map);
            }

        }
        else {
            this._map.removeLayer(this._tailPath1);
            this._map.removeLayer(this._tailPath2);
            this._map.removeLayer(this._tailPath3);
        }

    }

    return CarTail;
})();