/*
* Виджет, показывающий ХП
* */


var WHPRadial = (function (_super) {
    __extends(WHPRadial, _super);

    function WHPRadial(car, div_parent) {
        _super.call(this, [car]);
        this.car = car;

        this.options = {
            parent: div_parent,
            max: car._hp_state.max_hp
        };

        // создание дива-контейнера, чтобы при его удалении всё верно очистилось
        this.div_id = 'WHPRadial' + (-generator_ID.getID());
        $('#' + div_parent).append('<div id="' + this.div_id + '" class="w-hp-radial-parent"></div>');
        // главный див. В который можно добавлять что угодно. который можно просто удалить, чтобы полностью очистить виджет
        var main = $('#' + this.div_id);

        var draw = SVG(this.div_id);
        this.draw = draw;

        var max_r = 50;
        this.max_r = max_r;
        var d_radius = 7;
        var size = max_r + 20; // максимальный радиус + 20 пикселей запаса
        var angle_of_transparent = 10; // угол прозрачности для кружочков
        var d_angle_of_transparent = 0; //

        // отрисовка трёх полукругов с прозрачностью
        for(var i = 0; i < 3; i++){
            var r = max_r - d_radius * i;
            var p = polarPoint(r, gradToRad(angle_of_transparent - i * d_angle_of_transparent));

            draw.path('M ' + (-r) + ' ' + 0 + 'A ' + r + ' ' + r + ' 0 0 0 ' + (-p.x) + ' ' + p.y)
                .dmove(size, size)
                .fill('transparent')
                .stroke({width: 1, color: 'blue'});

            draw.path('M ' + (-p.x) + ' ' + p.y + 'A ' + r + ' ' + r + ' 0 0 1 ' + p.x + ' ' + p.y)
                .dmove(size, size)
                .fill('transparent')
                .stroke({width: 1, color: 'red'});

            draw.path('M ' + p.x + ' ' + p.y + 'A ' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + 0)
                .dmove(size, size)
                .fill('transparent')
                .stroke({width: 1, color: 'blue'});
        }







        this.change(clock.getCurrentTime());
    }

    WHPRadial.prototype.change = function (time) {

    };

    WHPRadial.prototype.setMax = function (value) {
        this.options.max = value;
        this.koeff = 100 / value;
        this.change(clock.getCurrentTime());
    };

    WHPRadial.prototype.delFromVisualManager = function () {
        // todo: удалить свою вёрстку (просто удалить $('#' + this.div_id), по идее)
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WHPRadial;
})(VisualObject);