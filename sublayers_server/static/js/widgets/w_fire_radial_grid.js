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
        var time = clock.getCurrentTime();
        var position = this.car.getCurrentCoord(time);
        var size = 200; // радиус квадрата (ДАДА!!!!)
        this.size_of_icon = size;
        var max_radius = 180;
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

        var rect_of_size = g.rect(2 * size, 2 * size)
            .fill('transparent')
            .stroke({width: 8, color: '#a00'});

        //var circle = draw.polygon([[0, 0], [50, 0], [0, 50]])
        var circle = g.circle(0);
            circle.radius(max_radius)
                .center(size, size)
                .fill('transparent')
                .stroke({width: 2, color: '#5f5'});
        //.opacity(0.3);
        //circle.center(size, size)

        this.big_circle = circle;

        g.line(0,0, size, size).stroke({width: 4, color: '#a00'});
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

