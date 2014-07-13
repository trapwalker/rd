var SliderZoom = (function () {
    function SliderZoom(options) {
        this.options = {
            parentDiv: '',
            sliderDiv: '',
            valueDiv: '',
            orientation: 'vertical',
            max: 100,
            min: 0,
            step: 1,
            carriageHeight: 1, // in em
            carriageWidth: 1, // in em
            height: 100, // px
            width: 5, // px
            onChange: '',
            parentCss: ''
        };

        this._id = _SlidersMass.length;
        _SlidersMass[this._id]=this;

        if (options) {
            if (options.parentDiv) this.options.parentDiv = options.parentDiv;
            if (options.orientation) this.options.orientation = options.orientation;
            if (options.max) this.options.max = options.max;
            if (options.min) this.options.min = options.min;
            if (options.step) this.options.step = options.step;
            if (options.carriageHeight) this.options.carriageHeight = options.carriageHeight;
            if (options.carriageWidth) this.options.carriageWidth = options.carriageWidth;
            if (options.height) this.options.height = options.height;
            if (options.width) this.options.width = options.width;
            if (options.onChange) this.options.onChange = options.onChange;
            if (options.parentCss) this.options.parentCss = options.parentCss;
        }

        var names = this.genSliderNamesElement();
        this.options.sliderDiv = names.sliderDiv;
        this.options.valueDiv = names.valueDiv;


        // создание 4 дивов
        var nodeText = '<div id="' + this.options.valueDiv+'"><span id="' + this.options.parentDiv + '_text">0</span></div>';
        var nodePlus = '<div id="' + this.options.parentDiv + '_sliderPlus">' +
            '<input id="'+this.options.parentDiv+'_btnPlus" type="image" src="img/green-plus-for-speed.png" value="Увеличить скорость"></div>';
        var nodeSlider = '<div id="' + this.options.sliderDiv + '"></div>';
        var nodeMinus = '<div id="' + this.options.parentDiv + '_sliderMinus">' +
            '<input id="'+this.options.parentDiv+'_btnMinus" type="image" src="img/green-minus-for-speed.png" value="Уменьшить скорость"></div>';

        // добавление дивов в родительский див
        $('#' + this.options.parentDiv).append(nodeText);
        $('#' + this.options.parentDiv).append(nodePlus);
        $('#' + this.options.parentDiv).append(nodeSlider);
        $('#' + this.options.parentDiv).append(nodeMinus);

        $('#' + names.btnPlus).on('click', {id: this._id}, this.plusFunc);
        $('#' + names.btnMinus).on('click', {id: this._id}, this.minusFunc);

        // создание слайдера

        $('#'+this.options.sliderDiv).slider({
            max: this.options.max,
            min: this.options.min,
            orientation: this.options.orientation,
            step: this.options.step
        })
            .on('slidechange', {id: this._id}, this.change);

        // установка дефолтных css классов
        $('#' + names.btnPlus).addClass('slider-zoom-btn-plus-default'); // +
        $('#' + names.btnMinus).addClass('slider-zoom-btn-minus-default'); // -
        $('#' + names.valueDiv).addClass('slider-zoom-value-default'); // text
        $('#' + names.sliderPlus).addClass('slider-zoom-plus-default');
        $('#' + names.sliderMinus).addClass('slider-zoom-minus-default');
        $('#' + names.sliderDiv).addClass('slider-zoom-slider-default');
        $('#' + names.sliderDiv + ' span:first-child').addClass('slider-speed-carriage-default');
        $('#' + names.parentDiv).addClass('slider-zoom-parent-default');

        // Изменение размеров ползунка
        $('#' + this.options.sliderDiv+' span:first-child').css("height", this.options.carriageHeight+'em');
        $('#' + this.options.sliderDiv+' span:first-child').css("margin-bottom", -this.options.carriageHeight+'em');

        $('#' + this.options.sliderDiv).css("height", this.options.height);
        $('#' + names.sliderDiv + ' span:first-child').css("background", "#009900");
        $('#' + names.sliderDiv + ' span:first-child').css("border-color", "#00FF00");


        // установка дополнительных css классов
        if(this.options.parentCss) {
            $('#' + names.parentDiv).addClass(this.options.parentCss);
        }
    }


    SliderZoom.prototype.plusFunc = function (event, ui) {
        var slider = _SlidersMass[event.data.id];
        $('#' + slider.options.sliderDiv).slider("value", $('#' + slider.options.sliderDiv).slider("value") + slider.options.step);
    }

    SliderZoom.prototype.minusFunc = function (event, ui) {
        var slider = _SlidersMass[event.data.id];
        $('#' + slider.options.sliderDiv).slider("value", $('#' + slider.options.sliderDiv).slider("value") - slider.options.step);
    }

    SliderZoom.prototype.change = function (event, ui) {
        //event.preventDefault();
        var slider = _SlidersMass[event.data.id];
        $('#' + slider.options.valueDiv).text($('#' + slider.options.sliderDiv).slider("value"));
        if(slider.options.onChange)
            slider.options.onChange();
    }

    SliderZoom.prototype.getZoom = function () {
        return $('#' + this.options.sliderDiv).slider("value");
    }

    SliderZoom.prototype.setZoom = function (newZoom) {
        $('#' + this.options.sliderDiv).slider("value", newZoom);
    }

    SliderZoom.prototype.delete = function () {
        // удаление всех дом элементов
        // удаление из массива всех слайдеров
        delete _SlidersMass[this._id];
    }

    SliderZoom.prototype.genSliderNamesElement = function() {
        var res = {
            parentDiv: this.options.parentDiv,
            sliderDiv: this.options.parentDiv + '_slider',
            valueDiv: this.options.parentDiv + '_valueOfSlider',
            btnPlus: this.options.parentDiv+'_btnPlus',
            btnMinus: this.options.parentDiv+'_btnMinus',
            sliderPlus: this.options.parentDiv+'_sliderPlus',
            sliderMinus: this.options.parentDiv+'_sliderMinus'
        }
        return res;
    }

    return SliderZoom;
})();

