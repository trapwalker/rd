var ViewMessenger = (function (_super) {
    __extends(ViewMessenger, _super);

    function ViewMessenger(options) {
        if (!this.options) this.options = {};
        setOptions({
            parentDiv: '',
            height: 400,
            width: 300,
            _visible: true,
            mesCountInChat: 30,
            stream_mes: null}, this.options);
        if (options) setOptions(options, this.options);

        // Запихиваем чат в отдельное окно
        _super.call(this, {
            name: 'ChatWindow',
            parentDiv: this.options.parentDiv
        });

        this.chats = [];
        this.log_index = 0;

        //добавление основного дива
        this.vMA = $("<div id='viewMessengerArea' class='sublayers-unclickable'></div>");
        this.vMA.css({width: this.options.width});
        //$("#" + this.options.parentDiv).append(this.vMA);
        this.mainDiv.append(this.vMA);

        //добавление верхнего дива с заголовком и кнопками
        this.vMHA = $("<div id='viewMessengerHeaderArea'></div>");
        this.vMA.append(this.vMHA);

        //добавление дива с кнопкой Свернуть/Развернуть
        this.vMSB = $("<div id='viewMessengerSlideButton' class='viewMessengerSlideButtonShowed sublayers-clickable'></div>");
        this.vMHA.append(this.vMSB);
        this.vMSB.on('click', {self: this}, this.changeVisible);

        //добавление заголовка
        this.vMTA = $("<div id='viewMessengerTitleArea'><span class='messenger-text'>NUKE Messenger </span></div>");
        this.vMTA.css({width: this.options.width - parseInt(this.vMSB.css('width')) -
                                                   parseInt(this.vMSB.css('margin-left')) -
                                                   parseInt(this.vMSB.css('margin-right'))});
        this.vMHTS = $("<span id='viewMessengerHeaderTitleSpan' class='messenger-text'></span>");
        this.vMHA.append(this.vMTA);
        this.vMTA.append(this.vMHTS);

        //создание динамической части
        this.vMDA = $("<div id='viewMessengerDynamicArea'></div>");
        this.vMDA.css({height: this.options.height - parseInt(this.vMHA.css('height')) - 1, width: this.options.width});
        this.vMA.append(this.vMDA);

        //добавление дивов с PageControl
        this.vMPC = $("<div id='viewMessengerPageControl'></div>");
        this.vMPCLB = $("<div id='viewMessengerPageControlLeftButton'></div>");
        this.vMPCRB = $("<div id='viewMessengerPageControlRightButton'></div>");
        this.vMPCCA = $("<div id='viewMessengerPageControlCenterArea'></div>");

        this.vMDA.append(this.vMPC);
        //this.vMPC.append(this.vMPCLB);
        this.vMPC.append(this.vMPCCA);
        //this.vMPC.append(this.vMPCRB);

        this.vMPCCA.css({width: this.options.width - parseInt(this.vMPCLB.css('width')) -
                                                     parseInt(this.vMPCLB.css('margin-left')) -
                                                     parseInt(this.vMPCLB.css('margin-right')) -
                                                     parseInt(this.vMPCRB.css('width')) -
                                                     parseInt(this.vMPCRB.css('margin-left')) -
                                                     parseInt(this.vMPCRB.css('margin-right'))});

        this.vMPCCC = $("<div id='viewMessengerPageControlCenterContent'></div>");
        this.vMPCCA.append(this.vMPCCC);

        //добавление дива с элементами ввода сообщений
        this.vMFA = $("<div id='viewMessengerFooterArea'></div>");
        this.vMDA.append(this.vMFA);

        //добавление кнопки 'отправить соосбщение'
        this.vMEB = $("<div id='viewMessengerEnterButton' class='sublayers-clickable'></div>");
        this.vMFA.append(this.vMEB);
        this.vMEB.on('click', this.viewMessengerSendMessage);

        //добавление дива с Input
        this.vMIA = $("<div id='viewMessengerInputArea'></div>");
        this.vMFA.append(this.vMIA);
        this.vMIA.css({width: this.options.width - parseInt(this.vMEB.css('width')) -
            2 * parseInt(this.vMEB.css('margin'))});

        //добавление Input
        this.vMI = $("<input id='viewMessengerInput' type='text'>");
        this.vMIA.append(this.vMI);
        this.vMI.css({width: parseInt(this.vMIA.css('width'))-5});

        this.vMI.on('keydown', {self: this}, function (event) {
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

        //добавление дива с сообщениями
        this.vMTA = $("<div id='viewMessengerTextArea'></div>");
        this.vMFA.before(this.vMTA);
        this.vMTA.css({width: this.options.width,
                       height: parseInt(this.vMDA.css('height')) -
                               parseInt(this.vMFA.css('height')) -
                               parseInt(this.vMPC.css('height'))
        });

        // Установка активного чата по умолчанию
        this._activeChatID = null;
        // Инициализация истории сообщений
        this._history = [];
        this._historyIndex = -1;

        
        // повесить хендлеры на разные эвенты
        var stream = this.options.stream_mes;

        stream.addInEvent({
            key: 'message',
            cbFunc: this.receiveMessage,
            subject: this
        });

        stream.addInEvent({
            key: 'ws_message',
            cbFunc: this.receiveMessageFromWS,
            subject: this
        });

        stream.addOutEvent({
            key: 'ws_message_send',
            cbFunc: this.receiveMessageFromModelManager,
            subject: this
        });

    }


    ViewMessenger.prototype.showChatWindow = function () {
        this.showWindow();
        // todo: придумать как учесть размеры границ (box-sizing)
        this.setNewSize(this.vMA.height() + 4, this.vMA.width() + 4);
    };


    ViewMessenger.prototype.changeVisible = function (event) {
        var self = event.data.self;
        self.vMDA.slideToggle("slow", function () {
            if (self.options._visible) {
                self.options._visible = false;
                self.vMSB.removeClass('viewMessengerSlideButtonShowed');
                self.vMSB.addClass('viewMessengerSlideButtonHided');
            }
            else {
                self.options._visible = true;
                self.vMSB.removeClass('viewMessengerSlideButtonHided');
                self.vMSB.addClass('viewMessengerSlideButtonShowed');
            }

            // todo: придумать как учесть размеры границ (box-sizing)
            self.setNewSize(self.vMA.height() + 4, self.vMA.width() + 4);
        });

    };


    ViewMessenger.prototype.setVisible = function (aVisible) {
        if (this.options._visible !== aVisible) {
            this.changeVisible({ data: {self: this}})
        }
    };


    ViewMessenger.prototype.getVisible = function () {
        return this.options._visible;
    };


    ViewMessenger.prototype.setTitle = function (aTitle) {
        this.vMHTS.text(aTitle);
    };


    ViewMessenger.prototype.addChat = function (aID, aName, setAct){
        var chat = {
            id: aID,
            name: aName,
            textArea: $('<div id="textArea' + aID + '" class="textOutArea"></div>'),
            pageButton: $('<div id="pageButton' + aID + '" class="pageButton sublayers-clickable">' + aName + '</div>'),
            mesList: [],
            mesCount: 0
        }

        this.vMTA.append(chat.textArea);
        this.vMPCCC.append(chat.pageButton);

        chat.pageButton.on('click', {self: this, id: chat.id}, this.clickForPageButton);

        this.vMTA.css({height: parseInt(this.vMDA.css('height')) -
                               parseInt(this.vMFA.css('height')) -
                               parseInt(this.vMPC.css('height')) -
                               2 * parseInt(this.vMTA.css('border-image-width'))});

        this.chats.push(chat);
        if (setAct)
            this.setActiveChat(chat.id);
        return chat;
    }


    ViewMessenger.prototype.removeChat = function(chatID){
        // Если этот чат активный, то сделать активным нулевой
        var setNewActive = (this._activeChatID == chatID);
        // получить чат
        var chat = this._getChat(chatID);
        if(! chat) return;
        // удалить все сообщения у чата
        this._removeAllMessagesInChat(chat);
        // удалить область сообщений
        chat.textArea.remove();
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


    ViewMessenger.prototype.setActiveChat = function(aID){
        // если чата с таким aID не существует, то ничего не делать
        if (this._getChat(aID)) {
            this.chats.forEach(function (chat) {
                    if (chat.id == this.id) {
                        chat.textArea.addClass('textOutAreaActive');
                        chat.pageButton.addClass('pageButtonActive');
                        this.self.vMHTS.text('[' + chat.name + ']');
                    }
                    else {
                        chat.textArea.removeClass('textOutAreaActive');
                        chat.pageButton.removeClass('pageButtonActive');
                    }
                },
                {self: this, id: aID});

            this._activeChatID = aID;
        }
    }

    ViewMessenger.prototype.getActiveChat = function() {
        return this._getChat(this._activeChatID);
    }


    ViewMessenger.prototype._getChat = function (chatID) {
        for (var i in this.chats) {
            if (this.chats[i])
                if (this.chats[i].id == chatID)
                    return this.chats[i];
        }
        return null;
    }


    ViewMessenger.prototype._getChatByName = function (chatName) {
        for (var i in this.chats) {
            if (this.chats[i])
                if (this.chats[i].name === chatName)
                    return this.chats[i];
        }
        return null;
    };


    ViewMessenger.prototype.addMessage = function (chatID, chatName, aUser, aText) {
        // Найти чат для добавления в него сообщения
        var chat = this._getChat(chatID);
        if(! chat) chat = this.addChat(chatID, chatName, false);
        var messageID = chat.mesCount++;
        // получить локальное время
        var tempTime = new Date().toLocaleTimeString();
        // создать див сообщения и спаны
        var mesDiv = $('<div id="' + chat.name + chatID + messageID + '" class="view-messenger-message"></div>');
        var spanTime = $('<span class="view-messenger-text-time">' + '[' + tempTime + '] ' + '</span>');
        var spanUser = $('<span class="view-messenger-text-user sublayers-clickable">' + aUser.login + '</span>');
        var spanText = $('<span class="view-messenger-text-text">' + ': ' + aText + '</span>');
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
            spanUser.addClass("view-messenger-text-my-user");
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


    ViewMessenger.prototype._removeAllMessagesInChat = function(chat){
        for(;chat.mesList.length;){
            var dmessage = chat.mesList.pop();
            dmessage.spanUser.off('click', this.viewMessengerClickSpanUser);
            dmessage.mesDiv.remove();
        }
    };


    ViewMessenger.prototype.addMessageToHistory = function(mes){
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


    ViewMessenger.prototype.setMessagesHistory = function(mess){
        // Добавить все элементы истории (при чтении из куки) в чат, читать массив с конца
        for(;mess.length > 0;){
            var mes = mess.pop();
            this.addMessageToHistory(mes);
        }
    };

    // Установить в инпут сообщение из истории под заданным индексом
    // TODO: при установке сообщения переместить картеку в конец строки
    ViewMessenger.prototype._setInputHistoryMessage = function () {
        if ((this._historyIndex >= 0) && (this._history.length > 0)) {
            chat.vMI.val(this._history[this._historyIndex]).focus();
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
            chat.vMI.val('').focus();
        }
    }

    // Установить следующее сообщение в инпут, более старое
    ViewMessenger.prototype.setNextHistoryMessage = function () {
        chat._historyIndex++;
        if (chat._historyIndex >= chat._history.length)  // Если это последнее сообщение
            chat._historyIndex = chat._history.length - 1;
        // Установить сообщение
        chat._setInputHistoryMessage();
    };

    // Установить предыдущее сообщение в инпут, более новое!!!
    ViewMessenger.prototype.setPrevHistoryMessage = function () {
        chat._historyIndex--;
        if (chat._historyIndex < -1) {  //
            chat._historyIndex = -1;
        }
        // Установить сообщение
        chat._setInputHistoryMessage();
    };


    ViewMessenger.prototype.viewMessengerSendMessage = function() {
        var str = chat.vMI.val();
        if (str.length) {
            var active = chat.getActiveChat();
            if (active)
                // TODO: переделать здесь как-нибудь иначе
                if (active.id != -1)  // если это не лог-чат
                    chat.options.stream_mes.sendMessage(
                        {
                            type: 'send_chat_message',
                            body: {
                                to: chat.getActiveChat().id,
                                body: str
                            }}
                    );
                else
                    sendServConsole(str); // попробовать отправить команду на сервер
            chat.vMI.val('').focus();
            // Добавление сообщения в историю
            chat.addMessageToHistory(str);
        } else {
            chat.vMI.focus()
        }
    };


    ViewMessenger.prototype.clickForPageButton = function (event) {
        event.data.self.setActiveChat(event.data.id);
    }


    ViewMessenger.prototype.viewMessengerClickSpanUser = function (event) {
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


    ViewMessenger.prototype.receiveMessage = function (self, params) {
        self.addMessage(params.chatID, params.chatName, params.user, params.text);
        return true;
    };


    // вывод входящих ws-сообщений в лог
    ViewMessenger.prototype.receiveMessageFromWS = function(self, msg){
        //alert('ViewMessenger receiveMessageFromWS');
        if (msg.message_type == "push") {
            if (cookieStorage.enableLogPushMessage())
            // if (msg.events[0].cls !== "Update")
                self._addMessageToLog(JSON.stringify(msg, null, 4), 'push');
        }
        if (msg.message_type == "answer")
            if (cookieStorage.enableLogAnswerMessage())
                self._addMessageToLog(JSON.stringify(msg, null, 4), 'answer');
        return true;
    };

    // вывод исходящих через ws сообщений
    ViewMessenger.prototype.receiveMessageFromModelManager = function(self, msg){
        //alert('ViewMessenger receiveMessageFromModelManager');
        if(cookieStorage.enableLogRPCMessage())
            self._addMessageToLog(JSON.stringify(msg, null, 4), 'rpc');
        return true;
    };

    ViewMessenger.prototype._addMessageToLog = function(mes, name){
        // alert('ViewMessenger    addMessageToLog');
        this.log_index++;
        this.addMessage(-1, '', {login: name + ' #' + this.log_index},  '<pre>' + mes + '</pre>');
    };

    return ViewMessenger;
})(Window);
