var TeachingNote = (function (_super) {
    __extends(TeachingNote, _super);

    function TeachingNote(options) {
        _super.call(this, options);
        this.start_point = new Point(960, 83);
        this.temp_x = 1800;
        this.first_call_draw_line_on_redraw = true;
        this.special_color_str = '105, 253, 96,';
    }

    TeachingNote.prototype.async_draw_line = function(p1, p2) {
        setTimeout(this.draw_line.bind(this, p1, p2), 10);
    };

    TeachingNote.prototype.draw_polyline = function(ctx, points, stroke_style, line_width, alpha) {
        ctx.beginPath();
        var old_alpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha * old_alpha;
        ctx.strokeStyle = stroke_style;
        ctx.lineWidth=line_width;
        ctx.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i++)
             ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
        ctx.globalAlpha = old_alpha;
    };

    TeachingNote.prototype.draw_stroke_line = function(ctx, points, stroke_style) {
        this.draw_polyline(ctx, points, stroke_style, "5", 0.1);
        this.draw_polyline(ctx, points, stroke_style, "3", 0.3);
        this.draw_polyline(ctx, points, stroke_style, "2", 0.6);
        this.draw_polyline(ctx, points, stroke_style, "1", 1);
    };

    // info: нужно вызывать строго после установки внеэкранок. Иначе не сработает автоопределение высоты правой внеэкранки
    TeachingNote.prototype.draw_line = function(p1, p2) {
        var ctx = teachingManager.context;
        ctx.save();
        ctx.lineCap = 'round';

        // Линия-указатель с размытием
        var grad2 = ctx.createLinearGradient(this.start_point.x, this.start_point.y, p2.x, p2.y);
        grad2.addColorStop(0, "rgba(" + this.special_color_str + " 0)");
        grad2.addColorStop(0.1, "rgba(" + this.special_color_str + " 0.5)");
        grad2.addColorStop(0.5, "rgba(" + this.special_color_str + " 0.65)");
        grad2.addColorStop(0.9, "rgba(" + this.special_color_str + " 0.75)");
        grad2.addColorStop(1, "rgba(" + this.special_color_str + " 1)");
        this.draw_stroke_line(ctx, [this.start_point, p2], grad2);

        // Рисуем точку
        ctx.beginPath();
        var grd = ctx.createRadialGradient(p2.x, p2.y, 0, p2.x, p2.y, 3);
        grd.addColorStop(0, "rgba(" + this.special_color_str + " 1)");
        grd.addColorStop(0.5, "rgba(" + this.special_color_str + " 1)");
        grd.addColorStop(1, "rgba(" + this.special_color_str + " 0)");

        ctx.arc(p2.x, p2.y, 3, 0, 2 * Math.PI, false);
        ctx.strokeStyle = "rgba(0, 0, 0, 0)";
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    };

    TeachingNote.prototype.redraw = function() {
    };

    TeachingNote.prototype.delete = function() {
        _super.prototype.delete.call(this);
        if (teachingManager.active_note == this){
            teachingManager.active_note = null;
            teachingManager.deactivate();
        }
    };

    TeachingNote.prototype.on_enter_location = function() {};

    return TeachingNote;
})(SimpleNote);


var TeachingMapNote = (function (_super) {
    __extends(TeachingMapNote, _super);

    function TeachingMapNote(options) {
        _super.call(this, options);
        this.single_length = 5;
        this.arrow_color = 'rgb(192, 255, 0)';
        this.window_name = '';
        this.window_uri = '';

        this.arrow_img_big = new Image();
        this.arrow_img_big.src = '/static/img/teaching/arrow_big.png';

        this.arrow_img = new Image();
        this.arrow_img.src = '/static/img/teaching/arrow_big_big.png';
    }

    TeachingMapNote.prototype.draw_arrow = function(ctx, point, angle) {
        //console.log("TeachingMapNote.prototype.draw_arrow");
        angle = gradToRad(angle);

        var arrow = this.arrow_img;
        if (!interface_scale_big) arrow = this.arrow_img_big;

        var width = $('#bodydiv').width();
        var height = $('#bodydiv').height();
        if (point.x < 0) point.x = width + point.x;
        if (point.y < 0) point.y = height + point.y;

        point.x = point.x - arrow.width + 15;
        point.y = point.y - Math.round(arrow.height / 2);

        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(angle);

        ctx.drawImage(arrow, 0, 0);

        ctx.restore();
    };

    TeachingMapNote.prototype.redraw = function() {
    };

    TeachingMapNote.prototype.delete = function() {
        _super.prototype.delete.call(this);
        if (teachingMapManager.active_note == this) {
            teachingMapManager.active_note = null;
            teachingMapManager.deactivate();
        }
    };

    return TeachingMapNote;
})(SimpleNote);


var NavigateTeachingNote = (function (_super) {
    __extends(NavigateTeachingNote, _super);

    function NavigateTeachingNote(options) {
        _super.call(this, options);
        this.needed_screen_name = 'location_screen';
        this.screens_btn_coord = {
            location_screen: new Point(1158, 939),
            chat_screen: new Point(1295, 939),
            menu_screen: new Point(1431, 939)
        };
        this.back_btn_coord = new Point(1511, 633);
        //this.needed_location = null;  // здесь должно быть здание или нпц из города
    }

    NavigateTeachingNote.prototype.redraw = function() {
        if (locationManager) {
            var town_scale = locationManager.jq_town_div.find('#townScaleState');
            if ((town_scale.length > 0) && town_scale.first().text() == 'big')
                this.screens_btn_coord = {
                    location_screen: new Point(1158, 939),
                    chat_screen: new Point(1295, 939),
                    menu_screen: new Point(1431, 939)
                };
            else
                this.screens_btn_coord = {
                    location_screen: new Point(1105, 872),
                    chat_screen: new Point(1163, 872),
                    menu_screen: new Point(1224, 872)
                };
        }
        if (this.needed_screen_name == locationManager.active_screen_name)
            // Указать на кнопку назад
            this.draw_line(this.start_point, this.back_btn_coord);
        else
            // Указать на кнопку переключения скрина
            this.draw_line(this.start_point, this.screens_btn_coord[this.needed_screen_name]);
    };

    return NavigateTeachingNote;
})(TeachingNote);



