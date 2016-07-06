
var GlitchImageEffect = (function(){
    function GlitchImageEffect(canvas_name, image, delay, site_size) {
        this.last_time = timeManager.getTime();

        this.is_active = false;
        this.glitch_delay = delay;
        this.image = image;
        this.site_size = site_size;

        this.canvas = document.getElementById(canvas_name);
        this.context = this.canvas.getContext('2d');
        this.ctx_w = null;
        this.ctx_h = null;
        this.image_w = null;
        this.image_h = null;
        this.globalCompositeOperationArray = ['overlay', 'lighter', 'screen', 'color-dodge'];
        this.current_opacity = 1.0;
        this.one_frame_length = 130;

        this.jq_road_grid = $('.content-start-back.content-start.road-grid').first();
        this.jq_road = $('.content-start-back.content-start.road').first();
        this.jq_skeletons = $('.car-skeleton-path'); // Массив элементов каркаса авто


        // todo: решить проблему с ресайзом
        this.canvas.width = this.ctx_w = this.image_w = image.width;
        this.canvas.height = this.ctx_h = this.image_h = image.height;

        this.glitch_timeouts = [];


        timeManager.addTimerEvent(this, 'redraw');
        this.draw_pure_image();
    }

    GlitchImageEffect.prototype.redraw = function(time) {
        if (time < this.glitch_delay + this.last_time) return;
        if (! this.is_active) return;
        if (this.site_size != currentSiteSize) return;
        this.last_time = time;
        this.glitch_timeout_fire();
    };

    GlitchImageEffect.prototype.stop = function(){
        //console.log('GlitchImageEffect.prototype.stop');
        while (this.glitch_timeouts.length) {
            clearTimeout(this.glitch_timeouts.pop());
        }
        this.is_active = false;
        this.draw_pure_image();
    };

    GlitchImageEffect.prototype.glitch_timeout_fire = function () {
        var context = this.context;
        //console.log('glith_timeot_fire start at ', timeManager.getTime());
        this.clear_ctx();
        context.drawImage(this.image, 0, 0, this.image_w, this.image_h, 0, 0, this.ctx_w, this.ctx_h);
        var i = 0;
        var one_frame = this.one_frame_length;
        for (i = 1; i < this.randInt(6, 9); i++) {
            this.glitch_timeouts.push(setTimeout(this.glitchImg.bind(this), this.randInt2(i * one_frame, 50)));
        }
        this.glitch_timeouts.push(setTimeout(this.draw_pure_image.bind(this), this.randInt2(i * one_frame, 50)));

        //glitchInterval = setTimeout(glith_timeot_fire, randInt2(6000, 3000));

        // включить аудио-оповещение о гличе
        audioManager.play('glitch_noise', 0, null, null, true, Math.random() * 30);
    };

    GlitchImageEffect.prototype.draw_pure_image = function () {
        // todo: change to this.stop()
        while (this.glitch_timeouts.length) {
            clearTimeout(this.glitch_timeouts.pop());
        }
        this.clear_ctx();
        this.context.drawImage(this.image, 0, 0, this.image_w, this.image_h, 0, 0, this.ctx_w, this.ctx_h);

        if (this.current_opacity != 1.0) {
            this.current_opacity = 1.0;
            this.jq_road_grid.css('opacity', this.current_opacity);
            this.jq_road.css('opacity', this.current_opacity);
            //this.jq_skeletons.css('opacity', 0.0);
        }

        // выключить аудио-оповещение о гличе
        audioManager.stop('glitch_noise');
    };

    GlitchImageEffect.prototype.start = function () {
        this.is_active = true;
        this.last_time = timeManager.getTime();
    };

    GlitchImageEffect.prototype.clear_ctx = function () {
        this.context.clearRect(0, 0, this.ctx_w, this.ctx_h);
    };

    GlitchImageEffect.prototype.glitchImg = function () {
        var context = this.context;
        context.save();
        var opacity = null;
        context.clearRect(0, 0, this.ctx_w, this.ctx_h);

        // Глобальная прозрачность
        if (Math.random() < 0.6) {
            opacity =  Math.random() * 0.5 + 0.3;
            context.globalAlpha = opacity;
        }
        // Сдвиг всей машинки
        if (Math.random() < 0.4) {
            var offset_x = Math.random() * 15;
            var offset_y = Math.random() * 12;
            context.drawImage(this.image, 0, 0, this.image_w, this.image_h, offset_x, offset_y, this.image_w, this.image_h);
        }else {
            context.drawImage(this.image, 0, 0, this.image_w, this.image_h, 0, 0, this.image_w, this.image_h);
        }

        // Глич отдельных частей машинки
        for (var i = 0; i < this.randInt(2, 10); i++) {
            var rand_offset_x = Math.random() * 200 - 100;
            var rand_offset_y = Math.random() * 60 - 30;
            var y = Math.random() * this.ctx_h;
            var spliceHeight = this.randInt(40, 100);
            context.save();
            if (y < 300 && Math.random() < 0.4) { // Значит можно делать globalCompositeOperation
                context.globalCompositeOperation = this.globalCompositeOperationArray[Math.floor(Math.random() * 4)];
            }
            context.drawImage(this.canvas,
                0, y, this.image_w, spliceHeight,
                rand_offset_x, y + rand_offset_y, this.image_w, spliceHeight);


            if (Math.random() > 0.7) {
                var imageData = context.getImageData(0, y, this.ctx_w, spliceHeight);
                //var imageDataFiltered = Math.random() > 0.4 ? CanvasFilters.grayscale(imageData) : CanvasFilters.threshold(imageData, 100);
                //var imageDataFiltered = CanvasFilters.shift(imageData);
                try {
                    var imageDataFiltered = CanvasFilters.random_filter()(imageData);
                    context.putImageData(imageDataFiltered, 0, y);
                }
                catch (e) {
                    console.log('Снова что-то с выбором рандомного фильтра', e);
                }
            }

            context.restore();
        }

        context.restore();

        if (opacity && Math.random() > 0.5) {
            this.current_opacity = opacity;
            if (Math.random() > 0.5)
                this.jq_road_grid.css('opacity', this.current_opacity);
            if (Math.random() > 0.5)
                this.jq_road.css('opacity', this.current_opacity);
        }

        //if (opacity && Math.random() > 0.6) {
        //    this.current_opacity = opacity;
        //    if (Math.random() > 0.8)
        //        $(this.jq_skeletons[0]).css('opacity', 1.0);
        //    if (Math.random() > 0.8)
        //        $(this.jq_skeletons[1]).css('opacity', 1.0);
        //    if (Math.random() > 0.8)
        //        $(this.jq_skeletons[2]).css('opacity', 1.0);
        //}

    };

    GlitchImageEffect.prototype.randInt = function (a, b) {
        return ~~(Math.random() * (b - a) + a);
    };

    GlitchImageEffect.prototype.randInt2 = function (number, radius) {
        return this.randInt(number - radius, number + radius);
    };

    return GlitchImageEffect;
})();



