var tempWindowID = 0;


var Window = (function () {
    function Window(options) {
        // Нужно именно так, из-за наследования, иначе this.options наследника затрет
        // родительский this.options (или наоборот, в зависимоти от порядка вызовов)
        if (!this.options) this.options = {};
        setOptions({
            name: '',
            parentDiv: '',
            mainDivCSSClass: '',
            isModal: false}, this.options);
        if (options) setOptions(options, this.options);

        this.parentDiv = $("#" + this.options.parentDiv);

        // создание структуры дивов
        if (this.options.name == '')
            this.options.name = 'window' + tempWindowID++;
        this.modalDiv = null;
        this.mainDiv = $("<div id='" + this.options.name + "MainDiv' " +
                         "class='mainDivWindow " + this.options.mainDivCSSClass + "'></div>");

        // Активация окна (всплытие по z-index)
        var self = this;
        this.mainDiv.on('mousedown', function (event) {
            windowTemplateManager.setActiveWindow(self.options.win_name);
            stopEvent(event);
        });

        this.mainDiv.droppable({ greedy: true });

        if (this.options.isModal) {
            this.modalDiv = $("<div id=" + this.options.name + "ModalDiv" + " class='modalDivWindow'></div>");
            this.parentDiv.append(this.modalDiv);
            this.modalDiv.append(this.mainDiv);
            this.modalDiv.on('click', stopEvent);
            this.modalDiv.on('mousedown', stopEvent);
            this.modalDiv.on('mouswmove', stopEvent);
            this.modalDiv.on('mouseup', stopEvent);
        }
        else this.parentDiv.append(this.mainDiv);

        this.hideWindow();
    }

    // Установка DOM-элемента в качестве "таскателя" для данного окна
    Window.prototype.setupDragElement = function (element) {
        //console.log('Window.prototype.setupDragElement', element);
        this.mainDiv.height(this.mainDiv[0].scrollHeight);
        this.mainDiv.width(this.mainDiv[0].scrollWidth);
        this.mainDiv.draggable({
            handle: element == this.mainDiv ? null : element,
            //snap: true,
            //snapMode: 'outer',
            containment: "parent"
        });
    };

    // Установка DOM-элемента в качестве "закрывателя" для данного окна
    Window.prototype.setupCloseElement = function (element) {
        //console.log('Window.prototype.setupCloseElement', element);
        // todo: снять все обработчики перед удалением
        element.on('click', this, function (event) {
            if (event.data.options.win_name)
                windowTemplateManager.closeUniqueWindow(event.data.options.win_name);
            else
                event.data.closeWindow();
        });
    };

    // Программный способ закрвания (удаления) окна
    Window.prototype.closeWindow = function () {
        //console.log('Window.prototype.closeWindow');
        // todo: усовершенствовать снятие обработчиков
        if (this.options.close_call_back && typeof(this.options.close_call_back) === 'function')
            this.options.close_call_back(this.mainDiv);
        this.mainDiv.find('div').off(); // снять со всемх дивов, так как они скорее всего кнопки
        this.mainDiv.off(); // снять с главного дива - тут снимается draggable
        if (this.options.isModal)
            this.modalDiv.remove();
        else
            this.mainDiv.remove();
    };

    // Загрузка произвольного HTML
    Window.prototype.loadHTML = function (addr, cbFunc) {
        this.mainDiv.load(addr, cbFunc);
    };

    // Показать окно
    Window.prototype.showWindow = function (in_center) {
        if (this.options.isModal)
            this.modalDiv.css('display', 'block');
        else this.mainDiv.css('display', 'block');

        if (in_center) {
            var parent = this.options.isModal ? this.modalDiv : this.parentDiv;
            var _top = (parent.height() - this.mainDiv[0].scrollHeight) / 2;
            var _left = (parent.width() - this.mainDiv[0].scrollWidth) / 2;
            this.mainDiv.css({top: _top, left: _left});
        }
    };

    // Скрыть окно
    Window.prototype.hideWindow = function () {
        //console.log('Window.prototype.hideWindow');
        if (this.options.isModal)
            this.modalDiv.css('display', 'none');
        else this.mainDiv.css('display', 'none');

    };

    Window.prototype.setNewSize = function (height, width) {
        if (height) this.mainDiv.height(height);
        if (width) this.mainDiv.width(width);
    };

    return Window;
})();


var TemplateWindow = (function (_super) {
    __extends(TemplateWindow, _super);

    function TemplateWindow(options) {
        if (!this.options) this.options = {};

        setOptions({
            height: 400,
            width: 300
           }, this.options);

        if (options) setOptions(options, this.options);

        _super.call(this, {
            parentDiv: this.options.parentDiv,
            isModal: options.isModal
        });
    }

    return TemplateWindow;
})(Window);


