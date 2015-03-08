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

        {   this.parentDiv = $('#' + div_parent);
            this.mainDiv = $("<div id='cruiseControlSpeedMainDiv'></div>");
            this.parentDiv.append(this.mainDiv);
        }

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
        this.scaleArea = $("<div id='cruiseControlScaleArea' class='cruise-control-scaleArea sublayers-unclickable'></div>");
        this.mediumDiv.append(this.scaleArea);

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

        this.zoneIconAreaDiv.append(this.zoneDirtIconDiv);
        this.zoneIconAreaDiv.append(this.zoneWoodIconDiv);
        this.zoneIconAreaDiv.append(this.zoneRoadIconDiv);
        this.zoneIconAreaDiv.append(this.zoneWaterIconDiv);

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
        this._setSpeedHandle(0);
    }

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
        var currentSpeed = (user.userCar.maxSpeed / 1000 * 3600) * prc;
        this.speedHandleDiv1.text(Math.floor(currentSpeed) + '.');
        this.speedHandleDiv2.text(Math.floor((currentSpeed - Math.floor(currentSpeed)) * 10));
    };

    WCruiseControl.prototype._setSpeedHandle = function(prc) {
        var topValue = (1 - prc) * this.constScaleHeight;
        this.speedHandleDiv.css({top: topValue});
        this._setSpeedHandleText(prc);
    };

    WCruiseControl.prototype._onMoveSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onMoveSpeedHandle');
        event.data._setSpeedHandleText(1 - (ui.position.top / event.data.constScaleHeight));
    };

    WCruiseControl.prototype._onStopSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onStopSpeedHandle', ui.position.top, event.data);
        var currentSpeed = user.userCar.maxSpeed * (1 - (ui.position.top / event.data.constScaleHeight));
        clientManager.sendSetSpeed(currentSpeed);
        document.getElementById('map').focus();
    };

    WCruiseControl.prototype._onClickStop = function (event) {
        //console.log('WCruiseControl.prototype._onClickStop');
        clientManager.sendStopCar();
        event.data._setSpeedHandle(0);
        document.getElementById('map').focus();
    };

    WCruiseControl.prototype._onClickR = function (event) {
        //console.log('WCruiseControl.prototype._onClickR');
        document.getElementById('map').focus();
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
            .stroke(this.svg_params.fill_area.stroke);

        this.close_line = this.svgScaleArea.line(topLeft.x, topLeft.y, topRight.x, topRight.y + 0.0001)
            .stroke({width: 1, color: this.svg_params.gradients.line_grad3});
    };

    WCruiseControl.prototype.getSpeedHandleValue = function() {
        //console.log('WCruiseControl.prototype.getSpeedHandleValue');
        return user.userCar.maxSpeed * (1 - (this.speedHandleDiv.position().top / this.constScaleHeight))
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
            // Обновление шкалы скорости
            var prc = currentSpeed / user.userCar.maxSpeed;
            this._drawFillArea(prc);

            // Вывод текущей скорости
            currentSpeed = (currentSpeed / 1000 * 3600);
            this.topTextDiv1.text(Math.floor(currentSpeed) + '.');
            this.topTextDiv2.text(Math.floor((currentSpeed - Math.floor(currentSpeed)) * 10));

            if (this.keyBoardControl) this._setSpeedHandle(prc);

            // Сохраняем последнюю скорость
            this.lastSpeed = currentSpeed;
        }
    };

    return WCruiseControl;
})(VisualObject);

var wCruiseControl;