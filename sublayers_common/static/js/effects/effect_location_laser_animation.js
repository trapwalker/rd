var ECanvasLocationLaserAnimation = (function () {
    function ECanvasLocationLaserAnimation(image_obj) {
        this.duration = 3000;
        this.img = image_obj;
        this.frame_count = 20;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = 746; // ������ ������ �����
        this.frame_width = 1100; // ������ ������ �����
        this.start_time = 0;
        this.offset_x = 409;
        this.offset_y = 52;

        if (locationManager.location_canvas_manager) locationManager.location_canvas_manager.add_vobj(this, 80);
    }

    ECanvasLocationLaserAnimation.prototype._get_frame_num = function (time) {
        var time_off = time - this.start_time; // �����, ��������� ������� ��������
        time_off = time_off < 0 ? 0 : time_off;
        if (time_off > this.duration) {
            this.start_time = time;
            return 0;
        }

        var frame = Math.floor(time_off / this.time_of_frame);
        if (frame > this.frame_count - 1) return this.frame_count - 1;
        return frame % this.frame_count;

        // ��� ��� �������� 12345432123... 
        //var all_frame_number = Math.floor(time_off / this.time_of_frame);
        //var fc2 = this.frame_count * 2 - 2;
        //var frame = all_frame_number % fc2;
        //if (frame > this.frame_count - 1) {frame = fc2 - frame;}
        //return frame;
    };

    ECanvasLocationLaserAnimation.prototype.start = function () {
        //console.log('ECanvasLocationLaserAnimation.prototype.start');
        this.start_time = clock.getClientTime();
        return this;
    };

    ECanvasLocationLaserAnimation.prototype.finish = function () {
        //console.log('ECanvasLocationLaserAnimation.prototype.finish');
        this.start_time = 0;
    };

    ECanvasLocationLaserAnimation.prototype.redraw = function (ctx, time) {
        //console.log('ECanvasLocationLaserAnimation.prototype.redraw', time);
        if (! this.start_time) return;
        time *= 1000;

        ctx.save();
        var frame = this._get_frame_num(time);
        ctx.drawImage(this.img, frame * this.frame_width, 0, this.frame_width, this.frame_height,
            this.offset_x, this.offset_y, this.frame_width, this.frame_height);

        ctx.restore();
    };

    return ECanvasLocationLaserAnimation
})();

//var eCanvasLocationLaserAnimation;
