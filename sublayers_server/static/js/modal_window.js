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
        this.modalWin = $('#' + divs.modalWin);
        this.modalLose = $('#' + divs.modalLose);
        this.modalRestart = $('#' + divs.modalRestart);

        // утсновка классов по умолчанию
        this.parent.addClass('modal-window-parent');
        this.back.addClass('modal-window-hide');
        this.modalWelcome.addClass('modal-window-hide');
        this.modalOptions.addClass('modal-window-hide');
        this.modalDeath.addClass('modal-window-hide');
        this.modalWin.addClass('modal-window-hide');
        this.modalLose.addClass('modal-window-hide');
        this.modalRestart.addClass('modal-window-hide');

        // Загрузка содержимого модельных окон
        this.modalWelcomeLoad();
        this.modalOptionsLoad();
        this.modalDeathLoad();
        this.modalWinLoad();
        this.modalLoseLoad();
        this.modalRestartLoad();
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
        this.modalWelcome.load('/static/modal_window/welcomePage.html', function(){
            // Назначить кнопку закрытия окна
            $('#welcomePageCloseButton').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
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
        optionsFlagDebug.checked = cookieStorage.flagDebug ? true : false;
        optionsChatPush.checked = cookieStorage.optionsChatPush ? true : false;
        optionsChatRPC.checked = cookieStorage.optionsChatRPC ? true : false;
        optionsChatAnswer.checked = cookieStorage.optionsChatAnswer ? true : false;
        optionsChatSystemLog.checked = cookieStorage.optionsChatSystemLog ? true : false;
        optionsMarkerContact.checked = cookieStorage.optionsMarkerContact ? true : false;
        optionsMarkerUpdate.checked = cookieStorage.optionsMarkerUpdate ? true : false;
        optionsMapTileVisible.checked = cookieStorage.optionsMapTileVisible ? true : false;
        optionsFCRotate.checked = cookieStorage.optionsFCRotate ? true : false;
        optionsRMVisible.checked = cookieStorage.optionsRMVisible ? true : false;
        optionsSelectAnybody.checked = cookieStorage.optionsSelectAnybody ? true: false;
        optionsLevelForVisibleLabel.value = cookieStorage.levelZoomForVisibleLabel;
        optionsShowID.checked = cookieStorage.optionsShowID;
        optionsFriendlyFireEnabled.checked = cookieStorage.optionsFriendlyFireEnabled;
        optionsShowDebugLine.checked = cookieStorage.optionsShowDebugLine;
    };

    ModalWindow.prototype.modalOptionsHide = function(saveOptions){
        // выключить фон
        this._modalBackHide();
        // выключить модальное окно Welcome
        this.modalOptions.removeClass('modal-window-options-show');
        this.modalOptions.addClass('modal-window-hide');
        // Загрузить данные в куки сторадж, если saveOptions == true
        if(saveOptions) {
            // Опции, не требующие действий
            cookieStorage.optionsRMVisible = optionsRMVisible.checked ? true : false;
            cookieStorage.optionsMarkerContact = optionsMarkerContact.checked ? true : false;
            cookieStorage.optionsMarkerUpdate = optionsMarkerUpdate.checked ? true : false;
            cookieStorage.optionsFriendlyFireEnabled = optionsFriendlyFireEnabled.checked ? true : false;

            // Считать флаг дебаг. Если false, то стереть маркеры апдейтов и контактов
            cookieStorage.flagDebug = optionsFlagDebug.checked ? true : false;
            if (!cookieStorage.flagDebug)
                for (; debugMapList.length;) // Очистиить debugMapList и удалить всё с карты
                    myMap.removeLayer(debugMapList.pop());

            // TODO Развыделить все машинки и снова выделить только партийные
            cookieStorage.optionsSelectAnybody = optionsSelectAnybody.checked ? true : false;

            // Опции чата. Нужно присваивать и потом удалять или добавлять чат
            cookieStorage.optionsChatPush = optionsChatPush.checked ? true : false;
            cookieStorage.optionsChatRPC = optionsChatRPC.checked ? true : false;
            cookieStorage.optionsChatAnswer = optionsChatAnswer.checked ? true : false;
            cookieStorage.optionsChatSystemLog = optionsChatSystemLog.checked ? true : false;
            chat.manageSystemChats(cookieStorage);

            // Скрыть или показать тайловый уровень в зависимости от настроек опций
            cookieStorage.optionsMapTileVisible = optionsMapTileVisible.checked ? true : false;
            TileLaterSet();

            // просто повернуть на 0 (или 90, или минус 90 - узнать!) и присвоить
            cookieStorage.optionsFCRotate = optionsFCRotate.checked ? true : false;
            controllers.fireControl.setRotated(cookieStorage.optionsFCRotate);

            // считать данные о масштабе для отображения лейблов маркера
            cookieStorage.levelZoomForVisibleLabel = optionsLevelForVisibleLabel.value;

            // optionsShowID переделать шапку, в зависимости от результата
            cookieStorage.optionsShowID = optionsShowID.checked ? true : false;
            setTitleOnPage();

            // optionsShowDebugLine - выключить все линии всех машинок
            if (optionsShowDebugLine.checked != cookieStorage.optionsShowDebugLine) {
                for (var i in listMapObject.objects)
                    if (listMapObject.exist(i)) {
                        // пересчёт координат
                        var car = listMapObject.objects[i];
                        if(car.debugLine)
                        {
                            if(optionsShowDebugLine.checked) // добавить линию на карту
                                car.debugLine.addTo(myMap);
                            else
                                myMap.removeLayer(car.debugLine);
                        }

                    }
            }
            cookieStorage.optionsShowDebugLine = optionsShowDebugLine.checked ? true : false;


        }
    };

    ModalWindow.prototype.modalOptionsLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalOptions.load('/static/modal_window/optionsPage.html', function(){
            // Назначить кнопку закрытия окна
            $('#optionsPageCloseButton').on('click', {modal: self}, function(event){
                event.data.modal.modalOptionsHide(true);
            });

            $('#optionsPageCancelButton').on('click', {modal: self}, function(event){
                event.data.modal.modalOptionsHide();
            });

        });

    };




    ModalWindow.prototype.modalDeathShow = function () {
        // включить фон - ФОН не включается, так как при смерти можно двигать карту и смотреть за боем
        //this._modalBackShow();
        // включить модальное окно modalOptions
        this.modalDeath.removeClass('modal-window-hide');
        this.modalDeath.addClass('modal-window-death-show');
    };

    ModalWindow.prototype.modalDeathHide = function(){
        // выключить фон
        //this._modalBackHide();
        // выключить модальное окно Death
        this.modalDeath.removeClass('modal-window-death-show');
        this.modalDeath.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalDeathLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalDeath.load('/static/modal_window/deathPage.html', function(){
            // Назначить кнопки закрытия окна
            $('#deathPageButtonResp').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                sendServConsole('change_car()');
                // Затем закрыть текущее модельное окно
                event.data.modal.modalDeathHide();
            });

        });

    };



    ModalWindow.prototype.modalWinShow = function () {
        // включить фон - ФОН не включается, так как при смерти можно двигать карту и смотреть за боем
        //this._modalBackShow();
        // включить модальное окно modalOptions
        this.modalWin.removeClass('modal-window-hide');
        this.modalWin.addClass('modal-window-win-show');
    };

    ModalWindow.prototype.modalWinHide = function(){
        // выключить фон
        //this._modalBackHide();
        // выключить модальное окно Death
        this.modalWin.removeClass('modal-window-win-show');
        this.modalWin.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalWinLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalWin.load('/static/modal_window/winPage.html', function(){
            // Назначить кнопки закрытия окна
            $('#winPageButtonResp').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                // Затем закрыть текущее модельное окно
                event.data.modal.modalWinHide();
            });

        });

    };



    ModalWindow.prototype.modalLoseShow = function () {
        // включить фон - ФОН не включается, так как при смерти можно двигать карту и смотреть за боем
        //this._modalBackShow();
        // включить модальное окно modalOptions
        this.modalLose.removeClass('modal-window-hide');
        this.modalLose.addClass('modal-window-lose-show');
    };

    ModalWindow.prototype.modalLoseHide = function(){
        // выключить фон
        //this._modalBackHide();
        // выключить модальное окно Death
        this.modalLose.removeClass('modal-window-lose-show');
        this.modalLose.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalLoseLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalLose.load('/static/modal_window/losePage.html', function(){
            // Назначить кнопки закрытия окна
            $('#losePageButtonResp').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                // Затем закрыть текущее модельное окно
                event.data.modal.modalLoseHide();
            });

        });

    };



    ModalWindow.prototype.modalRestartShow = function () {
        // включить фон - ФОН не включается, так как при смерти можно двигать карту и смотреть за боем
        this._modalBackShow();
        // включить модальное окно modalOptions
        this.modalRestart.removeClass('modal-window-hide');
        this.modalRestart.addClass('modal-window-restart-show');
    };

    ModalWindow.prototype.modalRestartHide = function(){
        // выключить фон
        this._modalBackHide();
        // выключить модальное окно Death
        this.modalRestart.removeClass('modal-window-restart-show');
        this.modalRestart.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalRestartLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalRestart.load('/static/modal_window/restartWindow.html', function(){
            // Назначить кнопки закрытия окна
            $('#restartPageButton').on('click', {modal: self}, function(event){
                // сначала обработать все необходимые данные
                // Затем закрыть текущее модельное окно
                event.data.modal.modalRestartHide();
                // И теперь сделать рестарт
                window.location.reload();
            });

        });

    };



    return ModalWindow;
})();