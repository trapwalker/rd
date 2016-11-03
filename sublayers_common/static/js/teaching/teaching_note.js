var TeachingNote = (function (_super) {
    __extends(TeachingNote, _super);

    function TeachingNote(options) {
        _super.call(this, options);
        this.start_point = new Point(1420, 189)
    }


    TeachingNote.prototype.draw_line = function(p1, p2) {
        var ctx = teachingManager.context;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        //ctx.strokeStyle = '#00ff00';
        ctx.strokeStyle = '#e2dd10';
        ctx.stroke();
        ctx.restore();

    };

    TeachingNote.prototype.redraw = function() {
        var p1 = new Point(1600, 300);
        var p2 = getRadialRandomPoint(new Point(500, 500), 50);
        this.draw_line(p1, p2);
    };


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
            // ”казать на кнопку назад
            this.draw_line(this.start_point, this.back_btn_coord);
        else
            // ”казать на кнопку переключени€ скрина
            this.draw_line(this.start_point, this.screens_btn_coord[this.needed_screen_name]);
    };




    return NavigateTeachingNote;
})(TeachingNote);



