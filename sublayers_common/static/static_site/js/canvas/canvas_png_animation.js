var ECanvasChipAnimation = (function () {
    function ECanvasChipAnimation(image_obj) {
        this.duration = 750;
        this.img = image_obj;
        this.frame_count = 16;
        this.time_of_frame = this.duration / this.frame_count;
        this.frame_height = 322; // размер одного кадра
        this.frame_width = 515; // размер одного кадра
        this.start_time = 0;
        this.next_random_delay = 3000;
        this.offset_x = 0;
        this.offset_y = 0;

        if (canvasManager) canvasManager.add_obj(this, 80);
    }

    ECanvasChipAnimation.prototype._get_frame_num = function (time) {
        var time_off = time - this.start_time; // врем€, прошедшее сначала анимации
        time_off = time_off < 0 ? 0 : time_off;
        if (time_off > this.duration + this.next_random_delay) {
            this.start_time = time;
            this.next_random_delay = 4000 + Math.random() * 6000; // –андомно от 4 до 10 секунд
            return 0;
        }
        var frame = Math.floor(time_off / this.time_of_frame);
        if (frame > this.frame_count - 1) return this.frame_count - 1;
        return frame % this.frame_count;
    };

    ECanvasChipAnimation.prototype._set_offsets = function () {
        if (canvasManager.screen_size === 'big') {
            this.offset_x = 200;
            this.offset_y = 105;
        }
        else {
            this.offset_x = 95;
            this.offset_y = 60;
        }
    };

    ECanvasChipAnimation.prototype.resize_window = function () {
        this._set_offsets();
    };

    ECanvasChipAnimation.prototype.start = function () {
        this.start_time = timeManager.getTime();
        this._set_offsets();
        return this;
    };

    ECanvasChipAnimation.prototype.finish = function () {
        this.start_time = 0;
    };

    ECanvasChipAnimation.prototype.redraw = function (ctx, time) {
        if (! this.start_time) return;
        ctx.save();
        var frame = this._get_frame_num(time);
        ctx.drawImage(this.img, frame * this.frame_width, 0, this.frame_width, this.frame_height,
            this.offset_x, this.offset_y, this.frame_width, this.frame_height);
        ctx.restore();
    };

    return ECanvasChipAnimation
})();

var eCanvasChipAnimation;