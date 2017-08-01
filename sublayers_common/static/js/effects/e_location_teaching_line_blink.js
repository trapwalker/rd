var ECanvasLocationTeachingLineBlink = (function () {
    function ECanvasLocationTeachingLineBlink(image_obj) {
        this.teaching_canvas = document.getElementById('townTeachingCanvas');
        this.context = this.teaching_canvas.getContext("2d");
        this.last_time = 0;
        this.target_opacity = Math.random();
        this.d_opacity = 0.7;
        this.lag = 0;
        if (locationManager.location_canvas_manager) locationManager.location_canvas_manager.add_vobj(this, 80);
    }

    ECanvasLocationTeachingLineBlink.prototype.redraw = function (ctx, time, client_time) {
        //console.log('ECanvasLocationTeachingLineBlink.prototype.redraw', client_time);
        if (!locationManager || !locationManager.in_location_flag ||
            !teachingManager || !teachingManager.is_active()) return;
        var current_opacity = this.context.globalAlpha;
        if (this.lag) {
            this.context.globalAlpha = Math.random();
            this.lag--;
        } else {
            if (Math.random() < 0.1) this.lag = 4;
            if (Math.abs(this.target_opacity - current_opacity) <= 0.01)
                this.target_opacity = Math.random();
            var max_opacity = this.target_opacity - current_opacity;
            var d_opacity = (client_time - this.last_time) / 1000. * this.d_opacity;
            d_opacity = Math.min(Math.abs(max_opacity), d_opacity) * Math.sign(max_opacity);
            this.context.globalAlpha = current_opacity + d_opacity;
        }
        this.last_time = client_time;
        teachingManager.redraw();
    };

    return ECanvasLocationTeachingLineBlink
})();