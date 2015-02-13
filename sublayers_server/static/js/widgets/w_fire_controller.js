/*
 * Виджет стрельбы
 */
var ConstSectorWidth = 60;     // Ширина сектора, которая будет отображаться в виджете (в градусах)
var ConstSectorDiameter = 150; // Диаметр виджета (в пикселях)

var WFireController = (function (_super) {
    __extends(WFireController, _super);

    function WFireController(car) {
        _super.call(this, [car]);
        this.car = car;

        this.options = {
            parent: 'fireControlArea',
            intervalRecharge: 50
        };

        this.sectors = [];
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

        var mainParent = $('#' + this.options.parent);
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

        this._initSectors();
        this.change();
    }

    WFireController.prototype.changeVisible = function (event) {
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
                self._setRotate((self.getRotate() ? self.options.rotateAngle : (- Math.PI / 2)));
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

    WFireController.prototype.changeAutoShootingEnable = function (event) {

    };

    WFireController.prototype._getSVGPathSide = function (radiusPath) {
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

    WFireController.prototype._initSectors = function () {
        this._clearSectors();
        var sides = this.car.fireSidesMng.getAllSides(true);
        for (var i = 0; i < sides.length; i++) {
            // Создание объекта в котором будет вся информация о секторе
            var sector = {};
            // Сохранить pathStr нормального состояния сектора
            sector.normalPath = this._getSVGPathSide(1);

            // Создание и добавление группы для сектора
            sector.SVGGroup = document.createElementNS(this.NS, "g");
            this.SVGSectorsGroup.appendChild(sector.SVGGroup);
            sector.SVGGroup.setAttribute('transform', 'translate(' + this.center.x + ', ' + this.center.y + ') ' +
                                         'rotate(' + radToGrad(sides[i].direction) + ')');

            // Рисование серого статического сектора
            sector.SVGPathShadow = document.createElementNS(this.NS, "path");
            sector.SVGPathShadow.setAttribute('class', 'fire-control-sector-shadow');
            sector.SVGPathShadow.setAttribute('d', sector.normalPath);
            sector.SVGGroup.appendChild(sector.SVGPathShadow);

            // Рисование
            sector.SVGPath = document.createElementNS(this.NS, "path");
            sector.SVGPath.setAttribute('class', 'fire-control-sector sublayers-clickable');
            sector.SVGPath.setAttribute('d', sector.normalPath);
            sector.SVGGroup.appendChild(sector.SVGPath);

            // Добавить в сектор ссылку на side
            sector.side = sides[i];
            console.log(sector.side);

            // Устанавливаем флаг речарджа сектора в false
            sector.recharged = false;

            // Вешаем на сектор обработчик клика данного сектора
            $(sector.SVGPath).on('click', {sector: sector}, this.shootBySide);

            // Помещаем сектор в массив секторов данного объекта
            this.sectors.push(sector);
        }
    };

    WFireController.prototype._clearSectors = function () {
        for (; this.sectors.length > 0;) {
            var sector = this.sectors.pop();
            $(sector.SVGPath).off('click', this._fireSectorEvent);
            $(sector.SVGPath).remove();
            $(sector.SVGPathShadow).remove();
            $(sector.SVGGroup).remove();
            // todo: точки с радара удаляются раньше, очищая backLightList в carMarkerList?
        }
        this.sectors = [];
    };

    WFireController.prototype._setRotation = function (angle) {
        if (Math.abs(this.rotateAngle - angle) < 0.01) return;
        this.rotateAngle = angle;
        if (this.visible)
            this.SVGSectorsGroup.setAttribute('transform', 'rotate(' + radToGrad(angle) + ', ' +
                                              this.center.x + ', ' + this.center.y + ')');
    };

    WFireController.prototype.change = function () {
        console.log('WFireController.prototype.change');
        var time = clock.getCurrentTime();
        // Вращаем виджет
        this._setRotation(this.car.getCurrentDirection(time));
    };

    WFireController.prototype.delFromVisualManager = function () {
        //console.log('WFireController.prototype.delFromVisualManager');
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    WFireController.prototype.shootBySide = function(event) {
        // Получить сектор, для которого вызвано событие
        var sector = event.data.sector;
        alert(sector.side.direction);
    };

    return WFireController;
})(VisualObject);