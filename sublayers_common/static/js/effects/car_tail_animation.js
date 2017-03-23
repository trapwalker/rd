var ECanvasCarTail = (function () {
    function ECanvasCarTail(position, direction, duration){
        this.duration = duration || 1000;  // 1сек по умолчанию
        this.effect_image_obj = iconsLeaflet.getIcon("icon-car-tail-circle", "canvas_icon");
        this.frame_height = this.effect_image_obj.size[0]; // размер одного кадра
        this.frame_width = this.effect_image_obj.size[1]; // размер одного кадра
        this.direction = direction; // Направление в радианах
        this.position = position; // Позиция в пиксельных-серверных координатах
        this.start_time = 0;
        this.offset_x = -0.5; // Множитель сдвига кадра по оси Х (размер кадра умножается на это число)
        this.offset_y = -0.5; // Множитель сдвига кадра по оси Y (размер кадра умножается на это число)
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;
    }

    ECanvasCarTail.prototype._start = function () {
        mapCanvasManager.add_vobj(this, 10);
        this.start_time = clock.getCurrentTime();
        if (this.duration > 0)
            timeManager.addTimeoutEvent(this, 'finish', this.duration);
    };

    ECanvasCarTail.prototype.start = function(){
        this._start();
        return this;
    };

    ECanvasCarTail.prototype.finish = function () {
        this.start_time = 0;
        mapCanvasManager.del_vobj(this);
    };

    ECanvasCarTail.prototype._progress = function (time) {
        return (time - this.start_time) / (this.duration / 1000.);
    };

    ECanvasCarTail.prototype._get_alpha = function (progress) {
        return 1.0 - progress;
    };

    ECanvasCarTail.prototype.redraw = function (ctx, time) {
        if (time >= this.start_time + this.duration / 1000.) return;
        if (mapManager.getZoom() <= 15) return;
        ctx.save();
        var img_obj = this.effect_image_obj;
        var ctx_pos = mulScalVector(subVector(this.position, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        //var additional_scale_pos = new Point(this.frame_width * (1 - this.scale_icon_x), this.frame_height * (1 - this.scale_icon_y));
        //ctx_pos = summVector(ctx_pos, additional_scale_pos);
        ctx.translate(ctx_pos.x, ctx_pos.y);
        ctx.globalAlpha = this._get_alpha(this._progress(time));
        //ctx.rotate(this.direction);
        ctx.scale(1.0 / mapCanvasManager.zoom_koeff, 1.0 / mapCanvasManager.zoom_koeff);
        ctx.drawImage(img_obj.img, 0, 0, this.frame_width, this.frame_height,
            this.offset_x * img_obj.size[1] * this.scale_icon_x, this.offset_y * img_obj.size[0] * this.scale_icon_y, this.frame_width * this.scale_icon_x, this.frame_height * this.scale_icon_y);

        ctx.restore();

        this.scale_icon_x += 0.02;
        this.scale_icon_y += 0.02;
    };

    return ECanvasCarTail
})();
