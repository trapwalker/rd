/*
* MapCanvasManager - объект, занимающийся отрисовкой на мап-канвас своих виджетов
*
* Чем выше приоритет добавляемого объекта, тем раньше он отрисуется на канвас!
* */


var ParentCanvasManager = (function(_super){
    __extends(ParentCanvasManager, _super);

    function ParentCanvasManager(canvas_id){
        _super.call(this);
        this.canvas_id = canvas_id;
        this.canvas = null;
        this.context = null;
        this.is_canvas_render = true;
        // todo: сделать это не просто списком, а списком с параметрами
        this.vobj_list = [];

        this.dom_canvas = null;
        this.dom_context = null;
    }

    ParentCanvasManager.prototype.init_canvas = function() {
        this.canvas = this.canvas || document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        var a = mapManager.getMapSize();
        this.canvas.width = a.x;
        this.canvas.height = a.y;

        //smap.renderer.canvas = this.canvas;
        //smap.renderer.context = this.context;

        this.dom_canvas = document.getElementById(this.canvas_id);
        this.dom_context = this.dom_canvas.getContext("2d");
        this.dom_canvas.width = a.x;
        this.dom_canvas.height = a.y;

        this.jq_for_cursor = $("#bodydiv");
    };

    ParentCanvasManager.prototype.add_vobj = function(vobj, priority) {
        //console.log('MapCanvasManager.prototype.add_vobj');
        for (var i = 0; i < this.vobj_list.length; i++)
            if (this.vobj_list[i].obj == vobj) {
                console.error('[visual_manager] Попытка повторного добавления визуального объекта.');
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
        var client_time = clock.getClientTime();
        for (var i = 0; i < this.vobj_list.length; i++)
            this.vobj_list[i].obj.redraw(this.context, time, client_time);

        this.dom_context.clearRect(0, 0, this.dom_canvas.width, this.dom_canvas.height);
        this.dom_context.drawImage(this.canvas, 0, 0);
    };

    return ParentCanvasManager;
})(ClientObject);


var MapCanvasManager = (function(_super){
    __extends(MapCanvasManager, _super);

    function MapCanvasManager(){
        _super.call(this, "ctest_1");
        this.init_canvas();
        // Общие переменные
        this.real_zoom = null; // Зум текущей итерации перерисовки
        this.zoom_koeff = null; // Коэффициент зуммирования: 2 в стемени 18 зум минус текущий зум
        this.map_tl = null;  // Игровые координаты, которые соответствуют 0,0 на канвасе (Map Top Left)
        this.cur_map_size = new Point(0, 0); // Текущие размеры карты
        this.cur_ctx_car_pos = new Point(0, 0); // Текущее положение userCar
        this.called_reinit_canvas = false; // Для медленных машин

        this._mouse_focus_widget = null;
        this._mouse_look = false;
        this._mouse_client = new Point(0, 0);


        this._settings_particles_tail = settingsManager.options.particles_tail.value;  // Длина шлейфов
    }

    MapCanvasManager.prototype.get_canvas_center = function() {
        return new Point(this.canvas.width >> 1, this.canvas.height >> 1);  // divison by 2
    };

    MapCanvasManager.prototype._on_mouse_hover = function (event) {
        this._mouse_client = new Point(event.clientX, event.clientY);
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
        if(! this.is_canvas_render) return;
        var a = mapManager.getMapSize();
        //console.log('MapCanvasManager.prototype.redraw', time);
        this.context.clearRect(0, 0, a.x, a.y);

        var focused_widget = this.mouse_test(time);
        // Заменить курсор и css, если нужно
        if ((focused_widget && !this._mouse_focus_widget) || (!focused_widget && this._mouse_focus_widget))
            if (focused_widget)
                this.jq_for_cursor.addClass("sublayers-clickable");
            else
                this.jq_for_cursor.removeClass("sublayers-clickable");
        this._mouse_focus_widget = focused_widget;

        this.real_zoom = mapManager.getZoom();
        this.zoom_koeff = Math.pow(2., (ConstMaxMapZoom - this.real_zoom));
        this.map_tl = mapManager.getTopLeftCoords(this.real_zoom);  // Эта точка соответствует 0,0 на канвасе
        var map_size = mapManager.getMapSize();
        if (subVector(map_size, this.cur_map_size).abs() > 0.2) {  // todo: ||  map.dragging._enabled
            var car_pos = user.userCar ? user.userCar.getCurrentCoord(time) : new Point(0, 0);
            var car_ctx_pos = mulScalVector(subVector(car_pos, this.map_tl), 1.0 / this.zoom_koeff);
            this.cur_map_size = map_size;
            this.cur_ctx_car_pos = car_ctx_pos;
        }
        _super.prototype.redraw.call(this, time);
    };

    MapCanvasManager.prototype.on_new_map_size = function() {
        //console.log('MapCanvasManager.prototype.on_new_map_size');
        this.cur_map_size = new Point(0, 0);

        if (! this.called_reinit_canvas) {
            this.called_reinit_canvas = true;
            setTimeout(function(){ mapCanvasManager.init_canvas(); mapCanvasManager.called_reinit_canvas = false;}, 50);
        }
    };


    return MapCanvasManager;
})(ParentCanvasManager);


var mapCanvasManager;