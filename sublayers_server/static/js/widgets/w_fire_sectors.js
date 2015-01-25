var ConstPointsOnSegment = 10;

var WFireSectors = (function (_super) {
    __extends(WFireSectors, _super);

    function WFireSectors(car, sectors) {
        _super.call(this, [car]);
        this.car = car;
        this.countPoints = ConstPointsOnSegment;
        this.sectors = [];
        // Сделать addSector для каждого элемента массива options.sectors
        if (sectors)
            for (var i = 0; i < sectors.length; i++) {
                this._addSector(sectors[i]);
            }
        this.change(clock.getCurrentTime());
    }

    WFireSectors.prototype._addSector = function (fireSector) {
        var angle;
        var sector = {};
        var tempWidthAll = fireSector.width / 2;

        var vertVOut = new Point(fireSector.radius, 0);
        var vertVIn = new Point(25, 0);
        var dAngle = fireSector.width / (this.countPoints - 1);
        sector._points = [];
        //добавление точек сектора
        //внешнии точки
        for (var i = 0; i < this.countPoints; i++)
            sector._points.push(rotateVector(vertVOut, - fireSector.width / 2 + i * dAngle));
        //внутренние точки
        for (var i = 0; i < this.countPoints; i++)
            sector._points.push(rotateVector(vertVIn, fireSector.width / 2 - i * dAngle));
        sector._fireSector = fireSector;
        this.sectors.push(sector);
    };

    WFireSectors.prototype._drawSectors = function (position, direction) {
        //console.log('WFireSectors.prototype._drawSectors', position, direction);
        this.sectors.forEach(function (sector) {
            var tempCenter = this.center;
            var tempAngle = this.angle + sector._fireSector.fi;
            var tempPointsAll = [];
            var tempPoint;
            for(var i = 0; i < sector._points.length; i++) {
                tempPoint = summVector(tempCenter, rotateVector(sector._points[i], tempAngle));
                tempPointsAll.push(map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom()));
            }
            if (map.hasLayer(sector.polygon)) {
                sector.polygon.setLatLngs(tempPointsAll);
                /*
                if (sector.shootState > 0) { // Если был выстрел, т.е. сейчас жёлтый(оранжевый) сектор
                    sector.shootState--;
                    sector.polygon.setStyle({
                        fillOpacity: (this.shootDelay - sector.shootState) / this.shootDelay * 0.8
                    });

                    if(sector.shootState == 0) { // "Анимация" выстрела прошла, началась перезарядка
                        // Сделать серым - т.е. сектор перезаряжается
                        sector.polygon.setStyle({
                            fillColor: '#666666',
                            fillOpacity: 0.4
                        });
                    }
                }
                */
            }
            else {
                sector.polygon = L.polygon(tempPointsAll, {
                    weight: 0,
                    fillColor: '#32cd32',
                    fillOpacity: 0.2,
                    clickable: false
                });
                map.addLayer(sector.polygon);
            }
        }, {center: position, angle: direction});
    };

    WFireSectors.prototype._clearSectors = function(){
        for(;this.sectors.length > 0;){
            var sector = this.sectors.pop();
            // Удалить сначала с карты
            map.removeLayer(sector.polygon);
            // Удалить присвоенные структуры
            sector._points = null;
            sector._fireSector = null;
            sector.polygon = null;

        }
        this.sectors = [];
    };

    WFireSectors.prototype.change = function(time){
        this._drawSectors(this.car.getCurrentCoord(time), this.car.getCurrentDirection(time));
    };

    WFireSectors.prototype.delFromVisualManager = function () {
        //console.log('WCarMarker.prototype.delFromVisualManager');
        this.car = null;
        this._clearSectors();
        _super.prototype.delFromVisualManager.call(this);
    };

    return WFireSectors;
})(VisualObject);