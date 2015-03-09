/*
 * Виджет стрельбы
 */
var ConstFireControllerSectorWidth = 70;         // Ширина сектора, которая будет отображаться в виджете (в градусах)
var ConstFireControllerSectorDiameter = 150;     // Диаметр виджета (в пикселях)
var ConstFireControllerRadarCircleSpeed = 2;  // Время за которое радиус радарного круга меняется от 0% до 100% (с)

var WFireController = (function (_super) {
    __extends(WFireController, _super);

    function WFireController(car) {
        _super.call(this, [car]);
        this.car = car;
        this.cars = [];
        this.autoShoot = false;
        this.sides = [];
        this.visible = true;
        this.combatState = true;
        this.rotateAngle = 0;
        this.diameter = ConstFireControllerSectorDiameter;
        this.halfSectorWidth = gradToRad(ConstFireControllerSectorWidth / 2.);
        this.radiusOut = this.diameter / 2 - 1;
        this.radiusIn = this.diameter / 6 + 5;
        this._difOutIn = this.radiusOut - this.radiusIn;
        this.radiusAll = this.diameter / 6;
        this.center = {
            x: this.diameter / 2,
            y: this.diameter / 2
        };

        var mainParent = $('#fireControlArea');
        mainParent.addClass('fire-control-parent');
        mainParent.append('<div id="fireControlAreaRumble"></div>');
        var parent = $('#fireControlAreaRumble');

        // Добавление верхнего дива
        this.fCT = $("<div id='fireControlTop'></div>");
        parent.append(this.fCT);

        // Добавление нижнего дива
        this.fCB = $("<div id='fireControlBottom'></div>");
        parent.append(this.fCB);

        // Добавление дива с кнопкой
        this.fCSB = $("<div id='fireControlSlideButton' class='fire-control-slide-button-show sublayers-clickable'></div>");
        this.fCB.append(this.fCSB);
        this.fCSB.on('click', {self: this}, this.changeCombatState);

        // Создание дива под SVG полотно
        this.dFSVG = $("<div id='divForSVG'></div>");
        this.fCT.append(this.dFSVG);

        // Создание SVG полотна
        this.NS = 'http://www.w3.org/2000/svg';
        this.SVG = document.createElementNS(this.NS, 'svg');
        //this.SVG.setAttribute('class', 'fire-control-svg');
        this.SVG.setAttribute('height', this.diameter);
        this.SVG.setAttribute('width', this.diameter);
        this.SVG.innerHTML = '<defs>' +
                             '   <radialGradient id="fcRadarCircleGradient" r="52%" spreadMethod="pad">' +
                            '        <stop offset="0.0" stop-color="#00FF00" stop-opacity="0"></stop>' +
                             '       <stop offset="0.8" stop-color="#00FF00" stop-opacity="0"></stop>' +
                             '       <stop offset="1.0" stop-color="#00FF00" stop-opacity="0.2"></stop>' +
                             '   </radialGradient>' +
                             '</defs>';
        this.dFSVG.append(this.SVG);

        // Создание unclickable фона для контроллера (прозрачного круга)
        this.backgroundCircle = document.createElementNS(this.NS, 'circle');
        this.backgroundCircle.setAttribute('class', 'fire-control-background sublayers-unclickable');
        this.backgroundCircle.setAttribute('r', this.radiusOut);
        this.backgroundCircle.setAttribute('cx', this.center.x);
        this.backgroundCircle.setAttribute('cy', this.center.y);
        this.SVG.appendChild(this.backgroundCircle);
        $(this.backgroundCircle).on('click', function(){
            document.getElementById('map').focus();
        });

        // Кнопка All
        this.allFire = document.createElementNS(this.NS, 'circle');
        this.allFire.setAttribute('class', 'fire-control-all sublayers-clickable');
        this.allFire.setAttribute('r', this.radiusAll);
        this.allFire.setAttribute('cx', this.center.x);
        this.allFire.setAttribute('cy', this.center.y);
        this.SVG.appendChild(this.allFire);
        $(this.allFire).on('click', {self: this}, this.changeAutoShootingEnable);

        // Создание общей группы для трансформации секторов
        this.SVGSectorsGroup = document.createElementNS(this.NS, 'g');
        this.SVG.appendChild(this.SVGSectorsGroup);

        // Создание SVG для нормального сектора
        this.normalPath = this._getSVGPathSide(1.);
        this._initSides();

        // Создание радарного круга
        this._radarCircleLastTime = 0;
        this._radarCircleRelRadius = 0;                                                            // относительный радиус (от 0 .. 1)
        this._radarCircleAbsRadius = this.radiusIn + this._difOutIn * this._radarCircleRelRadius;  // абсолютный радиус (px)
        this.SVGRadarCirle = document.createElementNS(this.NS, 'circle');
        this.SVGRadarCirle.setAttribute('class', 'fire-control-radar-circle sublayers-unclickable');
        this.SVGRadarCirle.setAttribute('r', this._radarCircleAbsRadius);
        this.SVGRadarCirle.setAttribute('cx', this.center.x);
        this.SVGRadarCirle.setAttribute('cy', this.center.y);
        this.SVGRadarCirle.setAttribute('fill', 'url(#fcRadarCircleGradient)');
        this.SVG.appendChild(this.SVGRadarCirle);
        this.change();
        // todo: сделать это правильно
        timeManager.addTimerEvent(this, 'change');
    }

    WFireController.prototype.changeCombatState = function(event){
        var self = event.data.self;
        self.combatState = !self.combatState;
        self.setVisible(self.combatState);
    };

    WFireController.prototype.changeVisible = function (event) {
        //console.log('WFireController.prototype.changeVisible');
        var self = event.data.self;
        self.fCT.slideToggle("slow", function () {
            if (self.visible) {
                self.visible = false;
                self.SVG.setAttribute('display', 'none');
                self.fCSB.removeClass('fire-control-slide-button-show');
                self.fCSB.addClass('fire-control-slide-button-hide');
                self._setAutoShootingEnable(false);
            }
            else {
                self.visible = true;
                self.fCSB.removeClass('fire-control-slide-button-hide');
                self.fCSB.addClass('fire-control-slide-button-show');
                self.SVG.setAttribute('display', 'block');
                self._setAutoShootingEnable(self.autoShoot);
            }
        });
        document.getElementById('map').focus();
        mapManager.widget_fire_radial_grid.setVisible(!self.visible);
        mapManager.widget_fire_sectors.setVisible(!self.visible);
    };

    WFireController.prototype.setVisible = function (aVisible) {
        if (this.visible !== aVisible) {
            this.changeVisible({data: {self: this}})
        }
    };

    WFireController.prototype.getVisible = function () {
        return this.visible;
    };

    WFireController.prototype._setAutoShootingEnable = function (enable) {
        //console.log('WFireController.prototype._setAutoShootingEnable', enable);
        clientManager.sendFireAutoEnable('front', enable);
        clientManager.sendFireAutoEnable('back', enable);
        clientManager.sendFireAutoEnable('right', enable);
        clientManager.sendFireAutoEnable('left', enable);
    };

    WFireController.prototype.changeAutoShootingEnable = function (event) {
        //console.log('WFireController.prototype.changeAutoShootingEnable');
        var self = event.data.self;
        if (self.autoShoot) {
            //console.log('WFireController.prototype.changeAutoShootingEnable', 'OFF');
            self.autoShoot = false;
            self._setAutoShootingEnable(false);
            //self.allFire.removeClass('fire-control-all-active');
            self.allFire.setAttribute('class', 'fire-control-all sublayers-clickable');
        }
        else {
            //console.log('WFireController.prototype.changeAutoShootingEnable', 'ON');
            self.autoShoot = true;
            self._setAutoShootingEnable(true);
            self.allFire.setAttribute('class', 'fire-control-all sublayers-clickable fire-control-all-active');
        }
        document.getElementById('map').focus();
    };

    WFireController.prototype._getSVGPathSide = function (radiusPath, isDischarge, isAuto) {
        var tempWidth = this.halfSectorWidth;
        var radiusOut = this.radiusIn + (this._difOutIn * radiusPath);
        var vertVOut = new Point(radiusOut, 0);
        var vertVIn = new Point(this.radiusIn, 0);
        var rightVOut = rotateVector(vertVOut, tempWidth);
        var leftVOut = rotateVector(vertVOut, -tempWidth);
        var rightVIn = rotateVector(vertVIn, tempWidth);
        var leftVIn = rotateVector(vertVIn, -tempWidth);
        return 'M' + rightVIn.x + ',' + rightVIn.y +
               'L' + rightVOut.x + ',' + rightVOut.y +
               'A' + radiusOut + ',' + radiusOut + ', 0, 0, 0, ' + leftVOut.x + ',' + leftVOut.y +
               'L' + leftVIn.x + ',' + leftVIn.y +
               'A' + this.radiusIn + ',' + this.radiusIn + ', 0, 0, 1, ' + rightVIn.x + ',' + rightVIn.y +
               'Z';
    };

    WFireController.prototype._initSides = function () {
        this._clearSides();
        var sides = this.car.fireSidesMng.getAllSides(true);
        for (var i = 0; i < sides.length; i++) {
            // Создание объекта в котором будет вся информация о секторе
            var side = {};

            // Создание и добавление группы для сектора
            side.SVGGroup = document.createElementNS(this.NS, "g");
            this.SVGSectorsGroup.appendChild(side.SVGGroup);
            side.SVGGroup.setAttribute('transform', 'translate(' + this.center.x + ', ' + this.center.y + ') ' +
                                       'rotate(' + radToGrad(sides[i].direction) + ')');

            // Рисование серого статического сектора
            side.SVGPathShadow = document.createElementNS(this.NS, "path");
            side.SVGPathShadow.setAttribute('class', 'fire-control-sector-shadow');
            side.SVGPathShadow.setAttribute('d', this.normalPath);
            side.SVGGroup.appendChild(side.SVGPathShadow);

            // Рисование самого сектора
            side.SVGPath = document.createElementNS(this.NS, "path");
            if (sides[i].isDischarge && sides[i].isAuto) {
                side.SVGPath.setAttribute('class', 'fire-control-sector-discharge-auto sublayers-clickable');
            }
            else {
                if (sides[i].isDischarge) side.SVGPath.setAttribute('class', 'fire-control-sector-discharge sublayers-clickable');
                if (sides[i].isAuto) side.SVGPath.setAttribute('class', 'fire-control-sector-auto');
            }
            side.SVGPath.setAttribute('d', this._getSVGPathSide(1., true, true));
            side.SVGGroup.appendChild(side.SVGPath);

            // Добавить в сектор ссылку на side
            side.side = sides[i];

            // Устанавливаем флаг речарджа сектора в false
            side.recharged = false;

            // Вешаем на сектор обработчик клика данного сектора
            $(side.SVGPath).on('click', {side: side}, this.shootBySide);

            // Помещаем сектор в массив секторов данного объекта
            this.sides.push(side);
        }
    };

    WFireController.prototype._clearSides = function () {
        for (; this.sides.length > 0;) {
            var side = this.sides.pop();
            $(sides.SVGPath).off('click', this._fireSectorEvent);
            $(sides.SVGPath).remove();
            $(sides.SVGPathShadow).remove();
            $(sides.SVGGroup).remove();
        }
        this.sides = [];
    };

    WFireController.prototype._setRotation = function (angle) {
        if (Math.abs(this.rotateAngle - angle) < 0.01) return;
        this.rotateAngle = angle;
        if (this.visible)
            this.SVGSectorsGroup.setAttribute('transform', 'rotate(' + radToGrad(angle) + ', ' +
                                              this.center.x + ', ' + this.center.y + ')');
    };

    WFireController.prototype._addCarPoint = function(side, car) {
        //console.log('WFireController.prototype._addCarPoint');
        car._wfc_side = side;
        // Вычислить точку для отрисовки
        var relativeRadius = car.distance / side.side.sideRadius;
        var relativeAngle = - car.fi;
        var radius = this.radiusIn + (this._difOutIn * relativeRadius);
        var p = rotateVector(new Point(radius, 0), ((2 * relativeAngle * this.halfSectorWidth) / side.side.sideWidth));
        // Нарисовать точку
        car.svg = document.createElementNS(this.NS, 'circle');
        // Добавить точку в сектор
        car.svg.setAttribute('class', 'fire-control-radar-point sublayers-unclickable');
        car.svg.setAttribute('cx', p.x);
        car.svg.setAttribute('cy', p.y);
        var temp = this._radarPointOpacityByRadarCircle(radius);
        car.svg.setAttribute('stroke-opacity', temp);
        car.svg.setAttribute('r', 1 + 2 * temp);
        side.SVGGroup.appendChild(car.svg);
    };

    WFireController.prototype._updateCarPoint = function(side, car) {
        //console.log('WFireController.prototype._updateCarPoint');
        // Вычислить точку для отрисовки
        var relativeRadius = car.distance / side.side.sideRadius;
        var relativeAngle = - car.fi;
        var radius = this.radiusIn + (this._difOutIn * relativeRadius);
        var p = rotateVector(new Point(radius, 0), ((2 * relativeAngle * this.halfSectorWidth) / side.side.sideWidth));
        // Обновить центр точки точку
        car.svg.setAttribute('cx', p.x);
        car.svg.setAttribute('cy', p.y);
        var temp = this._radarPointOpacityByRadarCircle(radius);
        car.svg.setAttribute('stroke-opacity', temp);
        car.svg.setAttribute('r', 1 + 2 * temp);
    };

    WFireController.prototype._deleteCarPoint = function(car) {
        //console.log('WFireController.prototype._deleteCarPoint');
        if (car.svg)
            $(car.svg).remove();
        car.svg = null;
    };

    WFireController.prototype._carInSide = function(car, side, uCarPos, uCarDir) {
        car.fi = getDiffAngle((uCarDir + side.side.direction), car.angle);
        var inSide = false;
        for (var i = 0; i < side.side.sectors.length; i++) {
            var sector = side.side.sectors[i];
            inSide = (car.distance <= sector.radius) && (Math.abs(car.fi) <= (sector.width / 2.));
            if (inSide) break;
        }
        return inSide;
    };

    WFireController.prototype._radarPointOpacityByRadarCircle = function(pointRadius) {
        if (pointRadius > this._radarCircleAbsRadius) return (pointRadius - this._radarCircleAbsRadius) / this._difOutIn;
        return ((pointRadius - this.radiusIn) / this._difOutIn) +
                ((this.radiusOut - this._radarCircleAbsRadius) / this._difOutIn);
    };

    WFireController.prototype._updateRadarCircle = function(time) {
        //console.log('WFireController.prototype._updateRadarCircle');
        var difTime = time - this._radarCircleLastTime;
        var newRelRadius = this._radarCircleRelRadius + (difTime / ConstFireControllerRadarCircleSpeed) * 1.0
        var newAbsRadius = this.radiusIn + this._difOutIn * newRelRadius;
        // Обновить круг если радиус изменился больше чем на 1px
        if ((newAbsRadius - this._radarCircleAbsRadius) > 1) {
            if (newRelRadius > 1) {
                newRelRadius = 0;
                newAbsRadius = this.radiusIn;
            }
            this._radarCircleAbsRadius = newAbsRadius;
            this._radarCircleRelRadius = newRelRadius;
            this._radarCircleLastTime = time;
            this.SVGRadarCirle.setAttribute('r', this._radarCircleAbsRadius);
        }
    };

    WFireController.prototype.change = function () {
        //console.log('WFireController.prototype.change');
        var time = clock.getCurrentTime();

        // Вращаем виджет
        var userCarDirection = this.car.getCurrentDirection(time);
        this._setRotation(userCarDirection);

        // Анимация перезарядки
        for (var i = 0; i < this.sides.length; i++) {
            var side = this.sides[i];
            var sideState = side.side.getRechargeState(time);
            if (sideState.prc == 1)
                side.SVGPath.setAttribute('d', this.normalPath);
            else {
                var pathstr = this._getSVGPathSide(sideState.prc);
                side.SVGPath.setAttribute('d', pathstr);
            }
        }

        // Анимация круга радара
        this._updateRadarCircle(time);

        // Анимация точек радара
        var userCarPosition = this.car.getCurrentCoord(time);
        for (var i = 0; i < this.cars.length; i++) {
            var car = this.cars[i];
            var carPosition = car.mobj.getCurrentCoord(time);
            var distance = distancePoints(userCarPosition, carPosition);
            var angle = angleVectorRadCCW(subVector(carPosition, userCarPosition));
            car.angle = angle;
            car.distance = distance;
            if (car.svg)
                if (this._carInSide(car, car._wfc_side, userCarPosition, userCarDirection))
                    this._updateCarPoint(car._wfc_side, car);
                else
                    this._deleteCarPoint(car);
            for (var j = 0; (j < this.sides.length) && (!car.svg); j++) {
                var side = this.sides[j];
                if (this._carInSide(car, side, userCarPosition, userCarDirection))
                    this._addCarPoint(side, car);
            }
        }
    };

    WFireController.prototype.shootBySide = function(event) {
        clientManager.sendFireDischarge(event.data.side.side.sideStr);
        document.getElementById('map').focus();
    };

    WFireController.prototype.addModelObject = function (mobj) {
        //console.log('WFireController.prototype.addModelObject');
        if (_super.prototype.addModelObject.call(this, mobj)) {
            var car = {
                mobj: mobj,
                svg: null,
                distance: 0,
                angle: 0,
                fi: 0
            };
            this.cars.push(car);
            this.change();
        }
    };

    WFireController.prototype.delModelObject = function (mobj) {
        //console.log('WFireController.prototype.delModelObject');
        var isSelf = mobj == this.car;
        if (_super.prototype.delModelObject.call(this, mobj) && !isSelf) {
            var i = 0;
            while ((i < this.cars.length) && (this.cars[i].mobj != mobj)) i++;
            if (i >= this._model_objects.length) return false;
            this._deleteCarPoint(this.cars[i]);
            this.cars.splice(i, 1);
        }
};

    WFireController.prototype.delFromVisualManager = function () {
        //console.log('WFireController.prototype.delFromVisualManager');
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WFireController;
}) (VisualObject);

var wFireController;