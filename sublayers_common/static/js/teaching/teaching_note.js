var TeachingNote = (function (_super) {
    __extends(TeachingNote, _super);

    function TeachingNote(options) {
        _super.call(this, options);
        this.start_point = new Point(1420, 189);
        this.temp_x = 1800;
        this.first_call_draw_line_on_redraw = true;
    }

    TeachingNote.prototype.async_draw_line = function(p1, p2) {
        setTimeout(this.draw_line.bind(this, p1, p2), 10);
    };

    TeachingNote.prototype.draw_polyline = function(ctx, points, stroke_style, line_width, alpha) {
        ctx.beginPath();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = stroke_style;
        ctx.lineWidth=line_width;
        ctx.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i++)
             ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
    };

    TeachingNote.prototype.draw_stroke_line = function(ctx, points, stroke_style) {
        this.draw_polyline(ctx, points, stroke_style, "8", 0.1);
        this.draw_polyline(ctx, points, stroke_style, "5", 0.2);
        this.draw_polyline(ctx, points, stroke_style, "3", 0.3);
        this.draw_polyline(ctx, points, stroke_style, "2", 0.4);
        this.draw_polyline(ctx, points, stroke_style, "1", 1.0);
    };

    // info: нужно вызывать строго после установки внеэкранок. Иначе не сработает автоопределение высоты правой внеэкранки
    TeachingNote.prototype.draw_line = function(p1, p2) {
        // todo: если не получается вызывать после заполнения внеэкранки, то вызывать async_draw_line
        var ctx = teachingManager.context;
        ctx.save();
        ctx.lineCap = 'round';

        // Рассчёт высоты правой кнеэкранки
        var h = teachingManager.jq_panel_right.height();
        p1.y = 80 + (h ? h : 0);

        // Подчёркивание внеэкранок
        if (this.first_call_draw_line_on_redraw) {
            this.first_call_draw_line_on_redraw = false;

            // Линия - граница правой внеэкранной области
            var grad = ctx.createLinearGradient(this.temp_x, p1.y, p1.x, p1.y);
            grad.addColorStop(0, "rgba(0, 255, 0, 0)");
            grad.addColorStop(0.5, "rgba(0, 255, 0, 1)");
            grad.addColorStop(1, "rgba(0, 255, 0, 0)");
            this.draw_stroke_line(ctx, [new Point(this.temp_x, p1.y), p1], grad);

            // Линия граница левой внеэкранки
            var left_y = 80 + teachingManager.jq_panel_left.height();
            var lp1 = new Point(105, left_y);
            var lp2 = new Point(490, left_y);
            var gradleft = ctx.createLinearGradient(lp1.x, lp1.y, lp2.x, lp2.y);
            gradleft.addColorStop(0, "rgba(0, 255, 0, 0)");
            gradleft.addColorStop(0.5, "rgba(0, 255, 0, 1)");
            gradleft.addColorStop(1, "rgba(0, 255, 0, 0)");
            this.draw_stroke_line(ctx, [lp1, lp2], gradleft);
        }

        // Линия-указатель с размытием
        var grad2 = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad2.addColorStop(0, "rgba(0, 255, 0, 0)");
        grad2.addColorStop(0.4, "rgba(0, 255, 0, 1)");
        grad2.addColorStop(1, "rgba(0, 255, 0, 1)");
        this.draw_stroke_line(ctx, [p1, p2], grad2);

        // Рисуем точку
        ctx.beginPath();
        var grd = ctx.createRadialGradient(p2.x, p2.y, 0, p2.x, p2.y, 10);
        grd.addColorStop(0, "rgba(0, 255, 0, 1)");
        grd.addColorStop(0.2, "rgba(0, 255, 0, 0.4)");
        grd.addColorStop(0.4, "rgba(0, 255, 0, 0.6)");
        grd.addColorStop(0.6, "rgba(0, 255, 0, 0.1)");
        grd.addColorStop(0.8, "rgba(0, 255, 0, 0.5)");
        grd.addColorStop(1, "rgba(0, 255, 0, 0)");

        ctx.arc(p2.x, p2.y, 10, 0, 2 * Math.PI, false);
        ctx.strokeStyle = "rgba(0, 0, 0, 0)";
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    };

    TeachingNote.prototype.redraw = function() {
    };

    TeachingNote.prototype.delete = function() {
        _super.prototype.delete.call();
        if (teachingManager.active_note == this){
            teachingManager.active_note = null;
            teachingManager.deactivate();
        }
    };

    TeachingNote.prototype.on_enter_location = function() {};

    return TeachingNote;
})(SimpleNote);


var NavigateTeachingNote = (function (_super) {
    __extends(NavigateTeachingNote, _super);

    function NavigateTeachingNote(options) {
        _super.call(this, options);

        this.needed_screen_name = 'location_screen';
        this.screens_btn_coord = {
            location_screen: new Point(1160, 920),
            chat_screen: new Point(1300, 920),
            menu_screen: new Point(1440, 920)
        };
        this.back_btn_coord = new Point(1600, 615);

        //this.needed_location = null;  // здесь должно быть здание или нпц из города
    }

    NavigateTeachingNote.prototype.redraw = function() {
        if (this.needed_screen_name == locationManager.active_screen_name)
            // Указать на кнопку назад
            this.draw_line(this.start_point, this.back_btn_coord);
        else
            // Указать на кнопку переключения скрина
            this.draw_line(this.start_point, this.screens_btn_coord[this.needed_screen_name]);
    };

    return NavigateTeachingNote;
})(TeachingNote);



