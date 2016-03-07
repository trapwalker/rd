/*
 * Виджет для отрисовки центрального виджета стрельбы (сетки )
 * Ссылка на него находится в мап менеджере, так как при зумировании он должен исчезать
 */

var WFireSectors = (function (_super) {
    __extends(WFireSectors, _super);

    function WFireSectors(car) {
        _super.call(this, [car]);
        this.car = car;
        this.marker = null; // это непосредственно маркер, в котором будет свг-иконка
        this.elem_zoom = []; // элементы, зависящие от зума, которые нужно перерисовывать

        this.init_marker();
        this._lastRotateAngle = 0.0;

        this.change(clock.getCurrentTime());
    }

    WFireSectors.prototype.init_marker = function(t){
        var max_circles = 6; // кол-во кругов сетки
        var time = clock.getCurrentTime();
        var i = 0; // для циклов
        var position = this.car.getCurrentCoord(time);
        var sides = this.car.fireSidesMng.sides;
        var max_radius = Math.max(
            sides.front.sideRadius,
            sides.back.sideRadius,
            sides.left.sideRadius,
            sides.right.sideRadius);
        var size = max_radius + 75; // радиус квадрата (ДАДА!!!!)
        this.size_of_icon = size;
        this.max_circles = max_circles;
        this.max_radius = max_radius;

        // создание иконки и маркера
        this.div_id = 'WFireRadialGrid' + (-generator_ID.getID());
        var myIcon = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [2 * size, 2 * size],
            iconAnchor: [size, size],   // todo: возможно здесь от каждой координаты -1, так как начинается иконка с 0
            html: '<div id="' + this.div_id + '" style="width: 100%; height: 100%"></div>'
        });

        this.marker = L.marker(myMap.unproject([position.x, position.y], map.getMaxZoom()),
            {
                icon: myIcon,
                zIndexOffset: -999,
                clickable: false,
                keyboard: false
            });

        map.addLayer(this.marker);

        // работа с SVG
        var draw = SVG(this.div_id);
        this.draw = draw;

        // группа: для вращения
        var g = draw.group();
        this.g = g;
        // после инициализации SVG можно задать все параметры: цвеат, градиенты и тд
        this._init_svg_parametrs();
/*
        // Добавление радиальных кружков, уменьшая радиус
        for (i = 1; i <= max_circles; i++)
            g.circle(0.0).radius(max_radius * i / max_circles)
                .center(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke(this.svg_params.circles.stroke);

        // добавление 45 градусных линий-отметок (их длинна сейчас по 10 градусов...изменяема)
        var p1 = new Point(max_radius, 0);
        var p2 = new Point(max_radius - (max_radius / max_circles) * 0.75, 0);
        var p31 = rotateVector(new Point(max_radius, 0), gradToRad(10.0));
        var p32 = rotateVector(new Point(max_radius, 0), -gradToRad(10.0));
        for (i = 0; i < 4; i++) {
            g.line(p1.x, p1.y, p2.x + 0.1, p2.y + 0.1)
                .stroke(this.svg_params.lines_45.stroke)
                .dmove(size, size)
                .transform({rotation: 45 + i * 90, cx: size, cy: size});
            g.path('M ' + p1.x + ' ' + p1.y + 'A ' + max_radius + ' ' + max_radius + ' 0 0 1 ' + p31.x + ' ' + p31.y)
                .stroke(this.svg_params.lines_45.stroke)
                .dmove(size, size)
                .transform({rotation: 45 + i * 90, cx: size, cy: size})
                .fill(this.svg_params.lines_45.radial_fill);
            g.path('M ' + p1.x + ' ' + p1.y + 'A ' + max_radius + ' ' + max_radius + ' 0 0 0 ' + p32.x + ' ' + p32.y)
                .stroke(this.svg_params.lines_45.stroke)
                .dmove(size, size)
                .transform({rotation: 45 + i * 90, cx: size, cy: size})
                .fill(this.svg_params.lines_45.radial_fill);
        }

        // Добавление радиальных точек
        for (i = 1; i <= max_circles; i++)
            for (var y = 0; y < 4; y++)
                g.circle(0.0).radius(this.svg_params.radial_point.radius)
                    .stroke(this.svg_params.radial_point.stroke)
                    .fill(this.svg_params.radial_point.fill)
                    .dmove(size + max_radius * i / max_circles, size)
                    .transform({rotation: y * 90, cx: size, cy: size});

        // Добавление точек-зумматоров (слева сзади от машинки), их координаты нужно сохранить
        this.zoomatorsPoints = [];
        this.zoomatorsText = [];
        for (i = 1; i <= max_circles; i++){
            var pz = rotateVector(new Point(max_radius * i / max_circles, 0), - 3. * Math.PI / 4.);
            pz = summVector(pz, new Point(size, size));
            g.circle(0.0).radius(this.svg_params.zoomators.radius)
                .stroke(this.svg_params.zoomators.stroke)
                .fill(this.svg_params.zoomators.fill)
                .dmove(pz.x, pz.y);
            this.zoomatorsPoints.push(pz); // сохраняем точку, чтобы потом вокруг неё вращать текст
        }
*/
        // вывод для каждого из бортов его области перезарядки
        this.rechAreas = {};
        this._drawRechargeArea('front');
        this._drawRechargeArea('back');
        this._drawRechargeArea('left');
        this._drawRechargeArea('right');

        // вывод текста зумматора
       // this._drawZoomatorsText();

        // вывод секторов
        this._drawSectors();
    };

    WFireSectors.prototype._init_svg_parametrs = function () {
        var g = this.g;
        // основные цвета сетки
        this.svg_colors = {
            main: '#5f5'
        };

        var self = this;

        // необходимо для вывода текста перезарядки вдоль дуги
        var d_rech_darius = 35; // определяет дальность полоски перезарядки
        var d_rech_text_radius = 25; // определяет высоту текста относительно полоски перезарядки
        var radius = this.max_radius + d_rech_darius + d_rech_text_radius;
        var sp1 = summVector(rotateVector(new Point(radius, 0), - Math.PI /4.), new Point(this.size_of_icon, this.size_of_icon));
        var sp2 = summVector(rotateVector(new Point(radius, 0), Math.PI /4.), new Point(this.size_of_icon, this.size_of_icon));
        var text_rech_path = 'M ' + sp1.x + ' ' + sp1.y + 'A ' + radius + ' ' + radius + ' 0 0 1 ' + sp2.x + ' ' + sp2.y;
        // запомнить длину дуги, чтобы можно было центровать текст
        var path = g.path(text_rech_path);
        var lpath = path.length();
        path.remove();

        this.svg_params = {
            // настройка кругов
            circles: {
                // характеристики границ окружностей
                stroke: {width: 1, color: this.svg_colors.main, opacity: 0.4},
                // заливка кругов
                fill: 'transparent'
            },
            // настройка 45 градусных линий
            lines_45: {
                stroke: {
                    width: 1.0,
                    color: g.gradient('linear', function(stop) {
                        stop.at({ offset: 0, color: self.svg_colors.main , opacity: 0.0});
                        stop.at({ offset: 1, color: self.svg_colors.main , opacity: 0.65});
                    })
                },
                radial_fill: 'transparent'
            },
            // настройка расходящихся точек
            radial_point: {
                radius: 1.3,
                stroke: {width: 0},
                fill: {color: this.svg_colors.main, opacity: 1.0}
            },
            // настройка залповых секторов
            disc_sectors: {
                gradient: g.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.0});
                    stop.at({ offset: 1, color: self.svg_colors.main, opacity: 0.2});
                }),
                norm_color: {color: this.svg_colors.main, opacity: 0.2},
                stroke: {width: 0}

            },
            // настройка бортов
            sides: {
                line_gradient: g.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.0});
                    stop.at({ offset: 0.25, color: self.svg_colors.main, opacity: 0.0});
                    stop.at({ offset: 0.5, color: self.svg_colors.main, opacity: 0.2});
                    stop.at({ offset: 1, color: self.svg_colors.main, opacity: 0.6});
                }),
                rad_gradient: g.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main, opacity: 0.6});
                    stop.at({ offset: 0.5, color: self.svg_colors.main, opacity: 0.0});
                }),
                width: 1.4,
                stroke_of_norm_line: {width: 1.4, color: this.svg_colors.main, opacity: 0.6},
                radial_fill: 'transparent'
            },

            // настройка автоматических секторов
            auto_sectors: {
                gradient_for_lines: g.gradient('linear', function(stop) {
                    stop.at({ offset: 0, color: self.svg_colors.main , opacity: 0.0});
                    stop.at({ offset: 1, color: self.svg_colors.main , opacity: 0.9});
                }),
                width_of_line: 1.4,
                radial_stroke: {width: 2, color: self.svg_colors.main},
                radial_fill: 'transparent',
                dash_array: '5, 5'
            },

            // настройка точек-зумматоров и текста к ним
            zoomators: {
                radius: 2,
                stroke: {width: 0},
                fill: {color: this.svg_colors.main, opacity: 1.0},
                text: {
                    font: {
                        family:   'Helvetica',
                        size:     10,
                        anchor:   'middle',
                        leading:  '1.5em'
                    },
                    fill: {color: this.svg_colors.main, opacity: 1}
                }
            },

            rechArea: {
                d_radius: d_rech_darius,
                text_path: text_rech_path,
                l_text_path: lpath,
                arc: {
                    stroke: {width: 1, color: this.svg_colors.main, opacity: 0.6},
                    fill: 'transparent'
                },
                rech_arc: {
                    stroke: {width: 3, color: this.svg_colors.main, opacity: 0.6},
                    fill: 'transparent'
                },
                rech_text: {
                    font: {
                        family:   'Helvetica',
                        size:     13,
                        anchor:   'start',
                        leading:  '1.5em'
                    },
                    fill: {color: this.svg_colors.main, opacity: 1},
                    tready: 'R E A D Y',
                    trech: 'L O A D I N G . . .'
                }
            }


        };

    };

    WFireSectors.prototype._drawSectors = function(){
        // Подготовка для отрисовки секторов и бортов
        var first_radius = this.max_radius / this.max_circles;
        var second_radius = this.max_radius * 2/ this.max_circles;

        var scale_map = Math.pow(2., map.getMaxZoom() - map.getZoom()); // учёт зуммирования

        // Добавление залповых секторов (только сектора, без привязки к стронам)
        var sectors = this.car.fireSidesMng.getSectors('', true, false);
        for(i=0; i< sectors.length; i++){
            var sector = sectors[i];
            var sect_radius = sector.radius / scale_map;
            // сектор состоит из двух частей:
            // 1) градиентное начало между первыми двумя кругами
            // 2) цельное, не градиентное окончание, между вторым кругом и далее
            if (sect_radius > first_radius){ // значит сектор можно рисовать впринципе
                if (sect_radius > second_radius) { // значит сектор состоит из двух частей
                    this.elem_zoom.push(this._drawOneSector(first_radius, second_radius, sector.width, sector.direction,
                        this.svg_params.disc_sectors.gradient));
                    this.elem_zoom.push(this._drawOneSector(second_radius, sect_radius, sector.width, sector.direction,
                        this.svg_params.disc_sectors.norm_color));
                }
                else{ // сектор лежит между первым и вторым кругом
                    this.elem_zoom.push(this._drawOneSector(first_radius, sect_radius, sector.width, sector.direction,
                        this.svg_params.disc_sectors.gradient));
                }
            }
        }

        // Добавление автоматических секторов (только сектора, без привязки к стронам)
        var auto_sectors = this.car.fireSidesMng.getSectors('', false, true);
        for(i=0; i< auto_sectors.length; i++){
            var asector = auto_sectors[i];
            var asect_radius = asector.radius / scale_map;
            if (asect_radius > first_radius) // значит сектор можно рисовать впринципе
                this.elem_zoom.push(this._drawOneAutoSector(asect_radius, asector.width, asector.direction));
        }

        // todo: меньше какого радиуса рисовать или не рисовать эти зацепы.
        // Добавление бортов - просто линии, указывающие направление борта
        var sides = this.car.fireSidesMng.sides;
        var max_disch_radius = sides.front.sideDischargeRadius / scale_map;
        var max_disch_width = sides.front.sideDischargeWidth;
        if (max_disch_radius > second_radius && max_disch_width > 0)
            this.elem_zoom.push(this._drawOneSide(second_radius, max_disch_radius, max_disch_width, 0.0));

        max_disch_radius = sides.back.sideDischargeRadius / scale_map;
        max_disch_width = sides.back.sideDischargeWidth;
        if (max_disch_radius > second_radius && max_disch_width > 0)
            this.elem_zoom.push(this._drawOneSide(second_radius, max_disch_radius, max_disch_width, -Math.PI));

        max_disch_radius = sides.left.sideDischargeRadius / scale_map;
        max_disch_width = sides.left.sideDischargeWidth;
        if (max_disch_radius > second_radius && max_disch_width > 0)
            this.elem_zoom.push(this._drawOneSide(second_radius, max_disch_radius, max_disch_width, Math.PI / 2.));

        max_disch_radius = sides.right.sideDischargeRadius / scale_map;
        max_disch_width = sides.right.sideDischargeWidth;
        if (max_disch_radius > second_radius && max_disch_width > 0)
            this.elem_zoom.push(this._drawOneSide(second_radius, max_disch_radius, max_disch_width, -Math.PI / 2.));


    };

    WFireSectors.prototype._clearSectors = function(){
        while (this.elem_zoom.length)
            this.elem_zoom.pop().remove();
    };

    WFireSectors.prototype._drawOneSector = function(minRadius, maxRadius, width, direction, fillColor){
        // todo: если ширина сектора больше 180, то: http://www.w3.org/TR/SVG/paths.html#PathData
        // Пример с красным кружком

        var size = this.size_of_icon;
        var sp11 = rotateVector(new Point(minRadius, 0), width /2.);
        var sp12 = rotateVector(new Point(minRadius, 0), - width /2.);
        var sp21 = rotateVector(new Point(maxRadius, 0), width /2.);
        var sp22 = rotateVector(new Point(maxRadius, 0), - width /2.);
        var path_str =
            'M ' + sp11.x + ' ' + sp11.y +
            'L ' + sp21.x + ' ' + sp21.y +
            'A ' + maxRadius + ' ' + maxRadius + ' 0 0 0 ' + sp22.x + ' ' + sp22.y +
            'L ' + sp12.x + ' ' + sp12.y +
            'A ' + minRadius + ' ' + minRadius + ' 0 0 1 ' + sp11.x + ' ' + sp11.y +
            'Z';

        return this.g.path(path_str)
            .dmove(size, size)
            .transform({rotation: radToGrad(direction), cx: size, cy: size})
            .stroke(this.svg_params.disc_sectors.stroke)
            .fill(fillColor);
    };

    WFireSectors.prototype._drawOneSide = function(minRadius, maxRadius, width, direction){
        // todo: если ширина сектора больше 180, то: http://www.w3.org/TR/SVG/paths.html#PathData
        // Пример с красным кружком

        var size = this.size_of_icon;
        var g = this.g.group();

        var p0 = new Point(0, 0);
        var sp11 = rotateVector(new Point(minRadius, 0), width /2.);
        var sp12 = rotateVector(new Point(minRadius, 0), - width /2.);
        var sp21 = rotateVector(new Point(maxRadius, 0), width /2.);
        var sp22 = rotateVector(new Point(maxRadius, 0), - width /2.);

        g.line(p0.x, p0.y, sp11.x, sp11.y)
            .stroke({width: this.svg_params.sides.width, color: this.svg_params.sides.line_gradient});
        g.line(p0.x, p0.y, sp12.x, sp12.y)
            .stroke({width: this.svg_params.sides.width, color: this.svg_params.sides.line_gradient});
        g.line(sp11.x, sp11.y, sp21.x, sp21.y)
            .stroke(this.svg_params.sides.stroke_of_norm_line);
        g.line(sp12.x, sp12.y, sp22.x, sp22.y)
            .stroke(this.svg_params.sides.stroke_of_norm_line);

        // градиентная оконтовка окончания угла
        var path_str =
            'M ' + sp21.x + ' ' + sp21.y +
            'A ' + maxRadius + ' ' + maxRadius + ' 0 0 0 ' + sp22.x + ' ' + sp22.y;

        g.path(path_str)
            .stroke({width: this.svg_params.sides.width, color: this.svg_params.sides.rad_gradient})
            .fill(this.svg_params.sides.radial_fill);

        g.transform({rotation: radToGrad(direction), cx: size, cy: size});
        g.dmove(size, size);
        return g;

    };

    WFireSectors.prototype._drawOneAutoSector = function(radius, width, direction){
        // todo: если ширина сектора больше 180, то: http://www.w3.org/TR/SVG/paths.html#PathData
        // Пример с красным кружком

        var size = this.size_of_icon;
        var g = this.g.group();
        var diffrent = 30.0; // todo: сделать зависимость от зума и размера этих зацепов
        var sp11 = rotateVector(new Point(radius - diffrent, 0), width /2.);
        var sp12 = rotateVector(new Point(radius - diffrent, 0), - width /2.);
        var sp21 = rotateVector(new Point(radius, 0), width /2.);
        var sp22 = rotateVector(new Point(radius, 0), - width /2.);

        g.line(sp11.x, sp11.y, sp21.x, sp21.y)
            .stroke({width: this.svg_params.auto_sectors.width_of_line,
                color: this.svg_params.auto_sectors.gradient_for_lines
            });
        //.attr('stroke-dasharray', this.svg_params.auto_sectors.dash_array);;
        g.line(sp12.x, sp12.y, sp22.x, sp22.y)
            .stroke({width: this.svg_params.auto_sectors.width_of_line,
                color: this.svg_params.auto_sectors.gradient_for_lines
            });
        //.attr('stroke-dasharray', this.svg_params.auto_sectors.dash_array);;

        // дуга
        var path_str =
            'M ' + sp21.x + ' ' + sp21.y +
            'A ' + radius + ' ' + radius + ' 0 0 0 ' + sp22.x + ' ' + sp22.y;

        g.path(path_str)
            .stroke(this.svg_params.auto_sectors.radial_stroke)
            .fill(this.svg_params.auto_sectors.radial_fill)
            .attr('stroke-dasharray', this.svg_params.auto_sectors.dash_array);

        g.transform({rotation: radToGrad(direction), cx: size, cy: size});
        g.dmove(size, size);
        return g;
    };

    WFireSectors.prototype._drawZoomatorsText = function(){
        // текст относится к группе и вертится вместе с ней
        if (this.zoomatorsText.length > 0 ) console.error('не удалён старый текст!!!!');
        var max_circles = this.max_circles;
        var points = this.zoomatorsPoints;
        var angle_of_car = radToGrad(this.car.getCurrentDirection(clock.getCurrentTime()));
        var g = this.g;
        var scale_map = Math.pow(2., map.getMaxZoom() - map.getZoom()); // учёт зуммирования
        for (var i = 0; i < max_circles; i++) {
            var p = points[i];
            var digit_str = (Math.round((i+1) * scale_map)).toString();
            var text = g.text(digit_str)
                .font(this.svg_params.zoomators.text.font)
                .fill(this.svg_params.zoomators.text.fill)
                .dmove(p.x, p.y-25)
                .transform({rotation: -angle_of_car, cx: p.x, cy: p.y});
            this.zoomatorsText.push(text);
        }

    };

    WFireSectors.prototype._drawZoomatorsText2 = function(){
        // текст относится к draw и НЕ вертится вместе с гуппой, а просто перемещается на нужную точку
        if (this.zoomatorsText.length > 0 ) console.error('не удалён старый текст!!!!');
        var max_circles = this.max_circles;
        var points = this.zoomatorsPoints;
        var angle_of_car = radToGrad(this.car.getCurrentDirection(clock.getCurrentTime()));
        var g = this.draw;
        var scale_map = Math.pow(2., map.getMaxZoom() - map.getZoom()); // учёт зуммирования
        for (var i = 0; i < max_circles; i++) {
            var p = points[i];
            var digit_str = (Math.round((i+1) * scale_map)).toString();
            var text = g.text(digit_str)
                .font(this.svg_params.zoomators.text.font)
                .fill(this.svg_params.zoomators.text.fill)
                .dmove(p.x, p.y-25);
            this.zoomatorsText.push(text);
        }

    };

    WFireSectors.prototype._clearZoomatorsText = function(){
        while (this.zoomatorsText.length)
            this.zoomatorsText.pop().remove();
    };

    WFireSectors.prototype._rotateZoomatorsText = function(angle_in_degrees){
        var max_circles = this.max_circles;
        for (var i = 0; i < max_circles; i++) {
            var p = this.zoomatorsPoints[i];
            var text = this.zoomatorsText[i];
            text.transform({rotation: -angle_in_degrees, cx: p.x, cy: p.y});
        }
    };

    WFireSectors.prototype._rotateZoomatorsText2 = function(angle_in_degrees){
        // перемещение текста, а не его вращение
        var max_circles = this.max_circles;
        for (var i = 0; i < max_circles; i++) {
            var p = this.zoomatorsPoints[i];
            p = subVector(p, new Point(this.size_of_icon, this.size_of_icon));
            p = rotateVector(p, gradToRad(angle_in_degrees));
            p = summVector(p, new Point(this.size_of_icon, this.size_of_icon));
            var text = this.zoomatorsText[i];
            text.move(p.x, p.y - 20.);
        }
    };

    WFireSectors.prototype._drawRechargeArea = function(side_str){
        var side = this.car.fireSidesMng.sides[side_str];
        var width = side.sideDischargeWidth;
        if (width <= 0) return;
        var g = this.g;
        var direction = side.direction;
        var size = this.size_of_icon;
        var radius = this.max_radius + this.svg_params.rechArea.d_radius;
        var sp1 = rotateVector(new Point(radius, 0), width /2.);
        var sp2 = rotateVector(new Point(radius, 0), - width /2.);

        // дуга 1, которая без перезарядки
        var path_str =
            'M ' + sp1.x + ' ' + sp1.y +
            'A ' + radius + ' ' + radius + ' 0 0 0 ' + sp2.x + ' ' + sp2.y;

        g.path(path_str)
            .stroke(this.svg_params.rechArea.arc.stroke)
            .fill(this.svg_params.rechArea.arc.fill)
            .transform({rotation: radToGrad(direction), cx: size, cy: size})
            .dmove(size, size);

        // дуга 2, с перезарядкой. Сохранить её в объект
        var rech = g.path(path_str)
            .stroke(this.svg_params.rechArea.rech_arc.stroke)
            .fill(this.svg_params.rechArea.rech_arc.fill)
            .transform({rotation: radToGrad(direction), cx: size, cy: size})
            .dmove(size, size)
            .attr('stroke-linecap', 'round');

        // вывод текста по дуге
        var text = g.text(this.svg_params.rechArea.rech_text.tready);
        text
            .font(this.svg_params.rechArea.rech_text.font)
            .fill(this.svg_params.rechArea.rech_text.fill)
            .transform({rotation: radToGrad(direction), cx: size, cy: size})
            .path(this.svg_params.rechArea.text_path);
        text.textPath.attr('startOffset', 0.5 * (this.svg_params.rechArea.l_text_path - text.length())/ this.svg_params.rechArea.l_text_path);

        this.rechAreas[side_str] = {
            rech_arc: rech,
            width: width,
            rech_text: text,
            rech_flag: false
            // todo: добавить сюда ссылку на текст времени в секундах
        }
    };

    WFireSectors.prototype._recharging = function(options){
        // todo: считать время как входной параметр (просто считывать из options.time)
        var prc = options.prc;
        var side_str = options.side_str;
        if (! this.rechAreas[side_str]) return;
        var side = this.rechAreas[side_str];
        if(prc < 1.) { // если ещё перезарядка
            if(! side.rech_flag){ // если до этого не перезаряжались, то установить текст перезарядки
                this._setRechText(side_str, this.svg_params.rechArea.rech_text.trech);
                side.rech_flag = true;
            }
            // заполнить линию перезарядки, пересчитая path
            var width = side.width;
            var radius = this.max_radius + this.svg_params.rechArea.d_radius;
            var sp1 = rotateVector(new Point(radius, 0), - width /2. + width * prc);
            var sp2 = rotateVector(new Point(radius, 0), - width /2. );

            // дуга перезарядки
            var path_str =
                'M ' + sp1.x + ' ' + sp1.y +
                'A ' + radius + ' ' + radius + ' 0 0 0 ' + sp2.x + ' ' + sp2.y;
            side.rech_arc.plot(path_str).dmove(this.size_of_icon, this.size_of_icon);

        }
        else{ // если мы уже перезаряжены
            if(side.rech_flag){ // если мы были в перезарядке, но перезарядились
                this._setRechText(side_str, this.svg_params.rechArea.rech_text.tready);
                side.rech_flag = false;

                // заполнить линию перезарядки, пересчитая path
                var width = side.width;
                var radius = this.max_radius + this.svg_params.rechArea.d_radius;
                var sp1 = rotateVector(new Point(radius, 0), width /2.);
                var sp2 = rotateVector(new Point(radius, 0), - width /2.);

                // дуга перезарядки
                var path_str =
                    'M ' + sp1.x + ' ' + sp1.y +
                    'A ' + radius + ' ' + radius + ' 0 0 0 ' + sp2.x + ' ' + sp2.y;
                side.rech_arc.plot(path_str).dmove(this.size_of_icon, this.size_of_icon);
            }
        }
    };

    WFireSectors.prototype._setRechText = function(side_str, rech_text){
        // todo: передать сюда ещё текст времени, чтобы обнулить его (сделать равным  "")
        var text = this.rechAreas[side_str].rech_text;
        text.text(rech_text);
        text.textPath.attr('startOffset', 0.5 * (this.svg_params.rechArea.l_text_path - text.length())/ this.svg_params.rechArea.l_text_path);
    };

    WFireSectors.prototype.change = function(t){
        //console.log('WFireRadialGrid.prototype.change');
        return;
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        // Установка угла для поворота иконки маркера
        var angle = this.car.getCurrentDirection(time);
        // Установка новых координат маркера или просто обновление угла;
        if (!mapManager.inZoomChange)
            this.marker.setLatLng(tempLatLng);
        else
            this.marker.update();
        this.rotate(radToGrad(angle));

        // запрос и установка перезарядки для каждой из сторон
        var options = this.car.fireSidesMng.getRechargeStates(t);
        for(var i = 0; i < options.length; i++)
            this._recharging(options[i]);
    };

    WFireSectors.prototype.setZoom = function(new_zoom) {
        //console.log('WFireRadialGrid.prototype.zoomStart');
        this.zoom = new_zoom;
        this.zoomStart();
        if(this.kostil_event)
            timeManager.delTimeoutEvent(this.kostil_event);
        this.kostil_event = timeManager.addTimeoutEvent(this, 'zoomEnd', ConstDurationAnimation + 10);
    };

    WFireSectors.prototype.zoomStart = function(){
        //console.log('WFireRadialGrid.prototype.zoomStart');
        this._clearSectors();
        //this._clearZoomatorsText();
    };

    WFireSectors.prototype.zoomEnd = function(){
        //console.log('WFireRadialGrid.prototype.zoomEnd');
        this._drawSectors();
        //this._drawZoomatorsText();
    };

    WFireSectors.prototype.rotate = function(angle_in_degrees){
        if (Math.abs(this._lastRotateAngle - angle_in_degrees) > 0.1) {
            this.g.transform({rotation: angle_in_degrees, cx: this.size_of_icon, cy: this.size_of_icon});
            this._lastRotateAngle = angle_in_degrees;
            //this._rotateZoomatorsText(angle_in_degrees);
        }
    };

    WFireSectors.prototype.delFromVisualManager = function () {
        //console.log('WFireRadialGrid.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        mapManager.widget_fire_sectors = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WFireSectors;
})(VisualObject);

