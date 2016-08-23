/*
* MapCanvasManager - ������, ������������ ���������� �� ���-������ ����� ��������
*
* ��� ���� ��������� ������������ �������, ��� ������ �� ���������� �� ������!
* */


var ParentCanvasManager = (function(_super){
    __extends(ParentCanvasManager, _super);

    function ParentCanvasManager(canvas_id){
        _super.call(this);
        this.canvas_id = canvas_id;
        this.canvas = null;
        this.context = null;
        this.is_canvas_render = true;
        // todo: ������� ��� �� ������ �������, � ������� � �����������
        this.vobj_list = [];
    }

    ParentCanvasManager.prototype.init_canvas = function() {
        this.canvas = document.getElementById(this.canvas_id);
        this.context = this.canvas.getContext("2d");
        this.canvas.width = mapManager.max_size;
        this.canvas.height = mapManager.max_size;
    };

    ParentCanvasManager.prototype.add_vobj = function(vobj, priority) {
        //console.log('MapCanvasManager.prototype.add_vobj');
        for (var i = 0; i < this.vobj_list.length; i++)
            if (this.vobj_list[i].obj == vobj) {
                console.error('[visual_manager] ������� ���������� ���������� ����������� �������.');
                return;
            }

        if (!priority) priority = 1;

        this.vobj_list.push({obj: vobj, priority: priority});
        for (var i = this.vobj_list.length - 1; ((i > 0)  && (this.vobj_list[i].priority > this.vobj_list[i - 1].priority)); i--) {
            var temp = this.vobj_list[i];
            this.vobj_list[i] = this.vobj_list[i - 1];
            this.vobj_list[i - 1] = temp;
        }
    };

    ParentCanvasManager.prototype.del_vobj = function (vobj) {
        //console.log('MapCanvasManager.prototype.del_vobj');
        var index = -1;
        for (var i = 0; i < this.vobj_list.length; i++)
            if (this.vobj_list[i].obj == vobj)
                index = i;
        if ((index >= 0) && (index < this.vobj_list.length))
            this.vobj_list.splice(index, 1);
    };

    ParentCanvasManager.prototype.get_ctx = function() {
        return this.context;
    };

    ParentCanvasManager.prototype.redraw = function(time) {
        for (var i = 0; i < this.vobj_list.length; i++)
            this.vobj_list[i].obj.redraw(this.context, time);
    };

    return ParentCanvasManager;
})(ClientObject);


var MapCanvasManager = (function(_super){
    __extends(MapCanvasManager, _super);

    function MapCanvasManager(){
        _super.call(this, "canvas");
        // ����� ����������
        this.real_zoom = null; // ��� ������� �������� �����������
        this.zoom_koeff = null; // ����������� ������������: 2 � ������� 18 ��� ����� ������� ���
        this.map_tl = null;  // ������� ����������, ������� ������������� 0,0 �� ������� (Map Top Left)
        this.cur_map_size = new Point(0, 0); // ������� ������� �����
        this.cur_ctx_car_pos = new Point(0, 0); // ������� ��������� userCar

        this._mouse_focus_widget = null;
        this._mouse_look = false;
        this._mouse_client_x = 0;
        this._mouse_client_y = 0;
        this._mouse_client = new Point(0, 0);
    }

    MapCanvasManager.prototype.get_canvas_center = function() {
        return new Point(this.canvas.width >> 1, this.canvas.height >> 1);  // divison by 2
    };

    MapCanvasManager.prototype._on_mouse_hover = function (event) {
        //this._mouse_client_x = event.clientX;
        //this._mouse_client_y = event.clientY;
        this._mouse_client = new Point(event.clientX, event.clientY);
        //console.log(this._mouse_client_x, this._mouse_client_y);
    };

    MapCanvasManager.prototype.set_mouse_look = function (new_look_state) {
        //console.log('MapCanvasManager.prototype.set_mouse_look', new_look_state);
        if (this._mouse_look != new_look_state) this._mouse_look = new_look_state;
    };

    MapCanvasManager.prototype.mouse_test = function (time) {
        if (!this._mouse_look) return null;
        //console.log('MapCanvasManager.prototype.mouse_test');
        for (var i = this.vobj_list.length - 1; i >= 0; i--) {
            var widg = this.vobj_list[i].obj;
            if (typeof(widg.mouse_test) === 'function' && widg.mouse_test(time))
                return widg;
        }
        return null;
    };

    MapCanvasManager.prototype.redraw = function(time) {
        //console.log('MapCanvasManager.prototype.redraw');
        if(! this.is_canvas_render) return;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        //this._mouse_focus_widget = this.mouse_test();

        this.real_zoom = mapManager.getRealZoom(time);
        this.zoom_koeff = Math.pow(2., (ConstMaxMapZoom - this.real_zoom));
        this.map_tl = mapManager.getTopLeftCoords(this.real_zoom);  // ��� ����� ������������� 0,0 �� �������

        var map_size = mapManager.getMapSize();
        if (subVector(map_size, this.cur_map_size).abs() > 0.2 || map.dragging._enabled) {
            var car_pos = user.userCar ? user.userCar.getCurrentCoord(time) : new Point(0, 0);
            var car_ctx_pos = mulScalVector(subVector(car_pos, this.map_tl), 1.0 / this.zoom_koeff);
            this.cur_map_size = map_size;
            this.cur_ctx_car_pos = car_ctx_pos;
        }

        //console.log(this.map_tl, mapManager.getMapSize(), this.cur_ctx_car_pos);

        _super.prototype.redraw.call(this, time);
    };

    MapCanvasManager.prototype.on_new_map_size = function() {
        this.cur_map_size = new Point(0, 0);
    };


    return MapCanvasManager;
})(ParentCanvasManager);


var mapCanvasManager;