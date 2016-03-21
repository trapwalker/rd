/*
* MapCanvasManager - ������, ������������ ���������� �� ���-������ ����� ��������
*
* ��� ���� ��������� ������������ �������, ��� ������ �� ���������� �� ������!
* */


var MapCanvasManager = (function(_super){
    __extends(MapCanvasManager, _super);

    function MapCanvasManager(){
        _super.call(this);

        this.canvas = document.getElementById("ctest_1");
        this.context = this.canvas.getContext("2d");
        this.canvas.width = 1920;
        this.canvas.height = 1080;

        // todo: ������� ��� �� ������ �������, � ������� � �����������
        this.vobj_list = [];

        // ����� ����������
        this.real_zoom = null; // ��� ������� �������� �����������
        this.zoom_koeff = null; // ����������� ������������: 2 � ������� 18 ��� ����� ������� ���
        this.map_tl = null;  // ������� ����������, ������� ������������� 0,0 �� ������� (Map Top Left)
        this.cur_map_size = new Point(0, 0); // ������� ������� �����
        this.cur_ctx_car_pos = new Point(0, 0); // ������� ��������� userCar
    }

    MapCanvasManager.prototype.add_vobj = function(vobj, priority) {
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

    MapCanvasManager.prototype.del_vobj = function (vobj) {
        //console.log('MapCanvasManager.prototype.del_vobj');
        var index = -1;
        for (var i = 0; i < this.vobj_list.length; i++)
            if (this.vobj_list[i].obj == vobj)
                index = i;
        if ((index >= 0) && (index < this.vobj_list.length))
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

        this.real_zoom = mapManager.getRealZoom(time);
        this.zoom_koeff = Math.pow(2., (ConstMaxMapZoom - this.real_zoom));
        var map_size = mapManager.getMapSize();
        if (subVector(map_size, this.cur_map_size).abs() > 0.2 || map.dragging._enabled) {
            var car_pos = user.userCar.getCurrentCoord(time);
            this.map_tl = mapManager.getTopLeftCoords(this.real_zoom);  // ��� ����� ������������� 0,0 �� �������
            var car_ctx_pos = mulScalVector(subVector(car_pos, this.map_tl), 1.0 / this.zoom_koeff);
            this.cur_map_size = map_size;
            this.cur_ctx_car_pos = car_ctx_pos;
        }

        for (var i = 0; i < this.vobj_list.length; i++)
            this.vobj_list[i].obj.redraw(this.context, time);
    };

    MapCanvasManager.prototype.on_new_map_size = function() {
        this.cur_map_size = new Point(0, 0);
    };




    return MapCanvasManager;
})(ClientObject);


var mapCanvasManager;