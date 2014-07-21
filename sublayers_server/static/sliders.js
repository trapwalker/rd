var SliderZoom = (function () {
    function SliderZoom(options) {
        this.options = {
            parentDiv: '',
            max: 100,
            min: 0,
            step: 1,
            height: 100, // px
            width: 5, // px
            onChange: ''
        };

        var parent = options.parentDiv;
        // сразу же применение стиля для зум-парент
        $('#'+parent).addClass('slider-zoom-parent');

        this._id = _SlidersMass.length;
        _SlidersMass[this._id] = this;

        if (options) {
            if (options.parentDiv) this.options.parentDiv = options.parentDiv;
            if (options.max) this.options.max = options.max;
            if (options.min) this.options.min = options.min;
            if (options.step) this.options.step = options.step;
            if (options.height) this.options.height = options.height;
            if (options.width) this.options.width = options.width;
            if (options.onChange) this.options.onChange = options.onChange;
        }

        // создание 4 дивов
        var nodePlus = '<input id="Zoom_btnPlus" type="image" src="img/control_zoom/ctrl_zm_plus.png" value="Приблизить">';
        var nodeBar = '<div id="Zoom_sliderBar"></div>';
        var nodeSlider = '<div id="Zoom_slider"></div>';
        var nodeMinus = '<input id="Zoom_btnMinus" type="image" src="img/control_zoom/ctrl_zm_minus.png" value="Отдалить">';


        // добавление дивов в родительский див
        $('#' + parent).append(nodePlus);
        $('#' + parent).append(nodeBar);
        $('#Zoom_sliderBar').append(nodeSlider);
        $('#' + parent).append(nodeMinus);

        $('#Zoom_btnPlus').on('click', {id: this._id}, this.plusFunc);
        $('#Zoom_btnMinus').on('click', {id: this._id}, this.minusFunc);

        // создание слайдера

        $('#Zoom_slider').slider({
            max: this.options.max,
            min: this.options.min,
            orientation: 'vertical',
            step: this.options.step
        })
            .on('slidechange', {id: this._id}, this.change);

        // Изменение размеров ползунка
        $('#Zoom_slider').removeClass('ui-widget-content');
        $('#Zoom_slider span:first-child').addClass('slider-zoom-carriage');
        $('#Zoom_slider span:first-child').css('width', '39px');
        $('#Zoom_slider span:first-child').css('height', '20px');
        $('#Zoom_slider span:first-child').css('background', 'green url(./img/control_zoom/ctrl_zm_slider.png) 50% 50% no-repeat');
        $('#Zoom_slider span:first-child').css('border', '0px');
        $('#Zoom_slider span:first-child').css('left', '-7px');
        $('#Zoom_slider span:first-child').css('margin-bottom', '-12.5px');

    }


    SliderZoom.prototype.plusFunc = function (event, ui) {
        var slider = _SlidersMass[event.data.id];
        $('#Zoom_slider').slider("value", $('#Zoom_slider').slider("value") + slider.options.step);
    }

    SliderZoom.prototype.minusFunc = function (event, ui) {
        var slider = _SlidersMass[event.data.id];
        $('#Zoom_slider').slider("value", $('#Zoom_slider').slider("value") - slider.options.step);
    }

    SliderZoom.prototype.change = function (event, ui) {
        //event.preventDefault();
        var slider = _SlidersMass[event.data.id];
        if (slider.options.onChange)
            slider.options.onChange();
    }

    SliderZoom.prototype.getZoom = function () {
        return $('#Zoom_slider').slider("value");
    }

    SliderZoom.prototype.setZoom = function (newZoom) {
        $('#Zoom_slider').slider("value", newZoom);
    }

    SliderZoom.prototype.delete = function () {
        // удаление всех дом элементов
        // удаление из массива всех слайдеров
        delete _SlidersMass[this._id];
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
            onChange: '',
            onStop: ''
        };

        this._id = _SlidersMass.length;
        _SlidersMass[this._id] = this;

        if (options) {
            if (options.parent) this.options.parent = options.parent;
            if (options.parentCss) this.options.parentCss = options.parentCss;
            if (options.orientation) this.options.orientation = options.orientation;
            if (options.max) this.options.max = options.max;
            if (options.min) this.options.min = options.min;
            if (options.step) this.options.step = options.step;
            if (options.height) this.options.height = options.height;
            if (options.onChange) this.options.onChange = options.onChange;
            if (options.onStop) this.options.onStop = options.onStop;
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
        var nodeSliderBarFillerMain = '<div class="slider-speed-filler-main">' +
            '<div id="slider-speed-filler-arrow"></div>' +
            '<div id="slider-speed-filler"></div>' +
            '</div>';
        $('#sliderSpeedSlider').append(nodeSliderBarFillerMain);
        this.setRealSpeed(0);

        // Создание кнопки стоп
        var nodeStopMain = '<div id="sliderSpeedStopButton" class="slider-speed-stop-main">' +
            '<span>STOP</span>' +
            '</div>';
        // добавление дива кнопки стоп в правый див
        $('#sliderSpeedRight').append(nodeStopMain);
        $('#sliderSpeedStopButton').on('click', {id: this._id}, this._onStop);

        // создание и расстановка текста

    }

    SliderSpeed.prototype.change = function (event, ui) {
        var slider = _SlidersMass[event.data.id];
        if (typeof(slider.options.onChange) === "function")
            slider.options.onChange();
    }

    SliderSpeed.prototype._onStop = function (event, ui) {
        var slider = _SlidersMass[event.data.id];
        if (typeof(slider.options.onStop) === "function")
            slider.options.onStop();
    }

    SliderSpeed.prototype._slide = function (event, ui) {
        $('#sliderSpeedCarriageLabel').text(ui.value);
    }

    SliderSpeed.prototype.setRealSpeed = function (newSpeed) {
        var prc = (newSpeed * 100) / this.options.max;
        if (prc > 99) prc = 99;
        if (prc < 0) prc = 0;
        prc = 99 - prc;
        $('#slider-speed-filler-arrow').css('top', prc + '%');
        $('#slider-speed-filler').css('top', prc + '%');
        $('#speedRealValue').text(newSpeed.toFixed(1));
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

var ProgressBarFuel = (function () {
    function ProgressBarFuel(options) {
        this.options = {
            parent: '',
            max: 100
        }
        var parent = options.parent;
        if (options.max)
            this.options.max = options.max;
        this.koeff = 100 / this.options.max;
        // Добавление класса для родителя
        $('#' + parent).addClass('pbar-fuel-parent');
        // создать 2 дива: левый и правый
        var nodeParentLeft = '<div id="pbarFuelLeft"></div>';
        var nodeParentRight = '<div id="pbarFuelRight"></div>';
        // Добавить их внутрь parent
        $('#' + parent).append(nodeParentLeft);
        $('#' + parent).append(nodeParentRight);
        // Создать 3 дива для правого дива: цифры. шкала, надпись
        var nodeRightDigits = '<div id="pbarFuelRightDigits">' +
            '<span class="pbarRightsDigitsLeft">0</span>' +
            '<span class="pbarRightsDigitsCenter">1/2</span>' +
            '<span class="pbarRightsDigitsRight">F</span>' +
            '</div>';
        var nodeRightBar = '<div id="pbarFuelRightBar"></div>';
        var nodeRightLabel = '<div id="pbarFuelRightLabel">' +
            '<span class="pbarFuelRightLabelt1">Fuel:</span>' +
            '<span class="pbarFuelRightLabelt2" id="pbarFuelRightLabelt2ID">0</span>' +
            '<span class="pbarFuelRightLabelt3">Range:</span>' +
            '<span class="pbarFuelRightLabelt4" id="pbarFuelRightLabelt4ID">0 km</span>' +
            '</div>';
        // Добавить эти 3 дива
        $('#pbarFuelRight').append(nodeRightDigits);
        $('#pbarFuelRight').append(nodeRightBar);
        $('#pbarFuelRight').append(nodeRightLabel);
        // в pbarFuelRightBar добавить pbarFuelBarFiller, pbarFuelBarScale, pbarFuelBarArrow
        var nodeRightFiller = '<div id="pbarFuelBarFiller"></div>';
        var nodeRightScale = '<div id="pbarFuelBarScale"></div>';
        var nodeRightArrow = '<div id="pbarFuelBarArrow"></div>';
        $('#pbarFuelRightBar').append(nodeRightFiller);
        $('#pbarFuelRightBar').append(nodeRightScale);
        $('#pbarFuelRightBar').append(nodeRightArrow);
        // Теперь в pbarFuelBarFiller добавить pbarFuelBarFillerFill чтобы именно в pbarFuelBarFiller  сделать overflow-x
        // А допустим стрелка могла спокойно выезжать за пределы своего pbarFuelRightBar
        var nodeRightFillerFill = '<div id="pbarFuelBarFillerFill"></div>';
        $('#pbarFuelBarFiller').append(nodeRightFillerFill);


    }

    ProgressBarFuel.prototype.setValue = function (value, distance) { // distance = rashod * value
        var temp = 100 - (value * this.koeff);
        if((temp > 100) || (temp < 0)) return;
        var tdist = distance > 0 ? distance.toFixed(0) + ' km' : "--------";
        $('#pbarFuelBarFillerFill').css('right', temp + '%');
        $('#pbarFuelBarArrow').css('right', temp + '%');
        // Установить значение остатка value и ввести второй параметр, сколько можем ещё проехать.
        $('#pbarFuelRightLabelt2ID').text(value.toFixed(0));
        $('#pbarFuelRightLabelt4ID').text(tdist);
    }

    ProgressBarFuel.prototype.setMax = function (value) {
        this.options.max = value;
        this.koeff = 100 / value;
    }


    return ProgressBarFuel;
})();

var ProgressBarHP = (function () {
    function ProgressBarHP(options) {
        this.options = {
            parent: '',
            max: 100
        }
        var parent = options.parent;
        if (options.max)
            this.options.max = options.max;
        this.koeff = 100 / this.options.max;
        // Добавление класса для родителя
        $('#' + parent).addClass('pbar-hp-parent');
        // создать 2 дива: левый и правый
        var nodeParentLeft = '<div id="pbarHPLeft"></div>';
        var nodeParentRight = '<div id="pbarHPRight"></div>';
        // Добавить их внутрь parent
        $('#' + parent).append(nodeParentLeft);
        $('#' + parent).append(nodeParentRight);
        // Создать 3 дива для правого дива: цифры. шкала, надпись
        var nodeRightDigits = '<div id="pbarHPRightDigits">' +
            '<span class="pbarHPRightsDigitsLeft">0</span>' +
            '<span class="pbarHPRightsDigitsCenter">50</span>' +
            '<span class="pbarHPRightsDigitsRight">100</span>' +
            '</div>';
        var nodeRightBar = '<div id="pbarHPRightBar"></div>';
        var nodeRightLabel = '<div id="pbarHPRightLabel">' +
            '<span class="pbarHPRightLabelt1">Vehicle health:</span>' +
            '<span class="pbarHPRightLabelt2" id="pbarHPRightLabelt2ID">0%</span>' +
            '</div>';
        // Добавить эти 3 дива
        $('#pbarHPRight').append(nodeRightDigits);
        $('#pbarHPRight').append(nodeRightBar);
        $('#pbarHPRight').append(nodeRightLabel);
        // в pbarHPRightBar добавить pbarHPBarFiller, pbarHPBarScale, pbarHPBarArrow
        var nodeRightFiller = '<div id="pbarHPBarFiller"></div>';
        var nodeRightScale = '<div id="pbarHPBarScale"></div>';
        var nodeRightArrow = '<div id="pbarHPBarArrow"></div>';
        $('#pbarHPRightBar').append(nodeRightFiller);
        $('#pbarHPRightBar').append(nodeRightScale);
        $('#pbarHPRightBar').append(nodeRightArrow);
        // Теперь в pbarHPBarFiller добавить pbarHPBarFillerFill чтобы именно в pbarHPBarFiller  сделать overflow-x
        // А допустим стрелка могла спокойно выезжать за пределы своего pbarHPRightBar
        var nodeRightFillerFill = '<div id="pbarHPBarFillerFill"></div>';
        $('#pbarHPBarFiller').append(nodeRightFillerFill);
    }

    ProgressBarHP.prototype.setValue = function (value) {
        var temp = 100 - (value * this.koeff);
        if((temp > 100) || (temp < 0)) return;
        $('#pbarHPBarFillerFill').css('right', temp + '%');
        $('#pbarHPBarArrow').css('right', temp + '%');
        // Установить значение остатка value и ввести второй параметр, сколько можем ещё проехать.
        $('#pbarHPRightLabelt2ID').text((100-temp).toFixed(0) + '%');
    }

    ProgressBarHP.prototype.setMax = function (value) {
        this.options.max = value;
        this.koeff = 100 / value;
    }

    return ProgressBarHP;
})();



var _SlidersMass = [];


