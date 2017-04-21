/*
 * Виджет, показывающий WIND
 * */

var WWindRadial = (function (_super) {
    __extends(WWindRadial, _super);

    function WWindRadial(car, div_parent) {
        _super.call(this, [car]);
        this.car = car;
        this.current_interface_size = interface_scale_big;
        this.alarm_sound = null;

        // создание дива-контейнера, чтобы при его удалении всё верно очистилось
        this.div_id = 'WFuelRadial' + (-generator_ID.getID());
        $('#' + div_parent).append('<div id="' + this.div_id + '" class="w-wind-radial-parent"></div>');

        // Лампочка тревоги
        this.alarmLamp = $("<div id='windAlarmLamp' class='windAlarmLamp-off'></div>");
        this.alarmLampState = false;
        $('#' + div_parent).append(this.alarmLamp);

        // Компакт режим
        this.compactText = $('#cruiseControlCompactViewWindTextDiv');

        this._drawRadialScale();
        this.draw_fill_area(0.75);
        this.draw.dmove(0, 2);
        this.change(clock.getCurrentTime());
    }

    WWindRadial.prototype._init_params = function(){
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
                    size:     this.current_interface_size ? 9 : 7,
                    anchor:   'middle',
                    leading:  '0.2em'
                },
                fill: {color: this.svg_colors.main2, opacity: 1}
            },
            text_WIND: {
                font: {
                    family:   'MICRADI',
                    size:     this.current_interface_size ? 9 : 7,
                    anchor:   'middle',
                    leading:  '0.4em'
                },
                fill: {color: this.svg_colors.main2, opacity: 0.5}
            },
            text_digits_fill: {color: this.svg_colors.main2, opacity: 0.5},
            text_digits_font: {
                family: 'MICRADI',
                size: this.current_interface_size ? 8 : 7,
                anchor: 'middle',
                leading: '1.2em'
            },
            triangle_fill: {color: this.svg_colors.main2, opacity: 0.5}
        };
    };

    WWindRadial.prototype._drawRadialScale = function(){
        $('#' + this.div_id).empty();
        var draw_main = SVG(this.div_id);
        this.draw_main = draw_main;
        var draw = draw_main.group();
        this.draw = draw;

        this._init_params();

        var max_r = this.current_interface_size ? 45 : 35;
        this.max_r = max_r;
        var d_radius = this.current_interface_size ? 6 : 4;
        this.d_radius = d_radius;
        var size = max_r + 20; // максимальный радиус + 20 пикселей запаса
        this.center = size;
        var angle_of_transparent = 15; // угол прозрачности для кружочков
        var d_angle_of_transparent = -5;

        // отрисовка трёх полукругов с прозрачностью
        for (var i = 0; i < 3; i++) {
            var r = max_r - d_radius * i;
            var p = polarPoint(r, -gradToRad(angle_of_transparent - i * d_angle_of_transparent));

            draw.path('M ' + (-p.x) + ' ' + (-p.y) + 'A ' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + 0)
                .dmove(size, 0)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_grad1
                });

            draw.path('M ' + (-p.x) + ' ' + (-p.y) + 'A ' + r + ' ' + r + ' 0 0 0 ' + p.x + ' ' + (-p.y))
                .dmove(size, 0)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_main,
                    opacity: this.svg_params.circles.stroke_opacity
                });

            draw.path('M ' + p.x + ' ' + (-p.y) + 'A ' + r + ' ' + r + ' 0 0 0 ' + r + ' ' + 0)
                .dmove(size, 0)
                .fill(this.svg_params.circles.fill)
                .stroke({
                    width: this.svg_params.circles.stroke_width,
                    color: this.svg_params.circles.stroke_color_grad2
                });
        }

        this.out_r = this.max_r - d_radius;
        this.in_r = this.max_r - 2 * d_radius;

        // добавление треугольничков
        var triangle_dy = this.out_r + 1;
        var triangle_str = 'M 0 0 L -2.5 4.33 L 2.5 4.33 Z';
        // добавление треугольничков
        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_params.triangle_fill);

        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_params.triangle_fill)
            .transform({rotation: 90, cx: size, cy: 0});

        draw.path(triangle_str)
            .dmove(size, triangle_dy)
            .stroke({width: 0})
            .fill(this.svg_params.triangle_fill)
            .transform({rotation: -90, cx: size, cy: 0});


        // Добавление текстов виджета
        // Добавление текста процентов ХП
        this.text_prc = draw.text("0.00")
            .font(this.svg_params.text_prc.font)
            .fill(this.svg_params.text_prc.fill)
            .dmove(size, 3 * this.d_radius);

        // текст HEALTH
        draw.text("WIND")
            .font(this.svg_params.text_WIND.font)
            .fill(this.svg_params.text_WIND.fill)
            .dmove(size, this.d_radius);

        // текст 0
        draw.text("0")
            .font(this.svg_params.text_digits_font)
            .fill(this.svg_params.text_digits_fill)
            .dmove(size - this.max_r - this.d_radius * 1.5, 0);

        // текст 30
        draw.text("30")
            .font(this.svg_params.text_digits_font)
            .fill(this.svg_params.text_digits_fill)
            .dmove(size + this.max_r + this.d_radius * 1.5, 0);

        // текст 15
        draw.text("15")
            .font(this.svg_params.text_digits_font)
            .fill(this.svg_params.text_digits_fill)
            .dmove(size, this.max_r);
    };

    WWindRadial.prototype.draw_alarmLamp = function() {
        if (this.alarmLampState) {
            this.alarmLamp.removeClass('windAlarmLamp-off');
            this.alarmLamp.addClass('windAlarmLamp-on');
            this.alarm_sound = audioManager.play({name: "error_1", gain: 1.0 * audioManager._settings_interface_gain, priority: 1.0, loop: true});
        }
        else {
            this.alarmLamp.removeClass('windAlarmLamp-on');
            this.alarmLamp.addClass('windAlarmLamp-off');
            if (this.alarm_sound) this.alarm_sound.stop();
        }
    };

    WWindRadial.prototype.draw_fill_area = function(prc) {
        if (prc > 1.0) prc = 1.0;
        if (prc < 0.0) prc = 0.0;
        var size = this.center;
        var pa1 = polarPoint(-this.out_r, 0);
        var pb1 = polarPoint(-this.in_r, 0);
        var pa2 = polarPoint(-this.out_r, -Math.PI * prc);
        var pb2 = polarPoint(-this.in_r, -Math.PI * prc);
        var pcl = polarPoint(-(this.in_r - this.d_radius / 2.), -Math.PI * prc);
        var draw = this.draw;

        if (this.fill_area || this.close_line || this.close_line_grad) {
            this.fill_area.remove();
            this.close_line.remove();
            this.close_line_grad.remove();

        }

        this.fill_area =
            draw.path(
                'M ' + pa1.x + ' ' + pa1.y +
                'A ' + this.out_r + ' ' + this.out_r + ' 0 0 0 ' + pa2.x + ' ' + pa2.y +
                'L ' + pb2.x + ' ' + pb2.y +
                'A ' + this.in_r + ' ' + this.in_r + ' 0 0 1 ' + pb1.x + ' ' + pb1.y +
                'Z'
            )
                .dmove(size, 0)
                .fill(this.svg_params.fill_area.fill)
                .stroke(this.svg_params.fill_area.stroke);

        this.close_line =
            draw.line(pa2.x, pa2.y, pb2.x, pb2.y)
                .dmove(size, 0)
                .stroke({
                    width: this.svg_params.fill_area.cl_stroke_width,
                    color: this.svg_params.fill_area.cl_stroke_color,
                    opacity: this.svg_params.fill_area.cl_stroke_opacity
                });

        this.close_line_grad =
            draw.line(pb2.x, pb2.y, pcl.x - 0.001, pcl.y - 0.001)
                .dmove(size, 0)
                .stroke({
                    width: this.svg_params.fill_area.cl_stroke_width,
                    color: prc >= 0.5 ? this.svg_params.fill_area.cl_stroke_grad2 : this.svg_params.fill_area.cl_stroke_grad1
                });

        // Изменение текста (проценты)
        this.text_prc.text(Math.round(prc * 30.) + ' m/s');
        this.compactText.text(Math.round(prc * 30.) + ' m/s');
    };

    WWindRadial.prototype.change = function () {
        //console.log('WWindRadial.prototype.change');
        //var prc = this.car.getCurrentHP(clock.getCurrentTime()) / this.car._hp_state.max_hp;
        // todo: определить способ плавного изменения области заливки
        //this.draw_fill_area(prc);
    };

    WWindRadial.prototype.delFromVisualManager = function () {
        $('#' + this.div_id).remove();
        this.alarmLamp.remove();
        this.car = null;
        if (this.alarm_sound) this.alarm_sound.stop();
        _super.prototype.delFromVisualManager.call(this);
    };

    WWindRadial.prototype._resize_view = function() {
        if (this.current_interface_size == interface_scale_big) return;
        this.current_interface_size = interface_scale_big;

        this._drawRadialScale();
        this.draw_fill_area(0.75);
    };

    return WWindRadial;
})(VisualObject);

var wWindControl;