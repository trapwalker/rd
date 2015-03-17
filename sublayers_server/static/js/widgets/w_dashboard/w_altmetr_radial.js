/*
 * Виджет, показывающий высоту
 * */

var WAltmetrRadial = (function (_super) {
    __extends(WAltmetrRadial, _super);

    function WAltmetrRadial(car, div_parent) {
        _super.call(this, [car]);
        this.car = car;

        // Компакт режим
        this.compactText = $('#cruiseControlCompactViewAltitudeTextDiv');

        // создание дива-контейнера, чтобы при его удалении всё верно очистилось
        this.div_id = 'WAltmetrRadial' + (-generator_ID.getID());
        $('#' + div_parent).append('<div id="' + this.div_id + '" class="w-alt-radial-parent"></div>');

        var draw = SVG(this.div_id);
        this.draw = draw;

        this._init_params();

        var max_r = 30;
        var d_radius = 6;
        this.d_radius = d_radius;
        var size = max_r + 20; // максимальный радиус + 20 пикселей запаса
        this.center = size;
        this.start_angle = 45;
        var angle_of_transparent = 15; // угол прозрачности для кружочков
        this.full_angle = 180 + 2 * this.start_angle;


        // отрисовка трёх полукругов с прозрачностью
        for (var i = 0; i < 2; i++) {
            var r = max_r - d_radius * i;
            var p = polarPoint(r, gradToRad(this.start_angle));
            var pt = polarPoint(r, gradToRad(this.start_angle + angle_of_transparent));

            draw.path('M ' + (-pt.x) + ' ' + pt.y + 'A ' + r + ' ' + r + ' 0 0 1 ' + (-p.x) + ' ' + p.y)
                .dmove(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_grad2
                });

            draw.path('M ' + (-p.x) + ' ' + p.y + 'A ' + r + ' ' + r + ' 0 1 1 ' + p.x + ' ' + p.y)
                .dmove(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_main,
                    opacity: this.svg_params.circles.stroke_opacity
                });

            draw.path('M ' + pt.x + ' ' + pt.y + 'A ' + r + ' ' + r + ' 0 0 0 ' + p.x + ' ' + p.y)
                .dmove(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_grad1
                });

        }

        this.out_r = max_r;
        this.in_r = max_r - d_radius;

        // добавление треугольничков
        var triangle_dy = size - this.out_r - 1;
        var triangle_str = 'M 0 0 L -2.5 -4.33 L 2.5 -4.33 Z';
        // добавление треугольничков
        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_params.triangle_fill);

        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_params.triangle_fill)
            .transform({rotation: 135, cx: size, cy: size});

        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_params.triangle_fill)
            .transform({rotation: -135, cx: size, cy: size});

        // Добавление текста метров
        this.text_prc = draw.text("0%")
            .font(this.svg_params.text_prc.font)
            .fill(this.svg_params.text_prc.fill)
            .dmove(size, size + 0.5 * this.d_radius);

        // текст ALT
        draw.text("ALT")
            .font(this.svg_params.text_HEALTH.font)
            .fill(this.svg_params.text_HEALTH.fill)
            .dmove(size, size - 2 * this.d_radius);

        this.draw_fill_area(0.5);

        this.change(clock.getCurrentTime());
    }

    WAltmetrRadial.prototype._init_params = function(){
        var draw = this.draw;
        // основные цвета сетки
        this.svg_colors = {
            main: '#00ff54', // все stroke
            main2: '#2afd0a' // все заливки и текст
        };

        var self = this;
        this.svg_params = {
            // настройка кругов
            circles: {
                // характеристики границ окружностей
                stroke_width: 1,
                stroke_opacity: 0.45,
                fill: 'transparent',
                stroke_color_main: this.svg_colors.main,
                stroke_color_grad1: draw.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.0});
                    stop.at({ offset: 1, color: self.svg_colors.main, opacity: 0.45});
                }),
                stroke_color_grad2: draw.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.45});
                    stop.at({ offset: 1, color: self.svg_colors.main, opacity: 0.0});
                })

            },
            // настройка заливки
            fill_area: {
                stroke: {width: 0.0},
                fill: {color: this.svg_colors.main2, opacity: 0.1},
                cl_stroke_opacity: 1,
                cl_stroke_color: this.svg_colors.main2,
                cl_stroke_width: 1.2,
                cl_stroke_grad1: draw.gradient('linear', function (stop) {
                    stop.at({offset: 0, color: self.svg_colors.main2, opacity: 1});
                    stop.at({offset: 1, color: self.svg_colors.main2, opacity: 0});
                }),
                cl_stroke_grad2: draw.gradient('linear', function (stop) {
                    stop.at({offset: 0, color: self.svg_colors.main2, opacity: 0});
                    stop.at({offset: 1, color: self.svg_colors.main2, opacity: 1});
                })

            },
            text_prc: {
                font: {
                    family:   'MICRADI',
                    size:     9,
                    anchor:   'middle',
                    leading:  '0.5em'
                },
                fill: {color: this.svg_colors.main2, opacity: 1}
            },
            text_HEALTH: {
                font: {
                    family:   'MICRADI',
                    size:     9,
                    anchor:   'middle',
                    leading:  '0.5em'
                },
                fill: {color: this.svg_colors.main2, opacity: 0.5}
            },
            text_digits_fill: {color: this.svg_colors.main2, opacity: 0.4},
            text_digits_font: {
                family: 'Arial',
                size: 10,
                anchor: 'middle',
                leading: '-0.2em'
            },
            triangle_fill: {color: this.svg_colors.main2, opacity: 0.5}
        };
    };

    WAltmetrRadial.prototype.draw_fill_area = function(prc) {
        if (prc > 1.0) prc = 1.0;
        if (prc < 0.0) prc = 0.0;
        var size = this.center;
        var angle = prc * this.full_angle;
        var pa1 = polarPoint(-this.out_r, -gradToRad(this.start_angle));
        var pb1 = polarPoint(-this.in_r, -gradToRad(this.start_angle));
        var pa2 = rotateVector(pa1, gradToRad(angle));
        var pb2 = rotateVector(pb1, gradToRad(angle));
        var pcl = mulScalVector(pb2, (this.in_r - this.d_radius) / this.in_r);
        var draw = this.draw;

        if (this.fill_area || this.close_line || this.close_line_grad) {
            this.fill_area.remove();
            this.close_line.remove();
            this.close_line_grad.remove();

        }

        var is_second_1_in_arc = angle > 180.0 ? 1 : 0;

        this.fill_area =
            draw.path(
                'M ' + pa1.x + ' ' + pa1.y +
                'A ' + this.out_r + ' ' + this.out_r + ' 0 '+is_second_1_in_arc+' 1 ' + pa2.x + ' ' + pa2.y +
                'L ' + pb2.x + ' ' + pb2.y +
                'A ' + this.in_r + ' ' + this.in_r + ' 0 '+is_second_1_in_arc+' 0 ' + pb1.x + ' ' + pb1.y +
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
            draw.line(pb2.x, pb2.y, pcl.x + 0.001, pcl.y + 0.001)
                .dmove(size, size)
                .stroke({
                    width: this.svg_params.fill_area.cl_stroke_width,
                    color: prc >= 0.5 ? this.svg_params.fill_area.cl_stroke_grad2 : this.svg_params.fill_area.cl_stroke_grad1
                });

        // Изменение текста (метры)
        // todo: узнать сколько метров минимум, а сколько максимум, и здесь переводить
        this.text_prc.text(Math.round(prc * 100) + ' M');
        this.compactText.text(Math.round(prc * 100) + ' M');
    };

    WAltmetrRadial.prototype.change = function () {
        //var prc = this.car.getCurrentHP(clock.getCurrentTime()) / this.car._hp_state.max_hp;
        // todo: определить способ плавного изменения области заливки
        //this.draw_fill_area(prc);
    };

    WAltmetrRadial.prototype.delFromVisualManager = function () {
        // todo: удалить свою вёрстку (просто удалить $('#' + this.div_id), по идее)
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WAltmetrRadial;
})(VisualObject);