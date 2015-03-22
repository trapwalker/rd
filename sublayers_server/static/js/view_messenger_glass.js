var ViewMessengerGlass = (function () {

    function ViewMessengerGlass(options) {
        if (!this.options) this.options = {};
        setOptions({
            height: 400,
            width: 300,
            _visible: true,
            mesCountInChat: 30,
            stream_mes: null}, this.options);
        if (options) setOptions(options, this.options);


        this.chats = [];
        this.log_index = 0;
        this.chat_visible = true;


        //  Вёрстка !
        var mainParent = $('#chatAreaGlass');
        mainParent.append('<div id="VMGDivHardware"></div>');
        mainParent.append('<div id="VMGMainDivGlass"></div>');
        this.parentGlass = $('#VMGMainDivGlass');
        this.parentGlass.append('<div id="VMGMainDivChat"></div>');
        var parent = $('#VMGMainDivChat');
        this.parent = parent;
        var width = 480;
        var height = 310;


        //добавление верхнего дива PageControl
        parent.append('<div id="VMGPageControlArea"></div>');
        this.divPageControlArea = $('#VMGPageControlArea');


        //создание центральной динамической части
        parent.append("<div id='VMGDynamicAreaForBorder'></div>");
        var dynamicAreaForBorder = $('#VMGDynamicAreaForBorder');

        //создание центральной динамической части
        dynamicAreaForBorder.append("<div id='VMGDynamicArea'></div>");
        this.dynamicArea = $('#VMGDynamicArea');


        //добавление дива с элементами ввода сообщений
        dynamicAreaForBorder.append("<div id='VMGFooterArea'></div>");
        var foot_area = $('#VMGFooterArea');

        //добавление кнопки 'отправить соосбщение'
        foot_area.append("<div id='VMGEnterButtonDIV'><div id='VMGEnterButton' class='sublayers-clickable'> > </div></div>");
        this.send_btn = $('#VMGEnterButton');
        this.send_btn.on('click', this.viewMessengerSendMessage);



        //добавление дива с Input
        foot_area.append("<div id='VMGInputArea'></div>");
        var div_for_input = $('#VMGInputArea');


        //добавление Input
        div_for_input.append("<input id='VMGMainInput' type='text'>");
        this.main_input = $("#VMGMainInput");


        this.main_input.on('keydown', {self: this}, function (event) {
            if (event.keyCode == 13) {
                event.data.self.viewMessengerSendMessage();
            }
            if (event.keyCode == 38) { // стрелка вверх
                event.data.self.setNextHistoryMessage();
            }
            if (event.keyCode == 40) { // стрелка вниз
                event.data.self.setPrevHistoryMessage();
            }
        });



        //добавление дива в котором будут формировать вкладки
        this.dynamicArea.append("<div id='VMGTextArea'></div>");
        this.vmg_text_area = $('#VMGTextArea');

        // Установка активного чата по умолчанию
        this._activeChatID = null;
        // Инициализация истории сообщений
        this._history = [];
        this._historyIndex = -1;


        // повесить хендлеры на разные эвенты
        var stream = this.options.stream_mes;

        stream.addInEvent({
            key: 'message',
            cbFunc: 'receiveMessage',
            subject: this
        });

        stream.addInEvent({
            key: 'ws_message',
            cbFunc: 'receiveMessageFromWS',
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


        // Создание чатов. Сразу все 4 чата
        this.addChat(-1, 'global', true); // глобальный чат
        this.addPartyChat(-2, 'party', false); // глобальный чат
        this.addChat(-3, 'gamelog', false); // игровой лог
        this.addChat(-4, 'systemlog', false); // системный лог


        // портативная версия чата. Главный див.
        mainParent.append('<div id="VGMMainDivCompact"></div>');
        this.mainCompact = $('#VGMMainDivCompact');

        // зона для сообщений портативной версии

        this.mainCompact.append('<div id="VGMtextAreaCompact"></div>');
        this.textAreaCompact = $('#VGMtextAreaCompact');

        this.compactVisibleOptions = null; // Объект, содержащий какие именно сообщения отображать в компактной версии

    }


    ViewMessengerGlass.prototype.showChatWindow = function () {
        this.showWindow();
        // todo: придумать как учесть размеры границ (box-sizing)
        this.setNewSize(this.vMA.height() + 4, this.vMA.width() + 4);
    };


    ViewMessengerGlass.prototype.setVisible = function (aVisible) {
        if (this.options._visible !== aVisible) {
            this.changeVisible({ data: {self: this}})
        }
    };


    ViewMessengerGlass.prototype.getVisible = function () {
        return this.options._visible;
    };


    ViewMessengerGlass.prototype.addChat = function (aID, aName, setAct){
        var chat = {
            id: aID,
            name: aName,
            chatArea: $('<div id="_charArea' + aID + '" class="VMGChatOutArea"></div>'),
            textArea: $('<div id="textArea' + aID + '" class="VMGtextOutArea"></div>'),
            pageButton: $('<div id="pageButton' + aID + '" class="VMGpageButton sublayers-clickable">' + aName + '</div>'),
            mesList: [],
            mesCount: 0
        };

        this.vmg_text_area.append(chat.chatArea);
        chat.chatArea.append(chat.textArea);
        this.divPageControlArea.append(chat.pageButton);

        chat.pageButton.on('click', {self: this, id: chat.id}, this.clickForPageButton);

        this.chats.push(chat);
        if (setAct)
            this.setActiveChat(chat.id);
        return chat;
    };


    ViewMessengerGlass.prototype.addPartyChat = function (aID, aName, setAct){
        var chat = {
            id: aID,
            name: aName,
            chatArea: $('<div id="_charArea' + aID + '" class="VMGChatOutArea"></div>'),
            pageControl: $('<div id="_charPageControl' + aID + '" class="VMGPartyPageControl"></div>'),
            textArea: $('<div id="textArea' + aID + '" class="VMGPartytextOutArea"></div>'),
            pageButton: $('<div id="pageButton' + aID + '" class="VMGpageButton sublayers-clickable">' + aName + '</div>'),
            mesList: [],
            mesCount: 0,
            partyBtns: null
        };

        this.vmg_text_area.append(chat.chatArea);
        chat.chatArea.append(chat.pageControl);
        chat.chatArea.append(chat.textArea);
        this.divPageControlArea.append(chat.pageButton);

        chat.pageButton.on('click', {self: this, id: chat.id}, this.clickForPageButton);

        // добавление кнопок для работы с пати
        chat.pageControl.append('<div id="VMGPartyCntrlInvite' + aID + '" class="VMGPartypageButton sublayers-clickable">' + 'invite' + '</div>');
        chat.pageControl.append('<div id="VMGPartyCntrlCreate' + aID + '" class="VMGPartypageButton sublayers-clickable">' + 'create' + '</div>');
        chat.pageControl.append('<div id="VMGPartyCntrlKick' + aID + '" class="VMGPartypageButton sublayers-clickable">' + 'kick' + '</div>');
        chat.pageControl.append('<div id="VMGPartyCntrlLeave' + aID + '" class="VMGPartypageButton sublayers-clickable">' + 'leave' + '</div>');

        chat.partyButtons = {
            invite: $('#VMGPartyCntrlInvite' + aID),
            create: $('#VMGPartyCntrlCreate' + aID),
            kick: $('#VMGPartyCntrlKick' + aID),
            leave: $('#VMGPartyCntrlLeave' + aID)
        };

        // Вешаем евенты для работы с пати
        // todo: эвенты не должны быть здесь!
        chat.partyButtons.invite.on('click', {self: this, id: chat.id}, this.party_invite);
        chat.partyButtons.create.on('click', {self: this, id: chat.id}, this.party_create);
        chat.partyButtons.kick.on('click', {self: this, id: chat.id}, this.party_kick);
        chat.partyButtons.leave.on('click', {self: this, id: chat.id}, this.party_leave);

        this.chats.push(chat);
        if (setAct)
            this.setActiveChat(chat.id);
        return chat;
    };


    ViewMessengerGlass.prototype.removeChat = function(chatID){
        // Если этот чат активный, то сделать активным нулевой
        var setNewActive = (this._activeChatID == chatID);
        // получить чат
        var chat = this._getChat(chatID);
        if(! chat) return;
        // удалить все сообщения у чата
        this._removeAllMessagesInChat(chat);
        // удалить область сообщений
        chat.textArea.remove();
        chat.chatArea.remove();
        // todo: если пати-чат, то правильно снять эвенты на кнопки управления чатом

        // отключить клик, удалить вкладку
        chat.pageButton.off('click', this.clickForPageButton);
        chat.pageButton.remove();
        // Сделать сплайс по данному chat.id
        var index = 0;
        for(var i=0; i < this.chats.length; i++){
            if(this.chats[i].id == chat.id)
                index = i;
        }
        this.chats.splice(index, 1);
        if (setNewActive) {
            if (this.chats.length > 0)
                this.setActiveChat(this.chats[0].id);
            else
                this._activeChatID = null
        }
    };

    ViewMessengerGlass.prototype.setActiveChat = function(aID){
        // если чата с таким aID не существует, то ничего не делать
        if (this._getChat(aID)) {
            this.chats.forEach(function (chat) {
                    if (chat.id == this.id) {
                        chat.textArea.addClass('VMGtextOutAreaActive');
                        chat.pageButton.addClass('VMGpageButtonActive');
                        chat.chatArea.addClass('VMGChatOutAreaActive');
                        //this.self.vMHTS.text('[' + chat.name + ']');
                    }
                    else {
                        chat.textArea.removeClass('VMGtextOutAreaActive');
                        chat.pageButton.removeClass('VMGpageButtonActive');
                        chat.chatArea.removeClass('VMGChatOutAreaActive');
                    }
                },
                {self: this, id: aID});

            this._activeChatID = aID;
        }
    };

    ViewMessengerGlass.prototype.getActiveChat = function() {
        return this._getChat(this._activeChatID);
    };

    ViewMessengerGlass.prototype._getChat = function (chatID) {
        for (var i in this.chats) {
            if (this.chats[i])
                if (this.chats[i].id == chatID)
                    return this.chats[i];
        }
        return null;
    };

    ViewMessengerGlass.prototype._getChatByName = function (chatName) {
        for (var i in this.chats) {
            if (this.chats[i])
                if (this.chats[i].name === chatName)
                    return this.chats[i];
        }
        return null;
    };

    ViewMessengerGlass.prototype.addMessageToCompact = function(chatID, chatName, aUser, aText){
        var self = this;
        // если компактная версия скрыта, то ничего не делать
        if(this.chat_visible) return;
        // todo: здесь проверка по опциям - какие из сообщений выводить (использовать chatID)

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

        mesDiv.animate({opacity: 0}, 3000, function(){
            this.remove();
        })


    };


    ViewMessengerGlass.prototype.addMessage = function (chatID, chatName, aUser, aText) {
        // Найти чат для добавления в него сообщения
        var chat = this._getChat(chatID);

        if(! chat) //chat = this.addChat(chatID, chatName, false);
            console.error('Попытка записать сообщение в несуществующий чат');

        this.addMessageToCompact(chatID, chatName, aUser, aText);

        var messageID = chat.mesCount++;
        // получить локальное время
        var tempTime = new Date().toLocaleTimeString();
        // создать див сообщения и спаны
        var mesDiv = $('<div id="' + chat.name + chatID + messageID + '" class="VMG-message-message"></div>');
        var spanTime = $('<span class="VMG-message-text-time">' + '[' + tempTime + '] ' + '</span>');
        var spanUser = $('<span class="VMG-message-text-user sublayers-clickable">' + aUser.login + '</span>');
        var spanText = $('<span class="VMG-message-text-text">' + ': ' + aText + '</span>');
        // Добавить, предварительно скрыв
        mesDiv.hide();
        chat.textArea.append(mesDiv);
        mesDiv.append(spanTime);
        mesDiv.append(spanUser);
        mesDiv.append(spanText);
        // Повесить клик на юзер спан, чтобы по клику можно было определять какой юзер сейчас выбран
        spanUser.on('click', {owner: aUser}, this.viewMessengerClickSpanUser);
        // Проверить, если своё сообщение, то добавить к спану класс совего сообщения
        if(aUser.login == user.login)
            spanUser.addClass("VMG-message-text-my-user");
        // Показать сообщение, опустив скрол дива
        mesDiv.slideDown('fast',function() {chat.textArea.scrollTop(99999999)});
        // Добавить mesDiv и spanUser в mesList для этого chat
        chat.mesList.push({mesDiv: mesDiv, spanUser: spanUser});
        // Удалить старые сообщения, предварительно сняв с них всё
        if(chat.mesList.length > this.options.mesCountInChat){
            var dmessage = chat.mesList.shift();
            dmessage.spanUser.off('click', this.viewMessengerClickSpanUser);
            dmessage.mesDiv.remove();
        }

    };


    ViewMessengerGlass.prototype._removeAllMessagesInChat = function(chat){
        for(;chat.mesList.length;){
            var dmessage = chat.mesList.pop();
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


    ViewMessengerGlass.prototype.viewMessengerSendMessage = function() {
        //console.log('ViewMessengerGlass.prototype.viewMessengerSendMessage');

        var str = chat.main_input.val();
        if (str.length) {
            if (str[0] === '#' || str[0] === '\\' || str[0] === '/') {
                sendServConsole(str);
            }
            else {
                var active = chat.getActiveChat();
                if (active)
                    chat.options.stream_mes.sendMessage(
                        {
                            type: 'send_chat_message',
                            body: {
                                to: chat.getActiveChat().id,
                                body: str
                            }
                        }
                    );
                else
                    sendServConsole(str); // попробовать отправить команду на сервер

            }
            chat.main_input.val('').focus();
            // Добавление сообщения в историю
            chat.addMessageToHistory(str);
        } else {
            chat.main_input.focus()
        }

    };


    ViewMessengerGlass.prototype.clickForPageButton = function (event) {
        //console.log('ViewMessengerGlass.prototype.clickForPageButton');
        event.data.self.setActiveChat(event.data.id);
    };


    ViewMessengerGlass.prototype.viewMessengerClickSpanUser = function (event) {
        // подстветить все машинки данного пользователя
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
    };


    ViewMessengerGlass.prototype.receiveMessage = function (params) {
        this.addMessage(params.chatID, params.chatName, params.user, params.text);
        return true;
    };


    // вывод входящих ws-сообщений в лог
    ViewMessengerGlass.prototype.receiveMessageFromWS = function(msg){
        //console.log('ViewMessengerGlass.prototype.receiveMessageFromWS', msg);
        /*
        if (msg.message_type == "push") {
            //if (cookieStorage.enableLogPushMessage())
            this._addMessageToLog('new push form server! SEE this!!!', 'push');
                //this._addMessageToLog(JSON.stringify(msg, null, 4), 'push');
        }
        if (msg.message_type == "answer")
            this._addMessageToLog('new answer form server!', 'answer');
            //if (cookieStorage.enableLogAnswerMessage())
                //this._addMessageToLog(JSON.stringify(msg, null, 4), 'answer');
                */
        if(msg.events) {
            var event = msg.events[0];
            if (event.cls === 'Chat')
                this.addMessage(-1, '', event.author, event.text);
        }

        return true;
    };

    // вывод исходящих через ws сообщений
    ViewMessengerGlass.prototype.receiveMessageFromModelManager = function(msg){
        //alert('ViewMessenger receiveMessageFromModelManager');
       // if(cookieStorage.enableLogRPCMessage())
       //     this._addMessageToLog(JSON.stringify(msg, null, 4), 'rpc');
       // this._addMessageToLog('отправка сообщения на сервер ', 'rpc');
        return true;
    };

    ViewMessengerGlass.prototype._addMessageToLog = function(mes, name){
        // alert('ViewMessenger    addMessageToLog');
        this.log_index++;
        if(name == 'push')
            this.addMessage(-4, '', {login: name + ' #' + this.log_index},  mes );
        if(name == 'answer')
            this.addMessage(-1, '', {login: name + ' #' + this.log_index},  mes );
        if(name == 'rpc')
            this.addMessage(-3, '', {login: name + ' #' + this.log_index},  mes );
        //this.addMessage(-4, '', {login: name + ' #' + this.log_index},  mes );
        //this.addMessage(-1, '', {login: name + ' #' + this.log_index},  '<pre>' + mes + '</pre>');
        this.addMessage(-2, '', {login: name + ' #' + this.log_index},  mes );
    };


    ViewMessengerGlass.prototype.party_invite = function (event) {
        //alert('Окно приглашения в пати');
        var temp_str = chat.main_input.val();
        chat.main_input.val('/invite ' + temp_str).focus();
    };

    ViewMessengerGlass.prototype.party_create = function (event) {
        //alert('Окно создания пати');
        /*
        var temp_str = chat.main_input.val();
        chat.main_input.val('/create ' + temp_str).focus();
        */

        clientManager.sendOpenWindowCreateParty();
    };

    ViewMessengerGlass.prototype.party_kick = function (event) {
        //alert('Окно выбора участника(ов) пати для кика');
        var temp_str = chat.main_input.val();
        chat.main_input.val('/kick ' + temp_str).focus();

    };

    ViewMessengerGlass.prototype.party_leave = function (event) {
        //alert('Окно для подтверждения выхода из пати');
        sendServConsole('/leave');
        chat.main_input.focus();
    };

    // отображение в партийном чате прихода инвайта
    ViewMessengerGlass.prototype.party_invite_show = function (event) {
        //console.log('ViewMessengerGlass.prototype.party_invite_show');
       // ViewMessengerGlass.prototype.addMessage = function (chatID, chatName, aUser, aText) {
            // Найти чат для добавления в него сообщения
            var chat = this._getChat(-2);

            if(! chat) //chat = this.addChat(chatID, chatName, false);
                console.error('Попытка записать сообщение в несуществующий чат');

            this.addMessageToCompact(chatID, chatName, aUser, aText);

            var messageID = chat.mesCount++;
            // получить локальное время
            var tempTime = new Date().toLocaleTimeString();
            // создать див сообщения и спаны
            var mesDiv = $('<div id="' + chat.name + chatID + messageID + '" class="VMG-message-message"></div>');
            var spanTime = $('<span class="VMG-message-text-time">' + '[' + tempTime + '] ' + '</span>');
            var spanUser = $('<span class="VMG-message-text-user sublayers-clickable">' + aUser.login + '</span>');
            var spanText = $('<span class="VMG-message-text-text">' + ': ' + aText + '</span>');
            // Добавить, предварительно скрыв
            mesDiv.hide();
            chat.textArea.append(mesDiv);
            mesDiv.append(spanTime);
            mesDiv.append(spanUser);
            mesDiv.append(spanText);
            // Повесить клик на юзер спан, чтобы по клику можно было определять какой юзер сейчас выбран
            spanUser.on('click', {owner: aUser}, this.viewMessengerClickSpanUser);
            // Проверить, если своё сообщение, то добавить к спану класс совего сообщения
            if(aUser.login == user.login)
                spanUser.addClass("VMG-message-text-my-user");
            // Показать сообщение, опустив скрол дива
            mesDiv.slideDown('fast',function() {chat.textArea.scrollTop(99999999)});
            // Добавить mesDiv и spanUser в mesList для этого chat
            chat.mesList.push({mesDiv: mesDiv, spanUser: spanUser});
            // Удалить старые сообщения, предварительно сняв с них всё
            if(chat.mesList.length > this.options.mesCountInChat){
                var dmessage = chat.mesList.shift();
                dmessage.spanUser.off('click', this.viewMessengerClickSpanUser);
                dmessage.mesDiv.remove();
            }

    };


    ViewMessengerGlass.prototype.btnHideReaction = function(event) {
        var self = event.data.self;
        self.changeVisible(!self.chat_visible);
        document.getElementById('map').focus();
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
            }
        }
    };


    return ViewMessengerGlass;
})();
