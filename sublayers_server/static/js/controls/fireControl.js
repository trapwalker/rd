var FireControl = (function () {
    function FireControl(options) {
    };

    FireControl.prototype._getSectorByID = function(fireSectorID){
        for (var i = 0; i < this.sectors.length; i++) {
            if (this.sectors[i]._fireSector.uid == fireSectorID)
                return this.sectors[i];
        }
        return null;
    };

    FireControl.prototype.shootSectorByID = function (fireSectorID) {
        // Получить сектор, для которого вызвано событие
        var sector = this._getSectorByID(fireSectorID);

        // уйти в перезарядку
        if (!sector.recharged) {
            // установить sector.recharged в true
            sector.recharged = true;
            sector.SVGPath.setAttribute('class', 'fire-control-sector-recharge');
            // Создание таймера для речарджа
            var self = this;
            var dRadius = 0;
            var rechargeTimer = setInterval(function(){
                dRadius += sector.rechargePart;
                // Получить svg-str для перезаряжающегося сектора
                var pathstr = self._getSVGPathSector(sector._fireSector, dRadius);
                // Установка атрибута d  = перерисовка сектора с изменённым размером
                sector.SVGPath.setAttribute('d', pathstr);
            }, this.options.intervalRecharge);

            // Запустить timeOut речарджа
            setTimeout(function () {
                    // Очистка таймера перерисовки речарджа
                    clearInterval(rechargeTimer);
                    // Снова установить нормальные классы и атрибуты для сектора, теперь он готов к стрельбе
                    sector.recharged = false;
                    sector.SVGPath.setAttribute('class', 'fire-control-sector sublayers-clickable');
                    sector.SVGPath.setAttribute('d', sector.normalPath);
                    if (typeof(sector._cbSectorRecharged) === 'function')
                        sector._cbSectorRecharged(sector._fireSector);
                },
                sector._fireSector.recharge);
            // Вызвать свой коллБэк и передать туда fireSector
            if (typeof(sector._cbSectorShoot) === 'function')
                sector._cbSectorShoot(sector._fireSector);
        }
    };

    // Реализация радара - вынесена сюда, т.к. только тут есть radiusIn и radiusOut
    // Добавление Точки в сектор
    FireControl.prototype.addCarInSector = function(aSector, relativeRadius, relativeAngle, visibleMode) {

        // Вычислить точку для отрисовки
        var radius = this.radiusIn + ((this.radiusOut - this.radiusIn) * relativeRadius);
        var p = rotateVector(new Point(radius, 0),
                             ((2 * relativeAngle * this.options.halfSectorWidth) / aSector.widthAngle));
        // Нарисовать точку
        var pathSVG = document.createElementNS(this.NS, 'circle');
        // Добавить точку в сектор
        if (visibleMode === 'friend')
            pathSVG.setAttribute('class', 'fire-control-radar-point-friend sublayers-unclickable');
        if (visibleMode === 'party')
            pathSVG.setAttribute('class', 'fire-control-radar-point-party sublayers-unclickable');
        if (!visibleMode)
            pathSVG.setAttribute('class', 'fire-control-radar-point sublayers-unclickable');
        pathSVG.setAttribute('r', 2);
        pathSVG.setAttribute('cx', p.x);
        pathSVG.setAttribute('cy', p.y);
        this._getSectorByID(aSector.uid).SVGGroup.appendChild(pathSVG);
        return pathSVG;
    };

    // Обновление точки в секторе
    FireControl.prototype.updateCarInSector = function(sector, pathSVG, relativeRadius, relativeAngle) {
        // Вычислить точку для отрисовки
        var radius = this.radiusIn + ((this.radiusOut - this.radiusIn) * relativeRadius);
        var p = rotateVector(new Point(radius, 0), ((2*relativeAngle * this.options.halfSectorWidth) / sector.widthAngle));
        // Обновить центр точки точку
        pathSVG.setAttribute('cx', p.x);
        pathSVG.setAttribute('cy', p.y);
        return pathSVG;
    };

    // Удаление точки из секутора
    FireControl.prototype.deleteCarInSector = function(pathSVG) {
        $(pathSVG).remove();
        return null;
    };

    return FireControl;
})();