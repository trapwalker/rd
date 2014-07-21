// Класс очередь
var SubLayersQueue = (function () {
    function SubLayersQueue() {
        this._queue = [];
        this._queueLength = 30;
    }

    SubLayersQueue.prototype.addPoint = function (aPoint) {
        this._queue.unshift(aPoint); // добавить точку в начало массива
        if (this._queue.length > this._queueLength)
            this._queue.pop(); // убрать послдений элемент, если больше 20.
    }

    SubLayersQueue.prototype.getPointA = function () {
        if (this._queue.length >= this._queueLength)
            return this._queue[(1 * this._queueLength / 3).toFixed(0)];
    }

    SubLayersQueue.prototype.getPointB = function () {
        if (this._queue.length >= this._queueLength)
            return this._queue[(2 * this._queueLength / 3).toFixed(0)];
    }

    SubLayersQueue.prototype.getPointC = function () {
        if (this._queue.length >= this._queueLength)
            return this._queue[(3 * this._queueLength / 3).toFixed(0) - 1];
    }

    SubLayersQueue.prototype.getPoints = function () {
        if (this._queue.length >= this._queueLength) {
            var points = [];
            points[0] = this.getPointA();
            points[1] = this.getPointB();
            points[2] = this.getPointC();
            return points;
        }
    }

    return SubLayersQueue;
})();

// Шлейф от машинки.
// Передавать в качетсве точек только latlng - точки !
// Метод setActive нужно повесить в кол-бек на изменение зума
var CarTail = (function () {
    function CarTail(options) {
        this.options = {
            aStartPoint: null,
            _map: null,
            _enable: false
        };

        if(options){
            if(options.aStartPoint) this.options.aStartPoint = options.aStartPoint;
            if(options._map) this.options._map = options._map;
            if(options._enable) this.options._enable = options._enable;
        }

        // Создание очереди
        this._tail = new SubLayersQueue();
        // заполнение очереди (изначально одинаковыми значениями)
        for (var i = 0; i < this._tail._queueLength; i++)
            this._tail.addPoint(this.options.aStartPoint);

        // Создание сразу трёх маркеров
        this._tailPath1 = L.circleMarker([0, 0], {color: '#11FF11'}).setRadius(5);
        this._tailPath2 = L.circleMarker([0, 0], {color: '#11FF11'}).setRadius(3.5);
        this._tailPath3 = L.circleMarker([0, 0], {color: '#11FF11'}).setRadius(2);

        // Добавить или не доавбить маркеры на карту
        this.setActive(this.options._enable);
    }

    CarTail.prototype.drawTail = function (newPoint) {
        // пересчёт новой точки
        this._tail.addPoint(newPoint);
        if (this.options._enable) {
            // перерисовка трёх маркеров
            var tempPoints = this._tail.getPoints();
            this._tailPath1.setLatLng(tempPoints[0]);
            this._tailPath2.setLatLng(tempPoints[1]);
            this._tailPath3.setLatLng(tempPoints[2]);
        }
    }

    CarTail.prototype.setActive = function(enable) {
        this.options._enable = enable;
        if (enable) {
            var tempPoints = this._tail.getPoints();
            this._tailPath1.setLatLng(tempPoints[0]).addTo(this.options._map);
            this._tailPath2.setLatLng(tempPoints[1]).addTo(this.options._map);
            this._tailPath3.setLatLng(tempPoints[2]).addTo(this.options._map);
        }
        else {
            this.options._map.removeLayer(this._tailPath1);
            this.options._map.removeLayer(this._tailPath2);
            this.options._map.removeLayer(this._tailPath3);
        }
    }

    return CarTail;
})();


// Класс нужен для централизованного рисования машинки пользователя и сопутствующих объектов
var UserCarMarker = (function () {
    function UserCarMarker(options) {
        this.options = {
            position: null,
            tailEnable: false,
            _map: null,
            radiusView: 0,
            carID: null
        }

        if(options){
            if(options.position) this.options.position = options.position;
            if(options.tailEnable) this.options.tailEnable = options.tailEnable;
            if(options._map) this.options._map = options._map;
            if(options.carID) this.options.carID = options.carID;
            if(options.radiusView) this.options.radiusView = options.radiusView;
        }

        // Создание Маркера
        this.marker = L.rotatedMarker(this.options.position).addTo(this.options._map);
        this.marker.setIcon(L.icon({
            iconUrl: 'img/car_user.png',
            iconSize: [35, 35]
        }));
        this.marker.carID = this.options.carID;

        // Повесить PopUp и ивент на него
        this.marker.on('popupopen', onMarkerPopupOpen);
        this.marker.bindPopup('popUp');

        // Создание шлейфа
        this.tail = new CarTail({
            aStartPoint: this.options.position,
            _map: this.options._map,
            _enable: this.options.tailEnable
        });

        // Создание круга обзора
        this.circleView = L.circle(this.options.position, this.options.radiusView,
            {
                color: '#11FF11',
                opacity: 0.3
            }
        ).addTo(this.options._map);
        // Создание секторов стрельбы

    }

    UserCarMarker.prototype.draw = function(aNewPoint, aNewAngle) {
        // Перерисовка маркера
        // Установка угла в для поворота иконки маркера (в градусах)
        this.marker.options.angle = aNewAngle;
        // Установка новых координат маркера
        this.marker.setLatLng(aNewPoint);

        // Перерисовка шлейфа
        this.tail.drawTail(aNewPoint); // только на максимальных приближениях будет рисоваться хвост

        // Перерисовка круга обзора
        this.circleView.setLatLng(aNewPoint);

        // Перерисовка секторов стрельбы


    }

    return UserCarMarker;
})();


