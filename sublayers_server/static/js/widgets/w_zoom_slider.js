/*
 * Виджет слайдер зума
*/

var WZoomSlider = (function () {
    function WZoomSlider() {
        this.mapMng = mapManager;
        this.points_in_step = 10;
        this.options = {
            parentDiv: "zoomSetDivForZoomSlider",
            max: map.getMaxZoom(),
            min: map.getMinZoom(),
            step: 1,
            height: 100, // px
            width: 5,    // px
            onChange: ''
        };
        var mainParent = $('#' + this.options.parentDiv);
        mainParent.append('<div id="zoomSetDivForZoomSliderRumble"></div>');
        var parent = $('#zoomSetDivForZoomSliderRumble');

        // сразу же применение стиля для зум-парент
        mainParent.addClass('slider-zoom-parent sublayers-clickable');

        // создание 4 дивов
        var nodePlus = '<div id="Zoom_btnPlus"></div>';
        var nodeBar = '<div id="Zoom_sliderBar"></div>';
        var nodeSlider = '<div id="Zoom_slider"></div>';
        var nodeMinus = '<div id="Zoom_btnMinus"></div>';

        // добавление дивов в родительский див
        parent.append(nodePlus);
        parent.append(nodeBar);
        $('#Zoom_sliderBar').append(nodeSlider);
        parent.append(nodeMinus);

        $('#Zoom_btnPlus').on('click', {self: this}, this.plusFunc);
        $('#Zoom_btnMinus').on('click', {self: this}, this.minusFunc);

        // создание слайдера
        $('#Zoom_slider').slider({
            max: this.options.max * this.points_in_step,
            min: this.options.min * this.points_in_step,
            orientation: 'vertical',
            step: this.options.step,
            animate: ConstDurationAnimation
        }).on('slidechange', {self: this}, this.slidechange);

        // Изменение размеров ползунка
        $('#Zoom_slider').removeClass('ui-widget-content');
        $('#Zoom_slider span:first-child').addClass('slider-zoom-carriage');
        $('#Zoom_slider span:first-child').css('width', '39px');
        $('#Zoom_slider span:first-child').css('height', '21px');
        //$('#Zoom_slider span:first-child').css('background', 'green url(./img/control_zoom/ctrl_zm_slider.png) 50% 50% no-repeat');
        $('#Zoom_slider span:first-child').css('border', '0px');
        $('#Zoom_slider span:first-child').css('left', '-7px');
        $('#Zoom_slider span:first-child').css('margin-bottom', '-12.5px');
        $('#Zoom_slider span:first-child').css("cursor", 'pointer'); // т.к. класс sublayers-clickable не применяется

        // Создание и добавление текста
        var spanZoomZoomText = '<span id="spanZoomZoomText" class="control-zoom-speed-vertical-text sublayers-unclickable">' +
            'Zoom</span>';
        parent.append(spanZoomZoomText);

        this.setZoom(this.mapMng.getZoom());
    }

    WZoomSlider.prototype.setZoom = function(new_zoom){
        //console.log('WZoomSlider.prototype.setZoom');
        $('#Zoom_slider').slider("value", new_zoom * this.points_in_step);
    };

    WZoomSlider.prototype.plusFunc = function (event) {
        var slider = event.data.self;
        slider.mapMng.setZoom(slider.mapMng.getZoom() + slider.options.step);
    };

    WZoomSlider.prototype.minusFunc = function (event) {
        var slider = event.data.self;
        slider.mapMng.setZoom(slider.mapMng.getZoom() - slider.options.step);
    };

    WZoomSlider.prototype.slidechange = function (event) {
        // отрабатывает мгновенно, значение value у слайдера уже установлено до начала анимации
        //console.log('WZoomSlider.prototype.slidechange');
        var slider = event.data.self;
        var value = $('#Zoom_slider').slider("value");
        var zoom = Math.round(value / slider.points_in_step);
        if (zoom != slider.mapMng.anim_zoom)
            slider.mapMng.setZoom(zoom);
        if (value != zoom * slider.points_in_step)
            slider.setZoom(zoom);
    };

    return WZoomSlider;
})();