var CanvasFilters = (function() {
    function CanvasFilters() {}

    CanvasFilters.random_filter = function () {
        var arr = ['grayscale', 'threshold', 'colorize', 'shift', 'invert', 'brightness'];
        return CanvasFilters[arr[Math.floor(Math.random() * arr.length - 0.001)]];
    };

    CanvasFilters.grayscale = function (pixels) {
        // получаем одномерный массив, описывающий все пиксели изображения
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        return pixels;
    };

    CanvasFilters.threshold = function (pixels, threshold) {
        var d = pixels.data;
        threshold = threshold != undefined ? threshold : 100;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= threshold) ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = v
        }
        return pixels;
    };

    CanvasFilters.colorize = function (pixels) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var a = d[i + 3];
            d[i] = r / 2;
            //d[i + 1] = 0;
            d[i + 2] = b / 2;
            //d[i + 3] = 255;

        }
        return pixels;
    };

    CanvasFilters.shift = function (pixels) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var a = d[i + 3];
            d[i] = g;
            d[i + 1] = b;
            d[i + 2] = r;
            //d[i + 3] = 255;

        }
        return pixels;
    };

    CanvasFilters.invert = function (pixels) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var a = d[i + 3];
            d[i] = 255 - r;
            d[i + 1] = 255 - g;
            d[i + 2] = 255 - b;

        }
        return pixels;
    };

    CanvasFilters.brightness = function (pixels, brightness) {
        brightness = brightness != undefined ? brightness : 100;
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var a = d[i + 3];
            d[i] = Math.min(255, r + brightness);
            d[i + 1] = Math.min(255, g + brightness);
            d[i + 2] = Math.min(255, b + brightness);

        }
        return pixels;
    };

    return CanvasFilters;
})();

