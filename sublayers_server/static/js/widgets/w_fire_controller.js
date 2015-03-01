/*
 * Виджет стрельбы
 */
var ConstSectorWidth = 70;     // Ширина сектора, которая будет отображаться в виджете (в градусах)
var ConstSectorDiameter = 150; // Диаметр виджета (в пикселях)

var WFireController = (function (_super) {
    __extends(WFireController, _super);

    function WFireController(car) {
        _super.call(this, [car]);
        this.car = car;
        this.cars = [];
        this.autoShoot = false;
        this.sides = [];
        this.visible = true;
        this.rotateAngle = 0;
        this.diameter = ConstSectorDiameter;
        this.halfSectorWidth = gradToRad(ConstSectorWidth / 2.);
        this.radiusOut = this.diameter / 2 - 1;
        this.radiusIn = this.diameter / 6 + 5;
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
        this.fCSB.on('click', {self: this}, this.changeVisible);

        // Создание дива под SVG полотно
        this.dFSVG = $("<div id='divForSVG'></div>");
        this.fCT.append(this.dFSVG);

        // Создание SVG полотна
        this.NS = 'http://www.w3.org/2000/svg';
        this.SVG = document.createElementNS(this.NS, 'svg');
        //this.SVG.setAttribute('class', 'fire-control-svg');
        this.SVG.setAttribute('height', this.diameter);
        this.SVG.setAttribute('width', this.diameter);
        this.dFSVG.append(this.SVG);

        // Создание unclickable фона для контроллера (прозрачного круга)
        this.backgroundCircle = document.createElementNS(this.NS, 'circle');
        this.backgroundCircle.setAttribute('class', 'fire-control-background sublayers-unclickable');
        this.backgroundCircle.setAttribute('r', this.radiusOut);
        this.backgroundCircle.setAttribute('cx', this.center.x);
        this.backgroundCircle.setAttribute('cy', this.center.y);
        this.SVG.appendChild(this.backgroundCircle);

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
        this.change();
    }

    WFireController.prototype.changeVisible = function (event) {
        //console.log('WFireController.prototype.changeVisible');
        var self = event.data.self;
        self.fCT.slideToggle("slow", function () {
            if (self.visible) {
                self.visible = false;
                self.SVG.setAttribute('display', 'none');
                self.fCSB.removeClass('fire-control-slide-button-show');
                self.fCSB.addClass('fire-control-slide-button-hide');
            }
            else {
                self.visible = true;
                self.fCSB.removeClass('fire-control-slide-button-hide');
                self.fCSB.addClass('fire-control-slide-button-show');
                self.SVG.setAttribute('display', 'block');
            }
        });
    };

    WFireController.prototype.setVisible = function (aVisible) {
        if (this.visible !== aVisible) {
            this.changeVisible({data: {self: this}})
        }
    };

    WFireController.prototype.getVisible = function () {
        return this.visible;
    };

    WFireController.prototype.changeAutoShootingEnable = function () {
        //console.log('WFireController.prototype.changeAutoShootingEnable');
        if (this.autoShoot) {
            //console.log('WFireController.prototype.changeAutoShootingEnable', 'OFF');
            clientManager.sendFireAutoEnable('front', false);
            clientManager.sendFireAutoEnable('back', false);
            clientManager.sendFireAutoEnable('right', false);
            clientManager.sendFireAutoEnable('left', false);
            this.autoShoot = false;
        }
        else {
            //console.log('WFireController.prototype.changeAutoShootingEnable', 'ON');
            clientManager.sendFireAutoEnable('front', true);
            clientManager.sendFireAutoEnable('back', true);
            clientManager.sendFireAutoEnable('right', true);
            clientManager.sendFireAutoEnable('left', true);
            this.autoShoot = true;
        }
    };

    WFireController.prototype._getSVGPathSide = function (radiusPath, isDischarge, isAuto) {
        var tempWidth = this.halfSectorWidth;
        var radiusOut = this.radiusIn + ((this.radiusOut - this.radiusIn) * radiusPath);
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
        // Вычислить точку для отрисовки
        var relativeRadius = car.distance / side.side.sideRadius;
        var relativeAngle = - car.fi;
        var radius = this.radiusIn + ((this.radiusOut - this.radiusIn) * relativeRadius);
        var p = rotateVector(new Point(radius, 0), ((2 * relativeAngle * this.halfSectorWidth) / side.side.sideWidth));
        // Нарисовать точку
        car.svg = document.createElementNS(this.NS, 'circle');
        // Добавить точку в сектор
        car.svg.setAttribute('class', 'fire-control-radar-point sublayers-unclickable');
        car.svg.setAttribute('r', 2);
        car.svg.setAttribute('cx', p.x);
        car.svg.setAttribute('cy', p.y);
        side.SVGGroup.appendChild(car.svg);
    };

    WFireController.prototype._updateCarPoint = function(side, car) {
        //console.log('WFireController.prototype._updateCarPoint');
        // Вычислить точку для отрисовки
        var relativeRadius = car.distance / side.side.sideRadius;
        var relativeAngle = - car.fi;
        var radius = this.radiusIn + ((this.radiusOut - this.radiusIn) * relativeRadius);
        var p = rotateVector(new Point(radius, 0), ((2 * relativeAngle * this.halfSectorWidth) / side.side.sideWidth));
        // Обновить центр точки точку
        car.svg.setAttribute('cx', p.x);
        car.svg.setAttribute('cy', p.y);
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

        // Анимация радара
        var userCarPosition = this.car.getCurrentCoord(time);
        for (var i = 0; i < this.cars.length; i++) {
            var car = this.cars[i];
            var carPosition = car.mobj.getCurrentCoord(time);
            var distance = distancePoints(userCarPosition, carPosition);
            var angle = angleVectorRadCCW(subVector(carPosition, userCarPosition));
            if ((car.angle == angle) && (car.distance == distance)) continue;
            car.angle = angle;
            car.distance = distance;
            this._deleteCarPoint(car);
            for (var j = 0; j < this.sides.length; j++) {
                var side = this.sides[j];
                if (this._carInSide(car, side, userCarPosition, userCarDirection)) {
                    if (car.svg) this._updateCarPoint(side, car);
                    else this._addCarPoint(side, car);
                }
            }
        }
    };

    WFireController.prototype.shootBySide = function(event) {
        clientManager.sendFireDischarge(event.data.side.side.sideStr);
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