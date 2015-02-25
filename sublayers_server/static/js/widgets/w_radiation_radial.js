/*
 * Виджет, показывающий Радиацию
 * */

var WRadiationRadial = (function (_super) {
    __extends(WRadiationRadial, _super);

    function WRadiationRadial(car, div_parent) {
        _super.call(this, [car]);
        this.car = car;

        // создание дива-контейнера, чтобы при его удалении всё верно очистилось
        this.div_id = 'WRadiationRadial' + (-generator_ID.getID());
        $('#' + div_parent).append('<div id="' + this.div_id + '" class="w-radiation-radial-parent"></div>');

        var draw = SVG(this.div_id);
        this.draw = draw;

        this._init_params();

        var max_r = 50;
        this.max_r = max_r;
        var d_radius = 8;
        this.d_radius = d_radius;
        var size = max_r + 20; // максимальный радиус + 20 пикселей запаса
        this.center = size;
        var angle_of_transparent = 15; // угол прозрачности для кружочков
        var d_angle_of_transparent = -5; //

        // отрисовка трёх полукругов с прозрачностью
        for (var i = 0; i < 3; i++) {
            var r = max_r - d_radius * i;
            var p = polarPoint(r, gradToRad(angle_of_transparent - i * d_angle_of_transparent));

            draw.path('M ' + (-p.x) + ' ' + (-p.y) + 'A ' + r + ' ' + r + ' 0 0 0 ' + (-r) + ' ' + 0)
                .dmove(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_grad1
                });

            draw.path('M ' + (-p.x) + ' ' + (-p.y) + 'A ' + r + ' ' + r + ' 0 0 1 ' + p.x + ' ' + (-p.y))
                .dmove(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_main,
                    opacity: this.svg_params.circles.stroke_opacity
                });

            draw.path('M ' + p.x + ' ' + (-p.y) + 'A ' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + 0)
                .dmove(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_grad2
                });
        }

        this.out_r = this.max_r - d_radius;
        this.in_r = this.max_r - 2 * d_radius;

        // добавление треугольничков
        var triangle_dy = size - this.out_r - 1;
        var triangle_str = 'M 0 0 L -2.5 -4.33 L 2.5 -4.33 Z';
        // добавление треугольничков
        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_colors.main);

        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_colors.main)
            .transform({rotation: 90, cx: size, cy: size});

        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_colors.main)
            .transform({rotation: -90, cx: size, cy: size});


        // Добавление текстов виджета
        // Добавление текста процентов ХП
        this.text_prc = draw.text("0%")
            .font(this.svg_params.text_prc.font)
            .fill(this.svg_params.text_prc.fill)
            .dmove(size, size - 3 * this.d_radius);

        // текст RAD
        draw.text("RAD")
            .font(this.svg_params.text_RAD.font)
            .fill(this.svg_params.text_RAD.fill)
            .dmove(size, size - this.d_radius);

        // текст 0
        draw.text("0")
            .font(this.svg_params.text_digits_font)
            .fill(this.svg_params.text_digits_fill)
            .dmove(size - this.max_r - this.d_radius * 1.5, size);

        // текст 100
        draw.text("10")
            .font(this.svg_params.text_digits_font)
            .fill(this.svg_params.text_digits_fill)
            .dmove(size + this.max_r + this.d_radius * 1.5, size);

        // текст 50
        draw.text("5")
            .font(this.svg_params.text_digits_font)
            .fill(this.svg_params.text_digits_fill)
            .dmove(size, size - this.max_r - this.d_radius / 2.);

        this.draw_fill_area(0.75);
        var prc = 1.0;
        var self =  this;
        setInterval(function(){
            self.draw_fill_area(prc);
            prc -= 0.001
        }, 60);

        this.change(clock.getCurrentTime());
    }

    WRadiationRadial.prototype._init_params = function(){
        var draw = this.draw;
        // основные цвета сетки
        this.svg_colors = {
            main: '#5f5'
        };

        var self = this;
        this.svg_params = {
            // настройка кругов
            circles: {
                // характеристики границ окружностей
                stroke_width: 1,
                stroke_opacity: 0.8,
                fill: 'transparent',
                stroke_color_main: this.svg_colors.main,
                stroke_color_grad1: draw.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.0});
                    stop.at({ offset: 1, color: self.svg_colors.main, opacity: 0.8});
                }),
                stroke_color_grad2: draw.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.8});
                    stop.at({ offset: 1, color: self.svg_colors.main, opacity: 0.0});
                })

            },
            // настройка заливки
            fill_area: {
                stroke: {width: 0.0},
                fill: {color: this.svg_colors.main, opacity: 0.3},
                cl_stroke_opacity: 1,
                cl_stroke_color: this.svg_colors.main,
                cl_stroke_width: 1.2,
                cl_stroke_grad1: draw.gradient('linear', function (stop) {
                    stop.at({offset: 0, color: self.svg_colors.main, opacity: 1});
                    stop.at({offset: 1, color: self.svg_colors.main, opacity: 0});
                }),
                cl_stroke_grad2: draw.gradient('linear', function (stop) {
                    stop.at({offset: 0, color: self.svg_colors.main, opacity: 0});
                    stop.at({offset: 1, color: self.svg_colors.main, opacity: 1});
                })

            },
            text_prc: {
                font: {
                    family:   'Arial',
                    size:     11,
                    anchor:   'middle',
                    leading:  '0.5em'
                },
                fill: {color: this.svg_colors.main, opacity: 1}
            },
            text_RAD: {
                font: {
                    family:   'Arial',
                    size:     11,
                    anchor:   'middle',
                    leading:  '0.5em'
                },
                fill: {color: this.svg_colors.main, opacity: 0.4}
            },
            text_digits_fill: {color: this.svg_colors.main, opacity: 0.4},
            text_digits_font: {
                family: 'Arial',
                size: 10,
                anchor: 'middle',
                leading: '-0.2em'
            }
        };
    };

    WRadiationRadial.prototype.draw_fill_area = function(prc) {
        if (prc > 1.0) prc = 1.0;
        if (prc < 0.0) prc = 0.0;
        var size = this.center;
        var pa1 = polarPoint(-this.out_r, 0);
        var pb1 = polarPoint(-this.in_r, 0);
        var pa2 = polarPoint(-this.out_r, Math.PI * prc);
        var pb2 = polarPoint(-this.in_r, Math.PI * prc);
        var pcl = polarPoint(-(this.in_r - this.d_radius / 2.), Math.PI * prc);
        var draw = this.draw;

        if (this.fill_area || this.close_line || this.close_line_grad) {
            this.fill_area.remove();
            this.close_line.remove();
            this.close_line_grad.remove();

        }

        this.fill_area =
            draw.path(
                'M ' + pa1.x + ' ' + pa1.y +
                'A ' + this.out_r + ' ' + this.out_r + ' 0 0 1 ' + pa2.x + ' ' + pa2.y +
                'L ' + pb2.x + ' ' + pb2.y +
                'A ' + this.in_r + ' ' + this.in_r + ' 0 0 0 ' + pb1.x + ' ' + pb1.y +
                'Z'
            )
                .dmove(size, size)
                .fill(this.svg_params.fill_area.fill)
                .stroke(this.svg_params.fill_area.stroke);

        this.close_line =
            draw.line(pa2.x, pa2.y, pb2.x, pb2.y)
                .dmove(size, size)
                .stroke({
                    width: this.svg_params.fill_area.cl_stroke_width,
                    color: this.svg_params.fill_area.cl_stroke_color,
                    opacity: this.svg_params.fill_area.cl_stroke_opacity
                });

        this.close_line_grad =
            draw.line(pb2.x, pb2.y, pcl.x - 0.001, pcl.y - 0.001)
                .dmove(size, size)
                .stroke({
                    width: this.svg_params.fill_area.cl_stroke_width,
                    color: prc >= 0.5 ? this.svg_params.fill_area.cl_stroke_grad2 : this.svg_params.fill_area.cl_stroke_grad1
                });

        // Изменение текста (проценты)
        this.text_prc.text((prc * 10).toFixed(1) + ' Sv');
    };

    WRadiationRadial.prototype.change = function () {
        //var prc = this.car.getCurrentHP(clock.getCurrentTime()) / this.car._hp_state.max_hp;
        // todo: определить способ плавного изменения области заливки
        //this.draw_fill_area(prc);
    };

    WRadiationRadial.prototype.delFromVisualManager = function () {
        // todo: удалить свою вёрстку (просто удалить $('#' + this.div_id), по идее)
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WRadiationRadial;
})(VisualObject);