var ModalWindow = (function () {
    function ModalWindow(divs) {
        // в массиве divs хранятся:
        // - divs.parent - див для создания всего механизма модельных окон
        // - divs.back - див для бекграунда
        // - divs.modalWelcome - див для модального окна приветствия
        //

        this.parent = $('#' + divs.parent);
        this.back = $('#' + divs.back);
        this.modalWelcome = $('#' + divs.modalWelcome);

        // утсновка классов по умолчанию
        this.parent.addClass('modal-window-parent');
        this.back.addClass('modal-window-hide');
        this.modalWelcome.addClass('modal-window-hide');


        // Загрузка содержимого модельных окон
        this.modalWelcomeLoad();
    }

    ModalWindow.prototype._modalBackShow = function () {
        this.back.removeClass('modal-window-hide');
        this.back.addClass('modal-window-back-show');
    };

    ModalWindow.prototype._modalBackHide = function () {
        this.back.removeClass('modal-window-back-show');
        this.back.addClass('modal-window-hide');
    };


    ModalWindow.prototype.modalWelcomeShow = function () {
        // включить фон
        this._modalBackShow();
        // включить модальное окно Welcome
        this.modalWelcome.removeClass('modal-window-hide');
        this.modalWelcome.addClass('modal-window-welcome-show');

    };


    ModalWindow.prototype.modalWelcomeHide = function(){
        // выключить фон
        this._modalBackHide();
        // выключить модальное окно Welcome
        this.modalWelcome.removeClass('modal-window-welcome-show');
        this.modalWelcome.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalWelcomeLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalWelcome.load('/static/welcomePage.html', function(){
            // Назначить кнопку закрытия окна
            $('#welcomePageCloseButton').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                alert('Вы закрыли окно приветствия. Ну как хотите...');
                // Затем закрыть текущее модельное окно
                event.data.modal.modalWelcomeHide();
            });

        });

    };













    return ModalWindow;
})();