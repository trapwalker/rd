/*
 * Виджет круиз контроля
 */
var WCruiseControl = (function (_super) {
    __extends(WCruiseControl, _super);

    function WCruiseControl(car, div_parent) {
        _super.call(this, [car]);
        this.car = car;

        this.parentDiv = $('#' + div_parent);
        this.mainDiv = $("<div id='cruiseControlMainDiv' class='cruise-control-speedMain'></div>");
        this.parentDiv.append(this.mainDiv);

        // Верхний див (индикатор текущей скорости)
        this.topDiv = $("<div id='cruiseControlTopDiv' class='cruise-control-top'></div>");
        this.mainDiv.append(this.topDiv);

        // Средний див (слайдер)
        this.mediumDiv = $("<div id='cruiseControlMediumDiv' class='cruise-control-medium'></div>");
        this.mainDiv.append(this.mediumDiv);

        // Каретка
        this.speedHandleAreaDiv = $("<div id='cruiseControlSpeedHandleAreaDiv' class='cruise-control-speedHandleArea '></div>");
        this.mediumDiv.append(this.speedHandleAreaDiv);
        this.speedHandleAreaDiv.click(this, this.onClickSpeedHandleArea);

        this.speedHandleDiv = $("<div id='cruiseControlSpeedHandleDiv' class='cruise-control-speedHandle'></div>");
        this.speedHandleAreaDiv.append(this.speedHandleDiv);
        this.speedHandleDiv.draggable({
            axis: "y",
            containment: "parent",
            scroll: false
        });

        this.speedHandleSpan1 = $("<span id='cruiseControlSpeedHandleSpan1'></span>");
        this.speedHandleSpan2 = $("<span id='cruiseControlSpeedHandleSpan2'></span>");

        this.speedHandleDiv.append(this.speedHandleSpan1);
        this.speedHandleDiv.append(this.speedHandleSpan2);

        this.speedHandleDiv.bind( "dragstart", this, this.onStartSpeedHandle);
        this.speedHandleDiv.bind( "drag", this, this.onMoveSpeedHandle);
        this.speedHandleDiv.bind( "dragstop", this, this.onStopSpeedHandle);

        // Шкала
        this.scaleArea = $("<div id='cruiseControlScaleArea' class='cruise-control-scaleArea sublayers-unclickable'></div>");
        this.mediumDiv.append(this.scaleArea);

        // Ограничитель зон
        this.zoneArea = $("<div id='cruiseControlZoneArea' class='cruise-control-zoneArea sublayers-unclickable'></div>");
        this.mediumDiv.append(this.zoneArea);

        // Нижний див (кнопка стоп и и задний ход)
        this.bottomDiv = $("<div id='cruiseControlBottomDiv' class='cruise-control-bottom sublayers-unclickable'></div>");
        this.mainDiv.append(this.bottomDiv);

        // Кнопка "задний ход"
        this.reverseDiv = $("<div id='cruiseControlReverseDiv' class='cruise-control-reverse'></div>");
        this.bottomDiv.append(this.reverseDiv);

        // Кнопка "стоп"
        this.stopDiv = $("<div id='cruiseControlStopDiv' class='cruise-control-stop'></div>");
        this.bottomDiv.append(this.stopDiv);
    }

    WCruiseControl.prototype.onClickSpeedHandleArea = function (event) {
        console.log('WCruiseControl.prototype.onClickSpeedHandleArea', event.data);
    };

    WCruiseControl.prototype.onStartSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onStartSpeedHandle', ui.position.top);
    };

    WCruiseControl.prototype.onMoveSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onMoveSpeedHandle', user.userCar.maxSpeed / 1000 * 3600);
        var currentSpeed = (user.userCar.maxSpeed / 1000 * 3600) * (1 - (ui.position.top / 333));
        event.data.speedHandleSpan1.text(Math.floor(currentSpeed) + '.');
        event.data.speedHandleSpan2.text(Math.floor((currentSpeed - Math.floor(currentSpeed)) * 10));
    };

    WCruiseControl.prototype.onStopSpeedHandle = function (event, ui) {
        //console.log('WCruiseControl.prototype.onStopSpeedHandle', ui.position.top, event.data);
    };






    WCruiseControl.prototype._getCC = function () {
        //return $('#sliderSpeedSlider').slider("value");
    };

    WCruiseControl.prototype._slidechange = function (event) {
        //console.log('WSpeedSlider.prototype._slidechange');
        //var slider = event.data.self;
        //clientManager.sendSetSpeed(slider._getCC());
    };

    WCruiseControl.prototype._slide = function (event, ui) {
       // $('#sliderSpeedCarriageLabel').text((ui.value / 1000. * 3600).toFixed(0));
    };

    WCruiseControl.prototype._setRealSpeed = function (newSpeed) {
        /*var prc = (newSpeed * 100) / this.options.max;
        if (prc > 99) prc = 99;
        if (prc < 0) prc = 0;
        // если сделать ниже не 99,5; а 100, то не видно стрелки при стоящей машине, если сделать 99, то она сливается со шкалой.
        prc = 99.5 - prc;
        $('#slider-speed-filler-arrow').css('top', prc + '%');
        $('#slider-speed-filler').css('top', prc + '%');
        $('#speedRealValue').text((newSpeed  / 1000. * 3600).toFixed(1));
        */
    };

    WCruiseControl.prototype._setGround = function (newGround) {
        //for (var i = 0; i < 4; i++)
        //    $('#' + this.options.leftIcons[i]).css('opacity', 0.4);
        //$('#' + this.options.leftIcons[newGround]).css('opacity', 1);
    };

    WCruiseControl.prototype._onStop = function () {
        //clientManager.sendStopCar();
    };

    // todo: методы для переинициализации. Расскоментить при необходимости
    /*
     WSpeedSlider.prototype.setSpeed = function (value) {
     //console.log('WSpeedSlider.prototype.setSpeed');
     return $('#sliderSpeedSlider').slider("value", value);
     };

     WSpeedSlider.prototype.setMaxSpeed = function (max_speed) {
     console.log('WSpeedSlider.prototype.setMaxSpeed');
     $('#sliderSpeedSlider').slider("option", "max", max_speed);
     this.options.max = max_speed;
     return this;
     };
     */

    WCruiseControl.prototype.change = function(time){
        //console.log('WSpeedSlider.prototype.change');
        //this._setRealSpeed(this.car.getCurrentSpeed(time));
        // todo: запросить тип местности
    };

    WCruiseControl.prototype.delFromVisualManager = function () {
        // todo: удалить свою вёрстку
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WCruiseControl;
})(VisualObject);