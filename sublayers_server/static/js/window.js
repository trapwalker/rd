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
            containment: "parent",
            snap: true,
            snapMode: 'outer'
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
        // todo: усовершенствовать снятие обработчиков
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

var tempWindowID = 0;

var TemplateWindow = (function (_super) {
    __extends(TemplateWindow, _super);

    function TemplateWindow(options) {
        if (!this.options) this.options = {};

        setOptions({
            height: 400,
            width: 300
           }, this.options);

        if (options) setOptions(options, this.options);

        // Запихиваем чат в отдельное окно
        _super.call(this, {
            parentDiv: this.options.parentDiv
        });
    }

    return TemplateWindow;
})(Window);