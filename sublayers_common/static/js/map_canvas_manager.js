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

        this.width = 0;
        this.height = 0;
    }

    ParentCanvasManager.prototype.init_canvas = function() {
        this.canvas = this.canvas || document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        var a = mapManager.getMapSize();
        this.width = a.x;
        this.height = a.y;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        //smap.renderer.canvas = this.canvas;
        //smap.renderer.context = this.context;

        this.dom_canvas = document.getElementById(this.canvas_id);
        this.dom_context = this.dom_canvas.getContext("2d");
        this.dom_canvas.width = this.width;
        this.dom_canvas.height = this.height;

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
        this.context.clearRect(0, 0, 1920, 1080);
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
        this.global_mouse_client = new Point(0, 0);
        $(document).mousemove(function(event) { mapCanvasManager.global_mouse_client = new Point(event.clientX, event.clientY); });

        this._central_point = new Point(0, 0);
        this._lock_radius1 = 0;
        this._lock_radius2 = 0;
        this.current_mouse_shift = new Point(0, 0);
        this.target_mouse_shift = new Point(0, 0);

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
        function easeInQuart(x, t, b, c, d) { // x: percent of animate, t: current time, b: begInnIng value, c: change In value, d: duration
            //return c * (t /= d) * t * t * t + b;
            return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
        }

        if(! this.is_canvas_render) return;

        var map_size = mapManager.getMapSize();
        if (subVector(map_size, this.cur_map_size).abs() > 0.2) {
            this.cur_map_size = map_size;
            this._central_point = mulScalVector(mapManager.getMapSize(), 0.5);
            var s = Math.min(map_size.x, map_size.y) * 0.5;
            this._lock_radius1 = s * 1.3;
            this._lock_radius2 = s * 1.8;
        }

        // Расчет сдвига карты от указателя мыши
        var cursor_point = this.global_mouse_client;
        this.target_mouse_shift = subVector(cursor_point, this._central_point);
        var sqr_abs = this.target_mouse_shift.sqr_abs();

        // Бублик
        var d_len = this._lock_radius2 - this._lock_radius1;
        if (sqr_abs < this._lock_radius1 * this._lock_radius1)
            this.target_mouse_shift = new Point(0, 0);
        else if (sqr_abs > this._lock_radius2 * this._lock_radius2)
            this.target_mouse_shift = normVector(this.target_mouse_shift, d_len);  // потому что this._lock_radius1 = this._lock_radius2 / 2
        else
            this.target_mouse_shift = normVector(this.target_mouse_shift, (Math.sqrt(sqr_abs) - this._lock_radius1));

        // Не бублик
        //if (sqr_abs > this._lock_radius2 * this._lock_radius2)
        //    this.target_mouse_shift = normVector(this.target_mouse_shift, this._lock_radius2);
        //var d_len = this._lock_radius2;

        // Градиент
        var len = this.target_mouse_shift.abs();
        var new_len = easeInQuart(0, len, 0, d_len, d_len);
        this.target_mouse_shift = normVector(this.target_mouse_shift, new_len);

        // Медленное движение
        var d_shift = subVector(this.target_mouse_shift, this.current_mouse_shift);
        if (settingsManager.options.dynamic_camera.currentValue)
            if (d_shift.sqr_abs() > 10) {
                d_shift.x = d_shift.x * 0.1; d_shift.y = d_shift.y * 0.1;
                this.current_mouse_shift = summVector(this.current_mouse_shift, d_shift);
            }
            else
                this.current_mouse_shift = this.target_mouse_shift;
        else
            this.current_mouse_shift = new Point(0, 0);

        //console.log('MapCanvasManager.prototype.redraw', time);
        this.context.clearRect(0, 0, map_size.x, map_size.y);

        if (wMapPosition) wMapPosition.redraw(time);

        var focused_widget = this.mouse_test(time);
        // Заменить курсор и css, если нужно
        if ((focused_widget && !this._mouse_focus_widget) || (!focused_widget && this._mouse_focus_widget))
            if (focused_widget)
                this.jq_for_cursor.addClass("sublayers-clickable");
            else
                this.jq_for_cursor.removeClass("sublayers-clickable");
        this._mouse_focus_widget = focused_widget;

        this.real_zoom = mapManager.getZoom();

        this.zoom_koeff = mapManager.getZoomKoeff();

        // ������ ������� - �������, �� ������� ���������� � ������
        // this.zoom_koeff = Math.pow(2., (ConstMaxMapZoom - this.real_zoom));

        this.map_tl = mapManager.getTopLeftCoords(this.real_zoom);  // ��� ����� ������������� 0,0 �� �������
        var car_pos = user.userCar ? user.userCar.getCurrentCoord(time) : new Point(0, 0);
        var car_ctx_pos = mulScalVector(subVector(car_pos, this.map_tl), 1.0 / this.zoom_koeff);
        this.cur_ctx_car_pos = car_ctx_pos;

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