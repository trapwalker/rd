var TeachingNote = (function (_super) {
    __extends(TeachingNote, _super);

    function TeachingNote(options) {
        _super.call(this, options);
        this.start_point = new Point(1420, 189);
        this.temp_x = 1800;
    }

    TeachingNote.prototype.draw_line = function(p1, p2) {
        var ctx = teachingManager.context;
        ctx.save();
        ctx.lineCap = 'round';

        // Линия до конкретной точкм
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.1)";
        ctx.lineWidth='8';
        ctx.moveTo(this.temp_x, p1.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.2)";
        ctx.lineWidth='5';
        ctx.moveTo(this.temp_x, p1.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
        ctx.lineWidth='3';
        ctx.moveTo(this.temp_x, p1.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
        ctx.lineWidth='2';
        ctx.moveTo(this.temp_x, p1.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 0, 1)";
        ctx.lineWidth='1';
        ctx.moveTo(this.temp_x, p1.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

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



