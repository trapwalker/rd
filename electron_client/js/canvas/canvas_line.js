var constDisplayLineSpeed = 0.01;      // смещение линии на каждый тик
var constDisplayLineDelay = 60;        // задержка в тиках между линиями
var constDisplayLineWidth = 200;       // ширина линии

var CanvasDisplayLine = (function(){
    function CanvasDisplayLine() {
        this.state = 0;
        this.delay = constDisplayLineDelay;
        this._half_width = ~~(0.5 * constDisplayLineWidth);
        this._height = canvasManager.height + constDisplayLineWidth;
        this.is_paused = false;
        if (canvasManager) canvasManager.add_obj(this, 0);
    }

    CanvasDisplayLine.prototype.redraw = function(context, time) {
        if (this.is_paused) return;
        if (this.delay <= 0)
            if (this.state < 1) {
                this.state += constDisplayLineSpeed;
                var pos_y = ~~(this._height * this.state) - this._half_width;
                var grd=context.createLinearGradient(0, pos_y - this._half_width, 0, pos_y + this._half_width);
                grd.addColorStop(0,"rgba(0, 255, 0, 0)");
                grd.addColorStop(0.85,"rgba(0, 255, 0, 0.035)");
                grd.addColorStop(1,"rgba(0, 255, 0, 0)");
                context.beginPath();
                context.lineWidth = constDisplayLineWidth;
                context.strokeStyle = grd;
                context.moveTo(0, pos_y);
                context.lineTo(canvasManager.width, pos_y);
                context.stroke();
            }
            else {
                this.state = 0;
                this.delay = constDisplayLineDelay + ~~(600 * Math.random());
            }
        else
            this.delay--;
    };

    CanvasDisplayLine.prototype.pause = function() {
        this.is_paused = true;
    };

    CanvasDisplayLine.prototype.play = function() {
        this.is_paused = false;
    };

    CanvasDisplayLine.prototype.resize_window = function() {
        this._height = canvasManager.height + constDisplayLineWidth;
    };

    return CanvasDisplayLine;
})();

var canvasDisplayLine;