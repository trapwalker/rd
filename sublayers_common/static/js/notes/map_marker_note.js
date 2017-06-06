var QuestMapMarkerNote = (function (_super) {
    __extends(QuestMapMarkerNote, _super);

    function QuestMapMarkerNote(options) {
        _super.call(this, options);
        this.radius = options.radius;
        this.position = new Point(options.position.x, options.position.y);
        this.focus_caption = options.focus_caption || "";

        this.img_obj = new Image();
        this.img_obj.src = "/" + options.icon;

        this.img_width = 40;
        this.img_height = 50;
        this.offset_x = -0.5;
        this.offset_y = -1.0;
        this.scale_icon_x = 1.0;
        this.scale_icon_y = 1.0;

        mapCanvasManager.add_vobj(this, 8);

        // Для рассчёта клика по ноте
        this._last_ctx_pos = null;  // Последняя ctx позиция
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
        console.log('QuestMapMarkerNote.prototype.click_handler', this);
        // todo: открыть квестовое окно и отобразить текущий активный квест
    };

    // функция перерисовки текущей ноты - просто перерисовка внутренностей в здании
    QuestMapMarkerNote.prototype.redraw = function(ctx, time, client_time) {
        //console.log("QuestMapMarkerNote.prototype.redraw");
        if (! this.is_active) return;

        ctx.save();
        var ctx_pos = mulScalVector(subVector(this.position, mapCanvasManager.map_tl), 1.0 / mapCanvasManager.zoom_koeff);
        this._last_ctx_pos = ctx_pos;
        ctx.translate(ctx_pos.x, ctx_pos.y);

        // Отрисовка иконки
        if (this.img_obj && this.img_obj.complete) {
            ctx.drawImage(this.img_obj, 0, 0, this.img_width, this.img_height,
                this.offset_x * this.img_width * this.scale_icon_x, this.offset_y * this.img_height * this.scale_icon_y,
                this.img_width * this.scale_icon_x, this.img_height * this.scale_icon_y);
        }

        // Отрисовка круга и текста, если нота находится в фокусе
        if (mapManager.getZoom() > 15 && this.radius > 0 && mapCanvasManager._mouse_focus_widget == this) {
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

            // Текст названия квеста (генератора)
            if (this.focus_caption) {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "8pt MICRADI";
                ctx.fillStyle = 'rgba(0, 255, 161, 0.9)';
                ctx.fillText(this.focus_caption, 0, this.img_height * this.offset_y);
            }
        }

        ctx.restore();  // Возврат транслейта
    };

    QuestMapMarkerNote.prototype.delete = function() {
        mapCanvasManager.del_vobj(this);
        _super.prototype.delete.call(this);
    };

    return QuestMapMarkerNote;
})(SimpleNote);


// var a = new QuestMapMarkerNote({uid: -5551328, position: {x: 12517600, y: 27028834}, range: 50, list_icon: "static/img/quests/icons/delivery.png"});
// a.is_active = true;