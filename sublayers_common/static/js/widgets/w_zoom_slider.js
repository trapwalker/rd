/*
 * Виджет слайдер зума
*/

var WZoomSlider = (function () {
    function WZoomSlider() {
        this.mapMng = mapManager;
        this.current_interface_size = interface_scale_big;
        this.zoomHeightOfScale = this.current_interface_size ? 170 : 120; // в пикселах, высота шкалы
        this.slider_margin_top = this.current_interface_size ? 13.5 : 10;
        this.count_zoom = mapManager.getMaxZoom() - mapManager.getMinZoom();
        this.px_on_zoom = this.zoomHeightOfScale / (this.count_zoom);
        this.zoom_visible = true;

        this.options = {
            parentDiv: "zoomSetDivForZoomSlider",
            max: mapManager.getMaxZoom(),
            min: mapManager.getMinZoom(),
            step: 1,
            height: 100, // px
            width: 5,    // px
            onChange: ''
        };
        var mainParent = $('#' + this.options.parentDiv);
        mainParent.append('<div id="zoomSliderMainDivHardware"></div>');
        mainParent.append('<div id="zoomSliderMainDivGlass"><div id="divForZoomNotClick" class="anti-click-class"></div></div>');
        mainParent.addClass('slider-zoom-parent sublayers-clickable');
        var parentGlass = $('#zoomSliderMainDivGlass');
        var parentPort = $('#zoomSliderMainDivHardware');
        this.parentGlass = parentGlass;

        // Добавление кнопок "Свернуть всё" и "FSCR"
        parentGlass.append('<div id="DivForBtnSVALLInsideZoom"></div>');
        parentGlass.append('<div id="DivForBtnFSCRInsideZoom">FSCR</div>');

        $('#DivForBtnSVALLInsideZoom').click(this, this.sverAll);
        $('#DivForBtnFSCRInsideZoom').on('click', {self: this}, this.fullscr);

        parentGlass.append('<div id="zoomSliderMainDivWrapper"></div>');
        var parent = $('#zoomSliderMainDivWrapper');

        // создание 5 дивов
        var jq_nodeTextDiv = $('<div id="ZoomTextDiv"><div id="ZoomTextZoomValue"></div></div>');
        var jq_nodePlus = $('<div id="Zoom_btnPlus"><div id="ZoomBtnPlusSpan">+</div></div>');
        var jq_nodeBar = $('<div id="Zoom_sliderBar"></div>');
        this.jq_slider = $('<div id="Zoom_slider"></div>');
        var jq_nodeMinus = $('<div id="Zoom_btnMinus"><div id="ZoomBtnMinusSpan">_</div></div>');

        // добавление дивов в родительский див
        parent.append(jq_nodeTextDiv);
        parent.append(jq_nodePlus);
        parent.append(jq_nodeBar);
        jq_nodeBar.append(this.jq_slider);
        jq_nodeBar.append('<div id="Zoom_sliderScale"></div>');
        parent.append(jq_nodeMinus);
        jq_nodePlus.on('click', {self: this}, this.plusFunc);
        jq_nodeMinus.on('click', {self: this}, this.minusFunc);
        this.jq_zoom_text_value = $('#ZoomTextZoomValue'); // сохранение jq-ссылок на слайдер и область текста

        // Вешаем ивенты мыши на слайдер
        var self = this;
        jq_nodeBar.on('mousemove', function(event) {
            if (event.buttons == 1) {
                mapManager.onZoomEnd();
                mapManager.set_coord({z: 18 - event.offsetY / self.zoomHeightOfScale * self.count_zoom});
            }
        });
        jq_nodeBar.on('click', function(event) {
            mapManager.onZoomEnd();
            mapManager.set_coord({z: 18 - event.offsetY / self.zoomHeightOfScale * self.count_zoom});
        });

        // Создание и добавление текста Zoom вертикально расположенного на виджете
        var spanZoomZoomText = '<span id="spanZoomZoomText" class="sublayers-unclickable">zoom</span>';
        parent.append(spanZoomZoomText);

        // создание SVG шкалы
        this.drawScale();

        // кнопка сворачивания дива
        parentPort.append('<div id="ZoomPortHideBtn" class="hideBtnDownLeft"></div>');
        this.btn_hide =  $('#ZoomPortHideBtn');
        this.btn_hide.on('click', {self: this}, this.btnHideReaction);

        // Зона для отображения урезанной версии контроллера
        mainParent.append('<div id="zoomSliderMainDivCompact"></div>');
        this.mainCompact = $('#zoomSliderMainDivCompact');

        // добавление кнопки развернуть всё и фулл-скрин
        this.mainCompact.append('<div id="DivForBtnRazverALLInsideZoomCompact"></div>');
        this.mainCompact.append('<div id="DivForBtnFSCRInsideZoomCompact">FSCR</div>');
        $('#DivForBtnRazverALLInsideZoomCompact').click(this, this.razverAll);
        $('#DivForBtnFSCRInsideZoomCompact').on('click', {self: this}, this.fullscr);

        // добавление кнопок + и минус
        this.mainCompact.append('<div id="DivForBtnPlusZoomCompact">' +
            '<div class="classForBtnZoomCompactText">+</div></div>');
        this.mainCompact.append('<div id="DivForBtnMinusZoomCompact">' +
            '<div class="classForBtnZoomCompactText">-</div></div>');
        $('#DivForBtnPlusZoomCompact').on('click', {self: this}, this.plusFunc);
        $('#DivForBtnMinusZoomCompact').on('click', {self: this}, this.minusFunc);

        // добавление текста - уровень зума
        this.mainCompact.append('<div id="ZoomTextDivCompact"><div id="ZoomTextZoomValueCompact"></div></div>');
        this.jq_zoom_text_value_compact = $('#ZoomTextZoomValueCompact');
    }

    WZoomSlider.prototype.drawScale = function(){
        $("#Zoom_sliderScale").empty();
        var draw = SVG('Zoom_sliderScale');
        var height = this.zoomHeightOfScale;
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

    WZoomSlider.prototype.setZoom = function(new_zoom, need_redraw){
        // Установка зума в слайдере извне
        //console.log('WZoomSlider.prototype.setZoom');
        // текст, который нужно вывести
        var new_str = new_zoom.toFixed(1) + 'x';
        var old_str = this.jq_zoom_text_value.text();
        if(old_str != new_str || need_redraw) {
            this.jq_zoom_text_value.text(new_str);
            this.jq_zoom_text_value_compact.text(new_str);
            // Установка каретки
            this.jq_slider.css("top", (this.zoomHeightOfScale - this.px_on_zoom * (new_zoom - this.options.min) - this.slider_margin_top).toFixed(0) + "px");
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

        // установить фокус на карту
        returnFocusToMap();
    };

    WZoomSlider.prototype.sverAll = function (event) {
        var slider = event.data;
        //alert('Свернуть все гаджеты-стекляшки');
        if (wCruiseControl) wCruiseControl.changeVisible(false);
        chat.changeVisible(false);
        slider.changeVisible(false);
        returnFocusToMap();
    };

    WZoomSlider.prototype.razverAll = function (event) {
        var slider = event.data;
        //alert('Свернуть все гаджеты-стекляшки');
        if (wCruiseControl) wCruiseControl.changeVisible(true);
        chat.changeVisible(true);
        slider.changeVisible(true);
        returnFocusToMap();
    };

    WZoomSlider.prototype.btnHideReaction = function(event) {
        var self = event.data.self;
        self.changeVisible(!self.zoom_visible);
        returnFocusToMap();
    };

    WZoomSlider.prototype.changeVisible = function(visible) {
        //console.log('WZoomSlider.prototype.changeVisible', visible);
        this.parentGlass.stop(true, true);
        this.mainCompact.stop(true, true);
        var self = this;
        if (visible != this.zoom_visible) {
            this.zoom_visible = visible;

            // Звук сворачивания/разворачивания
            audioManager.play({name: "error_1", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0});

            if (visible) { // нужно показать
                self.parentGlass.css({display: 'block'});
                self.parentGlass.animate({left: 0}, 500, function () {
                    self.btn_hide.removeClass('hideBtnUpLeft');
                    self.btn_hide.addClass('hideBtnDownLeft');
                    self.parentGlass.css({display: 'block'});
                });

                // и нужно скрыть портативную версию
                self.mainCompact.animate({opacity: 0}, 300, function () {
                    self.mainCompact.css({display: 'none'});
                });

            }
            else { // нужно скрыть
                this.parentGlass.animate({left: -200}, 500, function () {
                    self.btn_hide.removeClass('hideBtnDownLeft');
                    self.btn_hide.addClass('hideBtnUpLeft');
                    self.parentGlass.css({display: 'none'});
                });

                // и нужно показать портативную версию
                self.mainCompact.css({display: 'block'});
                self.mainCompact.animate({opacity: 1}, 300);
            }
        }
    };

    WZoomSlider.prototype._resize_view = function(width, height) {
        if (this.current_interface_size == interface_scale_big) return;
        this.current_interface_size = interface_scale_big;
        this.zoomHeightOfScale = this.current_interface_size ? 170 : 120; // в пикселах, высота шкалы
        this.slider_margin_top = this.current_interface_size ? 13.5 : 10;
        this.px_on_zoom = this.zoomHeightOfScale / (this.count_zoom);
        this.drawScale();
        mapManager.zoomSlider.setZoom(mapManager.getZoom(), true);
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