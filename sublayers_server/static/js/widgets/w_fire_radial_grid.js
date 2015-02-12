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

        //var rect_of_size = g.rect(2 * size, 2 * size)
        //    .fill('transparent')
        //    .stroke({width: 8, color: '#a00'});


        /*
        var circle = g.circle(0);
            circle.radius(max_radius)
                .center(size, size)
                .fill('transparent')
                .stroke({width: 2, color: '#5f5'});
        //.opacity(0.3);
        //circle.center(size, size)
        */

        //g.line(0,0, size, size).stroke({width: 4, color: '#a00'});

        // Добавление кружочков, уменьшая радиус
        for (i = 1; i <= max_circles; i++)
            g.circle(0).radius(max_radius * i / max_circles)
                .center(size, size)
                .fill('transparent')
                .stroke({width: 1, color: '#5f5', opacity: 0.4});

        // добавление 45 градусных линий-отметок
        console.log(max_radius, max_circles, pi);
        var p1 = new Point(max_radius, 0);
        var p2 = new Point(max_radius - max_radius / max_circles, 0);
        //var p2 = new Point(0, 0);
        console.log(p1, p2);
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
        var point_radius = 2;
        for (i = 1; i <= max_circles; i++)
            for (var y = 0; y < 4; y++)
                g.circle(0).radius(point_radius)
                    .stroke({
                        width: 0
                    }).
                    fill({color: '#0f0', opacity: 1.0})
                    .dmove(size + max_radius * i / max_circles, size)
                    .transform({rotation: y * 90, cx: size, cy: size});



        this.g = g;
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

