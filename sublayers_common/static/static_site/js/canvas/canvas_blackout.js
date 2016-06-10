var constDisplayBlackOutTimer = 150;    // частота смены опасити

var CanvasBlackOut = (function(){
    function CanvasBlackOut() {
        this.delay = constDisplayBlackOutTimer;
        this.last_change_opacity = 0;
        this.opacity = 0;
        if (canvasManager) canvasManager.add_obj(this, -5);
    }

    CanvasBlackOut.prototype.redraw = function(context, time) {
        if (time - this.last_change_opacity  > this.delay) {
            this.last_change_opacity = time;
            this.opacity = 0.1 * Math.random();
        }
        context.save();
        context.fillStyle = 'rgba(0, 0, 0, '+ this.opacity +')';
        context.fillRect(0, 0, canvasManager.width, canvasManager.height);
        context.restore();
    };

    return CanvasBlackOut;
})();

var canvasBlackOut;