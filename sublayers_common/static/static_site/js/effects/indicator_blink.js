var constIndicatorBlinkDelay = 400;         // время смены яркости индикатора
var constIndicatorBlinkMainOpacity = 0.6;   // базовое значение прозрачности индикатора


var IndicatorBlink = (function(){
    function IndicatorBlink() {
        this.last_time = timeManager.getTime();
        timeManager.addTimerEvent(this, 'redraw');
    }

    IndicatorBlink.prototype.redraw = function(time) {
        if ((time - this.last_time) >= constIndicatorBlinkDelay) {
            this.last_time = time;
            var opacity = constIndicatorBlinkMainOpacity + Math.random() * (1 - constIndicatorBlinkMainOpacity);
            $('.light-indicator').first().css({opacity: opacity});
        }
    };

    return IndicatorBlink;
})();

var indicatorBlink;