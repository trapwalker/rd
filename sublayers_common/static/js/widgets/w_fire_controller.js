/*
 * Виджет стрельбы
 */
var ConstFireControllerSectorWidth = 70;         // Ширина сектора, которая будет отображаться в виджете (в градусах)

var constFireControllerSectorDiameter = 150;    // диаметр для svg секторов (px)
var constRadarCircleSpeed = 6;                  // время за которое радиус радарного круга меняется от 0% до 100% (сек)
var constRadarTimeReStartCircle = 3;            // период запуска радарных круга (сек)
var constRadarRadiusIn = 15;                    // мимнимальный радиус радарного круга (px)
var constRadarRadiusOut = 95;                   // максимальный радиус радарного круга (px)
var constRadarMaxOpacity = 0.9;                 // начальная прозрачность радарного круга
var constRadarMinOpacity = 0;                   // конечная прозрачность радарного круга
var constRadarMaxWidth = 1;                     // начальная ширина радарного круга (в частях от всей ширины радара)
var constRadarMinWidth = 0.2;                   // конечная ширина радарного круга (в частях от всей ширины радара)

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
        this.halfSectorWidth = gradToRad(ConstFireControllerSectorWidth / 2.);
        this.radiusOut = constFireControllerSectorDiameter / 2 - 1;
        this.radiusIn = constFireControllerSectorDiameter / 6 + 5;
        this._difRadius = this.radiusOut - this.radiusIn;
        this.radiusAll = constFireControllerSectorDiameter / 6;
        this.center = {
            x: constFireControllerSectorDiameter / 2,
            y: constFireControllerSectorDiameter / 2
        };

        // Вставляем всю верстку тут, потому как при вход в город она нахуй сносится
        $('#fireControlArea').append(
            '<div id="fireControlAreaRumble">' +
                '<div id="fireControlTop">' +
                    '<div id="divForSVG"></div>' +
                    '<div id="divForCanvas">' +
                        '<canvas id="fireControlRadarCanvas" class="fire-controll-canvas"></canvas>' +
                        '<canvas id="fireControlRadarPointCanvas" class="fire-controll-canvas"></canvas>' +
                    '</div>' +
                '</div>' +
                '<div id="fireControlBottom">' +
                    '<div id="fireControlSlideButton" class="fire-control-slide-button-show sublayers-clickable" onclick="wFireController.changeCombatState()"></div>' +
                '</div>' +
            '</div>'
        );

        // Получаем основные дивы виджета
        this.fCT = $("#fireControlTop");                // верхний див
        this.fCSB = $("#fireControlSlideButton");       // див с кнопкой
        this.dFSVG = $("#divForSVG");                   // див под SVG полотно

        // Создание кнопок быстрого доступа
        this.initQuickConsumerPanel();

        // Создание SVG полотна
        this.NS = 'http://www.w3.org/2000/svg';
        this.SVG = document.createElementNS(this.NS, 'svg');
        this.SVG.setAttribute('height', constFireControllerSectorDiameter);
        this.SVG.setAttribute('width', constFireControllerSectorDiameter);
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
        this.initRadarCircles();

        this.change();

        // todo: сделать это правильно
        timeManager.addTimerEvent(this, 'change');
    }

    WFireController.prototype.initQuickConsumerPanel = function() {
        //console.log("WFireController.prototype.initQuickConsumerPanel");

        // Создаем 4 дива под кнопки
        var jq_wrap_list = {
            1: $('<div id="fireControlQuickBtn1BG"></div>'),
            2: $('<div id="fireControlQuickBtn2BG"></div>'),
            3: $('<div id="fireControlQuickBtn3BG"></div>'),
            4: $('<div id="fireControlQuickBtn4BG"></div>')
        }

        this.jq_quick_btns = {
            1: $('<div id="fireControlQuickBtn1" class="fire-controll-quick-btn-block" data-index="1"></div>'),
            2: $('<div id="fireControlQuickBtn2" class="fire-controll-quick-btn-block" data-index="2"></div>'),
            3: $('<div id="fireControlQuickBtn3" class="fire-controll-quick-btn-block" data-index="3"></div>'),
            4: $('<div id="fireControlQuickBtn4" class="fire-controll-quick-btn-block" data-index="4"></div>')
        };      

        // Добавляем дивы кнопок в верстку и вешаем на них клики с активейтами
        for (var key in this.jq_quick_btns)
            if (this.jq_quick_btns.hasOwnProperty(key)) {
                var jq_wrap = jq_wrap_list[key];
                var jq_slot = this.jq_quick_btns[key];
                jq_wrap.append(jq_slot);
                this.fCT.append(jq_wrap);
                this.jq_quick_btns[key].on('click', function () {
                    clientManager.sendActivateQuickItem($(this).data('index'), user.userCar.ID)
                });
            }

        // Делаем дивы кнопок droppabe, чтобы ловить итемы из инвентаря и из других кнопок
        $('.fire-controll-quick-btn-block').droppable({
            greedy: true,
            accept: function (target) {
                // Принимать инвентарные итемы и итемы других кнопок
                return target.hasClass('mainCarInfoWindow-body-trunk-body-right-item') ||
                       target.hasClass('fire-controll-quick-btn-block');
            },
            drop: function (event, ui) {
                // Итем прилетел из инвентаря
                if (ui.draggable.hasClass('mainCarInfoWindow-body-trunk-body-right-item')) {
                    if (ui.draggable.data('owner_id') == user.userCar.ID)
                        clientManager.sendSetQuickItem($(this).data('index'), ui.draggable.data('pos'));
                }
                // Итем прилетел из другой кнопки
                if (ui.draggable.hasClass('fire-controll-quick-btn-block')) {
                    clientManager.sendSwapQuickItems($(this).data('index'), ui.draggable.data('index'));
                }
            }
        });

        // Делаем дивы кнопок draggable, чтобы выкидывать и менять местами итемы
        $('.fire-controll-quick-btn-block').draggable({
            disabled: true,
            helper: 'clone',
            opacity: 0.8,
            revert: true,
            revertDuration: 0,
            zIndex: 100,
            appendTo: '#map',
            start: function (event, ui) {
                // Разрешить таскание только если открыто окно своего инвентаря
                if (!windowTemplateManager.unique.hasOwnProperty('inventory_info')) return false;
            }
        });
    };

    WFireController.prototype.updateQuickConsumerPanel = function(panel_info) {
        //console.log("WFireController.prototype.updateQuickConsumerPanel", panel_info);
        for (var i = 0; i < panel_info.items.length; i++) {
            var btn = panel_info.items[i];
            this.jq_quick_btns[btn.index].draggable("disable");
            if (btn.item) {
                this.jq_quick_btns[btn.index].css('background-image', 'url("' + btn.item.example.inv_icon_small + '")');
                this.jq_quick_btns[btn.index].draggable("enable");
            }
            else
                this.jq_quick_btns[btn.index].css('background-image', 'none');
        }
    };

    WFireController.prototype.initRadarCircles = function() {
        //console.log('WFireController.prototype.initRadarCircle');
        this.canvas_radar = document.getElementById("fireControlRadarCanvas");
        this.canvas_radar_point = document.getElementById("fireControlRadarPointCanvas");
        this.canvas_radar.width = 190;
        this.canvas_radar.height = 190;
        this.canvas_radar_point.width = 190;
        this.canvas_radar_point.height = 190;
        this.radarCTX = this.canvas_radar.getContext("2d");
        this.radarPointCTX = this.canvas_radar_point.getContext("2d");
        this._difRadarRadius = constRadarRadiusOut - constRadarRadiusIn;
        this._difRadarWidth = constRadarMaxWidth - constRadarMinWidth;
        this._difRadarOpacity = constRadarMaxOpacity - constRadarMinOpacity;
        this.radarLastTimeStart = 0;
        this.radarCircles = [];
    };

    WFireController.prototype._updateRadarCircles = function(time) {
        //console.log('WFireController.prototype._updateRadarCircle', this.radarCircles);

        // Сбрасываем кадр
        this.radarCTX.clearRect(0, 0, constRadarRadiusOut * 2, constRadarRadiusOut * 2);


        for (var i = 0; i < this.radarCircles.length; i++) {
            // Создаем общий градиент
            var circle = this.radarCircles[i];
            var difTime = time - circle.start_time;
            var newRelRadius = difTime / constRadarCircleSpeed;
            var newAbsRadius = constRadarRadiusIn + this._difRadarRadius * newRelRadius;
            if ((newRelRadius <= 1) || (newRelRadius >= constRadarMinWidth)) {
                var grd = this.radarCTX.createRadialGradient(constRadarRadiusOut, constRadarRadiusOut, constRadarRadiusIn,
                                                             constRadarRadiusOut, constRadarRadiusOut, constRadarRadiusOut);

                var tempWidth = constRadarMinWidth + this._difRadarWidth * newRelRadius;
                var tempOpacity = constRadarMaxOpacity - this._difRadarOpacity * newRelRadius;

                var startGradient2 = newRelRadius - 0.9 * tempWidth;
                var startGradient1 = newRelRadius - 0.2 * tempWidth;
                var midleGradient = newRelRadius;
                var endGradient1 = newRelRadius + 0.1 * tempWidth;

                startGradient1 = startGradient1 < 0 ? 0 : ( startGradient1 > 1 ? 1 : startGradient1 );
                startGradient2 = startGradient2 < 0 ? 0 : ( startGradient2 > 1 ? 1 : startGradient2 );
                midleGradient = midleGradient < 0 ? 0 : ( midleGradient > 1 ? 1 : midleGradient );
                endGradient1 = endGradient1 < 0 ? 0 : ( endGradient1 > 1 ? 1 : endGradient1 );

                grd.addColorStop(startGradient2, "rgba(0, 255, 0, 0)");
                grd.addColorStop(startGradient1, "rgba(0, 255, 0, " + tempOpacity * 0.3 + ")");
                grd.addColorStop(midleGradient, "rgba(100, 255, 100, " + tempOpacity + ")");
                grd.addColorStop(endGradient1, "rgba(0, 255, 0, 0)");

                circle.abs_radius = newAbsRadius;

                this.radarCTX.fillStyle = grd;
                this.radarCTX.beginPath();
                //this.radarCTX.arc(constRadarRadiusOut, constRadarRadiusOut, constRadarRadiusOut - 3, 2 * Math.PI, 0, false);
                this.radarCTX.arc(constRadarRadiusOut, constRadarRadiusOut, constRadarRadiusOut - 14, 2 * Math.PI, 0, false);
                this.radarCTX.closePath();
                this.radarCTX.fill();
                //this.radarCTX.fillRect(0, 0, 174, 174);
            }
            circle.rel_radius = newRelRadius;
        }

        // Вырезать прозрачную дырку в центре
        this.radarCTX.globalCompositeOperation = "destination-out";
        this.radarCTX.fillStyle = 'rgba(255, 0, 0, 1)';
        this.radarCTX.beginPath();
        this.radarCTX.arc(constRadarRadiusOut, constRadarRadiusOut, this.radiusAll, Math.PI * 2, 0, false);
        this.radarCTX.closePath();
        this.radarCTX.fill();
        this.radarCTX.globalCompositeOperation = "source-over";

        // Удаляем те круги которые выросли до конца
        var index = this.radarCircles.length - 1;
        while (index >= 0) {
            if (this.radarCircles[index].rel_radius >= 1) this.radarCircles.splice(index, 1);
            index--;
        }
    };

    WFireController.prototype._reStartRadarCircle = function(time){
        var difTime = time - this.radarLastTimeStart;
        if (difTime >= constRadarTimeReStartCircle) {
            this.radarCircles.push({
                start_time: time,
                rel_radius: 0,
                abs_radius: 0
            });
            this.radarLastTimeStart = time;
        }
    };

    WFireController.prototype.changeCombatState = function(){
        this.combatState = !this.combatState;
        this.setVisible(this.combatState);
    };

    WFireController.prototype.changeVisible = function () {
        //console.log('WFireController.prototype.changeVisible');
        var self = this;
        this.fCT.slideToggle("slow", function () {
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
        var is_show_central = !this.visible && (map.getZoom() >= 14);
        if (mapManager.widget_fire_radial_grid)
            mapManager.widget_fire_radial_grid.setVisible(is_show_central);
        if (mapManager.widget_fire_sectors)
            mapManager.widget_fire_sectors.setVisible(is_show_central);
    };

    WFireController.prototype.setVisible = function (aVisible) {
        if (this.visible !== aVisible) this.changeVisible()
    };

    WFireController.prototype.getVisible = function () {
        return this.visible;
    };

    WFireController.prototype._setAutoShootingEnable = function (enable) {
        //console.log('WFireController.prototype._setAutoShootingEnable', enable);
        clientManager.sendFireAutoEnable(enable);
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
        var radiusOut = this.radiusIn + (this._difRadius * radiusPath);
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
            side.current_prc = 0;

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
            $(side.SVGPath).off('click', this._fireSectorEvent);
            $(side.SVGPath).remove();
            $(side.SVGPathShadow).remove();
            $(side.SVGGroup).remove();
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

    WFireController.prototype._calculatePoint = function (side, car, userCarDirection, relativeRadius) {
        var relativeAngle = - 2 * this.halfSectorWidth * car.fi / side.side.sideWidth;
        relativeAngle = normalizeAngleRad(userCarDirection + side.side.direction + relativeAngle);
        var radius = this.radiusIn + (this._difRadius * relativeRadius);
        var p = rotateVector(new Point(radius, 0), relativeAngle);
        return summVector(p, new Point(constRadarRadiusOut, constRadarRadiusOut));
    };

    WFireController.prototype._updateCarPointCanvas = function () {
        this.radarPointCTX.save();
        this.radarPointCTX.globalCompositeOperation = "copy";
        this.radarPointCTX.globalAlpha = 0.97;
        this.radarPointCTX.drawImage(this.canvas_radar_point, 0, 0);
        //this.radarPointCTX.globalCompositeOperation = "source-over";
        //this.radarPointCTX.globalAlpha = 1;
        this.radarPointCTX.restore();
        //stackBlurCanvasRGBA('fireControlRadarPointCanvas', 0, 0, 190, 190, 1);
    };

    WFireController.prototype._updateCarPoint = function(side, car, userCarDirection) {
        //console.log('WFireController.prototype._updateCarPoint');
        car._wfc_side = side;

        var relativeRadius = car.distance / side.side.sideRadius;

        // Вычислить точку для отрисовки
        var p = this._calculatePoint(side, car, userCarDirection, relativeRadius);
        var temp = this._radarPointOpacityByRadarCircle(relativeRadius);

        // Отрисовка
        this.radarPointCTX.fillStyle = 'rgba(50, 255, 50, ' + temp * 0.7 + ')';
        this.radarPointCTX.beginPath();
        this.radarPointCTX.arc(p.x, p.y, 1.7 + temp * 0.5, Math.PI * 2, 0, false);
        this.radarPointCTX.closePath();
        this.radarPointCTX.fill();
    };

    WFireController.prototype._deleteCarPoint = function(car) {
        //console.log('WFireController.prototype._deleteCarPoint');
        car._wfc_side = null;
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

    WFireController.prototype._radarPointOpacityByRadarCircle = function(relativeRadius) {
        var temp_rel_radius = ((this.radiusIn + this._difRadius * relativeRadius) - constRadarRadiusIn) / this._difRadarRadius;
        var dif_rel_radius = 1;
        var index = -1;
        for (var i = 0; i < this.radarCircles.length; i++) {
            var temp_radius = Math.abs(this.radarCircles[i].rel_radius - temp_rel_radius);
            if (temp_radius < dif_rel_radius) {
                dif_rel_radius = temp_radius;
                index = i;
            }
        }
        if (index >= 0)
            if (this.radarCircles[index].rel_radius > temp_rel_radius)
                dif_rel_radius = (constRadarTimeReStartCircle / constRadarCircleSpeed) - dif_rel_radius;
        if (dif_rel_radius < 0)
            console.log('error');
        var max_radius = constRadarTimeReStartCircle / constRadarCircleSpeed;
        var result = dif_rel_radius / max_radius;
        result = result < 0 ? 0 : ( result > 1 ? 1 : result );
        return result;
    };

    WFireController.prototype.change = function () {
        //console.log('WFireController.prototype.change');
        //return;
        var time = clock.getCurrentTime();

        // Вращаем виджет
        var userCarDirection = this.car.getCurrentDirection(time);
        this._setRotation(userCarDirection);

        // Анимация перезарядки
        for (var i = 0; i < this.sides.length; i++) {
            var side = this.sides[i];
            var sideState = side.side.getRechargeState(time);
            if (Math.abs(side.current_prc - sideState.prc) > 0.02) {
                if (sideState.prc == 1)
                    side.SVGPath.setAttribute('d', this.normalPath);
                else {
                    var pathstr = this._getSVGPathSide(sideState.prc);
                    side.SVGPath.setAttribute('d', pathstr);
                }
                side.current_prc = sideState.prc;
            }
        }

        // Анимация круга радара
        this._reStartRadarCircle(time);
        this._updateRadarCircles(time);

        // Анимация точек радара
        this._updateCarPointCanvas();
        var userCarPosition = this.car.getCurrentCoord(time);
        for (var i = 0; i < this.cars.length; i++) {
            var car = this.cars[i];
            var carPosition = car.mobj.getCurrentCoord(time);
            car.distance = distancePoints(userCarPosition, carPosition);
            car.angle = angleVectorRadCCW(subVector(carPosition, userCarPosition));

            if (car._wfc_side)
                if (this._carInSide(car, car._wfc_side, userCarPosition, userCarDirection))
                    this._updateCarPoint(car._wfc_side, car, userCarDirection);
                else
                    this._deleteCarPoint(car);

            for (var j = 0; (j < this.sides.length) && (!car._wfc_side); j++) {
                var side = this.sides[j];
                if (this._carInSide(car, side, userCarPosition, userCarDirection))
                    this._updateCarPoint(side, car);
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
        if (mobj == this.car) {
            this.delFromVisualManager();
            return;
        }
        if (_super.prototype.delModelObject.call(this, mobj)) {
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
        this.cars = [];
        timeManager.delTimerEvent(this, 'change');

        this.fCSB.unbind();
        $(this.backgroundCircle).unbind();
        $(this.allFire).unbind();
        this._clearSides();

        wFireController = null;

        $('#fireControlArea').empty();
        _super.prototype.delFromVisualManager.call(this);
    };

    return WFireController;
}) (VisualObject);

var wFireController;