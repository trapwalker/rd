var Window = (function () {
    function Window(options) {
        this.options = {
            name: '',
            parentDiv: '',
            mainDivCSSClass: '',
            isModal: false,
        };
        setOptions(options, this.options);

        // создание структуры дивов
        if (this.options.name == '')
            this.options.name = 'window' + tempWindowID++;
        this.modalDiv = null;
        this.mainDiv = $("<div id='" + this.options.name + "MainDiv' " +
                         "class='mainDivWindow " + this.options.mainDivCSSClass + "'></div>");

        if (this.options.isModal) {
            this.modalDiv = $("<div id=" + this.options.name + "ModalDiv" + " class='modalDivWindow'></div>");
            $("#" + this.options.parentDiv).append(this.modalDiv);
            this.modalDiv.append(this.mainDiv);
            this.modalDiv.on('click', stopEvent);
            this.modalDiv.on('mousedown', stopEvent);
            this.modalDiv.on('mouswmove', stopEvent);
            this.modalDiv.on('mouseup', stopEvent);
        }
        else $("#" + this.options.parentDiv).append(this.mainDiv);

        this.hideWindow();
    }

    // Установка DOM-элемента в качестве таскателя для данного окна
    Window.prototype.setupDragElement = function (element) {
        this.mainDiv.draggable({
            handle: element == this.mainDiv ? null : element,
            containment: "parent",
            snap: true,
            snapMode: 'outer'
        });
    };

    // Загрузка произвольного HTML
    Window.prototype.loadHTML = function (addr, cbFunc) {
        this.mainDiv.load(addr, cbFunc);
    };

    // Показать окно
    Window.prototype.showWindow = function () {
        if (this.options.isModal)
            this.modalDiv.css('display', 'block');
        else this.mainDiv.css('display', 'block');
    };

    // Скрыть окно
    Window.prototype.hideWindow = function () {
        if (this.options.isModal)
            this.modalDiv.css('display', 'none');
        else this.mainDiv.css('display', 'none');
    };

    return Window;
})();

var tempWindowID = 0;