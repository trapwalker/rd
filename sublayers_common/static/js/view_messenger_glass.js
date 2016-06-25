var ViewMessengerGlass = (function () {

    function ViewMessengerGlass(options) {
        if (!this.options) this.options = {};
        setOptions({
            height: 400,
            width: 300,
            _visible: true,
            mesCountInChat: 50,
            stream_mes: null}, this.options);
        if (options) setOptions(options, this.options);

        this.chats = [];
        this.pages = [];
        this.log_index = 0;
        this.chat_visible = true;

        this.in_town = false;

        // вёрстка
        var mainParent = $('#chatAreaGlass');
        mainParent.append('<div id="VMGDivHardware"></div>');
        mainParent.append('<div id="VMGMainDivGlass"></div>');
        this.parentGlass = $('#VMGMainDivGlass');
        this.parentGlass.append('<div id="VMGDivWrapChat"></div>');
        this.chatWrapDiv = $('#VMGDivWrapChat');
        this.chatWrapDiv.append('<div id="VMGMainDivChat"></div>');
        this.parent = $('#VMGMainDivChat');
        var width = 480;
        var height = 310;

        // добавление верхнего дива PageControl
        this.parent.append('<div id="VMGPageControlArea"></div>');
        this.divPageControlArea = $('#VMGPageControlArea');

        // создание центральной динамической части
        this.parent.append("<div id='VMGDynamicAreaForBorder'></div>");
        var dynamicAreaForBorder = $('#VMGDynamicAreaForBorder');

        // создание центральной динамической части (в котором будут формировать под-вкладки)
        dynamicAreaForBorder.append("<div id='VMGDynamicArea'></div>");
        this.dynamicArea = $('#VMGDynamicArea');

        // добавление дива с элементами ввода сообщений
        dynamicAreaForBorder.append("<div id='VMGFooterArea'></div>");
        var foot_area = $('#VMGFooterArea');

        // добавление кнопки 'отправить соосбщение'
        foot_area.append("<div id='VMGEnterButtonDIV'><div id='VMGEnterButton' class='sublayers-clickable'> > </div></div>");
        this.send_btn = $('#VMGEnterButton');
        this.send_btn.on('click', this.sendMessage);

        // добавление дива с Input
        foot_area.append("<div id='VMGInputArea'></div>");
        var div_for_input = $('#VMGInputArea');

        // добавление Input
        div_for_input.append("<input id='VMGMainInput' type='text'>");
        this.main_input = $("#VMGMainInput");

        this.main_input.on('keydown', {self: this}, function (event) {
            if (event.keyCode == 13) {
                event.data.self.sendMessage();
            }
            if (event.keyCode == 38) { // стрелка вверх
                event.data.self.setNextHistoryMessage();
            }
            if (event.keyCode == 40) { // стрелка вниз
                event.data.self.setPrevHistoryMessage();
            }
        });

        // установка активного чата по умолчанию
        this.activeChat = null;
        this._activeChatID = null;

        // инициализация истории сообщений
        this._history = [];
        this._historyIndex = -1;

        // повесить хендлеры на разные эвенты
        var stream = this.options.stream_mes;

        stream.addInEvent({
            key: 'ws_message',
            cbFunc: 'receiveMessage',
            subject: this
        });
        stream.addOutEvent({
            key: 'ws_message_send',
            cbFunc: 'receiveMessageFromModelManager',
            subject: this
        });

        // кнопка сворачивания дива
        $('#VMGDivHardware').append('<div id="VMGPortHideBtn" class="hideBtnDownLeft"></div>');
        this.btn_hide =  $('#VMGPortHideBtn');
        this.btn_hide.on('click', {self: this}, this.btnHideReaction);

        // инициализация верхнего PageControl
        this.page_global = this.initGlobalPage(); // страница для глобальных комнат
        this.page_party = this.initPartyPage(); // страница для пати
        this.page_log = this.initLogPage(); // игровой лог
        this.page_sys = this.initSysPage(); // системный лог

        // портативная версия чата. Главный див.
        mainParent.append('<div id="VMGMainDivCompact"></div>');
        this.mainCompact = $('#VMGMainDivCompact');

        // зона для сообщений портативной версии
        this.mainCompact.append('<div id="VMGtextAreaCompact"></div>');
        this.textAreaCompact = $('#VMGtextAreaCompact');

        // поле ввода компактной версии
        var jq_cmpct_input_div = $(
            '<div class="VMGinputAreaCompact">' +
                '<input id="VMGMainInputCompact" type="text">' +
                '<div class="VMGMainBtnCompact">></div>' +
            '</div>'
        );
        this.mainCompact.append(jq_cmpct_input_div);
        jq_cmpct_input_div.find(".VMGMainBtnCompact").on('click', this.sendMessage);

        this.compact_input = jq_cmpct_input_div.find("#VMGMainInputCompact");
        this.compact_input.on('keydown', {self: this}, function (event) {
            if (event.keyCode == 13) {
                event.data.self.sendMessage();
            }
            if (event.keyCode == 38) { // стрелка вверх
                event.data.self.setNextHistoryMessage();
            }
            if (event.keyCode == 40) { // стрелка вниз
                event.data.self.setPrevHistoryMessage();
            }
        });

        // объект, содержащий какие именно сообщения отображать в компактной версии
        this.compactVisibleOptions = ['global', 'party', 'system']; // ещё может быть 'gamelog'
    }

    ViewMessengerGlass.prototype._getChatByJID = function (room_jid) {
        for (var i in this.chats)
            if ((this.chats[i]) && (this.chats[i].room_jid == room_jid))
                return this.chats[i];
        for (var i in this.pages)
            if ((this.pages[i].chat) && (this.pages[i].chat.room_jid == room_jid))
                return this.pages[i].chat;
        return null;
    };

    ViewMessengerGlass.prototype.addMessageToCompact = function(chat, aUser, aText, type){
        //console.log('ViewMessengerGlass.prototype.addMessageToCompact');
        if (chat != this.activeChat) return;
        var self = this;

        // если компактная версия скрыта, то ничего не делать
        if (this.chat_visible) return;
        if (this.compactVisibleOptions.indexOf(type) == -1) return;

        // создать див сообщения и спаны
        var mesDiv = $('<div class="VGM-message-compact"></div>');
        var spanUser = $('<span class="VMG-message-text-user">' + aUser.login + '</span>');
        var spanText = $('<span class="VMG-message-text-text">' + ': ' + aText + '</span>');

        // Добавить, предварительно скрыв
        mesDiv.hide();
        this.textAreaCompact.append(mesDiv);
        mesDiv.append(spanUser);
        mesDiv.append(spanText);

        // Показать сообщение, опустив скрол дива
        self.textAreaCompact.scrollTop(99999999);
        mesDiv.slideDown('fast',function() {self.textAreaCompact.scrollTop(99999999)});
    };

    ViewMessengerGlass.prototype.addMessageToInteraction = function(chat, aUser, aText, time){
        //console.log('ViewMessengerGlass.prototype.addMessageToInteraction', chat, aUser, aText, time);
        if (!locationManager.location_chat) return;
        var int_mngr = locationManager.location_chat.interaction_manager;
        if (chat.room_jid != int_mngr.room_jid) return;

        // создать див сообщения и спаны
        var tempTime = new Date(time).toLocaleTimeString();
        var mesDiv = $(
            '<div class="VMG-message-message">' +
                '<span class="VMG-message-text-time">' + '[' + tempTime + '] ' + '</span>' +
                '<span class="VMG-message-text-user sublayers-clickable">' + aUser.login + '</span>' +
                '<span class="VMG-message-text-text">' + ': ' + aText + '</span>' +
            '</div>'
        );

        // Добавить, предварительно скрыв
        mesDiv.hide();
        var jq_int_mngr = int_mngr.jq_main_div.find('.chat-interaction-private-chat').first();
        jq_int_mngr.append(mesDiv);
        mesDiv.slideDown('fast', function() {jq_int_mngr.scrollTop(99999999)});
    };

    ViewMessengerGlass.prototype._removeAllMessagesInChat = function(chat){
        for(;chat.mesList.length;){
            var dmessage = chat.mesList.pop();
            if (dmessage.spanUser)
                dmessage.spanUser.off('click', this.viewMessengerClickSpanUser);
            dmessage.mesDiv.remove();
        }
    };

    ViewMessengerGlass.prototype.addMessageToHistory = function(mes){
        // Сверить с нулевый элементом истории, если совпадает, то не добавлять. Иначе добавить
        if ( !(this._history.length > 0) || (!(mes === this._history[0]))) {
            // Добавить в хистори
            this._history.unshift(mes);
            // Очистить старые сообщения хистори
            if (this._history.length > this.options.mesCountInChat) {
                this._history.pop();
            }
        }
        // сбросить индекс в -1, так как было добавление
        this._historyIndex = -1;
    };

    ViewMessengerGlass.prototype.setMessagesHistory = function(mess){
        // Добавить все элементы истории (при чтении из куки) в чат, читать массив с конца
        for(;mess.length > 0;){
            var mes = mess.pop();
            this.addMessageToHistory(mes);
        }
    };

    // Установить в инпут сообщение из истории под заданным индексом
    // TODO: при установке сообщения переместить картеку в конец строки
    ViewMessengerGlass.prototype._setInputHistoryMessage = function () {
        if ((this._historyIndex >= 0) && (this._history.length > 0)) {
            chat.main_input.val(this._history[this._historyIndex]).focus();
            // Установка каретки в конец сообщения
            //var len = this._history[this._historyIndex].length;
            //alert(len);
            //chat.vMI[0].setSelectionRange(len,len);
            //  chat.vMI.each(function () {
            //      var len = $(this).val().length;
            //      this.setSelectionRange(len, len);
            //  });
        }
        else {
            chat.main_input.val('').focus();
        }
    };

    // Установить следующее сообщение в инпут, более старое
    ViewMessengerGlass.prototype.setNextHistoryMessage = function () {
        chat._historyIndex++;
        if (chat._historyIndex >= chat._history.length)  // Если это последнее сообщение
            chat._historyIndex = chat._history.length - 1;
        // Установить сообщение
        chat._setInputHistoryMessage();
    };

    // Установить предыдущее сообщение в инпут, более новое!!!
    ViewMessengerGlass.prototype.setPrevHistoryMessage = function () {
        chat._historyIndex--;
        if (chat._historyIndex < -1) {  //
            chat._historyIndex = -1;
        }
        // Установить сообщение
        chat._setInputHistoryMessage();
    };

    ViewMessengerGlass.prototype.clickForPageButton = function (event) {
        //console.log('ViewMessengerGlass.prototype.clickForPageButton');
        event.data.self.setActiveChat(event.data);
    };

    ViewMessengerGlass.prototype.viewMessengerClickSpanUser = function (event) {
        // подстветить все машинки данного пользователя
        /*
        var owner = event.data.owner;
        // TODO: Разобраться что делать с выделениями. Пока выделяется, если можно выделять

        if (cookieStorage.optionsSelectAnybody && owner.cars)
            for (var i = 0; i < owner.cars.length; i++) {
                if (listMapObject.exist(owner.cars[i].ID)) {
                    var car = listMapObject.objects[owner.cars[i].ID];
                    if (car.backLight)
                        carMarkerList.delFromBackLight(car);
                    else
                        carMarkerList.addToBackLight(car);
                }
            }
        */
    };

    // Добавление сообщений в окно чата
    ViewMessengerGlass.prototype.addMessageByJID = function (room_jid, aUser, aText, time) {
        // Найти чат для добавления в него сообщения
        var chat = this._getChatByJID(room_jid);
        if(! chat) {
            // todo: просто создать чат с таким именем и продолжить
            console.error('Попытка записать сообщение в несуществующий чат');
            return;
        }

        var type_for_compact = room_jid == this.page_party.chat.room_jid ? 'party' : 'global';
        this.addMessageToCompact(chat, aUser, aText, type_for_compact);
        this.addMessageToInteraction(chat, aUser, aText, time);
        var messageID = chat.mesCount++;
        // получить локальное время
        var tempTime = new Date(time).toLocaleTimeString();
        // создать див сообщения и спаны
        var mesDiv = $('<div id="mesdiv' + room_jid + messageID + '" class="VMG-message-message"></div>');
        var spanTime = $('<span class="VMG-message-text-time">' + '[' + tempTime + '] ' + '</span>');
        var spanUser = $('<span class="VMG-message-text-user sublayers-clickable">' + aUser.login + '</span>');
        var spanText = $('<span class="VMG-message-text-text">' + ': ' + aText + '</span>');
        // Добавить, предварительно скрыв
        mesDiv.hide();
        chat.chatArea.append(mesDiv);
        mesDiv.append(spanTime);
        mesDiv.append(spanUser);
        mesDiv.append(spanText);
        // Повесить клик на юзер спан, чтобы по клику можно было определять какой юзер сейчас выбран
        spanUser.on('click', {owner: aUser}, this.viewMessengerClickSpanUser);
        // Проверить, если своё сообщение, то добавить к спану класс совего сообщения
        if (aUser.login == user.login)
            mesDiv.addClass("my-user");
        if (aText.indexOf('@' + user.login) >= 0)
            mesDiv.addClass("for-my-user");
        if ((this.activeChat != chat) && (chat.pageButton))
            chat.pageButton.addClass('wait');
        // Показать сообщение, опустив скрол дива
        mesDiv.slideDown('fast',function() {chat.chatArea.scrollTop(99999999)});
        // Добавить mesDiv и spanUser в mesList для этого chat
        chat.mesList.push({
            mesDiv: mesDiv,
            spanUser: spanUser,
            user: aUser,
            text: aText,
            time: time
        });
        // Удалить старые сообщения, предварительно сняв с них всё
        if(chat.mesList.length > this.options.mesCountInChat) {
            var dmessage = chat.mesList.shift();
            dmessage.spanUser.off('click', this.viewMessengerClickSpanUser);
            dmessage.mesDiv.remove();
        }
    };

    // ======== Страницы

    // Кнопки страниц
    ViewMessengerGlass.prototype.onClickPageButton = function (event) {
        //console.log('ViewMessengerGlass.prototype.onClickPageButton', event);
        event.data.self.setActivePage(event.data.page);
    };

    // Сделать страницу активной
    ViewMessengerGlass.prototype.setActivePage = function (aPage){
        this.pages.forEach(function (page) {
            if (page == aPage) {
                aPage.pageArea.addClass('VMGChatOutAreaActive');
                aPage.pageButton.addClass('VMGpageButtonActive');
            }
            else {
                page.pageArea.removeClass('VMGChatOutAreaActive');
                page.pageButton.removeClass('VMGpageButtonActive');
            }
        });
        this.activeChat = aPage.chat;
    };

    // ======== Глобальные чаты

    // Создание вкладки глобальных чат-комнат
    ViewMessengerGlass.prototype._makeScrollPgCtrl = function (jq_block, d_scroll) {
        //console.log('ViewMessengerGlass.prototype._makeScrollPgCtrl', jq_block, d_scroll);
        var scroll_pos = jq_block.scrollLeft();
        jq_block.scrollLeft(scroll_pos + d_scroll);
    };

    ViewMessengerGlass.prototype.initGlobalPage = function (){
        var page = {
            pageArea: $('<div id="chatAreaGlobal" class="VMGChatOutArea"></div>'),
            pageControl: $(''),
            chatArea: $('<div id="textAreaGlobal" class="VMGPartytextOutArea"></div>'),
            pageButton: $('<div id="pageButtonGlobal" class="VMGpageButton sublayers-clickable">Radio</div>'),
            chat: null
        };

        var jq_pg_ctrl_block = $(
            '<div class="VMGGlobalPgCtrlBlock">' +
                '<div class="VMGGlobalPgCtrlScrlBtn Left" data-block_id="chatPageControlGlobalWrap"></div>' +
                '<div id="chatPageControlGlobalWrap" class="VMGGlobalPgCtrlWrap">' +
                    '<div id="chatPageControlGlobal" class="VMGGlobalPageControl"></div>' +
                '</div>' +
                '<div class="VMGGlobalPgCtrlScrlBtn Right" data-block_id="chatPageControlGlobalWrap"></div>' +
            '</div>'
        );

        this.dynamicArea.append(page.pageArea);
        page.pageArea.append(jq_pg_ctrl_block);
        page.pageArea.append(page.chatArea);
        this.divPageControlArea.append(page.pageButton);
        page.pageButton.on('click', {self: this, page: page}, this.onClickPageButton);
        page.pageControl = jq_pg_ctrl_block.find('#chatPageControlGlobal');
         // Активация скролов
        jq_pg_ctrl_block.find('.VMGGlobalPgCtrlScrlBtn').mousedown(function(event) {
            var jq_this = $(this);
            var scroll_block = $('#' + jq_this.data('block_id'));
            var d_scroll = 0;
            if (jq_this.hasClass('Left')) d_scroll = -10;
            if (jq_this.hasClass('Right')) d_scroll = 10;
            chat.pg_ctrl_scrl_interval = setInterval(chat._makeScrollPgCtrl, 50, scroll_block, d_scroll);
        });
        jq_pg_ctrl_block.find('.VMGGlobalPgCtrlScrlBtn').mouseup(function(event) {
            if (chat.pg_ctrl_scrl_interval)
                clearInterval(chat.pg_ctrl_scrl_interval);
        });
        this.pages.push(page);
        return page;
    };

    // Кнопки чатов
    ViewMessengerGlass.prototype.onClickChatButton = function (event) {
        //console.log('ViewMessengerGlass.prototype.onClickChatButton', event);
        event.data.self.setActiveChat(event.data.chat);
    };

    // Сделать чат-комнату активной
    ViewMessengerGlass.prototype.setActiveChat = function (aChat) {
        this.chats.forEach(function (chat) {
            if (aChat == chat) {
                aChat.pageButton.addClass('active');
                chat.pageButton.removeClass('wait');
                aChat.chatArea.addClass('VMGChatOutAreaActive');
            }
            else {
                chat.pageButton.removeClass('active');
                chat.chatArea.removeClass('VMGChatOutAreaActive');
            }
        });
        this.activeChat = aChat;
        this.page_global.chat = aChat;
    };

    ViewMessengerGlass.prototype._resizePageControl = function(jq_list) {
        //console.log('ViewMessengerGlass.prototype._resizePageControl');
        var width = 10;
        if (jq_list) {
            jq_list.children().each(function (index, element) {
                if ($(element).css('display') == 'block')
                    width += $(element).outerWidth(true);
            });
            jq_list.width(width);
        }
    };

    // Добавление произвольной чат-комнаты
    ViewMessengerGlass.prototype.addChat = function (room_jid, chat_type) {
        //console.log('ViewMessengerGlass.prototype.addChat');
        if (this._getChatByJID(room_jid)) {
            console.warn('Попытка повторного создания чат-комнаты.');
            return;
        }

        var pageButton = $('<div id="pageButton' + room_jid + '" class="VMGPartypageButton sublayers-clickable">' + room_jid + '</div>');

        if (chat_type === 'PrivateChatRoom') {
            //console.log('Генерация приватного чата');
            clientManager.sendGetPrivateChatMembers(room_jid);

            var close_str = 'clientManager.sendClosePrivateChat(\'' + room_jid + '\')';
            var pageButtonClose = $(
                '<div class="sublayers-clickable VMGPartypageButtonClose" onClick="' + close_str + '"></div>'
            );
            pageButton.append(pageButtonClose);
        }

        var chat = {
            room_jid: room_jid,
            chatArea: $('<div id="_charArea' + room_jid + '" class="VMGChatOutArea VMGChatAreaScroll"></div>'),
            pageButton: pageButton,
            mesList: [],
            mesCount: 0
        };

        this.page_global.chatArea.append(chat.chatArea);
        this.page_global.pageControl.append(chat.pageButton);
        this._resizePageControl(this.page_global.pageControl);

        chat.pageButton.on('click', {self: this, chat: chat}, this.onClickChatButton);
        this.chats.push(chat);

        // если добавили первый, то он автоматически становится активным
        if (this.chats.length == 1)
            this.setActiveChat(chat);
    };

    ViewMessengerGlass.prototype.addChatToInteraction = function (room_jid, members) {
        //console.log('ViewMessengerGlass.prototype.addChatToInteraction', room_jid, members);
        var chat = this._getChatByJID(room_jid);
        if (!chat) return;
        chat.members = members;
        if (!locationManager.location_chat) return;
        var int_mngr = locationManager.location_chat.interaction_manager;
        if (int_mngr.room_jid != '') return;
        if (members.indexOf(int_mngr.player_nick) < 0) return;
        this._setInteractionChat(room_jid);
    };

    ViewMessengerGlass.prototype.searchChatInteraction = function (player_nick) {
        for (var i = 0; i < this.chats.length; i++) {
            var chat = this.chats[i];
            if (chat.members && (chat.members.indexOf(player_nick) >= 0)) {
                this._setInteractionChat(chat.room_jid);
                return;
            }
        }
    };

    ViewMessengerGlass.prototype._setInteractionChat = function (room_jid) {
        //console.log('ViewMessengerGlass.prototype._setInteractionChat');
        var int_mngr = locationManager.location_chat.interaction_manager;
        int_mngr.room_jid = room_jid;
        var chat = this._getChatByJID(room_jid);
        for (var i = 0; i < chat.mesList.length; i++) {
            var msg = chat.mesList[i];
            if (msg.hasOwnProperty('user') && msg.hasOwnProperty('text') && msg.hasOwnProperty('time'))
                this.addMessageToInteraction(chat, msg.user, msg.text, msg.time)
        }
    };

    ViewMessengerGlass.prototype._setCompactChat = function () {
        this.textAreaCompact.empty();
        var chat = this.activeChat;
        for (var i = 0; i < chat.mesList.length; i++) {
            var msg = chat.mesList[i];
            if (msg.hasOwnProperty('user') && msg.hasOwnProperty('text') && msg.hasOwnProperty('time'))
                this.addMessageToCompact(chat, msg.user, msg.text, 'global')
        }
    };

    // Удаление произвольной чат-комнаты
    ViewMessengerGlass.prototype.removeChat = function (room_jid) {
        //console.log('ViewMessengerGlass.prototype.removeChat');
        // получить чат
        var chat = this._getChatByJID(room_jid);
        if (!chat) {
            console.warn('Попытка удалить несуществующую чат-комнату.');
            return;
        }

        this.removeChatFromInteraction(room_jid);

        // удалить все сообщения у чата
        this._removeAllMessagesInChat(chat);

        // удалить область сообщений
        chat.chatArea.remove();

        // отключить клик, удалить вкладку
        chat.pageButton.off('click', this.clickForPageButton);
        chat.pageButton.remove();
        this._resizePageControl(this.page_global.pageControl);

        // сделать сплайс по данному chat
        var index = 0;
        for (var i = 0; i < this.chats.length; i++)
            if (this.chats[i] == chat)
                index = i;
        this.chats.splice(index, 1);

        for (var i in this.pages)
            if ((this.pages[i].chat) && (this.pages[i].chat.room_jid == room_jid))
                this.pages[i].chat = null;

        // если нужно, установить активным другой чат
        if (this.activeChat == chat) {
            if (this.chats.length > 0)
                this.setActiveChat(this.chats[0]);
            else {
                this.activeChat = null;
                this.page_global.chat = null;
            }
        }
    };

    ViewMessengerGlass.prototype.removeChatFromInteraction = function (room_jid) {
        if (!locationManager.location_chat) return;
        var int_mngr = locationManager.location_chat.interaction_manager;
        if (int_mngr.room_jid != room_jid) return;
        int_mngr.room_jid = '';
        int_mngr.jq_main_div.find('.chat-interaction-private-chat').empty();
    };

    // ======== Отправка и получение сообщений

    ViewMessengerGlass.prototype.sendMessage = function() {
        //console.log('ViewMessengerGlass.prototype.sendMessage');

        var jq_input = (chat.chat_visible || chat.in_town) ? chat.main_input : chat.compact_input;

        var str = jq_input.val();
        if (str.length) {
            if (str[0] === '#' || str[0] === '\\' || str[0] === '/') {
                clientManager.sendConsoleCmd(str);
            }
            else {
                var active = chat.activeChat;
                if (active && (active.room_jid != null)) {
                    var mes = {
                        call: "chat_message",
                        rpc_call_id: rpcCallList.getID(),
                        params: {
                            room_name: active.room_jid,
                            msg: str
                        }
                    };
                    chat.options.stream_mes.sendMessage({
                        type: 'send_chat_message',
                        body: mes
                    });

                    rpcCallList.add(mes);

                    // добавление сообщения в историю
                    chat.addMessageToHistory(str);

                    // очистить поле ввода
                    jq_input.val('');
                }
                else
                    console.warn('Вы не можете отправить сообщение в неактивный чат');
            }
        }

        //фокус на поле ввода
        jq_input.focus();
    };

    ViewMessengerGlass.prototype.receiveMessage = function (params) {
        //console.log('ViewMessengerGlass.prototype.receiveMessage', params);
        if (params.message_type === "push") {
            var msg = params.events[0];
            if (msg.cls === "ChatRoomMessage")
                this.addMessageByJID(msg.room_name, {login: msg.sender}, msg.msg, msg.msg_time);
        }
        return true;
    };

    // ======== Работа с пати чатом

    // Создание вкладки пати (с кнопками и чат-комнатой пати)
    ViewMessengerGlass.prototype.initPartyPage = function (){
        var chat = {
            room_jid: null,
            chatArea: $('<div id="textAreaParty" class="VMGPartytextOutArea"></div>'),
            mesList: [],
            mesCount: 0
        };

        var page = {
            pageArea: $('<div id="chatAreaParty" class="VMGChatOutArea"></div>'),
            pageButton: $('<div id="pageButtonParty" class="VMGpageButton sublayers-clickable">Party</div>'),
            pageControl: $(),
            chat: chat,
            buttons: null
        };

        this.dynamicArea.append(page.pageArea);
        page.pageArea.append(chat.chatArea);
        this.divPageControlArea.append(page.pageButton);
        page.pageButton.on('click', {self: this, page: page}, this.onClickPageButton);

        this.pages.push(page);
        return page;
    };

    // Отображение в партийном чате прихода инвайта
    ViewMessengerGlass.prototype.party_info_message = function (msg) {
        //console.log('ViewMessengerGlass.prototype.party_invite_show', msg);
        // todo: добавить здесь интерактивный мессадж в пати-чат с информацией об инвайте в пати

        // формирование сообщения анализируя входные данные
        var aText = '';
        switch (msg.cls) {
            case 'AgentPartyChangeMessage':
                aText = msg.subj.login + (msg.subj.party != null ? ' присоединился к группе' : ' покинул группу');
                break;
            case 'PartyIncludeMessageForIncluded':
                aText = 'Вы включены в состав группы ' + msg.party.name;
                break;
            case 'PartyExcludeMessageForExcluded':
                aText = 'Вы исключены из состава группы ' + msg.party.name;
                break;
            case 'PartyKickMessageForKicked':
                aText = 'Вас выгнали из состава группы ' + msg.party.name;
                break;
            case 'PartyInviteMessage':
                if (user.login == msg.recipient.login) {
                    // значит инвайт для меня
                    aText = msg.sender.login + ' приглашает Вас вступить в группу ' + msg.party.name;
                } else {
                    // значит инвайт для кого-то другого
                    if (user.login == msg.sender.login) {
                        // значит я пригласил кого-то
                        aText ='Ваше приглашение отправлено для ' + msg.recipient.login;
                    }
                    else // просто кто-то кого-то пригласил
                        aText = msg.sender.login + ' приглашает ' + msg.recipient.login + ' вступить в группу ' + msg.party.name;
                }
                break;
            case 'PartyInviteDeleteMessage':
                if (user.login == msg.recipient.login) {
                    // значит инвайт для меня был кем-то отклонён, возможно даже мной
                    aText = 'Приглашание вступить в группу ' + msg.party.name + ' от ' + msg.sender.login + ' отклонено.';
                } else {
                    // значит инвайт для кого-то другого
                    if (user.login == msg.sender.login) {
                        // значит я пригласил кого-то, и как-то это приглашение было отклонено
                        aText ='Ваше приглашение для ' + msg.recipient.login + ' отклонено.';
                    }
                    else // просто кто-то кого-то пригласил
                        aText = 'Приглашение от ' + msg.sender.login + ' для ' + msg.recipient.login + ' отклонено.';
                }
                break;
            case 'PartyErrorMessage':
                aText = 'Ошибка: ' + msg.comment;
                break;
            default:
                aText = 'Неизвестная информация о пати! Попробуйте это повторить и расскажите нам.';
        }

        // Найти чат для добавления в него сообщения
        var chat = this.page_party.chat;
        if (!chat) {
            console.error('Пати чат не найден');
            return;
        }
        this.addMessageToCompact(chat, {login: 'SYSTEM'}, aText, 'party'); // оставлено специально GAMELOG
        var messageID = chat.mesCount++;
        // получить локальное время
        var tempTime = new Date().toLocaleTimeString();
        // создать див сообщения и спаны
        var mesDiv = $('<div id="mesdivpartyinfo' + messageID + '" class="VMG-message-message"></div>');
        var spanTime = $('<span class="VMG-message-text-time">' + '[' + tempTime + '] ' + '</span>');
        var spanText = $('<span class="VMG-message-text-text">' + ': ' + aText + '</span>');
        // Добавить, предварительно скрыв
        mesDiv.hide();
        chat.chatArea.append(mesDiv);
        mesDiv.append(spanTime);
        mesDiv.append(spanText);
        // Показать сообщение, опустив скрол дива
        mesDiv.slideDown('fast', function () {
            chat.chatArea.scrollTop(99999999)
        });
        // Добавить mesDiv и spanUser в mesList для этого chat
        chat.mesList.push({mesDiv: mesDiv});
        // Удалить старые сообщения
        if (chat.mesList.length > this.options.mesCountInChat) {
            var dmessage = chat.mesList.shift();
            dmessage.mesDiv.remove();
        }

    };

    // Активировать пати-чат (пользователь зашел в пати)
    ViewMessengerGlass.prototype.activateParty = function (room_jid) {
        //console.log('ViewMessengerGlass.prototype.activateParty', room_jid);
        var p_chat = this.page_party.chat;
        if (p_chat.room_jid == room_jid)
            return;
        if (p_chat.room_jid != null)
            console.warn('Попытка установить комнату в пати-чате, не закрыв предыдущую.');
        p_chat.room_jid = room_jid;
    };

    // Деактивировать пати-чат (пользователь покинул пати)
    ViewMessengerGlass.prototype.deactivateParty = function (room_jid) {
        //console.log('ViewMessengerGlass.prototype.deactivateParty');
        var p_chat = this.page_party.chat;
        if ((p_chat.room_jid == null) || (p_chat.room_jid != room_jid))
            console.warn('Попытка выйти из неактивной пати-чат команты.');
        p_chat.room_jid = null;
    };

    // ======== Механизм сворачивания/разворачивания окна чата

    ViewMessengerGlass.prototype.btnHideReaction = function(event) {
        var self = event.data.self;
        self.changeVisible(!self.chat_visible);
        document.getElementById('map').focus();
    };

    ViewMessengerGlass.prototype.setVisible = function (aVisible) {
        if (this.options._visible !== aVisible) {
            this.changeVisible({ data: {self: this}})
        }
    };

    ViewMessengerGlass.prototype.getVisible = function () {
        return this.options._visible;
    };

    ViewMessengerGlass.prototype.changeVisible = function(visible) {
        //console.log('WZoomSlider.prototype.changeVisible', visible);
        this.parentGlass.stop(true, true);
        this.mainCompact.stop(true, true);
        var self = this;
        if (visible != this.chat_visible) {
            this.chat_visible = visible;
            if (visible) { // нужно показать
                self.parentGlass.css({display: 'block'});
                this.parentGlass.animate({left: 0}, 1000, function () {
                    self.btn_hide.removeClass('hideBtnUpLeft');
                    self.btn_hide.addClass('hideBtnDownLeft');
                    self.parentGlass.css({display: 'block'});
                });
                // и нужно скрыть портативную версию
                self.mainCompact.animate({opacity: 0}, 300, function () {
                    self.mainCompact.css({display: 'none'});
                });
                chat.main_input.val(chat.compact_input.val());
            }
            else { // нужно скрыть
                this.parentGlass.animate({left: -555}, 1000, function () {
                    self.btn_hide.removeClass('hideBtnDownLeft');
                    self.btn_hide.addClass('hideBtnUpLeft');
                    self.parentGlass.css({display: 'none'});
                });
                // и нужно показать портативную версию
                self.mainCompact.css({display: 'block'});
                self.mainCompact.animate({opacity: 1}, 300);
                chat.compact_input.val(chat.main_input.val());
                chat._setCompactChat();
            }
        }
    };

    // ======== Добавление страницы логов

    ViewMessengerGlass.prototype.initLogPage = function (){
        var chat = {
            chatArea: $('<div id="textAreaLog" class="VMGStandarttextOutArea"></div>'),
            mesList: [],
            mesCount: 0
        };

        var page = {
            pageArea: $('<div id="chatAreaLog" class="VMGChatOutArea"></div>'),
            pageButton: $('<div id="pageButtonLog" class="VMGpageButton sublayers-clickable">GameLog</div>'),
            chat: null,
            log_chat: chat
        };

        this.dynamicArea.append(page.pageArea);
        page.pageArea.append(chat.chatArea);
        this.divPageControlArea.append(page.pageButton);

        page.pageButton.on('click', {self: this, page: page}, this.onClickPageButton);

        this.pages.push(page);
        return page;
    };

    // вывод входящих ws-сообщений в лог
    ViewMessengerGlass.prototype.receiveMessageFromWS = function (msg) {
        //console.log('ViewMessengerGlass.prototype.receiveMessageFromWS', msg);
        if (msg.message_type == "push") {
            this.addMessageToLog('new push: ' + msg.events[0].cls);
        }
        return true;
    };

    // вывод исходящих через ws сообщений
    ViewMessengerGlass.prototype.receiveMessageFromModelManager = function (msg) {
        //console.log('ViewMessengerGlass.prototype.receiveMessageFromModelManager');
        if (cookieStorage.enableLogRPCMessage())
            this.addMessageToLog(JSON.stringify(msg, null, 4));
        return true;
    };

    ViewMessengerGlass.prototype.addMessageToLog = function (aText) {
        // Найти чат для добавления в него сообщения
        var chat = this.page_log.log_chat;
        if(! chat) {
            console.error('Чат для логирования не найден');
            return;
        }
        this.addMessageToCompact(chat, {login: 'GAMELOG'}, aText, 'gamelog');
        var messageID = chat.mesCount++;
        // получить локальное время
        var tempTime = new Date().toLocaleTimeString();
        // создать див сообщения и спаны
        var mesDiv = $('<div id="mesdivlog' + messageID + '" class="VMG-message-message"></div>');
        var spanTime = $('<span class="VMG-message-text-time">' + '[' + tempTime + '] ' + '</span>');
        var spanText = $('<span class="VMG-message-text-text">' + ': ' + aText + '</span>');
        // Добавить, предварительно скрыв
        mesDiv.hide();
        chat.chatArea.append(mesDiv);
        mesDiv.append(spanTime);
        mesDiv.append(spanText);
        // Показать сообщение, опустив скрол дива
        mesDiv.slideDown('fast',function() {chat.chatArea.scrollTop(99999999)});
        // Добавить mesDiv и spanUser в mesList для этого chat
        chat.mesList.push({mesDiv: mesDiv});
        // Удалить старые сообщения
        if(chat.mesList.length > this.options.mesCountInChat){
            var dmessage = chat.mesList.shift();
            dmessage.mesDiv.remove();
        }
    };

    // ======== Добавление системной страницы (System)

    ViewMessengerGlass.prototype.initSysPage = function (){
        var chat = {
            chatArea: $('<div id="textAreaSys" class="VMGStandarttextOutArea"></div>'),
            mesList: [],
            mesCount: 0
        };

        var page = {
            pageArea: $('<div id="chatAreaSys" class="VMGChatOutArea"></div>'),
            pageButton: $('<div id="pageButtonSys" class="VMGpageButton sublayers-clickable">System</div>'),
            chat: null,
            log_chat: chat
        };

        this.dynamicArea.append(page.pageArea);
        page.pageArea.append(chat.chatArea);
        this.divPageControlArea.append(page.pageButton);

        page.pageButton.on('click', {self: this, page: page}, this.onClickPageButton);

        this.pages.push(page);
        return page;
    };

    ViewMessengerGlass.prototype.addMessageToSys = function (aText) {
        // Найти чат для добавления в него сообщения
        var chat = this.page_sys.log_chat;
        if(! chat) {
            console.error('Чат для логирования не найден');
            return;
        }
        this.addMessageToCompact(chat, {login: 'SYSTEM'}, aText, 'system');
        var messageID = chat.mesCount++;
        // получить локальное время
        var tempTime = new Date().toLocaleTimeString();
        // создать див сообщения и спаны
        var mesDiv = $('<div id="mesdivlog' + messageID + '" class="VMG-message-message"></div>');
        var spanTime = $('<span class="VMG-message-text-time">' + '[' + tempTime + '] ' + '</span>');
        var spanText = $('<span class="VMG-message-text-text">' + ': ' + aText + '</span>');
        // Добавить, предварительно скрыв
        mesDiv.hide();
        chat.chatArea.append(mesDiv);
        mesDiv.append(spanTime);
        mesDiv.append(spanText);
        // Показать сообщение, опустив скрол дива
        mesDiv.slideDown('fast',function() {chat.chatArea.scrollTop(99999999)});
        // Добавить mesDiv и spanUser в mesList для этого chat
        chat.mesList.push({mesDiv: mesDiv});
        // Удалить старые сообщения
        if(chat.mesList.length > this.options.mesCountInChat){
            var dmessage = chat.mesList.shift();
            dmessage.mesDiv.remove();
        }
    };

    // ======== Отображение чата в других местах

    ViewMessengerGlass.prototype.showChatInTown = function(jq_town_chat_div){
        jq_town_chat_div.append(this.parent);
        $('#VMGDynamicAreaForBorder').css('border-width', '0px');
        this.in_town = true;
    };

    ViewMessengerGlass.prototype.showChatInMap = function(){
        this.chatWrapDiv.append(this.parent);
        $('#VMGDynamicAreaForBorder').css('border-width', '1px');
        $('#VGM-PlayerInfoDivInCity').remove();
        this.in_town = false;
    };

    return ViewMessengerGlass;
})();
