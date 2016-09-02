/*
* Виджет, показывающий ХП
*/

var WHPIndicator = (function (_super) {
    __extends(WHPIndicator, _super);

    function WHPIndicator(car) {
        _super.call(this, [car]);
        this.car = car;
        this.jq_main_div = $('.hp-indicator');
        this.change(clock.getCurrentTime());
    }

    WHPIndicator.prototype.change = function (time) {
        var hp = this.car.getCurrentHP(time);
        this.jq_main_div.text(hp.toFixed(2));
    };

    WHPIndicator.prototype.delFromVisualManager = function () {
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WHPIndicator;
})(VisualObject);