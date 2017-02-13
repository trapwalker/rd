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
        this.modalItemActivation = $('#modalItemActivationPage');
        this.modalQuickGamePoints = $('#modalQuickGamePointsPage');
        this.modalQuickGameMapTeaching = $('#modalQuickGameMapTeachingPage');

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
        this.modalItemActivation.addClass('modal-window-hide');
        this.modalQuickGamePoints.addClass('modal-window-hide');
        this.modalQuickGameMapTeaching.addClass('modal-window-hide');

        // Загрузка содержимого модельных окон
        this.modalWelcomeLoad();
        this.modalOptionsLoad();
        this.modalDeathLoad();
        this.modalRestartLoad();
        this.modalDialogInfoLoad();
        this.modalDialogAnswerLoad();
        this.modalItemDivisionLoad();
        this.modalItemActivationLoad();
        this.modalQuickGamePointsPageLoad();
        this.modalQuickGameMapTeachingPageLoad();
    }

    ModalWindow.prototype._modalBackShow = function () {
        this.back.removeClass('modal-window-hide');
        this.back.addClass('modal-window-back-show');
    };

    ModalWindow.prototype._modalBackHide = function () {
        this.back.removeClass('modal-window-back-show');
        this.back.addClass('modal-window-hide');
    };

    ModalWindow.prototype.setupWindowAtScreenCenter = function (jq_window) {
        var win_height = jq_window.height();
        var win_width = jq_window.width();
        var screen_height = $(window).height();
        var screen_width = $(window).width();

        jq_window.css('top', screen_height / 2 - win_height / 2);
        jq_window.css('left', screen_width / 2 - win_width / 2);
    };

    ModalWindow.prototype.closeAllWindows = function() {
        this._modalBackHide();

        this.modalWelcome.removeClass('modal-window-welcome-show');
        this.modalWelcome.addClass('modal-window-hide');

        this.modalOptions.removeClass('modal-window-options-show');
        this.modalOptions.addClass('modal-window-hide');

        this.modalDeath.removeClass('modal-window-death-show');
        this.modalDeath.addClass('modal-window-hide');

        this.modalRestart.removeClass('modal-window-restart-show');
        this.modalRestart.addClass('modal-window-hide');

        this.modalDialogInfo.removeClass('modal-window-show');
        this.modalDialogInfo.addClass('modal-window-hide');

        this.modalAnswerInfo.removeClass('modal-window-show');
        this.modalAnswerInfo.addClass('modal-window-hide');

        this.modalItemDivision.removeClass('modal-window-show');
        this.modalItemDivision.addClass('modal-window-hide');

        this.modalItemActivation.removeClass('modal-window-show');
        this.modalItemActivation.addClass('modal-window-hide');

        this.modalQuickGamePoints.removeClass('modal-window-show');
        this.modalQuickGamePoints.addClass('modal-window-hide');

        this.modalQuickGameMapTeaching.removeClass('modal-window-show');
        this.modalQuickGameMapTeaching.addClass('modal-window-hide');

        returnFocusToMap();
    };

    ModalWindow.prototype.closeEscWindows = function() {
        //console.log('ModalWindow.prototype.closeEscWindows');
        if (this.modalItemDivision.hasClass('modal-window-show'))
            this.modalItemDivisionHide();

        //if (this.modalItemActivation.hasClass('modal-window-show'))
        //    this.modalItemActivationHide();
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
        returnFocusToMap();
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
        returnFocusToMap();
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
        returnFocusToMap();
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
        returnFocusToMap();
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
        returnFocusToMap();
    };

    ModalWindow.prototype.modalDialogInfoLoad = function () {
        // Загрузить информацию из документа в див
        var self = this;
        this.modalDialogInfo.load('/static/modal_window/dialogInfoPage.html', function(){});
        this.modalDialogInfo.keydown(function(event) {
            if (event.keyCode == 27) modalWindow.closeEscWindows();
        });
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
        returnFocusToMap();
    };

    ModalWindow.prototype.modalDialogAnswerLoad = function () {
        // Загрузить информацию из документа в див
        this.modalAnswerInfo.load('/static/modal_window/dialogAnswerPage.html', function(){});
        this.modalAnswerInfo.keydown(function(event) {
            if (event.keyCode == 27) modalWindow.closeEscWindows();
        });
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
        this.setupWindowAtScreenCenter(this.modalItemDivision);
        document.getElementById('itemDivision-edit').focus();        

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
        returnFocusToMap();
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
            self.modalItemDivision.draggable({
                handle: self.modalItemDivision.find('.windowDragCloseHeader-main').first(),
                containment: "parent"
            });
        });
        this.modalItemDivision.keydown(function(event) {
            if (event.keyCode == 27) modalWindow.closeEscWindows();
        });
    };


    ModalWindow.prototype.modalItemActivationShow = function (options) {
        var self = this;
        options = options || {};

        this.modalItemActivation.removeClass('modal-window-hide');
        this.modalItemActivation.addClass('modal-window-show');
        this.setupWindowAtScreenCenter(this.modalItemActivation);
        document.getElementById('modalItemActivationPage').focus();

        this.act_item_all = options.activate_time * 1000;
        this.act_item_start = clock.getClientTime();
        this.act_item_interval = setInterval(function() {
            var d_progress = Math.floor((clock.getClientTime() - self.act_item_start) * 100 / self.act_item_all);
            self.act_item_load_bar.css('width', d_progress + '%');
            self.act_item_load_text.text(d_progress + '% complete');
        }, 100);
        this.act_item_timeout = setTimeout(function() {
            if (self.act_item_interval) clearInterval(self.act_item_interval);
            self.act_item_load_bar.css('width', '0%');
            self.act_item_load_text.text('0% complete');
        }, this.act_item_all);
    };

    ModalWindow.prototype.modalItemActivationHide = function() {
        //console.log('ModalWindow.prototype.modalItemActivationHide');
        clearTimeout(this.act_item_timeout);
        clearInterval(this.act_item_interval);
        this.act_item_load_bar.css('width', '0');
        this.act_item_load_text.text('0% complete');
        this.modalItemActivation.removeClass('modal-window-show');
        this.modalItemActivation.addClass('modal-window-hide');
        returnFocusToMap();
    };

    ModalWindow.prototype.modalItemActivationLoad = function () {
        var self = this;
        this.modalItemActivation.load('/static/modal_window/itemActivation.html', function() {
            var btn_cancel = self.modalItemActivation.find('#activationItemBtnCancel');
            btn_cancel.on('click', function(event) { clientManager.sendCancelActivationItem(); });
            self.act_item_load_bar = self.modalItemActivation.find('.mw_ia_progress_bar_load').first();
            self.act_item_load_text = self.modalItemActivation.find('.mw_ia_progress_bar_text').first();
        });
        self.modalItemActivation.keydown(function(event) {
            if (event.keyCode == 27) clientManager.sendCancelActivationItem();
        });
    };


    ModalWindow.prototype.modalQuickGamePointsPageLoad = function () {
        // Загрузить информацию из документа в див
        this.modalQuickGamePoints.load('/static/modal_window/quickGamePointsPage.html', function(){});
        this.modalQuickGamePoints.draggable({
            cancel: '.qg-pp-graphic-wrap',
            containment: "parent"
        });
    };

    ModalWindow.prototype.modalQuickGamePointsPageShow = function (options) {
        var self = this;
        this._modalBackShow();
        options = options || {};
        // включить модальное окно modalOptions
        this.modalQuickGamePoints.removeClass('modal-window-hide');
        this.modalQuickGamePoints.addClass('modal-window-show');
        this.setupWindowAtScreenCenter(this.modalQuickGamePoints);

        // Вывод очков
        if (options.record_index >= 0)
            this.modalQuickGamePoints.find('#QuickGamePagePointPoints').html('Набрано: ' + options.points + '<br>Место: ' + options.record_index);
        else
            this.modalQuickGamePoints.find('#QuickGamePagePointPoints').html('Набрано: ' + options.points);

        // Вывод High Score
        var color_class = 'qg-pp-light-back';
        var quick_users = options.quick_users;
        var jq_table = this.modalQuickGamePoints.find('.qg-pp-block-left-table').first();
        jq_table.empty();
        for(var i = 0; i < quick_users.length; i++) {
            color_class = color_class == 'qg-pp-light-back' ? 'qg-pp-dark-back' : 'qg-pp-light-back';
            var qu = quick_users[i];
            var my_record_str = options.record_index == i + 1 ? "my-record" : "";
            var jq_line = $(
                '<div class="qg-pp-block-left-table-line ' + my_record_str + '">' +
                    '<div class="qg-pp-table-col place ' + color_class + '">' + (i + 1) + '</div>' +
                    '<div class="qg-pp-table-col name ' + color_class + '">' + qu.name + '</div>' +
                    '<div class="qg-pp-table-col score ' + color_class + '">' + qu.points + '</div>' +
                '</div>'
            );
            jq_table.append(jq_line);
        }

        // Запуск анимации для скроллинга к своему рекорду
        jq_table.scrollTop(0);
        if (options.record_index >= 0 && options.record_index <= quick_users.length) {
            jq_table.animate({
                scrollTop: $(".qg-pp-block-left-table-line.my-record").first().offset().top - 400
            }, 2000);
        }

        // Повесить новый эвент
        var btn_ok = this.modalQuickGamePoints.find('#quickGamePointsPageBtnOK');
        var btn_cancel = this.modalQuickGamePoints.find('#quickGamePointsPageBtnCancel');
        btn_ok.off('click');
        btn_cancel.off('click');
        btn_ok.on('click', function(event) {
            //self.modalDialogAnswerHide();
            var cb_ok = options.callback_ok;
            if (typeof(cb_ok) === 'function')
                cb_ok(event);
        });

        btn_cancel.on('click', function(event) {
            //self.modalDialogAnswerHide();
            var cb_cancel = options.callback_cancel;
            if (typeof(cb_cancel) === 'function')
                cb_cancel(event);
        });
    };

    ModalWindow.prototype.modalQuickGamePointsPageHide = function() {
        this._modalBackHide();
        this.modalQuickGamePoints.removeClass('modal-window-show');
        this.modalQuickGamePoints.addClass('modal-window-hide');
        returnFocusToMap();
    };


    ModalWindow.prototype.modalQuickGameMapTeachingPageLoad = function () {
        // Загрузить информацию из документа в див
        this.modalQuickGameMapTeaching.load('/static/modal_window/modalQuickGameMapTeachingPage.html', function(){});
        this.modalQuickGameMapTeaching.draggable({
            cancel: '.qg-mt-graphic-wrap',
            containment: "parent"
        });
    };

    ModalWindow.prototype.modalQuickGameMapTeachingPageShow = function (options) {
        var self = this;
        this._modalBackShow();
        options = options || {};
        // включить модальное окно modalOptions
        this.modalQuickGameMapTeaching.removeClass('modal-window-hide');
        this.modalQuickGameMapTeaching.addClass('modal-window-show');
        this.setupWindowAtScreenCenter(this.modalQuickGameMapTeaching);

        // Повесить новый эвент
        var btn_ok = this.modalQuickGameMapTeaching.find('#quickGameMapTeachingPageBtnOK');
        var btn_cancel = this.modalQuickGameMapTeaching.find('#quickGameMapTeachingPageBtnCancel');
        btn_ok.off('click');
        btn_cancel.off('click');
        btn_ok.on('click', function(event) {
            modalWindow.modalQuickGameMapTeachingPageHide();
            var cb_ok = options.callback_ok;
            if (typeof(cb_ok) === 'function')
                cb_ok(event);
        });

        btn_cancel.on('click', function(event) {
            modalWindow.modalQuickGameMapTeachingPageHide();
            var cb_cancel = options.callback_cancel;
            if (typeof(cb_cancel) === 'function')
                cb_cancel(event);
        });
    };

    ModalWindow.prototype.modalQuickGameMapTeachingPageHide = function() {
        this._modalBackHide();
        this.modalQuickGameMapTeaching.removeClass('modal-window-show');
        this.modalQuickGameMapTeaching.addClass('modal-window-hide');
        returnFocusToMap();
    };

    return ModalWindow;
})();