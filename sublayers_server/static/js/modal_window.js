var ModalWindow = (function () {
    function ModalWindow(divs) {
        // в массиве divs хранятся:
        // - divs.parent - див для создания всего механизма модельных окон
        // - divs.back - див для бекграунда
        // - divs.modalWelcome - див для модального окна приветствия
        // - divs.modalOptions - див для модального окна настроек
        // - divs.modalDeath - див для модального окна смерти игрока

        this.parent = $('#' + divs.parent);
        this.back = $('#' + divs.back);
        this.modalWelcome = $('#' + divs.modalWelcome);
        this.modalOptions = $('#' + divs.modalOptions);
        this.modalDeath = $('#' + divs.modalDeath);

        // утсновка классов по умолчанию
        this.parent.addClass('modal-window-parent');
        this.back.addClass('modal-window-hide');
        this.modalWelcome.addClass('modal-window-hide');
        this.modalOptions.addClass('modal-window-hide');
        this.modalDeath.addClass('modal-window-hide');

        // Загрузка содержимого модельных окон
        this.modalWelcomeLoad();
        this.modalOptionsLoad();
        this.modalDeathLoad();
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




    ModalWindow.prototype.modalOptionsShow = function () {
        // включить фон
        this._modalBackShow();
        // включить модальное окно modalOptions
        this.modalOptions.removeClass('modal-window-hide');
        this.modalOptions.addClass('modal-window-options-show');
        // считать все данные из CookieStorage и занести галочками сюда

    };

    ModalWindow.prototype.modalOptionsHide = function(){
        // выключить фон
        this._modalBackHide();
        // выключить модальное окно Welcome
        this.modalOptions.removeClass('modal-window-options-show');
        this.modalOptions.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalOptionsLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalOptions.load('/static/optionsPage.html', function(){
            // Назначить кнопку закрытия окна
            $('#optionsPageCloseButton').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                alert('Вы закрыли окно настроек. Ну как хотите...');
                // Затем закрыть текущее модельное окно
                event.data.modal.modalOptionsHide();
            });

            $('#optionsPageCancelButton').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                alert('Вы закрыли окно настроек. Ну как хотите...');
                // Затем закрыть текущее модельное окно
                event.data.modal.modalOptionsHide();
            });

        });

    };




    ModalWindow.prototype.modalDeathShow = function () {
        // включить фон
        this._modalBackShow();
        // включить модальное окно modalOptions
        this.modalDeath.removeClass('modal-window-hide');
        this.modalDeath.addClass('modal-window-death-show');
        // считать все данные из CookieStorage и занести галочками сюда

    };

    ModalWindow.prototype.modalDeathHide = function(){
        // выключить фон
        this._modalBackHide();
        // выключить модальное окно Welcome
        this.modalDeath.removeClass('modal-window-death-show');
        this.modalDeath.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalDeathLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalOptions.load('/static/deathPage.html', function(){
            // Назначить кнопки закрытия окна
            $('#deathPageButtonYes').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                alert('Вы закрыли окно настроек. Ну как хотите...');
                // Затем закрыть текущее модельное окно
                event.data.modal.modalDeathHide();
            });
            $('#deathPageButtonNo').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                alert('Вы закрыли окно настроек. Ну как хотите...');
                // Затем закрыть текущее модельное окно
                event.data.modal.modalDeathHide();
            });

        });

    };









    return ModalWindow;
})();