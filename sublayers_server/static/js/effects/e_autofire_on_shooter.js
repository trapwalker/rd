/*
* Эффект предназначен для рисования факта автоматической стрельбы у машинки
* */

var EAutoFireOnShooter = (function () {

    function EAutoFireOnShooter(car, side){
        this.car = car;
        this.marker = null;
        // todo: сделать вычисление direction правильным способом!
        this.direction = user.userCar.fireSidesMng.sides[side].direction;
        this.icons = [];
        this.currentIcon = null;
        this.duration = 0.0;
        this.time_start = null;

    }

    EAutoFireOnShooter.prototype._createMarker = function(){
        var marker;
        marker = L.rotatedMarker([0, 0]);

        var myIcon1 = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [100, 100],
            iconAnchor: [50, 50],
            html: '<svg height="100px" width="100px"'+
            'xmlns="http://www.w3.org/2000/svg" version="1.1"'+
            'xmlns:xlink="http://www.w3.org/1999/xlink">' +
            '<path d="M75 30 A 35 35 0 0 1 75 70" stroke="#0f0" stroke-width="4" fill="transparent"' +
            '/path>'+
            '</svg>'
        });

        var myIcon2 = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [100, 100],
            iconAnchor: [50, 50],
            html: '<svg height="100px" width="100px"'+
            'xmlns="http://www.w3.org/2000/svg" version="1.1"'+
            'xmlns:xlink="http://www.w3.org/1999/xlink">' +
            '<path d="M75 30 A 35 35 0 0 1 75 70" stroke="#0f0" stroke-width="4" opacity="0.5" fill="transparent"' +
            '/path>'+
            '</svg>'
        });

        var myIcon3 = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [100, 100],
            iconAnchor: [50, 50],
            html: '<svg height="100px" width="100px"'+
            'xmlns="http://www.w3.org/2000/svg" version="1.1"'+
            'xmlns:xlink="http://www.w3.org/1999/xlink">' +
            '</svg>'
        });

        this.icons.push({
            icon: myIcon1,
            dur_before : 0.2
        });
        this.icons.push({
            icon: myIcon2,
            dur_before: 0.4
        });
        this.icons.push({
            icon: myIcon3,
            dur_before: 0.6
        });

        this.duration = this.icons[this.icons.length - 1].dur_before;

        this.marker = marker;
        this.time_start = clock.getCurrentTime();
        this._setIconByTime(this.time_start);
        marker.addTo(map);


    };

    EAutoFireOnShooter.prototype._getIconByTime = function(time){
        var t = (time - this.time_start + 10.) % this.duration;
        for(var i = 0; i < this.icons.length; i++)
            if (t < this.icons[i].dur_before)
                return this.icons[i];
        return this.icons[this.icons.length - 1];
    };

    EAutoFireOnShooter.prototype._setIconByTime = function(time){
        var icon = this._getIconByTime(time);
        if (icon != this.currentIcon){
            this.currentIcon = icon;
            this.marker.setIcon(icon.icon);
        }
    };


    EAutoFireOnShooter.prototype.change = function(t){
        // todo: продолжать стрелять чтобы не случиолсь !
        //console.log('EAutoFireOnShooter.prototype.change');
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        // Установка угла для поворота иконки маркера
        this.marker.options.angle = this.car.getCurrentDirection(time) + this.direction;
        // установка правильной иконки
        this._setIconByTime(time);
        // Установка новых координат маркера);
        this.marker.setLatLng(tempLatLng);
    };

    EAutoFireOnShooter.prototype.start = function () {
        this._createMarker();
        timeManager.addTimerEvent(this, 'change');
        return this
    };

    EAutoFireOnShooter.prototype.finish = function () {
        timeManager.delTimerEvent(this, 'change');
        map.removeLayer(this.marker);
    };


    return EAutoFireOnShooter
})();
