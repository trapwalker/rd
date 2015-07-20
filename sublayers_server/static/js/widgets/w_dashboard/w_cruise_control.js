/*
 * Виджет круиз контроля
 */
var WCruiseControl = (function (_super) {
    __extends(WCruiseControl, _super);

    function WCruiseControl(car, div_parent) {
        _super.call(this, [car]);
        this.car = car;

        this.keyBoardControl = false;
        this.lastSpeed = -100;
        this.reverse = false;

        // Механизм скрытия
        this.visible = true;
        this.glassDiv = $('#cruiseControlGlassDiv');
        this.visibleButtonDiv = $("#cruiseControlVisibleButtonDiv");
        this.visibleButtonDiv.click(this, this._onClickChangeVisible);

        // Компактный вид
        this.compactView = $("<div id='cruiseControlCompactView' class='sublayers-unclickable'></div>");
        $('#cruiseControlMainDiv').append(this.compactView);

        var compactViewSpeedDiv = $("<div id='cruiseControlCompactViewSpeedDiv' class='compactViewDiv'></div>");
        var compactViewLimitDiv = $("<div id='cruiseControlCompactViewLimitDiv' class='compactViewDiv'></div>");
        var compactViewHealthDiv = $("<div id='cruiseControlCompactViewHealthDiv' class='compactViewDiv'></div>");
        var compactViewFuelDiv = $("<div id='cruiseControlCompactViewFuelDiv' class='compactViewDiv'></div>");
        var compactViewRadiationDiv = $("<div id='cruiseControlCompactViewRadiationDiv' class='compactViewDiv'></div>");
        var compactViewWindDiv = $("<div id='cruiseControlCompactViewWindDiv' class='compactViewDiv'></div>");
        var compactViewAltitudeDiv = $("<div id='cruiseControlCompactViewAltitudeDiv' class='compactViewDiv'></div>");

        this.compactViewSpeedTextDiv = $("<div id='cruiseControlCompactViewSpeedTextDiv' class='compactViewTextDiv'> ---- </div>");
        this.compactViewLimitTextDiv = $("<div id='cruiseControlCompactViewLimitTextDiv' class='compactViewTextDiv'> ---- </div>");
        compactViewSpeedDiv.append(this.compactViewSpeedTextDiv);
        compactViewLimitDiv.append(this.compactViewLimitTextDiv);
        compactViewHealthDiv.append($("<div id='cruiseControlCompactViewHealthTextDiv' class='compactViewTextDiv'> ---- </div>"));
        compactViewFuelDiv.append($("<div id='cruiseControlCompactViewFuelTextDiv' class='compactViewTextDiv'> ---- </div>"));
        compactViewRadiationDiv.append($("<div id='cruiseControlCompactViewRadiationTextDiv' class='compactViewTextDiv'> ---- </div>"));
        compactViewWindDiv.append($("<div id='cruiseControlCompactViewWindTextDiv' class='compactViewTextDiv'> ---- </div>"));
        compactViewAltitudeDiv.append($("<div id='cruiseControlCompactViewAltitudeTextDiv' class='compactViewTextDiv'> ---- </div>"));

        compactViewSpeedDiv.append($("<div id='cruiseControlCompactViewSpeedHeaderDiv' class='compactViewHeaderDiv'>speed:</div>"));
        compactViewLimitDiv.append($("<div id='cruiseControlCompactViewLimitHeaderDiv' class='compactViewHeaderDiv'>limit:</div>"));
        compactViewHealthDiv.append($("<div id='cruiseControlCompactViewHealthHeaderDiv' class='compactViewHeaderDiv'>health:</div>"));
        compactViewFuelDiv.append($("<div id='cruiseControlCompactViewFuelHeaderDiv' class='compactViewHeaderDiv'>fuel:</div>"));
        compactViewRadiationDiv.append($("<div id='cruiseControlCompactViewRadiationHeaderDiv' class='compactViewHeaderDiv'>radiation:</div>"));
        compactViewWindDiv.append($("<div id='cruiseControlCompactViewWindHeaderDiv' class='compactViewHeaderDiv'>wind:</div>"));
        compactViewAltitudeDiv.append($("<div id='cruiseControlCompactViewAltitudeHeaderDiv' class='compactViewHeaderDiv'>altitude:</div>"));

        this.compactView.append(compactViewSpeedDiv);
        this.compactView.append(compactViewLimitDiv);
        this.compactView.append(compactViewHealthDiv);
        this.compactView.append(compactViewFuelDiv);
        this.compactView.append(compactViewRadiationDiv);
        this.compactView.append(compactViewWindDiv);
        this.compactView.append(compactViewAltitudeDiv);

        // Добавление основного дива круиз-контрола
        this.parentDiv = $('#' + div_parent);
        this.mainDiv = $("<div id='cruiseControlSpeedMainDiv'></div>");
        this.parentDiv.append(this.mainDiv);

        // Верхний див (индикатор текущей скорости)
        this.topDiv = $("<div id='cruiseControlTopDiv'></div>");
        this.mainDiv.append(this.topDiv);

        this.topTextPositionDiv1 = $("<div id='cruiseControlTopTextPositionDiv1'></div>");
        this.topTextPositionDiv2 = $("<div id='cruiseControlTopTextPositionDiv2'></div>");
        this.topDiv.append(this.topTextPositionDiv1);
        this.topDiv.append(this.topTextPositionDiv2);
        this.topTextDiv1 = $("<div id='cruiseControlTopTextDiv1'></div>");
        this.topTextDiv2 = $("<div id='cruiseControlTopTextDiv2'></div>");
        this.topTextPositionDiv1.append(this.topTextDiv1);
        this.topTextPositionDiv2.append(this.topTextDiv2);

        // Средний див (слайдер)
        // Заполнил эти размеры со скриншотов, чтоб править их тут а не по всему коду
        this.constScaleHeight = 325;
        this.constScaleWidth = 24;
        this.constSpeedHandleHeight = 27;

        this.mediumDiv = $("<div id='cruiseControlMediumDiv'></div>");
        this.mainDiv.append(this.mediumDiv);

        // Каретка
        this.speedHandleAreaDiv = $("<div id='cruiseControlSpeedHandleAreaDiv' class='cruise-control-speedHandleArea '></div>");
        this.mediumDiv.append(this.speedHandleAreaDiv);

        this.speedHandleDiv = $("<div id='cruiseControlSpeedHandleDiv' class='cruise-control-speedHandle sublayers-clickable'></div>");
        this.speedHandleAreaDiv.append(this.speedHandleDiv);
        this.speedHandleDiv.draggable({
            axis: "y",
            containment: "parent",
            scroll: false
        });

        this.speedHandleDiv1 = $("<div id='cruiseControlSpeedHandleDiv1'></div>");
        this.speedHandleDiv2 = $("<div id='cruiseControlSpeedHandleDiv2'></div>");

        this.speedHandleDiv.append(this.speedHandleDiv1);
        this.speedHandleDiv.append(this.speedHandleDiv2);

        this.speedHandleDiv.bind( "drag", this, this._onMoveSpeedHandle);
        this.speedHandleDiv.bind( "dragstop", this, this._onStopSpeedHandle);

        // Шкала
        this.scaleArea = $("<div id='cruiseControlScaleArea' class='sublayers-clickable'></div>");
        this.mediumDiv.append(this.scaleArea);
        this.scaleArea.click(this, this._onClickScaleArea);

        // Рисуем SVG шкалу
        this.svgScaleArea = SVG('cruiseControlScaleArea');
        this._init_params();

        this.svgScaleDX = 10;                               // сдвиг на ширину верхней линии
        this.svgScaleDY = this.constSpeedHandleHeight / 2;  // сдвиг на пол каретки вниз

        // Вертикальная линия
        this.svgScaleArea.line(this.svgScaleDX, this.svgScaleDY,
                               this.svgScaleDX, this.constScaleHeight + this.svgScaleDY)
                         .stroke({width: 1, color: this.svg_colors.line});

        // Верхняя заглушка
        this.svgScaleArea.line(0, this.svgScaleDY,
                               this.svgScaleDX + this.constScaleWidth + 10, this.svgScaleDY + 0.01)
                         .stroke({width: 1, color: this.svg_params.gradients.line_grad2});

        // Промежуточные засечки
        for (var i = 0; i <= 5; i ++) {
            var dy = 25;
            this.svgScaleArea.line(0, dy + this.svgScaleDY + i * 50, this.constScaleWidth, dy + this.svgScaleDY + i * 50 + 0.01).stroke({
                width: 1,
                color: this.svg_params.gradients.line_grad1
            }).dmove(10, 0);
        }
        for (var i = 1; i <= 6; i ++)
            this.svgScaleArea.line(0, this.svgScaleDY + i * 50, 9, this.svgScaleDY + i * 50 + 0.01).stroke({
                width: 1,
                color: this.svg_params.gradients.line_grad1
            }).dmove(10, 0);

        // Нижняя заглушка
        this.svgScaleArea.line(0, this.svgScaleDY + this.constScaleHeight,
                               this.svgScaleDX + this.constScaleWidth + 10, this.svgScaleDY + this.constScaleHeight + 0.01)
            .stroke({width: 1, color: this.svg_params.gradients.line_grad2});

        // Ограничитель зон
        this.zoneArea = $("<div id='cruiseControlZoneArea' class='cruise-control-zoneArea sublayers-unclickable'></div>");
        this.mediumDiv.append(this.zoneArea);

        // Каретка зон
        this.zoneHandleDiv = $("<div id='cruiseControlZoneHandleDiv'></div>");
        this.zoneArea.append(this.zoneHandleDiv);
        this.zoneHandleDiv.append($("<div id='cruiseControlZoneHandleArrow'></div>"));

        this.zoneIconAreaDiv = $("<div id='cruiseControlZoneIconAreaDiv'></div>");
        this.zoneHandleDiv.append(this.zoneIconAreaDiv);

        this.zoneDirtIconDiv = $("<div id='cruiseControlZoneDirtIconDiv'></div>");
        this.zoneWoodIconDiv = $("<div id='cruiseControlZoneWoodIconDiv'></div>");
        this.zoneRoadIconDiv = $("<div id='cruiseControlZoneRoadIconDiv'></div>");
        this.zoneWaterIconDiv = $("<div id='cruiseControlZoneWaterIconDiv'></div>");
        this.zoneSlopeIconDiv = $("<div id='cruiseControlZoneSlopeIconDiv'></div>");

        this.zoneIconAreaDiv.append(this.zoneDirtIconDiv);
        this.zoneIconAreaDiv.append(this.zoneWoodIconDiv);
        this.zoneIconAreaDiv.append(this.zoneRoadIconDiv);
        this.zoneIconAreaDiv.append(this.zoneWaterIconDiv);
        this.zoneIconAreaDiv.append(this.zoneSlopeIconDiv);

        this.zones = {
            Dirt: {
                jqselector: this.zoneDirtIconDiv,
                zoneName: "dirt",
                active: false
            },
            Wood: {
                jqselector: this.zoneWoodIconDiv,
                zoneName: "wood",
                active: false
            },
            Water: {
                jqselector: this.zoneWaterIconDiv,
                zoneName: "water",
                active: false
            },
            Road: {
                jqselector: this.zoneRoadIconDiv,
                zoneName: "road",
                active: false
            },
            Slope: {
                jqselector: this.zoneSlopeIconDiv,
                zoneName: "slope",
                active: false
            }
        };
        this.zoneCount = 0;

        // Создание и добавление текстов
        this.zoneArea.append('<span id="spanLimitText1">LIMITS:</span>');
        this.zoneArea.append('<span id="spanLimitText2"></span>');
        this.zoneLimitText = $('#spanLimitText2');

        // Кнопка "задний ход"
        this.reverseDiv = $("<div id='cruiseControlReverseDiv' class='sublayers-clickable'></div>");
        this.reverseDiv.click(this, this._onClickR);
        this.mainDiv.append(this.reverseDiv);

        // Кнопка "стоп"
        this.stopDiv = $("<div id='cruiseControlStopDiv' class='sublayers-clickable'></div>");
        this.stopDiv.click(this, this._onClickStop);
        this.mainDiv.append(this.stopDiv);

        // Создание и добавление текстов
        this.mainDiv.append('<span id="spanZoomZoomText1">CRUISE CONTROL</span>');
        this.mainDiv.append('<span id="spanZoomZoomText2">km/h</span>');

        this.change();
        this.setSpeedHandleValue(0);
    }

    WCruiseControl.prototype._getCurrentMaxSpeed = function () {
        return this.reverse ? user.userCar.v_backward : user.userCar.v_forward;
    };

    WCruiseControl.prototype._onClickChangeVisible = function (event) {
        //console.log('WCruiseControl.prototype._onClickChangeVisible');
        event.data.changeVisible(!event.data.visible);
        document.getElementById('map').focus();
    };

    WCruiseControl.prototype.changeVisible = function (visible) {
        //console.log('WCruiseControl.prototype.changeVisible');
        if (visible == this.visible) return;
        var self = this;
        if (this.visible) {
            this.visible = false;
            this.glassDiv.animate({right: -560}, 1000, function () {
                self.visibleButtonDiv.removeClass('hideBtnDownRight');
                self.visibleButtonDiv.addClass('hideBtnUpRight');
                self.glassDiv.css({display: 'none'});
                self.compactView.css({display: 'block'});
                self.compactView.animate({opacity: 1}, 500);
            });
        }
        else {
            this.visible = true;
            this.glassDiv.css({display: 'block'});
            this.glassDiv.animate({right: 0}, 1000, function () {
                self.visibleButtonDiv.removeClass('hideBtnUpRight');
                self.visibleButtonDiv.addClass('hideBtnDownRight');
                self.glassDiv.css({display: 'block'});
            });
            self.compactView.animate({opacity: 0}, 500, function () {
                self.compactView.css({display: 'none'});
            });
        }
    };

    WCruiseControl.prototype._init_params = function() {
        this.svg_colors = {
            fill: "#2afd0a",
            line: "#00ff54"
        };

        var self = this;
        this.svg_params = {
            // градиенты
            gradients: {
                line_grad1: this.svgScaleArea.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.line, opacity: 0.45});
                    stop.at({ offset: 0.5, color: self.svg_colors.line, opacity: 0.45});
                    stop.at({ offset: 1, color: self.svg_colors.line, opacity: 0.22});
                }),
                line_grad2: this.svgScaleArea.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.line, opacity: 0.22});
                    stop.at({ offset: 0.2, color: self.svg_colors.line, opacity: 0.45});
                    stop.at({ offset: 0.8, color: self.svg_colors.line, opacity: 0.45});
                    stop.at({ offset: 1, color: self.svg_colors.line, opacity: 0.22});
                }),
                line_grad3: this.svgScaleArea.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.line, opacity: 1});
                    stop.at({ offset: 0.5, color: self.svg_colors.line, opacity: 1});
                    stop.at({ offset: 1, color: self.svg_colors.line, opacity: 0.2});
                })
            },

            // настройка заливки
            fill_area: {
                stroke: {width: 0.0},
                fill: {color: this.svg_colors.fill, opacity: 0.2}
            }
        };
    };

    WCruiseControl.prototype._setSpeedHandleText = function(prc) {
        var currentSpeed = (this._getCurrentMaxSpeed() / 1000 * 3600) * prc;
        currentSpeedWords = (currentSpeed.toFixed(1)).split('.');
        this.speedHandleDiv1.text(currentSpeedWords[0] + '.');
        this.speedHandleDiv2.text(currentSpeedWords[1]);
    };

    WCruiseControl.prototype.setSpeedHandleValue = function(prc) {
        var topValue = (1 - prc) * this.constScaleHeight;
        this.speedHandlePrc = prc;
        this.speedHandleDiv.css({top: topValue});
        this._setSpeedHandleText(prc);
    };

    WCruiseControl.prototype.getSpeedHandleValue = function() {
        //console.log('WCruiseControl.prototype.getSpeedHandleValue');
        return this._getCurrentMaxSpeed() * this.speedHandlePrc;
    };

    WCruiseControl.prototype._onMoveSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onMoveSpeedHandle');
        event.data._setSpeedHandleText(1 - (ui.position.top / event.data.constScaleHeight));
    };

    WCruiseControl.prototype._onStopSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onStopSpeedHandle', ui.position.top, event.data);
        var prc = 1 - (ui.position.top / event.data.constScaleHeight);
        var currentSpeed = event.data._getCurrentMaxSpeed() * prc;
        event.data.speedHandlePrc = prc;
        clientManager.sendSetSpeed(currentSpeed);
        document.getElementById('map').focus();
    };

    WCruiseControl.prototype._onClickScaleArea = function (event) {
        //console.log('WCruiseControl.prototype._onClickScaleArea');
        var prc = (event.data.constScaleHeight + event.data.constSpeedHandleHeight) - event.offsetY - event.data.svgScaleDY;
        if (prc < 0) prc = 0;
        if (prc > event.data.constScaleHeight) prc = event.data.constScaleHeight;
        prc /= event.data.constScaleHeight;
        event.data.setSpeedHandleValue(prc);
        clientManager.sendSetSpeed(event.data._getCurrentMaxSpeed() * prc);
        document.getElementById('map').focus();
    };

    WCruiseControl.prototype._onClickStop = function (event) {
        //console.log('WCruiseControl.prototype._onClickStop');
        clientManager.sendStopCar();
        event.data.setSpeedHandleValue(0);
        document.getElementById('map').focus();
    };

    WCruiseControl.prototype._onClickR = function (event) {
        //console.log('WCruiseControl.prototype._onClickR');
        event.data.changeReverse(!event.data.reverse);
        var currentSpeed = event.data._getCurrentMaxSpeed() * event.data.speedHandlePrc;
        event.data._setSpeedHandleText(event.data.speedHandlePrc);
        clientManager.sendSetSpeed(currentSpeed);
        document.getElementById('map').focus();
    };

    WCruiseControl.prototype.changeReverse = function (reverse) {
        if (this.reverse != reverse) {
            this.reverse = reverse;
        }
    };

    WCruiseControl.prototype._drawFillArea = function (prc) {
        //console.log('WCruiseControl.prototype.onStopSpeedHandle', ui.position.top, event.data);
        if (prc > 1.0) prc = 1.0;
        if (prc < 0.0) prc = 0.0;
        if (this.fill_area) this.fill_area.remove();
        if (this.close_line) this.close_line.remove();

        var bottomLeft = new Point(this.svgScaleDX, this.constScaleHeight + this.svgScaleDY);
        var bottomRight = new Point(this.svgScaleDX + 16, this.constScaleHeight + this.svgScaleDY);
        var topRight = new Point(this.svgScaleDX + 16, this.constScaleHeight * (1 - prc) + this.svgScaleDY);
        var topLeft = new Point(this.svgScaleDX, this.constScaleHeight * (1 - prc) + this.svgScaleDY);

        this.fill_area = this.svgScaleArea.path(
                    'M ' + bottomLeft.x + ' ' + bottomLeft.y +
                    'L ' + bottomRight.x + ' ' + bottomRight.y +
                    'L ' + topRight.x + ' ' + topRight.y +
                    'L ' + topLeft.x + ' ' + topLeft.y +
                    'Z')
            .fill(this.svg_params.fill_area.fill)
            .stroke(this.svg_params.fill_area.stroke)
            .style('pointer-events: none');

        //this.fill_area.setAttribute('class', 'cruise-control-fill-area');

        this.close_line = this.svgScaleArea.line(topLeft.x, topLeft.y, topRight.x, topRight.y + 0.0001)
            .stroke({width: 1, color: this.svg_params.gradients.line_grad3});
    };

    WCruiseControl.prototype.setZoneState = function(zoneName, zoneState) {
        //console.log('WCruiseControl.prototype.setZoneState');
        if (zoneState) {
            this.zones[zoneName].jqselector.css({display: "block"});
            this.zones[zoneName].active = true;
            this.zoneCount++;
        }
        else {
            this.zones[zoneName].jqselector.css({display: "none"});
            this.zones[zoneName].active = false;
            this.zoneCount--;
        }
        if (this.zoneCount > 1) {
            this.zoneDirtIconDiv.css({display: "none"});
            var limit_str = "";
            for(var key in this.zones)
                if (key != 'Dirt' && this.zones[key].active)
                    limit_str = limit_str + '  ' + this.zones[key].zoneName;
            this.zoneLimitText.text(limit_str);
            this.compactViewLimitTextDiv.text(limit_str);
        }
        else {
            this.zoneDirtIconDiv.css({display: "block"});
            this.zoneLimitText.text("dirt");
            this.compactViewLimitTextDiv.text("dirt");
        }
    };

    WCruiseControl.prototype.setSpeedRange = function(speedRange) {
        //console.log('WCruiseControl.prototype.setSpeedRange', speedRange);
        var absCC = Math.abs(speedRange);
        var topValue = (1 - absCC) * this.constScaleHeight + this.svgScaleDY - this.zoneHandleDiv.height() / 2;
        this.zoneHandleDiv.css({top: topValue});
    };

    WCruiseControl.prototype.startKeyboardControl = function() {
        //console.log('WCruiseControl.prototype.startKeyboardControl');
        this.keyBoardControl = true;
    };

    WCruiseControl.prototype.stopKeyboardControl = function() {
        //console.log('WCruiseControl.prototype.stopKeyboardControl');
        this.keyBoardControl = false;
    };

    WCruiseControl.prototype.change = function() {
        //console.log('WCruiseControl.prototype.change');
        var currentSpeed = user.userCar.getCurrentSpeed(clock.getCurrentTime());
        if (Math.abs(currentSpeed - this.lastSpeed) > 0.01) {
            // Сохраняем последнюю скорость
            this.lastSpeed = currentSpeed;

            // Обновление шкалы скорости
            var prc = 0;
            if (currentSpeed >= 0) prc = currentSpeed / user.userCar.v_forward;
            else prc = currentSpeed / user.userCar.v_backward;
            this._drawFillArea(prc);

            // Вывод текущей скорости
            currentSpeed = (currentSpeed / 1000 * 3600);
            currentSpeedWords = (currentSpeed.toFixed(1)).split('.');
            this.topTextDiv1.text(currentSpeedWords[0] + '.');
            this.topTextDiv2.text(currentSpeedWords[1]);
            this.compactViewSpeedTextDiv.text(currentSpeed.toFixed(1) + ' km/h');
            if (this.keyBoardControl) {
                this.setSpeedHandleValue(prc);
                this.changeReverse(this.lastSpeed < 0)
            }
        }
    };

    WCruiseControl.prototype.delFromVisualManager = function () {
        this.car = null;

        this.speedHandleDiv.unbind();
        this.speedHandleDiv.draggable("destroy");
        this.scaleArea.unbind();
        this.reverseDiv.unbind();
        this.stopDiv.unbind();
        this.visibleButtonDiv.unbind();
        wCruiseControl = null;

        this.compactView.remove();
        this.mainDiv.remove();

        _super.prototype.delFromVisualManager.call(this);
    };

    return WCruiseControl;
})(VisualObject);

var wCruiseControl;