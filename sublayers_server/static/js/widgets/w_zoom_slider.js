/*
 * Виджет слайдер зума
*/

var WZoomSlider = (function (_super) {
    __extends(WZoomSlider, _super);

    function WZoomSlider(mapMng) {
        _super.call(this, [mapMng]);
        this.mapMng = mapMng;

        this.options = {
            parentDiv: "zoomSetDivForZoomSlider",
            max: map.getMaxZoom(),
            min: map.getMinZoom(),
            step: 1,
            height: 100, // px
            width: 5,    // px
            onChange: ''
        };
        var parent = $('#' + this.options.parentDiv);

        // сразу же применение стиля для зум-парент
        parent.addClass('slider-zoom-parent sublayers-clickable');

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
            max: this.options.max,
            min: this.options.min,
            orientation: 'vertical',
            step: this.options.step
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

        this.change();
    }

    WZoomSlider.prototype.change = function(time){
        //console.log('WZoomSlider.prototype.change');
        $('#Zoom_slider').slider("value", this.mapMng.getZoom());
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
        var slider = event.data.self;
        var zoom = $('#Zoom_slider').slider("value");
        slider.mapMng.setZoom(zoom);
    };

    WZoomSlider.prototype.delFromVisualManager = function () {
        // todo: удалить свою вёрстку
        _super.prototype.delFromVisualManager.call(this);
    };

    return WZoomSlider;
})(VisualObject);