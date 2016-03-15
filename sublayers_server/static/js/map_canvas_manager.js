
var MapCanvasManager = (function(_super){
    __extends(MapCanvasManager, _super);

    function MapCanvasManager(){
        _super.call(this);

        this.canvas = document.getElementById("ctest_1");
        this.context = this.canvas.getContext("2d");
        this.canvas.width = 1920;
        this.canvas.height = 1080;

        // todo: сделать это не просто списком, а списком с параметрами
        this.vobj_list = [];
    }

    // todo: сделать здесь в качестве параметра тип совмещени€ пикселов или какой-то приоритет
    MapCanvasManager.prototype.add_vobj = function(vobj) {
        for (var i = 0; i < this.vobj_list.length; i++)
            if (this.vobj_list[i] == vobj) {
                console.error('[visual_manager] ѕопытка повторного добавлени€ визуального объекта.');
                return;
            }
        this.vobj_list.push(vobj);
    };

    MapCanvasManager.prototype.del_vobj = function (vobj) {
        var index = -1;
        for (var i = 0; i < this.vobj_list.length; i++)
            if (this.vobj_list[i] == vobj)
                index = i;

        if ((index > 0) && (index < this.vobj_list.length))
            this.vobj_list.splice(index, 1);
    };

    MapCanvasManager.prototype.get_ctx = function() {
        return this.context;
    };

    MapCanvasManager.prototype.get_canvas_center = function() {
        return new Point(this.canvas.width >> 1, this.canvas.height >> 1);  // divison by 2
    };

    MapCanvasManager.prototype.redraw = function(time) {
        this.context.clearRect(0, 0, 1920, 1080);

        for (var i = 0; i < this.vobj_list.length; i++) {
            this.vobj_list[i].redraw(this.context, time);
        }

    };


    return MapCanvasManager;
})(ClientObject);


var mapCanvasManager;