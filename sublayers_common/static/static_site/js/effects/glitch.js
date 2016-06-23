
var GlitchImageEffect = (function(){
    function GlitchImageEffect(canvas_name, image, delay) {
        this.last_time = timeManager.getTime();

        this.is_active = false;
        this.glitch_delay = delay;
        this.image = image;

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


        // todo: решить проблему с ресайзом
        this.canvas.width = this.ctx_w = this.image_w = 2013;
        this.canvas.height = this.ctx_h = this.image_h = 997;

        this.glitch_timeouts = [];


        timeManager.addTimerEvent(this, 'redraw');
        this.draw_pure_image();

    }

    GlitchImageEffect.prototype.redraw = function(time) {
        if (time < this.glitch_delay + this.last_time) return;
        if (! this.is_active) return;
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
        }
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
                var imageDataFiltered = Math.random() > 0.4 ? CanvasFilters.grayscale(imageData) : CanvasFilters.threshold(imageData, 100);
                //var imageDataFiltered = grayscale(imageData);
                context.putImageData(imageDataFiltered, 0, y);
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
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= threshold) ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = v
        }
        return pixels;
    };

    return CanvasFilters;
})();

