var constDisplayRipplingSpeed = 0.01;     // смещение линий на каждый тик
var constDisplayRipplingWidth = 200;      // ширина линии
var constDisplayRipplingOpacity = 0.03;   // минимальная прозрачность мерцания

var CanvasDisplayRippling = (function(){
    function CanvasDisplayRippling() {
        this._half_width = ~~(0.5 * constDisplayRipplingWidth);
        this._height = canvasManager.height + constDisplayRipplingWidth;
        this._line_step = constDisplayRipplingWidth / this._height;
        this.lines = [0];
        this.is_paused = false;
        if (canvasManager) canvasManager.add_obj(this, 0);
    }

    CanvasDisplayRippling.prototype.redraw = function(context, time) {
        if (this.is_paused) return;
        for (var i = 0; i < this.lines.length; i++) {
            this.lines[i] += constDisplayRipplingSpeed;
            var pos_y = ~~(this._height * this.lines[i]) - this._half_width;
            var grd=context.createLinearGradient(0, pos_y - this._half_width, 0, pos_y + this._half_width);
            grd.addColorStop(0,"rgba(0, 0, 0, 0)");
            grd.addColorStop(0.5,"rgba(0, 255, 0, " + constDisplayRipplingOpacity + ")");
            grd.addColorStop(1,"rgba(0, 0, 0, 0)");

            context.beginPath();
            context.lineWidth = constDisplayLineWidth;
            context.strokeStyle = grd;
            context.moveTo(0, pos_y);
            context.lineTo(canvasManager.width, pos_y);
            context.stroke();
        }
        if (this.lines[this.lines.length - 1] > 1) this.lines.splice(this.lines.length - 1, 1);
        if (this.lines[0] >= this._line_step) this.lines.unshift(0);
    };

    CanvasDisplayRippling.prototype.pause = function() {
        this.is_paused = true;
    };

    CanvasDisplayRippling.prototype.play = function() {
        this.is_paused = false;
    };

    return CanvasDisplayRippling;
})();

var canvasDisplayRippling;
