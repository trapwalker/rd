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
        this.modalRestart = $('#' + divs.modalRestart);
        this.modalDialogInfo = $('#modalInfoPage');
        this.modalAnswerInfo = $('#modalAnswerPage');
        this.modalItemDivision = $('#modalItemDivisionPage');

        // утсновка классов по умолчанию
        this.parent.addClass('modal-window-parent');
        this.back.addClass('modal-window-hide');
        this.modalWelcome.addClass('modal-window-hide');
        this.modalOptions.addClass('modal-window-hide');
        this.modalDeath.addClass('modal-window-hide');
        this.modalRestart.addClass('modal-window-hide');
        this.modalDialogInfo.addClass('modal-window-hide');
        this.modalAnswerInfo.addClass('modal-window-hide');
        this.modalItemDivision.addClass('modal-window-hide');

        // Загрузка содержимого модельных окон
        this.modalWelcomeLoad();
        this.modalOptionsLoad();
        this.modalDeathLoad();
        this.modalRestartLoad();
        this.modalDialogInfoLoad();
        this.modalDialogAnswerLoad();
        this.modalItemDivisionLoad();
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
            cookieStorage.optionsShowDebugLine = optionsShowDebugLine.checked ? true : false;

            // Считать флаг дебаг. Если false, то стереть маркеры апдейтов и контактов
            cookieStorage.flagDebug = optionsFlagDebug.checked ? true : false;
            if (!cookieStorage.flagDebug)
                for (; debugMapList.length;) // Очистиить debugMapList и удалить всё с карты
                    map.removeLayer(debugMapList.pop());

            // TODO Развыделить все машинки и снова выделить только партийные
            cookieStorage.optionsSelectAnybody = optionsSelectAnybody.checked ? true : false;

            // Опции чата. Нужно присваивать и потом удалять или добавлять чат
            cookieStorage.optionsChatPush = optionsChatPush.checked ? true : false;
            cookieStorage.optionsChatRPC = optionsChatRPC.checked ? true : false;
            cookieStorage.optionsChatAnswer = optionsChatAnswer.checked ? true : false;
            cookieStorage.optionsChatSystemLog = optionsChatSystemLog.checked ? true : false;
            //chat.manageSystemChats(cookieStorage);

            /*
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
            */
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
        this._modalBackShow();
        // включить модальное окно modalOptions
        this.modalDeath.removeClass('modal-window-hide');
        this.modalDeath.addClass('modal-window-death-show');
    };

    ModalWindow.prototype.modalDeathHide = function(){
        // выключить фон
        this._modalBackHide();
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
                //sendServConsole('change_car()');
                location.reload();
                // Затем закрыть текущее модельное окно
                event.data.modal.modalDeathHide();
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


    ModalWindow.prototype.modalDialogInfoShow = function (options) {
        // включить фон - ФОН не включается, так как при смерти можно двигать карту и смотреть за боем
        var self = this;
        this._modalBackShow();
        options = options || {};
        // включить модальное окно modalOptions
        this.modalDialogInfo.removeClass('modal-window-hide');
        this.modalDialogInfo.addClass('modal-window-show');

        // Повесить новый текст
        var caption = this.modalDialogInfo.find('.windowDragCloseHeader-caption span').first();
        var header = this.modalDialogInfo.find('.modal-window-wrap .modal-header').first();
        var body_text = this.modalDialogInfo.find('.modal-window-wrap span').first();

        if (options.caption) caption.text(options.caption);
        if (options.header) header.text(options.header); else header.text('');
        if (options.body_text) body_text.text(options.body_text); else body_text.text('');

        // Повесить новый эвент
        var btn_ok = this.modalDialogInfo.find('#dialogInfoPageBtnOK');
        btn_ok.off('click');
        btn_ok.on('click', function(event) {
            self.modalDialogInfoHide();
            var cb_ok = options.callback_ok;
            if (typeof(cb_ok) === 'function')
                cb_ok(event);
        });
    };

    ModalWindow.prototype.modalDialogInfoHide = function(){
        // выключить фон
        this._modalBackHide();
        // выключить модальное окно Death
        this.modalDialogInfo.removeClass('modal-window-show');
        this.modalDialogInfo.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalDialogInfoLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalDialogInfo.load('/static/modal_window/dialogInfoPage.html', function(){});
    };


    ModalWindow.prototype.modalDialogAnswerShow = function (options) {
        // включить фон - ФОН не включается, так как при смерти можно двигать карту и смотреть за боем
        var self = this;
        this._modalBackShow();
        options = options || {};
        // включить модальное окно modalOptions
        this.modalAnswerInfo.removeClass('modal-window-hide');
        this.modalAnswerInfo.addClass('modal-window-show');

        // Повесить новый текст
        var caption = this.modalAnswerInfo.find('.windowDragCloseHeader-caption span').first();
        var header = this.modalAnswerInfo.find('.modal-window-wrap .modal-header').first();
        var body_text = this.modalAnswerInfo.find('.modal-window-wrap span').first();

        if (options.caption) caption.text(options.caption);
        if (options.header) header.text(options.header); else header.text('');
        if (options.body_text) body_text.text(options.body_text); else body_text.text('');

        // Повесить новый эвент
        var btn_ok = this.modalAnswerInfo.find('#dialogAnswerPageBtnOK');
        var btn_cancel = this.modalAnswerInfo.find('#dialogAnswerPageBtnCancel');
        btn_ok.off('click');
        btn_cancel.off('click');
        btn_ok.on('click', function(event) {
            self.modalDialogAnswerHide();
            var cb_ok = options.callback_ok;
            if (typeof(cb_ok) === 'function')
                cb_ok(event);
        });

        btn_cancel.on('click', function(event) {
            self.modalDialogAnswerHide();
            var cb_cancel = options.callback_cancel;
            if (typeof(cb_cancel) === 'function')
                cb_cancel(event);
        });
    };

    ModalWindow.prototype.modalDialogAnswerHide = function(){
        // выключить фон
        this._modalBackHide();
        // выключить модальное окно Death
        this.modalAnswerInfo.removeClass('modal-window-show');
        this.modalAnswerInfo.addClass('modal-window-hide');

    };

    ModalWindow.prototype.modalDialogAnswerLoad = function () {
        // Загрузить информацию из документа в див
        this.modalAnswerInfo.load('/static/modal_window/dialogAnswerPage.html', function(){});
    };


    ModalWindow.prototype.modalItemDivisionSetCount = function (count) {
        this.stop_division_event = true;
        if (count > this.division_max_count) count = this.division_max_count;
        if (count < 0) count = 0;
        this.division_count = count;

        this.modalItemDivision.find('#divisionItemCountSpan').text(count);
        this.modalItemDivision.find('#itemDivision-edit').val(count);

        var prc = this.division_max_count ? Math.round(count / this.division_max_count * 100) : 0;
        this.modalItemDivision.find('.division-item-progress').css('width', prc + '%');

        this.stop_division_event = false;
    };

    ModalWindow.prototype.modalItemDivisionShow = function (options) {
        var self = this;
        this._modalBackShow();
        options = options || {};

        this.modalItemDivision.removeClass('modal-window-hide');
        this.modalItemDivision.addClass('modal-window-show');

        if (options.max_count)
            this.division_max_count = options.max_count;
        else
            this.division_max_count = 0;
        this.modalItemDivision.find('#divisionItemTotalSpan').text(this.division_max_count);
        this.modalItemDivisionSetCount(0);

        var caption = this.modalItemDivision.find('.division-item-info-caption').first();
        var img = this.modalItemDivision.find('.division-item-info-image').first();

        if (options.item) {
            caption.text(options.item.title);
            img.css('background', 'transparent url(' + options.item.inv_icon_mid + ') no-repeat center');
        }
        else {
            caption.text('');
            img.css('background', 'none');
        }

        var btn_ok = this.modalItemDivision.find('#divisionItemBtnOK');
        btn_ok.off('click');
        btn_ok.on('click', function(event) {
            self.modalItemDivisionHide();
            var cb_ok = options.callback_ok;
            if ((typeof(cb_ok) === 'function') && self.division_count)
                cb_ok(self.division_count);
        });

        var btn_cancel = this.modalItemDivision.find('#divisionItemBtnCancel');
        btn_cancel.off('click');
        btn_cancel.on('click', function(event) {
            self.modalItemDivisionHide();
            var cb_cancel = options.callback_cancel;
            if (typeof(cb_cancel) === 'function')
                cb_cancel(event);
        });
    };

    ModalWindow.prototype.modalItemDivisionHide = function(){
        this._modalBackHide();
        this.modalItemDivision.removeClass('modal-window-show');
        this.modalItemDivision.addClass('modal-window-hide');
    };

    ModalWindow.prototype.modalItemDivisionLoad = function () {
        var self = this;
        this.modalItemDivision.load('/static/modal_window/itemDivision.html', function() {
            var btn_plus = self.modalItemDivision.find('#divisionItemBtnPlus');
            btn_plus.mousedown(function(event) {
                self.modalItemDivisionSetCount(self.division_count + 1);
                stopEvent(event);
            });
            btn_plus.mousemove(function(event) {
                if (!self.division_drag_start) stopEvent(event);
            });

            var btn_minus = self.modalItemDivision.find('#divisionItemBtnMinus');
            btn_minus.mousedown(function(event) {
                self.modalItemDivisionSetCount(self.division_count - 1);
                stopEvent(event);
            });
            btn_minus.mousemove(function(event) {
                if (!self.division_drag_start) stopEvent(event);
            });

            var progress_scale = self.modalItemDivision.find('.division-item-progress-wrap');
            progress_scale.mousedown(function(event) {
                var part = event.offsetX;
                var total = $(this).width();
                self.modalItemDivisionSetCount(Math.round(self.division_max_count * (part / total)));
            });
            progress_scale.mousemove(function(event) {
                if (event.buttons != 1) return;
                self.division_drag_start = true;
                var total = progress_scale.width();
                var part = event.pageX - progress_scale.offset().left;
                part = Math.min(Math.max(part, 0), total);
                self.modalItemDivisionSetCount(Math.round(self.division_max_count * (part / total)));
            });
            progress_scale.mouseleave(function(event) { self.division_drag_start = false; });
            progress_scale.mouseup(function(event) { self.division_drag_start = false; });

            self.modalItemDivision.find('#itemDivision-edit').change(function(event) {
                if (self.stop_division_event) return;
                var new_count = parseInt($(this).val());
                if (!new_count)
                    new_count = 0;
                self.modalItemDivisionSetCount(new_count);
            });
        });
    };

    return ModalWindow;
})();