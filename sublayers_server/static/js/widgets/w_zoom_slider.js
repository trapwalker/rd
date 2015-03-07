/*
 * Виджет слайдер зума
*/

var ConstZoomHeightOfScale = 170; // в пикселах, высота шкалы


var WZoomSlider = (function () {
    function WZoomSlider() {
        this.mapMng = mapManager;
        this.count_zoom = map.getMaxZoom() - map.getMinZoom();
        this.px_on_zoom = ConstZoomHeightOfScale / (this.count_zoom);
        this.points_in_step = ConstZoomHeightOfScale / (this.count_zoom);

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
        mainParent.append('<div id="zoomSliderMainDivHardware"></div>');
        mainParent.append('<div id="zoomSliderMainDivGlass"></div>');
        mainParent.addClass('slider-zoom-parent sublayers-clickable');
        var parentGlass = $('#zoomSliderMainDivGlass');

        // Добавление кнопок "Свернуть всё" и "FSCR"
        parentGlass.append('<div id="DivForBtnSVALLInsideZoom"></div>');
        parentGlass.append('<div id="DivForBtnFSCRInsideZoom">FSCR</div>');

        $('#DivForBtnSVALLInsideZoom').on('click', {self: this}, this.sverAll);
        $('#DivForBtnFSCRInsideZoom').on('click', {self: this}, this.fullscr);

        parentGlass.append('<div id="zoomSliderMainDivWrapper"></div>');

        var parent = $('#zoomSliderMainDivWrapper');


        // создание 5 дивов
        var nodeTextDiv = '<div id="ZoomTextDiv"><div id="ZoomTextZoomValue"></div></div>';
        var nodePlus = '<div id="Zoom_btnPlus"><div id="ZoomBtnPlusSpan">+</div></div>';
        var nodeBar = '<div id="Zoom_sliderBar"></div>';
        var nodeSlider = '<div id="Zoom_slider"></div>';
        var nodeMinus = '<div id="Zoom_btnMinus"><div id="ZoomBtnMinusSpan">_</div></div>';


        // добавление дивов в родительский див
        parent.append(nodeTextDiv);
        parent.append(nodePlus);
        parent.append(nodeBar);

        $('#Zoom_sliderBar').append(nodeSlider);
        parent.append(nodeMinus);

        $('#Zoom_btnPlus').on('click', {self: this}, this.plusFunc);
        $('#Zoom_btnMinus').on('click', {self: this}, this.minusFunc);

        // сохранение jq-ссылок на слайдер и область текста
        this.slider = $('#Zoom_slider');
        this.zoom_text_value = $('#ZoomTextZoomValue');

        // создание слайдера
        this.slider.slider({
            max: this.options.max * this.points_in_step,
            min: this.options.min * this.points_in_step,
            orientation: 'vertical',
            step: this.options.step,
            animate: ConstDurationAnimation
        }).on('slidechange', {self: this}, this.slidechange);

        // Изменение размеров ползунка
        this.slider.removeClass('ui-widget-content');
        var carriage = this.slider.find('span:first-child');

        carriage.addClass('slider-zoom-carriage');
        carriage.css('width', '39px');
        carriage.css('height', '27px');
        carriage.css('border', '0px');
        carriage.css('left', '20px');
        carriage.css('margin-bottom', '-13.5px');
        carriage.css("cursor", 'pointer'); // т.к. класс sublayers-clickable не применяется
        carriage.append('<div id="ZoomDivInsideSpanCarriage"></div>');

        this.zomm_circle = $('#ZoomDivInsideSpanCarriage');

        // Создание и добавление текста
        var spanZoomZoomText = '<span id="spanZoomZoomText" class="sublayers-unclickable">' +
            'zoom</span>';
        parent.append(spanZoomZoomText);

        // создание SVG шкалы
        this.drawScale();


        this.setZoom(this.mapMng.getZoom());


    }

    WZoomSlider.prototype.drawScale = function(){
        var draw = SVG('Zoom_sliderBar');
        var height = ConstZoomHeightOfScale;
        var width_large_line = 35;
        var count_zoom = this.count_zoom;
        var px_on_zoom = this.px_on_zoom;

        var colorMain1 = '#00ff55';
        var opacityMain1 = 0.55;

        var grad1 = draw.gradient('linear', function(stop) {
            stop.at({ offset: 0, color: colorMain1, opacity: 0.0});
            stop.at({ offset: 0.4, color: colorMain1, opacity: opacityMain1});
        });

        var grad2 = draw.gradient('linear', function(stop) {
            stop.at({ offset: 0, color: colorMain1, opacity: 0.0});
            stop.at({ offset: 0.2, color: colorMain1, opacity: opacityMain1});
            stop.at({ offset: 0.8, color: colorMain1, opacity: opacityMain1});
            stop.at({ offset: 1, color: colorMain1, opacity: 0.0});
        });

        // вертикальная линия
        draw.line(20, 0, 20, height)
            .stroke({
                width: 1.0,
                color: colorMain1,
                opacity: opacityMain1
            });
        // 2 горизонтальных линии-оконтовки шкалы
        draw.line(0, 1, width_large_line, 1.01)
            .stroke({
                width: 1,
                color: grad2
            });
        draw.line(0, height, width_large_line, height-0.01)
            .stroke({
                width: 1,
                color: grad2
            });

        // в цикле выводим горизонтальные маленькие линии в зависимости кол-ва зумов
        for(var i = 1; i < count_zoom; i++) {
            draw.line(3, 0, 20, 0.01)
                .stroke({
                    width: 1,
                    color: grad1
                })
                .dy((i * px_on_zoom) + 1);
        }
    };

    WZoomSlider.prototype.setZoom = function(new_zoom){
        //console.log('WZoomSlider.prototype.setZoom');
        this.slider.slider("value", new_zoom * this.points_in_step);

        // текст, который нужно вывести
        var new_str = new_zoom + 'x';
        var old_str = this.zoom_text_value.text();
        if(old_str != new_str) {
            var text = this.zoom_text_value;
            this.zoom_text_value.animate({opacity: 0}, ConstDurationAnimation / 2., function(){
                text.text(new_str)
                    .animate({opacity: 1}, ConstDurationAnimation / 2.);
            });

            var zoom_circle = this.zomm_circle;
            zoom_circle.animate({opacity: 0.3}, ConstDurationAnimation / 2., function(){
                zoom_circle.animate({opacity: 1}, ConstDurationAnimation / 2.);
            })
        }
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
        if (zoom != slider.mapMng.anim_zoom) {
            slider.mapMng.setZoom(zoom);
            return;
        }
        if (Math.abs(value - zoom * slider.points_in_step) > 1)
            slider.setZoom(zoom);
    };

    WZoomSlider.prototype.fullscr = function (event) {
        var slider = event.data.self;
        var html = document.documentElement;
        var jSelector = $('#DivForBtnFSCRInsideZoom');

        if (RunPrefixMethod(document, "FullScreen") || RunPrefixMethod(document, "IsFullScreen")) {
            RunPrefixMethod(document, "CancelFullScreen");
            // для замены изображения
            //jSelector.removeClass('buttonFullScreenOff');
            //jSelector.addClass('buttonFullScreenOn');
        }
        else {
            RunPrefixMethod(html, "RequestFullScreen");
            //jSelector.removeClass('buttonFullScreenOn');
            //jSelector.addClass('buttonFullScreenOff');
        }
    };

    WZoomSlider.prototype.sverAll = function (event) {
        var slider = event.data.self;
        alert('Свернуть все гаджеты-стекляшки');
    };

    return WZoomSlider;
})();


//Подстановка префиксов к методам для работы полноэкранного режима в различных браузерах
function RunPrefixMethod(obj, method) {
    var p = 0, m, t;
    while (p < pfx.length && !obj[m]) {
        m = method;
        if (pfx[p] == "") {
            m = m.substr(0, 1).toLowerCase() + m.substr(1);
        }
        m = pfx[p] + m;
        t = typeof obj[m];
        if (t) {
            pfx = [pfx[p]];
            return (t == "function" ? obj[m]() : obj[m]);
        }
        p++;
    }

}