var ConstDurationScale = 50;    // Длительность расширения вспышки, ms
var ConstDurationHiding = 100;  // Длительность затухания вспышки, ms
var ConstDurationShow = 50;     // Время замирания вспышки после расширения, ms
var ConstMinRadius = 0.2;       // Относительный радиус ядра вспышки (должен быть меньше 1)
var ConstRangeRadius = 0.3;     // Разброс точек многоугольника вспышки (должен быть меньше 1)

var EFlashLight = (function(){
    function EFlashLight(position, radius){
        if (position && radius >= 2.) {
            this.radius = radius;
            this.div_id = 'EFlashLight' + (-generator_ID.getID());
            var myIcon = L.divIcon({
                className: 'my-bang-icon',
                iconSize: [4 * radius, 4 * radius],
                iconAnchor: [2 * radius, 2 * radius],   // todo: возможно здесь от каждой координаты -1, так как начинается иконка с 0
                html: '<div id="' + this.div_id + '"></div>'
            });
            this.marker = L.marker(myMap.unproject([position.x, position.y], map.getMaxZoom()), {icon: myIcon, zIndexOffset: 10});
            this.duration = ConstDurationScale + ConstDurationHiding + ConstDurationShow;
        }
    }

    EFlashLight.prototype.on_start = function () {
        function generate_flash_light(radius) {
            var _points = [];
            var _min_r = ConstMinRadius * radius;
            var _max_r = (1 - ConstRangeRadius) * radius;
            var _random_range = ConstRangeRadius * radius;
            var _d_ang = 2 * Math.PI / 16.;
            for (var i = 0; i < 16; i++) {
                var _chet = i % 2;
                var value = Math.random() * _random_range + (_chet == 0 ? _min_r : _max_r);
                var _p = new Point(value, 0);
                _p = rotateVector(_p, i * _d_ang);
                _points.push([_p.x, _p.y]);
            }
            return _points;
        }

        function gen_flashlight(radius){
            var double_radius = 2* radius;
            var matrix_str = "2, 0, 0, 2, -"+ double_radius + ", -"+ double_radius;

            var pol = draw.polygon(generate_flash_light(radius))
                .center(double_radius, double_radius)
                .fill('#8d9')
                .stroke({ width: 0 });
            pol.animate(ConstDurationScale).transform({matrix: matrix_str})//.attr({opacity: 0})
                .after(function(){
                    this.animate(ConstDurationHiding, '-', ConstDurationShow).attr({ opacity: 0 }).after(function(){
                        this.remove();
                    });
                });

        }

        var draw = SVG(this.div_id);

        gen_flashlight(this.radius);
    };

    EFlashLight.prototype._start = function() {
        if(this.marker) {
            this.marker.addTo(map);
            this.on_start();
            timeManager.addTimeoutEvent(this, 'finish', this.duration);
        }
    };

    EFlashLight.prototype.start = function(delay){
        if (delay)
            timeManager.addTimeoutEvent(this, '_start', delay);
        else
            this._start();
    };

    EFlashLight.prototype.finish = function(){
        map.removeLayer(this.marker)
    };

    return EFlashLight
})();