var WindowTemplateManager = (function () {
    function WindowTemplateManager() {
        this.count = 0;
        this.unique = {}; // ассоциативный массив для уникальных окон, имеющих имя
        this.z_index_list = {};
    }

    WindowTemplateManager.prototype.closeActiveWindow = function (win_name) {
        //console.log("WindowTemplateManager.prototype.setActiveWindow", win_name);
        var win_name = '';
        var z_val = -1;
        for (var key in this.z_index_list)
            if (this.z_index_list.hasOwnProperty(key) && this.z_index_list[key] > z_val) {
                win_name = key;
                z_val = this.z_index_list[key];
            }
        if (z_val >= 0)
            this.closeUniqueWindow(win_name);
    };

    WindowTemplateManager.prototype.setActiveWindow = function (win_name) {
        //console.log("WindowTemplateManager.prototype.setActiveWindow", win_name);

        if (!this.z_index_list.hasOwnProperty(win_name)) return;
        var current_val = this.z_index_list[win_name];

        for (var key in this.z_index_list)
            if (this.z_index_list.hasOwnProperty(key) && (this.z_index_list[key] > current_val))
                this.z_index_list[key]--;

        this.z_index_list[win_name] = this.count;
        this._reSortWindow();
    };

    WindowTemplateManager.prototype._reSortWindow = function () {
        for(var key in this.unique)
            if (this.unique.hasOwnProperty(key) && this.z_index_list.hasOwnProperty(key))
                this.unique[key].mainDiv.css('z-index', this.z_index_list[key]);
    };

    WindowTemplateManager.prototype.closeAllWindows = function () {
        for(var key in this.unique)
            if (this.unique.hasOwnProperty(key))
                this.closeUniqueWindow(key);
    };

    WindowTemplateManager.prototype.openUniqueWindow = function (win_name, win_url, win_data, open_call_back, close_call_back, is_modal) {
        //console.log('WindowTemplateManager.prototype.openUniqueWindow');
        var self = this;
        if (this.unique[win_name] != null) this.closeUniqueWindow(win_name);
        // todo: возможно стоит передавать уникальное имя в сам объект-окно, чтобы когда окно закрывается само, оно закрывалось через этот менеджер
        this.unique[win_name] = 'waiting';
        $.ajax({
            url: "http://" + location.hostname + $('#settings_server_mode_link_path').text() + '/api' + win_url,
            data: win_data,
            success: function(data) {
                if (self.unique[win_name] != 'waiting') return;
                var temp_window = new TemplateWindow({
                    parentDiv: 'bodydiv',
                    win_name: win_name,
                    close_call_back: close_call_back,
                    isModal: is_modal ? is_modal : false
                });
                temp_window.mainDiv.append(data);
                temp_window.showWindow(true);
                var drag_elem = temp_window.mainDiv.find('.windowDragCloseHeader-main').first();
                var close_elem = temp_window.mainDiv.find('.windowDragCloseHeader-close').first();
                temp_window.setupDragElement(drag_elem);
                temp_window.setupCloseElement(close_elem);
                self.unique[win_name] = temp_window;

                // Настройка z-index
                self.count++;
                self.z_index_list[win_name] = self.count;
                temp_window.mainDiv.css('z-index', self.count);

                if (open_call_back && typeof(open_call_back) === 'function') open_call_back(temp_window.mainDiv);
            }
        });
    };

    WindowTemplateManager.prototype.openWindow = function (win_url, win_data, is_modal) {
        //console.log('WindowTemplateManager.prototype.openWindow');
        $.ajax({
            url: "http://" + location.host + win_url,
            data: win_data,
            success: function(data){
                var temp_window = new TemplateWindow({
                    parentDiv: 'bodydiv',
                    isModal: is_modal ? is_modal : false
                });
                temp_window.mainDiv.append(data);
                temp_window.showWindow(true);
                var drag_elem = temp_window.mainDiv.find('.windowDragCloseHeader-main').first();
                var close_elem = temp_window.mainDiv.find('.windowDragCloseHeader-close').first();
                temp_window.setupDragElement(drag_elem);
                temp_window.setupCloseElement(close_elem);
            }
        });
    };

    WindowTemplateManager.prototype.closeUniqueWindow = function (win_name) {
        //console.log('WindowTemplateManager.prototype.closeUniqueWindow', win_name);
        if (this.unique[win_name] != null) {
            if (this.unique[win_name] != 'waiting')
                this.unique[win_name].closeWindow();
            this.unique[win_name] = null;
            delete this.unique[win_name];

            if (!this.z_index_list.hasOwnProperty(win_name)) return;
            var current_val = this.z_index_list[win_name];

            for (var key in this.z_index_list)
                if (this.z_index_list.hasOwnProperty(key) && (this.z_index_list[key] > current_val))
                    this.z_index_list[key]--;

            delete this.z_index_list[win_name];
            this.count--;

            this._reSortWindow();
            returnFocusToMap();
        }
    };

    WindowTemplateManager.prototype.isOpen = function (win_name) {
        return (this.unique[win_name]) && (this.unique[win_name] != null)
    };

    WindowTemplateManager.prototype.isClose = function (win_name) {
        return (!this.unique[win_name]) || (this.unique[win_name] == null)
    };

    return WindowTemplateManager;
})();


var windowTemplateManager = new WindowTemplateManager();