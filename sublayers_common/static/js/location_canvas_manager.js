/*
* LocationCanvasManager - объект, занимающийся отрисовкой на канвас города
* */

var LocationCanvasManager = (function(_super){
    __extends(LocationCanvasManager, _super);

    function LocationCanvasManager() {
        _super.call(this, "ctest_2");
        this.is_canvas_render = false;
        console.log('location canvas manager !!!');
    }

    LocationCanvasManager.prototype.redraw = function(time) {
        if(! this.is_canvas_render) return;
        //console.log('LocationCanvasManager.prototype.redraw', time);
        this.context.clearRect(0, 0, 1920, 1080);
        //this.context.fillStyle = "rgba(100,230,150,0.8)";
        //this.context.fillRect(900,480,120,120);
       _super.prototype.redraw.call(this, time);
    };

    return LocationCanvasManager;
})(ParentCanvasManager);
