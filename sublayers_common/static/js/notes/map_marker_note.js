var QuestMapMarkerNote = (function (_super) {
    __extends(QuestMapMarkerNote, _super);

    function QuestMapMarkerNote(options) {
        _super.call(this, options);
        this.radius = options.radius;
        this.position = new Point(options.position.x, options.position.y);
        this.focus_caption = _(options.focus_caption) || "";

        this.icon_circle = new Image();
        if (options.icon_circle)
            this.icon_circle.src = "/" + options.icon_circle;

        this.icon_full = new Image();
        if (options.icon_full)
            this.icon_full.src = "/" + options.icon_full;

        this.img_width = 40;
        this.img_height = 66;
        this.offset_x = -0.5;
        this.offset_y = -1.0;
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;

        this.canvasMapRadiusMin = 20;
        this.canvasMapRadiusMiddle = this.canvasMapRadiusMin;
        this.canvasMapOpacity = 1;

        mapCanvasManager.add_vobj(this, 8);

        // Для рассчёта клика по ноте
        this._last_ctx_pos = new Point(0, 0);  // Последняя ctx позиция
        this.icon_size_min_div_2 = Math.min(this.img_width, this.img_height) >> 2; // Размеры иконки
        this.icon_size_min_div_2 *= this.icon_size_min_div_2;
    }

    QuestMapMarkerNote.prototype.mouse_test = function(time) {
        //console.log('QuestMapMarkerNote.prototype.mouse_test');
        //return this.is_active && distancePoints2(this._last_ctx_pos, mapCanvasManager._mouse_client) < this.icon_size_min_div_2;
        if (! this.is_active) return false;

        var x_curr = this._last_ctx_pos.x;
        var y_curr = this._last_ctx_pos.y;
        var min_x = x_curr + (this.img_width * this.offset_x);
        var max_x = x_curr + (this.img_width * (this.offset_x + 1.));
        var min_y = y_curr + (this.img_height * this.offset_y);
        var max_y = y_curr + (this.img_height * (this.offset_y + 1.));

        var mouse_p = mapCanvasManager._mouse_client;

        return mouse_p.x > min_x && mouse_p.x < max_x && mouse_p.y > min_y && mouse_p.y < max_y;
    };

    QuestMapMarkerNote.prototype.click_handler = function(event) {
        //console.log('QuestMapMarkerNote.prototype.click_handler', this);
        mapManager.goto_handler(event, this.position)
    };

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestMapMarkerNote.prototype.redraw = function(ctx, time, client_time) {
        //console.log("QuestMapMarkerNote.prototype.redraw");
        if (! this.is_active) return;

        var focused = mapCanvasManager._mouse_focus_widget == this;

        ctx.save();
        var ctx_pos = mulScalVector(subVector(this.position, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        this._last_ctx_pos = ctx_pos;
        ctx.translate(ctx_pos.x, ctx_pos.y);

        // Отрисовка иконки
        if (this.icon_circle && this.icon_circle.complete) {
            ctx.drawImage(this.icon_circle, 0, 0, this.img_width, this.img_height,
                this.offset_x * this.img_width * this.scale_icon_x, this.offset_y * this.img_height * this.scale_icon_y,
                this.img_width * this.scale_icon_x, this.img_height * this.scale_icon_y);

            var opacity = mapCanvasManager.real_zoom - 14.;
            if (focused)
                opacity = 1;
            else
                opacity = Math.max(Math.min(1, opacity), 0);

            if (this.icon_full && this.icon_full.complete && opacity > 0) {
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.drawImage(this.icon_full, 0, 0, this.img_width, this.img_height,
                    this.offset_x * this.img_width * this.scale_icon_x, this.offset_y * this.img_height * this.scale_icon_y,
                    this.img_width * this.scale_icon_x, this.img_height * this.scale_icon_y);
                if (focused && this.focus_caption) {
                    // Название квеста
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.font = "8pt MICRADI";
                    ctx.fillStyle = 'rgba(0, 255, 161, 0.9)';
                    ctx.fillText(this.focus_caption, 0, this.img_height * this.offset_y * 0.85);
                }

                ctx.restore();
            }
        }

        // Отрисовка круга и текста, если нота находится в фокусе
        if (mapManager.getZoom() > 15 && this.radius > 0 && focused) {
            // Если мы в зумировании, то рисовать круг с прозрачностью
            var opacity = mapCanvasManager.real_zoom - 15.;
            opacity = Math.max(Math.min(1, opacity), 0);
            opacity *= 0.5; // Max opacity
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.strokeStyle = "#00cc81";
            //ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
            ctx.arc(0, 0, (this.radius / mapCanvasManager.zoom_koeff).toFixed(5), 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }

        ctx.restore();  // Возврат транслейта
    };

    QuestMapMarkerNote.prototype.delete = function() {
        mapCanvasManager.del_vobj(this);
        _super.prototype.delete.call(this);
    };

    return QuestMapMarkerNote;
})(SimpleNote);

// Нота сейфа в квесте маскировки
var QuestMCMapMarkerNote = (function (_super) {
    __extends(QuestMCMapMarkerNote, _super);

    function QuestMCMapMarkerNote(options) {
        _super.call(this, options);
        this.img_width = 20;
        this.img_height = 20;
        this.offset_x = -0.5;
        this.offset_y = -0.5;
    }

     // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestMCMapMarkerNote.prototype.redraw = function(ctx, time, client_time) {
        //console.log("QuestMapMarkerNote.prototype.redraw");
        if (! this.is_active) return;

        var focused = mapCanvasManager._mouse_focus_widget == this;

        ctx.save();
        var ctx_pos = mulScalVector(subVector(this.position, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        this._last_ctx_pos = ctx_pos;
        ctx.translate(ctx_pos.x, ctx_pos.y);

        // Отрисовка иконки
        if (this.icon_circle && this.icon_circle.complete) {
            ctx.drawImage(this.icon_circle, 0, 0, this.img_width, this.img_height,
                this.offset_x * this.img_width * this.scale_icon_x, this.offset_y * this.img_height * this.scale_icon_y,
                this.img_width * this.scale_icon_x, this.img_height * this.scale_icon_y);

            var opacity = mapCanvasManager.real_zoom - 14.;
            if (focused)
                opacity = 1;
            else
                opacity = Math.max(Math.min(1, opacity), 0);

            if (this.icon_full && this.icon_full.complete && opacity > 0) {
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.drawImage(this.icon_full, 0, 0, this.img_width, this.img_height,
                    this.offset_x * this.img_width * this.scale_icon_x, this.offset_y * this.img_height * this.scale_icon_y,
                    this.img_width * this.scale_icon_x, this.img_height * this.scale_icon_y);
                ctx.restore();
            }
        }

        // Отрисовка круга и текста, если нота находится в фокусе
        if (mapManager.getZoom() > 15 && this.radius > 0 && focused) {
            // Если мы в зумировании, то рисовать круг с прозрачностью
            var opacity = mapCanvasManager.real_zoom - 15.;
            opacity = Math.max(Math.min(1, opacity), 0);
            opacity *= 0.5; // Max opacity
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.strokeStyle = "#00cc81";
            //ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
            ctx.arc(0, 0, (this.radius / mapCanvasManager.zoom_koeff).toFixed(5), 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }

        ctx.restore();  // Возврат транслейта
    };

    return QuestMCMapMarkerNote;
})(QuestMapMarkerNote);


var QuestMTMapMarkerNote = (function (_super) {
    __extends(QuestMTMapMarkerNote, _super);

    function QuestMTMapMarkerNote(options) {
        _super.call(this, options);
    }

     // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestMTMapMarkerNote.prototype.redraw = function(ctx, time, client_time) {
        // console.log("QuestMTMapMarkerNote.prototype.redraw", this.radius);
        if (! this.is_active) return;

        ctx.save();
        var ctx_pos = mulScalVector(subVector(this.position, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        this._last_ctx_pos = ctx_pos;
        ctx.translate(ctx_pos.x, ctx_pos.y);

        // Отрисовка круга и текста, если нота находится в фокусе
        if (mapManager.getZoom() > 15 && this.radius > 0) {
            // Если мы в зумировании, то рисовать круг с прозрачностью
            var opacity = mapCanvasManager.real_zoom - 15.;
            opacity = Math.max(Math.min(1, opacity), 0);
            opacity *= 0.5; // Max opacity
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.strokeStyle = "#00cc81";
            //ctx.setLineDash([10, 10]);
            ctx.lineWidth = 0;
            var canvasMapRadius = (this.radius / mapCanvasManager.zoom_koeff).toFixed(5);
            this.canvasMapRadiusMiddle++;
            this.canvasMapOpacity = (this.canvasMapRadiusMiddle/(canvasMapRadius/100))/100;
            ctx.arc(0, 0, canvasMapRadius, 0, 2 * Math.PI);

            var grd=ctx.createRadialGradient(0, 0, this.canvasMapRadiusMiddle-20, 0, 0, this.canvasMapRadiusMiddle+15);
            grd.addColorStop(0,"rgba(255,255,255, 0)");
            grd.addColorStop(0.2,"rgba(0,200,80, " + (1-this.canvasMapOpacity)*0.9 + ")");
            grd.addColorStop(0.6,"rgba(0,255,111, "+(1-this.canvasMapOpacity)+")");
            grd.addColorStop(1,"rgba(0,255,111, 0)");
            ctx.fillStyle = grd;

            ctx.fill();
            ctx.stroke();
            ctx.closePath();
            ctx.restore();

            if (this.canvasMapRadiusMiddle > canvasMapRadius){
                this.canvasMapRadiusMiddle = this.canvasMapRadiusMin;
            }
        }

        ctx.restore();  // Возврат транслейта
    };

    return QuestMTMapMarkerNote;
})(QuestMapMarkerNote);

