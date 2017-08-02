var constDisplayLineSpeed = 0.0005;    // смещение линии в частях за мс
var constDisplayLineDelay = 5;         // задержка в секундах между линиями
var constDisplayLineWidth = 200;       // ширина линии

var ECanvasLocationLine = (function(){
    function ECanvasLocationLine() {
        this.is_init = false;
        this.last_time = 0;
        this.state = 0;
        this.delay = constDisplayLineDelay;
        this._half_width = Math.floor(0.5 * constDisplayLineWidth);
        this._height = 0;
        if (locationManager.location_canvas_effect_manager)
            locationManager.location_canvas_effect_manager.add_vobj(this, 80);
    }

    ECanvasLocationLine.prototype.redraw = function(ctx, time, client_time) {
        if (this.is_init) {
            var d_time = client_time - this.last_time;
            if (this.delay <= 0)
                if (this.state < 1) {
                    this.state += d_time * constDisplayLineSpeed;
                    var pos_y = Math.floor(this._height * this.state) - this._half_width;
                    var grd = ctx.createLinearGradient(0, pos_y - this._half_width, 0, pos_y + this._half_width);
                    grd.addColorStop(0,    "rgba(0, 255, 0, 0)");
                    grd.addColorStop(0.85, "rgba(0, 255, 0, 0.035)");
                    grd.addColorStop(1,    "rgba(0, 255, 0, 0)");
                    ctx.beginPath();
                    ctx.lineWidth = constDisplayLineWidth;
                    ctx.strokeStyle = grd;
                    ctx.moveTo(0, pos_y);
                    ctx.lineTo(locationManager.location_canvas_effect_manager.width, pos_y);
                    ctx.stroke();
                }
                else {
                    this.state = 0;
                    this.delay = (constDisplayLineDelay + Math.floor(5 * Math.random())) * 1000;
                }
            else
                this.delay -= d_time;
            this.last_time = client_time;
        }
    };

    ECanvasLocationLine.prototype.init = function() {
        this._height = locationManager.location_canvas_effect_manager.height + constDisplayLineWidth;
        this.is_init = true;
    };

    return ECanvasLocationLine;
})();