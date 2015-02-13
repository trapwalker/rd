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



        // Добавление кружочков, уменьшая радиус
        for (i = 1; i <= max_circles; i++)
            g.circle(0.0).radius(max_radius * i / max_circles)
                .center(size, size)
                .fill('transparent')
                .stroke({width: 1, color: '#5f5', opacity: 0.4});

        // добавление 45 градусных линий-отметок
        console.log(max_radius, max_circles, pi);
        var p1 = new Point(max_radius, 0);
        var p2 = new Point(max_radius - max_radius / max_circles, 0);
        var line_grad_1 = g.gradient('linear', function(stop) {
            stop.at({ offset: 0, color: '#0f0' , opacity: 0.0});
            stop.at({ offset: 1, color: '#0f0' , opacity: 0.7});
        });

        for (i = 0; i < 4; i++)
            g.line(p1.x, p1.y, p2.x + 0.1, p2.y + 0.1)
                .stroke({
                    width: 1,
                    color: line_grad_1
                })
                .dmove(size, size)
                .transform({rotation: 45 + i * 90, cx: size, cy: size});


        // Добавление радиальных точек
        var point_radius = 1.3;
        for (i = 1; i <= max_circles; i++)
            for (var y = 0; y < 4; y++)
                g.circle(0.0).radius(point_radius)
                    .stroke({
                        width: 0
                    }).
                    fill({color: '#0f0', opacity: 1.0})
                    .dmove(size + max_radius * i / max_circles, size)
                    .transform({rotation: y * 90, cx: size, cy: size});


        this._drawSectors();

    };


    WFireRadialGrid.prototype._drawSectors = function(){
        // отрисовывает все сектора на сетку, зависит от зума

        // Подготовка для отрисовки секторов и бортов
        var g = this.g;
        var first_radius = this.max_radius / this.max_circles;
        var second_radius = this.max_radius * 2/ this.max_circles;

        // Добавление залповых секторов (только сектора, без привязки к стронам)
        // получение списка секторов
        //var sectors = this.car.fireSidesMng.getSectors('', true);
        var sectors = this.car.fireSidesMng.getAllSectors();
        for(i=0; i< sectors.length; i++){
            var sector = sectors[i];
            var line_grad_2 = g.gradient('linear', function(stop) {
                stop.at({ offset: 0, color: '#0f0' , opacity: 0.0});
                stop.at({ offset: 1, color: '#0f0' , opacity: 0.2});
            });
            var sect_norm_color = {color: '#0f0' , opacity: 0.2};
            var sect_radius = sector.radius; // todo: поделить на 2 в степени maxZoom - currentZoom  (Math.pow())
            // сектор состоит из двух частей:
            // 1) градиентное начало между первыми двумя кругами
            // 2) цельное, не градиентное окончание, между вторым кругом и далее
            if (sect_radius > first_radius){ // значит сектор можно рисовать впринципе
                if (sect_radius > second_radius){ // значит сектор состоит из двух частей
                    this.elem_zoom.push(this._drawOneSector(first_radius, second_radius, sector.width, sector.direction, line_grad_2));
                    this.elem_zoom.push(this._drawOneSector(second_radius, sect_radius, sector.width, sector.direction, sect_norm_color));
                }
                else{ // сектор лежит между первым и вторым кругом
                    this.elem_zoom.push(this._drawOneSector(first_radius, sect_radius, sector.width, sector.direction, line_grad_2));
                }
            }
        }






        // Добавление бортов - просто линии, указывающие направление борта
        var sides = this.car.fireSidesMng.sides;

        if (sides.front.sectors.length)
            this._drawOneSide(second_radius,
                this.car.fireSidesMng.sides.front.sideRadius,
                this.car.fireSidesMng.sides.front.sideWidth,
                0.0
            );

        if (sides.back.sectors.length)
            this._drawOneSide(second_radius,
                this.car.fireSidesMng.sides.back.sideRadius,
                this.car.fireSidesMng.sides.back.sideWidth,
                -Math.PI
            );

        if (sides.left.sectors.length)
            this._drawOneSide(second_radius,
                this.car.fireSidesMng.sides.left.sideRadius,
                this.car.fireSidesMng.sides.left.sideWidth,
                Math.PI / 2.
            );

        if (sides.right.sectors.length)
            this._drawOneSide(second_radius,
                this.car.fireSidesMng.sides.right.sideRadius,
                this.car.fireSidesMng.sides.right.sideWidth,
                - Math.PI / 2.
            );

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
            .stroke({width: 0})
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

        var line_grad_for_side = g.gradient('linear', function(stop) {
            stop.at({ offset: 0, color: '#0f0' , opacity: 0.0});
            stop.at({ offset: 0.25, color: '#0f0' , opacity: 0.0});
            stop.at({ offset: 0.5, color: '#0f0' , opacity: 0.2});
            stop.at({ offset: 1, color: '#0f0' , opacity: 0.6});
        });

        var line_grad_for_side_end = g.gradient('linear', function(stop) {
            stop.at({ offset: 0, color: '#0f0' , opacity: 0.6});
            stop.at({ offset: 0.4, color: '#0f0' , opacity: 0.0});
            stop.at({ offset: 0.6, color: '#0f0' , opacity: 0.0});
            stop.at({ offset: 1, color: '#0f0' , opacity: 0.6});
        });

        g.line(p0.x, p0.y, sp11.x, sp11.y)
            .stroke({width: 1.4, color: line_grad_for_side});
        g.line(p0.x, p0.y, sp12.x, sp12.y)
            .stroke({width: 1.4, color: line_grad_for_side});
        g.line(sp11.x, sp11.y, sp21.x, sp21.y)
            .stroke({width: 1.4, color: '#0f0', opacity: 0.6});
        g.line(sp12.x, sp12.y, sp22.x, sp22.y)
            .stroke({width: 1.4, color: '#0f0', opacity: 0.6});

        // градиентная оконтовка окончания угла
        var path_str =
            'M ' + sp21.x + ' ' + sp21.y +
            'A ' + maxRadius + ' ' + maxRadius + ' 0 0 0 ' + sp22.x + ' ' + sp22.y;

        g.path(path_str)
            .stroke({width: 3, color: line_grad_for_side_end})
            .fill('transparent');

        g.transform({rotation: radToGrad(direction), cx: size, cy: size});
        g.dmove(size, size);


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


    WFireRadialGrid.prototype.test = function(){
        console.log('WFireRadialGrid.prototype.test');

        this.g.transform({rotation: 45, cx: 200, cy: 200});

        this.big_circle.fill('#5f5');
        this.big_circle.animate().opacity(0.0).after(function(){
            this.fill('transparent');
            this.opacity(1.0);
        })
    }

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

