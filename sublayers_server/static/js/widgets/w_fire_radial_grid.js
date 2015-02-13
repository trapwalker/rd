/*
 * Виджет для отрисовки центрального виджета стрельбы (сетки )
 * Ссылка на него находится в мап менеджере, так как при зумировании он должен исчезать
 */

var WFireRadialGrid = (function (_super) {
    __extends(WFireRadialGrid, _super);

    function WFireRadialGrid(car) {
        _super.call(this, [car]);
        this.car = car;
        this.marker = null; // это непосредственно маркер, в котором будет свг-иконка
        this.elem_zoom = []; // элементы, зависящие от зума, которые нужно перерисовывать

        this.init_marker();

        this.change(clock.getCurrentTime());
    }

    WFireRadialGrid.prototype.init_marker = function(t){
        var max_circles = 6; // todo: сделать зависимость от зума
        var time = clock.getCurrentTime();
        var pi = Math.PI;
        var i = 0; // тут будет много циклов
        var position = this.car.getCurrentCoord(time);
        var sides = this.car.fireSidesMng.sides;
        // todo: сделать зависимость от зума
        var max_radius = Math.max(
            sides.front.sideRadius,
            sides.back.sideRadius,
            sides.left.sideRadius,
            sides.right.sideRadius);
        var size = max_radius + 50; // радиус квадрата (ДАДА!!!!)
        this.size_of_icon = size;
        this.max_circles = max_circles;
        this.max_radius = max_radius;


        this.div_id = 'WFireRadialGrid' + (-generator_ID.getID());
        var myIcon = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [2 * size, 2 * size],
            iconAnchor: [size, size],   // todo: возможно здесь от каждой координаты -1, так как начинается иконка с 0
            html: '<div id="' + this.div_id + '" style="width: 100%; height: 100%"></div>'
        });

        this.marker = L.marker(myMap.unproject([position.x, position.y], map.getMaxZoom()),
            {icon: myIcon, zIndexOffset: 10});

        map.addLayer(this.marker);

        var draw = SVG(this.div_id);

        // попытка вставить всё в группу
        var g = draw.group();
        this.g = g;

        this._init_svg_parametrs();

        // Добавление кружочков, уменьшая радиус
        for (i = 1; i <= max_circles; i++)
            g.circle(0.0).radius(max_radius * i / max_circles)
                .center(size, size)
                .fill(this.svg_params.circles.fill)
                .stroke(this.svg_params.circles.stroke);

        // добавление 45 градусных линий-отметок
        var p1 = new Point(max_radius, 0);
        var p2 = new Point(max_radius - (max_radius / max_circles) * 0.75, 0);
        var p31 = rotateVector(new Point(max_radius, 0), gradToRad(10.0));
        var p32 = rotateVector(new Point(max_radius, 0), -gradToRad(10.0));
        for (i = 0; i < 4; i++) {
            g.line(p1.x, p1.y, p2.x + 0.1, p2.y + 0.1)
                .stroke(this.svg_params.lines_45.stroke)
                .dmove(size, size)
                .transform({rotation: 45 + i * 90, cx: size, cy: size});
            g.path('M ' + p1.x + ' ' + p1.y + 'A ' + max_radius + ' ' + max_radius + ' 0 0 0 ' + p31.x + ' ' + p31.y)
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
        var point_radius = 1.3;
        for (i = 1; i <= max_circles; i++)
            for (var y = 0; y < 4; y++)
                g.circle(0.0).radius(point_radius)
                    .stroke(this.svg_params.radial_point.stroke)
                    .fill(this.svg_params.radial_point.fill)
                    .dmove(size + max_radius * i / max_circles, size)
                    .transform({rotation: y * 90, cx: size, cy: size});


        this._drawSectors();

    };


    WFireRadialGrid.prototype._init_svg_parametrs = function () {
        var g = this.g;
        this.svg_colors = {
            main: '#5f5'
        };

        var self = this;

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
                    stop.at({ offset: 1, color: self.svg_colors.main , opacity: 0.6});
                }),
                width_of_line: 1.4,
                radial_stroke: {width: 2, color: self.svg_colors.main},
                radial_fill: 'transparent',
                dash_array: '5, 5'
            }


        };


    };


    WFireRadialGrid.prototype._drawSectors = function(){
        // отрисовывает все сектора на сетку, зависит от зума

        // Подготовка для отрисовки секторов и бортов
        var g = this.g;
        var first_radius = this.max_radius / this.max_circles;
        var second_radius = this.max_radius * 2/ this.max_circles;

        var scale_map = Math.pow(2., map.getMaxZoom() - map.getZoom()); // учёт зуммирования

        // Добавление залповых секторов (только сектора, без привязки к стронам)
        var sectors = this.car.fireSidesMng.getSectors('', true);
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
        var auto_sectors = this.car.fireSidesMng.getSectors('', false);
        for(i=0; i< auto_sectors.length; i++){
            var asector = auto_sectors[i];
            var asect_radius = asector.radius / scale_map;
            if (asect_radius > first_radius) // значит сектор можно рисовать впринципе
               this.elem_zoom.push(this._drawOneAutoSector(asect_radius, asector.width, asector.direction));
        }


        // todo: меньше какого радиуса рисовать или не рисовать эти зацепы.
        // Добавление бортов - просто линии, указывающие направление борта
        var sides = this.car.fireSidesMng.sides;
        var max_disch_radius = sides.front.getMaxDischargeRadius() / scale_map;
        var max_disch_width = sides.front.getMaxDischargeWidth();
        if (max_disch_radius > second_radius && max_disch_width > 0)
            this.elem_zoom.push(this._drawOneSide(second_radius, max_disch_radius, max_disch_width, 0.0));

        max_disch_radius = sides.back.getMaxDischargeRadius() / scale_map;
        max_disch_width = sides.back.getMaxDischargeWidth();
        if (max_disch_radius > second_radius && max_disch_width > 0)
            this.elem_zoom.push(this._drawOneSide(second_radius, max_disch_radius, max_disch_width, -Math.PI));

        max_disch_radius = sides.left.getMaxDischargeRadius() / scale_map;
        max_disch_width = sides.left.getMaxDischargeWidth();
        if (max_disch_radius > second_radius && max_disch_width > 0)
            this.elem_zoom.push(this._drawOneSide(second_radius, max_disch_radius, max_disch_width, Math.PI / 2.));

        max_disch_radius = sides.right.getMaxDischargeRadius() / scale_map;
        max_disch_width = sides.right.getMaxDischargeWidth();
        if (max_disch_radius > second_radius && max_disch_width > 0)
            this.elem_zoom.push(this._drawOneSide(second_radius, max_disch_radius, max_disch_width, -Math.PI / 2.));


    };


    WFireRadialGrid.prototype._drawOneSector = function(minRadius, maxRadius, width, direction, fillColor){
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


    WFireRadialGrid.prototype._drawOneSide = function(minRadius, maxRadius, width, direction){
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


    WFireRadialGrid.prototype._drawOneAutoSector = function(radius, width, direction){
        // todo: если ширина сектора больше 180, то: http://www.w3.org/TR/SVG/paths.html#PathData
        // Пример с красным кружком

        var size = this.size_of_icon;
        var g = this.g.group();

        var sp11 = rotateVector(new Point(radius - 10.0, 0), width /2.);
        var sp12 = rotateVector(new Point(radius - 10.0, 0), - width /2.);
        var sp21 = rotateVector(new Point(radius, 0), width /2.);
        var sp22 = rotateVector(new Point(radius, 0), - width /2.);

        g.line(sp11.x, sp11.y, sp21.x, sp21.y)
            .stroke({width: this.svg_params.auto_sectors.width_of_line,
                color: this.svg_params.auto_sectors.gradient_for_lines
            });
        g.line(sp12.x, sp12.y, sp22.x, sp22.y)
            .stroke({width: this.svg_params.auto_sectors.width_of_line,
                color: this.svg_params.auto_sectors.gradient_for_lines
            });

        // градиентная оконтовка окончания угла
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


    WFireRadialGrid.prototype.change = function(t){
        //console.log('WFireRadialGrid.prototype.change');
        // todo: считать и установить позицию и направление
        // todo: считать и установить проценты перезарядки и время перезарядки

        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var tempLatLng = map.unproject([tempPoint.x, tempPoint.y], map.getMaxZoom());
        // Установка угла для поворота иконки маркера
        var angle = this.car.getCurrentDirection(time);
        // Установка новых координат маркера);
        this.marker.setLatLng(tempLatLng);
        this.rotate(radToGrad(angle));
        // запрос и установка перезарядки для каждой из сторон

    };

    WFireRadialGrid.prototype.zoomStart = function(){
        console.log('WFireRadialGrid.prototype.zoomStart');
        while (this.elem_zoom.length)
            this.elem_zoom.pop().remove();
    };


    WFireRadialGrid.prototype.zoomEnd = function(){
        //console.log('WFireRadialGrid.prototype.zoomEnd');
        this._drawSectors();
    };



    WFireRadialGrid.prototype.test = function () {
        console.log('WFireRadialGrid.prototype.test');

        while (this.elem_zoom.length)
            this.elem_zoom.pop().remove();

        /*
         this.g.transform({rotation: 45, cx: 200, cy: 200});

         this.big_circle.fill('#5f5');
         this.big_circle.animate().opacity(0.0).after(function(){
         this.fill('transparent');
         this.opacity(1.0);
         })
         */
    };


    WFireRadialGrid.prototype.rotate = function(angle_in_degrees){
        this.g.transform({rotation: angle_in_degrees, cx: this.size_of_icon, cy: this.size_of_icon});
    };


    WFireRadialGrid.prototype.delFromVisualManager = function () {
        //console.log('WFireRadialGrid.prototype.delFromVisualManager');
        this.car = null;
        map.removeLayer(this.marker);
        _super.prototype.delFromVisualManager.call(this);
    };

    return WFireRadialGrid;
})(VisualObject);

