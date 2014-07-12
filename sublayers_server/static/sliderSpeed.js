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
        //$('#' + names.sliderDiv + ' span:first-child').addClass('slider-speed-carriage-defualt');
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


        // создание дивов

        // создание дива Цифровой реальной скорости
        var nodeDigitalSpeed = '<div class="slider-speed-digital-main"'> +
                '<div class="slider-speed-digital-value"><span id="speedRealValue">0</span></div>' +
                '<div class="slider-speed-digital-label"><span>KM/H</span></div>'+
            '</div>';

        var nodeSlider = '<div id="' + this.options.sliderDiv + '"></div>';

        // добавление дивов в родительский див
        $('#' + this.options.parentDiv).append(nodeDigitalSpeed);
        $('#' + this.options.parentDiv).append(nodeSlider);

        // создание слайдера

        $('#'+this.options.sliderDiv).slider({
            max: this.options.max,
            min: this.options.min,
            orientation: this.options.orientation,
            step: this.options.step
        })
            .on('slidechange', {id: this._id}, this.change);

        // установка дефолтных css классов
        $('#' + names.valueDiv).addClass('slider-speed-value-default'); // text
        $('#' + names.sliderDiv).addClass('slider-speed-slider-default');
        $('#' + names.parentDiv).addClass('slider-speed-parent-default');

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


    SliderSpeed.prototype.change = function (event, ui) {
        //event.preventDefault();
   //     var slider = _SlidersMass[event.data.id];
   //     $('#' + slider.options.valueDiv).text($('#' + slider.options.sliderDiv).slider("value"));
   //     if(slider.options.onChange)
   //         slider.options.onChange();
    }

    SliderSpeed.prototype.getSpeed = function () {
        return $('#' + this.options.sliderDiv).slider("value");
    }

    SliderSpeed.prototype.setSpeed = function (newSpeed) {
        $('#' + this.options.sliderDiv).slider("value", newSpeed);
    }

    SliderSpeed.prototype.delete = function () {
        // удаление всех дом элементов
        // удаление из массива слайдеров
        delete _SpeedSlidersMass[this._id];
    }

    SliderSpeed.prototype.genSliderNamesElement = function() {
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



    return SliderSpeed;
})();


var _SlidersMass = [];


