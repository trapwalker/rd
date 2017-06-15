/*
 * Виджет для отрисовки шума (помех) поверх карты (синглтон);
 */

var WMapNoise = (function (_super) {
    __extends(WMapNoise, _super);

    function WMapNoise() {
        _super.call(this, []);
        mapCanvasManager.add_vobj(this, 1);

        this.activated = false;
        this.current_noise = '';
        this.current_opacity = 1.0;
        this.user_opacity = 1.0;
        this._last_noise = '';
        this._last_opacity = 1.0;

        this.noise_img_src_list = {
            'cat_noise': new Image(),
            'cat_noise_1': new Image(),
            'cat_noise_2': new Image(),
            'cat_noise_3': new Image(),
            '1_noise': new Image(),
            '1_noise_inv': new Image(),
            '1_noise60': new Image(),
            '2_noise': new Image(),
            '2_noise_inv': new Image(),
            '2_noise60': new Image(),
            '3_noise': new Image(),
            '3_noise_inv': new Image(),
            '3_noise60': new Image(),
            '4_noise': new Image(),
            '4_noise_inv': new Image(),
            '4_noise60': new Image(),
            'n1': new Image(),
            'n2': new Image(),
            'n3': new Image(),
            'n4': new Image(),
            '2n1_white': new Image(),
            '2n2_white': new Image(),
            '2n3_white': new Image(),
            '2n4_white': new Image()
        };

        this.noise_img_src_list['cat_noise'].src = '/static/img/noise/map_noise_src.png';
        this.noise_img_src_list['cat_noise_1'].src = '/static/img/noise/map_noise_src_1.png';
        this.noise_img_src_list['cat_noise_2'].src = '/static/img/noise/map_noise_src_2.png';
        this.noise_img_src_list['cat_noise_3'].src = '/static/img/noise/map_noise_src_3.png';
        this.noise_img_src_list['1_noise'].src = '/static/img/noise/1_noise.png';
        this.noise_img_src_list['1_noise_inv'].src = '/static/img/noise/1_noise_inv.png';
        this.noise_img_src_list['1_noise60'].src = '/static/img/noise/1_noise60.png';
        this.noise_img_src_list['2_noise'].src = '/static/img/noise/2_noise.png';
        this.noise_img_src_list['2_noise_inv'].src = '/static/img/noise/2_noise_inv.png';
        this.noise_img_src_list['2_noise60'].src = '/static/img/noise/2_noise60.png';
        this.noise_img_src_list['3_noise'].src = '/static/img/noise/3_noise.png';
        this.noise_img_src_list['3_noise_inv'].src = '/static/img/noise/3_noise_inv.png';
        this.noise_img_src_list['3_noise60'].src = '/static/img/noise/3_noise60.png';
        this.noise_img_src_list['4_noise'].src = '/static/img/noise/4_noise.png';
        this.noise_img_src_list['4_noise_inv'].src = '/static/img/noise/4_noise_inv.png';
        this.noise_img_src_list['4_noise60'].src = '/static/img/noise/4_noise60.png';
        this.noise_img_src_list['n1'].src = '/static/img/noise/n1.png';
        this.noise_img_src_list['n2'].src = '/static/img/noise/n2.png';
        this.noise_img_src_list['n3'].src = '/static/img/noise/n3.png';
        this.noise_img_src_list['n4'].src = '/static/img/noise/n4.png';
        this.noise_img_src_list['2n1_white'].src = '/static/img/noise/2n1_white.png';
        this.noise_img_src_list['2n2_white'].src = '/static/img/noise/2n2_white.png';
        this.noise_img_src_list['2n3_white'].src = '/static/img/noise/2n3_white.png';
        this.noise_img_src_list['2n4_white'].src = '/static/img/noise/2n4_white.png';

        this.noise_img = null;

        this.temp_canvas = document.createElement("canvas");
        this.img_size = new Point(0, 0);
    }

    WMapNoise.prototype._generate_img = function() {
        // В случае если изменилось разрешение экрана, надо перегенерировать картинку шума
        var width = Math.round(mapCanvasManager.canvas.width * 1.2);
        var height = Math.round(mapCanvasManager.canvas.height * 1.2);
        if ((this.img_size.x != width) || (this.img_size.y != height) ||
            (this._last_noise != this.current_noise) || (this.current_opacity != this._last_opacity)) {

            this._last_noise = this.current_noise;
            this._last_opacity = this.current_opacity;

            this.img_size.x = width;
            this.img_size.y = height;

            // Генерируем новый шум
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

    WMapNoise.prototype.redraw = function(ctx, time){
        if (!this.activated) return;
        this.opacity_by_zoom();
        this._generate_img();
        var shift_x = Math.round(Math.random() * mapCanvasManager.canvas.width * 0.2);
        var shift_y = Math.round(Math.random() * mapCanvasManager.canvas.height * 0.2);
        ctx.drawImage(this.temp_canvas, -shift_x, -shift_y);
    };

    WMapNoise.prototype.opacity_by_zoom = function() {
        if (mapCanvasManager.real_zoom >= 14)
            this.current_opacity = this.user_opacity;
        else
            if (mapCanvasManager.real_zoom >= 13)
                this.current_opacity = this.user_opacity + (1 - this.user_opacity) * (14.0 - mapCanvasManager.real_zoom);
            else
                this.current_opacity = 1;
    };

    WMapNoise.prototype.start = function(noise_name, opacity) {
        if (this.noise_img_src_list.hasOwnProperty(noise_name)) {
            this.current_noise = noise_name;
            this.user_opacity = opacity;
            this.current_opacity = opacity;
            this.activated = settingsManager.options.canvas_noise.value == 1 ? true : false;
        }
        else {
            console.warn('Указанный тип шума не найден - ' + noise_name);
            this.activated = false;
        }
    };

    WMapNoise.prototype.stop = function() {
        this.activated = false;
    };

    WMapNoise.prototype.delFromVisualManager = function () {
        mapCanvasManager.del_vobj(this);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WMapNoise;
})(VisualObject);


var WRadiationNoise = (function (_super) {
    __extends(WRadiationNoise, _super);

    function WRadiationNoise() {
        _super.call(this, []);
        this.frame_rate = 5;

        this.radiation_dps_max = 2; // Уровень урона радиаций после которого (включительно) шум показывается без прозрачности
        this.radiation_d_dps_max = 0.1; // Максимальный уровень приращения дамага за кадр
        this.target_radiation_dps = 0; // Целевой дамаг
        this.current_radiation_dps = 0; // Текущий дамаг
        this.activated = true;
        this.current_noise = 'n4';
    }

    WRadiationNoise.prototype.redraw = function(ctx, time) {
        if (user.userCar) {
            this.target_radiation_dps = user.userCar.radiation_dps || 0;
            var d_dps = this.target_radiation_dps - this.current_radiation_dps;
            if (Math.abs(d_dps) <  this.radiation_d_dps_max)
                this.current_radiation_dps = this.target_radiation_dps;
            else
                this.current_radiation_dps += Math.sign(d_dps) * this.radiation_d_dps_max;
            this.current_opacity = Math.min(this.current_radiation_dps / this.radiation_dps_max, 1.0);
        }
        else
            this.current_opacity = 0;
        if ((this.current_opacity == this._last_opacity) && (this.current_opacity == 0)) return;
        _super.prototype.redraw.call(this, ctx, time);
    };

    WRadiationNoise.prototype.opacity_by_zoom = function() {
        return;
    };

    return WRadiationNoise;
})(WMapNoise);


var wMapNoise;
var wRadiationNoise;