var SliderSpeed = (function () {
    function SliderSpeed(options) {
        this.options = {
            parent: '',
            parentCss: '',
            orientation: 'vertical',
            max: 100,
            min: 0,
            step: 1,
            height: 100, // px
            onChange: ''
        };

        this._id = _SlidersMass.length;
        _SlidersMass[this._id]=this;

        if (options) {
            if (options.parent) this.options.parent = options.parent;
            if (options.parentCss) this.options.parentCss = options.parentCss;
            if (options.orientation) this.options.orientation = options.orientation;
            if (options.max) this.options.max = options.max;
            if (options.min) this.options.min = options.min;
            if (options.step) this.options.step = options.step;
            if (options.height) this.options.height = options.height;
            if (options.onChange) this.options.onChange = options.onChange;
        }
        // сразу же применить родительскую css для родительского дива
        $('#' + this.options.parent).addClass(this.options.parentCss);

        // создание и добавление двух главных дивов - правого и левого.
        var nodeParentLeft = '<div id="sliderSpeedLeft" class="slider-speed-left-main"></div>';
        var nodeParentRight = '<div id="sliderSpeedRight"class="slider-speed-right-main"></div>';
        $('#' + this.options.parent).append(nodeParentLeft);
        $('#' + this.options.parent).append(nodeParentRight);

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
        this.setGround(1);

        // создание дива Цифровой реальной скорости
        var nodeDigitalSpeed = '<div class="slider-speed-digital-main">' +
                '<div class="slider-speed-digital-value"><span id="speedRealValue">0</span></div>' +
                '<div class="slider-speed-digital-label"><span>KM/H</span></div>'+
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
            step: this.options.step
        })
            .on('slidechange', {id: this._id}, this.change) // отправка сообщений серверу
            .on('slide', this._slide);                      // чтобы менялись циферки внутри каретки

        // настройка слайдера
        $('#sliderSpeedSlider').addClass('slider-speed-slider');
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
        $('#sliderSpeedSlider span:first-child').css('background', 'transparent url(./img/CruiseControl/if_spd_slider.png) 50% 50% no-repeat');
        $('#sliderSpeedSlider span:first-child').css('border', '0px');
        $('#sliderSpeedSlider span:first-child').css('margin-bottom', '-15.5px');
        $('#sliderSpeedSlider span:first-child').css("z-index", '5');

        var newSpan = '<span id="sliderSpeedCarriageLabel" class="slider-speed-carriage-label">0</span>';
        $('#sliderSpeedSlider span:first-child').append(newSpan);

        // Создание и добавление фона шкалы
        var nodeSliderBarFillerMain = '<div class="slider-speed-filler-main">'+
            '<div id="slider-speed-filler-arrow"></div>'+
            '<div id="slider-speed-filler"></div>'+
            '</div>';
        $('#sliderSpeedSlider').append(nodeSliderBarFillerMain);
        this.setRealSpeed(0);

        // Создание кнопки стоп
        var nodeStopMain = '<div id="sliderSpeedStopButton" class="slider-speed-stop-main">' +
            '<span>STOP</span>' +
            '</div>';
        // добавление дива кнопки стоп в правый див
        $('#sliderSpeedRight').append(nodeStopMain);
        $('#sliderSpeedStopButton').click(_SpeedSlider_StopButton);

        // создание и расстановка текста

    }

    SliderSpeed.prototype.change = function (event, ui) {
        var slider = _SlidersMass[event.data.id];
        if(slider.options.onChange)
            slider.options.onChange();
    }

    SliderSpeed.prototype._slide = function (event, ui) {
        $('#sliderSpeedCarriageLabel').text(ui.value);
    }

    SliderSpeed.prototype.setRealSpeed = function (newSpeed) {
        var prc= (newSpeed * 100) / this.options.max;
        if(prc > 99) prc = 99;
        if(prc < 0) prc = 0;
        prc = 99-prc;
        $('#slider-speed-filler-arrow').css('top', prc+'%');
        $('#slider-speed-filler').css('top', prc+'%');
        $('#speedRealValue').text(newSpeed);
    }

    SliderSpeed.prototype.setGround = function (newGround) {
        for (var i = 0; i < 4; i++) {
            $('#' + this.options.leftIcons[i]).css('opacity', 0.4);
        }
        $('#' + this.options.leftIcons[newGround]).css('opacity', 1);
    }

    SliderSpeed.prototype.getSpeed = function () {
        return $('#sliderSpeedSlider').slider("value");
    }

    return SliderSpeed;
})();



// функции, необходимые для логики работы слайдеров
_SpeedSlider_StopButton = function () {
    $('#sliderSpeedSlider').slider("value", 0);
    $('#sliderSpeedCarriageLabel').text(0);
}


var _SlidersMass = [];


