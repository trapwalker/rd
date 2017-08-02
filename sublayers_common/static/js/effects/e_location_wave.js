var constDisplayRipplingSpeed = 0.0001;     // смещение линий в частях за мс
var constDisplayRipplingWidth = 200;      // ширина линии
var constDisplayRipplingOpacity = 0.03;   // минимальная прозрачность мерцания

var ECanvasLocationWave = (function() {
    function ECanvasLocationWave() {
        this.is_init = false;
        this.last_time = 0;
        this.lines = [0];
        this._half_width = Math.floor(0.5 * constDisplayRipplingWidth);
        this._height = 0;
        this._line_step = 0;
        if (locationManager.location_canvas_effect_manager)
            locationManager.location_canvas_effect_manager.add_vobj(this, 80);
    }

    ECanvasLocationWave.prototype.redraw = function(ctx, time, client_time) {
        if (this.is_init) {
            var shift = (client_time - this.last_time) * constDisplayRipplingSpeed;
            for (var i = 0; i < this.lines.length; i++) {
                this.lines[i] += shift;
                var pos_y = Math.floor(this._height * this.lines[i]) - this._half_width;
                var grd = ctx.createLinearGradient(0, pos_y - this._half_width, 0, pos_y + this._half_width);
                grd.addColorStop(0,"rgba(0, 0, 0, 0)");
                grd.addColorStop(0.5,"rgba(0, 255, 0, " + constDisplayRipplingOpacity + ")");
                grd.addColorStop(1,"rgba(0, 0, 0, 0)");
                ctx.beginPath();
                ctx.lineWidth = constDisplayRipplingWidth;
                ctx.strokeStyle = grd;
                ctx.moveTo(0, pos_y);
                ctx.lineTo(locationManager.location_canvas_effect_manager.width, pos_y);
                ctx.stroke();
            }
            if (this.lines[0] >= this._line_step) this.lines.unshift(0);
            if (this.lines[this.lines.length - 1] > 1) this.lines.splice(this.lines.length - 1, 1);
            this.last_time = client_time;
        }
    };

    ECanvasLocationWave.prototype.init = function() {
        this._height = locationManager.location_canvas_effect_manager.height + constDisplayRipplingWidth;
        this._line_step = constDisplayRipplingWidth / this._height;
        this.is_init = true;
    };

    return ECanvasLocationWave;
})();