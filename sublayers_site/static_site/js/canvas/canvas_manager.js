var CanvasManager = (function(){
    function CanvasManager(){
        // todo: определять по размеру монитора
        this.width = 613;
        this.height = 368;

        this.canvas = document.getElementById("content-canvas");
        this.context = this.canvas.getContext("2d");
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.obj_list = [];

        if (timeManager) timeManager.addTimerEvent(this, 'redraw');
    }

    CanvasManager.prototype.add_obj = function(obj, priority) {
        //console.log('CanvasManager.prototype.add_vobj');
        for (var i = 0; i < this.obj_list.length; i++)
            if (this.obj_list[i].obj == obj) {
                console.error('[visual_manager] Попытка повторного добавления визуального объекта.');
                return;
            }

        if (!priority) priority = 1;

        this.obj_list.push({obj: obj, priority: priority});
        for (var i = this.obj_list.length - 1; ((i > 0)  && (this.obj_list[i].priority > this.obj_list[i - 1].priority)); i--) {
            var temp = this.obj_list[i];
            this.obj_list[i] = this.obj_list[i - 1];
            this.obj_list[i - 1] = temp;
        }
    };

    CanvasManager.prototype.del_obj = function (obj) {
        //console.log('CanvasManager.prototype.del_vobj');
        var index = -1;
        for (var i = 0; i < this.obj_list.length; i++)
            if (this.obj_list[i].obj == obj)
                index = i;
        if ((index >= 0) && (index < this.obj_list.length))
            this.obj_list.splice(index, 1);
    };

    CanvasManager.prototype.redraw = function(time) {
        this.context.clearRect(0, 0, this.width, this.height);
        for (var i = 0; i < this.obj_list.length; i++)
            this.obj_list[i].obj.redraw(this.context, time);
    };

    return CanvasManager;
})();

var canvasManager;