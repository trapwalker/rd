/*
* Виджетпредназначен для рисования факта автоматической стрельбы у машинки
* Виджет - потому что он должен быть подписан на ту машинку, для которой создан
* */

var WAutoFireOnShooter = (function (_super) {
    __extends(WAutoFireOnShooter, _super);

    function WAutoFireOnShooter(car, side){
        _super.call(this, [car]);
        this.car = car;
        this.marker = null;
        this.direction = car.fireSidesMng.sides[side].direction;
        this.icons = [];
        this.currentIcon = null;
        this.summ_duration = 0.0;
        this.time_start = null;
        this._createMarker();
        this.change(clock.getCurrentTime());
    }

    WAutoFireOnShooter.prototype._createMarker = function(){
        var marker;
        marker = L.rotatedMarker([0, 0]);

        var myIcon1 = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [100, 100],
            iconAnchor: [50, 50],
            html: '<svg height="100px" width="100px"'+
            'xmlns="http://www.w3.org/2000/svg" version="1.1"'+
            'xmlns:xlink="http://www.w3.org/1999/xlink">' +
            '<path d="M75 30 A 35 35 0 0 1 75 70" stroke="red" stroke-width="8" fill="transparent"' +
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
            '<path d="M75 30 A 35 35 0 0 1 75 70" stroke="white" stroke-width="8" fill="transparent"' +
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

    WAutoFireOnShooter.prototype._getIconByTime = function(time){
        var t = (time - this.time_start + 10.) % this.duration;
        for(var i = 0; i < this.icons.length; i++)
            if (t < this.icons[i].dur_before)
                return this.icons[i];
        return this.icons[this.icons.length - 1];
    };

    WAutoFireOnShooter.prototype._setIconByTime = function(time){
        var icon = this._getIconByTime(time);
        if (icon != this.currentIcon){
            this.currentIcon = icon;
            this.marker.setIcon(icon.icon);
        }
    };



    WAutoFireOnShooter.prototype.change = function(t){
        // todo: продолжать стрелять чтобы не случиолсь !
        //console.log('WAutoFireOnShooter.prototype.change');
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

    WAutoFireOnShooter.prototype.off = function(){
        this.delFromVisualManager();
    }

    WAutoFireOnShooter.prototype.delFromVisualManager = function () {
        //console.log('WAutoFireOnShooter.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        _super.prototype.delFromVisualManager.call(this);
    };



    return WAutoFireOnShooter
})(VisualObject);
