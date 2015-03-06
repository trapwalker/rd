/*
 * Виджет круиз контроля
 */

var WCruiseControl = (function (_super) {
    __extends(WCruiseControl, _super);

    function WCruiseControl(car) {
        _super.call(this, [car]);
        this.car = car;

        this.parentDiv = $('#speedSetDivForSpeedSlider');
        this.parentDiv.addClass('cruise-control-main');
        this.mainDiv = $("<div id='mainCruiseDiv' class='sublayers-unclickable'></div>");
        this.parentDiv.append(this.mainDiv);






        /*
        // создание слайдера скорости
        this.options = {
            orientation: 'vertical',
            height: 320,
            max: car.maxSpeed,
            min: 1,
            step: 1
        };

        // сразу же применить родительскую css для родительского дива
        var mainParent = $('#' + this.options.parent);

        mainParent.append('<div id="speedSetDivForSpeedSliderRumble"></div>');
        var parent = $('#speedSetDivForSpeedSliderRumble');

        // создание и добавление двух главных дивов - правого и левого.
        var nodeParentLeft = '<div id="sliderSpeedLeft" class="slider-speed-left-main"></div>';
        var nodeParentRight = '<div id="sliderSpeedRight"class="slider-speed-right-main"></div>';
        parent.append(nodeParentLeft);
        parent.append(nodeParentRight);

        // создание левых дивов-картинок
        var nodeLeft1 = '<div id="slider-speed-left-hwy"></div>';
        var nodeLeft2 = '<div id="slider-speed-left-rd"></div>';
        var nodeLeft3 = '<div id="slider-speed-left-drt"></div>';
        var nodeLeft4 = '<div id="slider-speed-left-frst"></div>';

        // добавление всех дивов-картинок
        $('#sliderSpeedLeft').append(nodeLeft1).append(nodeLeft2).append(nodeLeft3).append(nodeLeft4);
        this.options.leftIcons = [];
        this.options.leftIcons[0] = 'slider-speed-left-hwy';
        this.options.leftIcons[1] = 'slider-speed-left-rd';
        this.options.leftIcons[2] = 'slider-speed-left-drt';
        this.options.leftIcons[3] = 'slider-speed-left-frst';
        this._setGround(1);

        // создание дива Цифровой реальной скорости
        var nodeDigitalSpeed = '<div class="slider-speed-digital-main">' +
            '<div class="slider-speed-digital-value"><span id="speedRealValue">0</span></div>' +
            '<div class="slider-speed-digital-label"><span>KM/H</span></div>' +
            '</div>';

        // Создание дива слайдера
        var nodeSlider = '<div id="sliderSpeedSlider""></div>';

        // добавление дивов скорости в правый див
        $('#sliderSpeedRight').append(nodeDigitalSpeed);
        $('#sliderSpeedRight').append(nodeSlider);


        // создание слайдера
        $('#sliderSpeedSlider').slider({
            max: this.options.max,
            min: this.options.min,
            orientation: this.options.orientation,
            step: this.options.step,
            value: (this.options.max * 0.75).toFixed(0)
        })
            .on('slidechange', {self: this}, this._slidechange) // отправка сообщений серверу
            .on('slide', this._slide);                          // чтобы менялись циферки внутри каретки

        // настройка слайдера
        $('#sliderSpeedSlider').addClass('slider-speed-slider sublayers-clickable');
        $('#sliderSpeedSlider').css("height", this.options.height);
        $('#sliderSpeedSlider').css("width", '31px');
        $('#sliderSpeedSlider').css("border", '0px');
        $('#sliderSpeedSlider').css("border-radius", '0px');
        $('#sliderSpeedSlider').removeClass('ui-widget-content');
        $('#sliderSpeedSlider').css("z-index", '4');

        // Изменение ползунка
        $('#sliderSpeedSlider span:first-child').addClass('slider-speed-carriage');
        $('#sliderSpeedSlider span:first-child').css('width', '39px');
        $('#sliderSpeedSlider span:first-child').css('height', '31px');
        //$('#sliderSpeedSlider span:first-child').css('background', 'transparent url(./img/CruiseControl/if_spd_slider.png) 50% 50% no-repeat');
        $('#sliderSpeedSlider span:first-child').css('border', '0px');
        $('#sliderSpeedSlider span:first-child').css('margin-left', '1px');
        $('#sliderSpeedSlider span:first-child').css('margin-bottom', '-15.5px');
        $('#sliderSpeedSlider span:first-child').css("z-index", '5');
        $('#sliderSpeedSlider span:first-child').css("cursor", 'pointer'); // т.к. класс sublayers-clickable не применяется

        var newSpan = '<span id="sliderSpeedCarriageLabel" class="slider-speed-carriage-label sublayers-clickable">0</span>';
        $('#sliderSpeedSlider span:first-child').append(newSpan);

        // Создание и добавление фона шкалы
        var nodeSliderBarFillerMain = '<div class="slider-speed-filler-main sublayers-clickable">' +
            '<div id="slider-speed-filler-arrow"></div>' +
            '<div id="slider-speed-filler"></div>' +
            '</div>';
        $('#sliderSpeedSlider').append(nodeSliderBarFillerMain);
        this._setRealSpeed(0);

        // Создание кнопки стоп
        var nodeStopMain = '<div id="sliderSpeedStopButton" class="slider-speed-stop-main sublayers-clickable"></div>';
        // добавление дива кнопки стоп в правый див
        $('#sliderSpeedRight').append(nodeStopMain);
        $('#sliderSpeedStopButton').on('click', {self: this}, this._onStop);

        // создание и расстановка текста
        var spanSpeedCruiseControlText = '<span id="spanSpeedCruiseControlText" class="control-zoom-speed-vertical-text">' +
            'Cruise Control</span>';
        var spanSpeedLimitsText = '<span id="spanSpeedLimitsText" class="control-zoom-speed-vertical-text">' +
            'Limits</span>';
        parent.append(spanSpeedCruiseControlText);
        parent.append(spanSpeedLimitsText);

        this._slide(null, {value: (this.options.max * 0.75).toFixed(0)});
        this.change(clock.getCurrentTime());
        */
    }

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

