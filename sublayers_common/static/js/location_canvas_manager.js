/*
* LocationCanvasManager - объект, занимающийся отрисовкой на канвас города
* */

var LocationCanvasManager = (function(_super){
    __extends(LocationCanvasManager, _super);

    function LocationCanvasManager(canvas_id) {
        _super.call(this, canvas_id);
        this.is_canvas_render = false;
    }

    LocationCanvasManager.prototype.init_canvas = function() {
        this.canvas = this.canvas || document.createElement("canvas");
        this.context = this.canvas.getContext("2d");

        this.dom_canvas = document.getElementById(this.canvas_id);
        this.dom_context = this.dom_canvas.getContext("2d");

        this.width = $('#' + this.canvas_id).width();
        this.height = $('#' + this.canvas_id).height();

        this.dom_canvas.width = this.width;
        this.dom_canvas.height = this.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.jq_for_cursor = $("#bodydiv");
    };

    LocationCanvasManager.prototype.redraw = function(time) {
        if(!this.is_canvas_render) return;
       _super.prototype.redraw.call(this, time);
    };

    return LocationCanvasManager;
})(ParentCanvasManager);