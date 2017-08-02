var ECanvasLocationNoise = (function () {
    function ECanvasLocationNoise() {
        this._last_noise = '';
        this._last_opacity = 1.0;

        this.noise_img_src_list = { 'cat_noise_1': new Image() };
        this.noise_img_src_list['cat_noise_1'].src = '/static/img/noise/map_noise_src_1.png';
        this.current_noise = 'cat_noise_1';
        this.user_opacity = 1.0;
        this.current_opacity = 1.0;
        
        this.noise_img = null;

        this.temp_canvas = document.createElement("canvas");
        this.img_size = new Point(0, 0);

        if (locationManager.location_canvas_effect_manager)
            locationManager.location_canvas_effect_manager.add_vobj(this, 80);
    }

    ECanvasLocationNoise.prototype._generate_img = function() {
        // ¬ случае если изменилось разрешение экрана, надо перегенерировать картинку шума
        var width = Math.round(locationManager.location_canvas_effect_manager.width * 1.2);
        var height = Math.round(locationManager.location_canvas_effect_manager.height * 1.2);
        if ((this.img_size.x != width) || (this.img_size.y != height)) {
            this._last_noise = this.current_noise;
            this._last_opacity = this.current_opacity;

            this.img_size.x = width;
            this.img_size.y = height;

            // √енерируем новый шум
            var temp_canvas = this.temp_canvas;
            temp_canvas.width = this.img_size.x;
            temp_canvas.height = this.img_size.y;
            var temp_ctx = temp_canvas.getContext("2d");
            temp_ctx.globalAlpha = this.current_opacity;
            var x_pos = 0;
            var y_pos = 0;
            var src_size_x = this.noise_img_src_list[this.current_noise].width;
            var src_size_y = this.noise_img_src_list[this.current_noise].height;
            while (x_pos <= this.img_size.x) {
                while (y_pos <= this.img_size.y) {
                    temp_ctx.drawImage(this.noise_img_src_list[this.current_noise], x_pos, y_pos);
                    y_pos += src_size_y;
                }
                x_pos += src_size_x;
                y_pos = 0;
            }
        }
    };

    ECanvasLocationNoise.prototype.redraw = function(ctx, time) {
        if (!settingsManager.options.location_effects.currentValue) return;
        this._generate_img();
        var shift_x = Math.round(Math.random() * locationManager.location_canvas_effect_manager.width * 0.2);
        var shift_y = Math.round(Math.random() * locationManager.location_canvas_effect_manager.height * 0.2);
        ctx.drawImage(this.temp_canvas, -shift_x, -shift_y);
    };

    return ECanvasLocationNoise;
})();
