/*
 * Виджет круиз контроля
 */
var WCruiseControl = (function (_super) {
    __extends(WCruiseControl, _super);

    function WCruiseControl(car, div_parent) {
        _super.call(this, [car]);
        this.car = car;

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

        this.speedHandleDiv = $("<div id='cruiseControlSpeedHandleDiv' class='cruise-control-speedHandle'></div>");
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

        this.speedHandleDiv.bind( "drag", this, this.onMoveSpeedHandle);
        this.speedHandleDiv.bind( "dragstop", this, this.onStopSpeedHandle);

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
                         .stroke({width: 2, color: this.svg_color});

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

        // Нижний див (кнопка стоп и и задний ход)
        this.bottomDiv = $("<div id='cruiseControlBottomDiv' class='sublayers-unclickable'></div>");
        this.mainDiv.append(this.bottomDiv);

        // Кнопка "задний ход"
        this.reverseDiv = $("<div id='cruiseControlReverseDiv' class='cruise-control-reverse'></div>");
        this.bottomDiv.append(this.reverseDiv);

        // Кнопка "стоп"
        this.stopDiv = $("<div id='cruiseControlStopDiv' class='cruise-control-stop'></div>");
        this.bottomDiv.append(this.stopDiv);

        this.change()
    }

    WCruiseControl.prototype._init_params = function() {
        this.svg_color = "#00FF00";
        var self = this;
        this.svg_params = {
            // градиенты
            gradients: {
                line_grad1: this.svgScaleArea.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_color, opacity: 1});
                    stop.at({ offset: 0.5, color: self.svg_color, opacity: 1});
                    stop.at({ offset: 1, color: self.svg_color, opacity: 0});
                }),
                line_grad2: this.svgScaleArea.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_color, opacity: 0});
                    stop.at({ offset: 0.2, color: self.svg_color, opacity: 1});
                    stop.at({ offset: 0.8, color: self.svg_color, opacity: 1});
                    stop.at({ offset: 1, color: self.svg_color, opacity: 0});
                })
            },

            // настройка заливки
            fill_area: {
                stroke: {width: 0.0},
                fill: {color: this.svg_color, opacity: 0.3},
                cl_stroke: {
                    opacity: 1,
                    color: this.svg_color
                }
            }
        };
    };

    WCruiseControl.prototype.onMoveSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onMoveSpeedHandle');
        var currentSpeed = (user.userCar.maxSpeed / 1000 * 3600) * (1 - (ui.position.top / event.data.constScaleHeight));
        event.data.speedHandleDiv1.text(Math.floor(currentSpeed) + '.');
        event.data.speedHandleDiv2.text(Math.floor((currentSpeed - Math.floor(currentSpeed)) * 10));
    };

    WCruiseControl.prototype.onStopSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onStopSpeedHandle', ui.position.top, event.data);
    };

    WCruiseControl.prototype.drawFillArea = function (prc) {
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

        this.close_line = this.svgScaleArea.line(topLeft.x, topLeft.y, topRight.x, topRight.y)
            .stroke(this.svg_params.fill_area.cl_stroke);
    };

    WCruiseControl.prototype.change = function() {
        //console.log('WCruiseControl.prototype.change');
        var currentSpeed = user.userCar.getCurrentSpeed(clock.getCurrentTime());
        var prc = currentSpeed / user.userCar.maxSpeed;
        this.drawFillArea(prc);
        currentSpeed = (currentSpeed / 1000 * 3600);
        this.topTextDiv1.text(Math.floor(currentSpeed) + '.');
        this.topTextDiv2.text(Math.floor((currentSpeed - Math.floor(currentSpeed)) * 10));
    };

    return WCruiseControl;
})(VisualObject);