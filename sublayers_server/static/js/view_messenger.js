var ViewMessenger = (function () {
    function ViewMessenger(options) {
        this.options = {
            parentDiv: '',
            height: 400,
            width: 300,
            _visible: true
        };

        this.chats = [];

        if (options) {
            if (options.parentDiv) this.options.parentDiv = options.parentDiv;
            if (options.height) this.options.height = options.height;
            if (options.width) this.options.width = options.width;
        }

        // Счётчик сообщений лога.
        this.pushID = 0;
        this.rpcID = 0;
        this.ansID = 0;

        //добавление основного дива
        this.vMA = $("<div id='viewMessengerArea' class='sublayers-unclickable'></div>");
        this.vMA.css({width: this.options.width});
        $("#" + this.options.parentDiv).append(this.vMA);

        //создание заголовка
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
        this.vMEB.on('click', this.viewMessngerSendMessage);

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
                event.data.self.viewMessngerSendMessage();
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
    }


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
        });
    };


    ViewMessenger.prototype.setVisible = function (aVisible) {
        if (this.options._visible != aVisible) {
            this.changeVisible({ data: {self: this}})
        }
    };


    ViewMessenger.prototype.getVisible = function () {
        return this.options._visible;
    };


    ViewMessenger.prototype.setTitle = function (aTitle) {
        this.vMHTS.text(aTitle);
    };


    ViewMessenger.prototype.addChat = function (aID, aName){
        var chat = {
            id: aID,
            name: aName,
            textArea: $('<div id="textArea' + aID + '" class="textOutArea"></div>'),
            pageButton: $('<div id="pageButton' + aID + '" class="pageButton sublayers-clickable">' + aName + '</div>')
        }

        this.vMTA.append(chat.textArea);
        this.vMPCCC.append(chat.pageButton);

        chat.pageButton.on('click', {self: this, id: chat.id}, this.clickForPageButton);

        this.vMTA.css({height: parseInt(this.vMDA.css('height')) -
                               parseInt(this.vMFA.css('height')) -
                               parseInt(this.vMPC.css('height'))-
                               2 * parseInt(this.vMTA.css('border-image-width'))});

        this.chats.push(chat);
        this.setActiveChat(chat.id);
        return chat;
    }


    ViewMessenger.prototype.setActiveChat = function(aID){
        this.chats.forEach(function(chat){
                if(chat.id == this.id){
                    chat.textArea.addClass('textOutAreaActive');
                    chat.pageButton.addClass('pageButtonActive');
                    this.self.vMHTS.text('['+chat.name+']');
                }
                else {
                    chat.textArea.removeClass('textOutAreaActive');
                    chat.pageButton.removeClass('pageButtonActive');
                }
            },
            {self: this, id: aID})
    }


    ViewMessenger.prototype._getChat = function(chatID) {
        // Найти чат
        for(var i in this.chats){
            if(this.chats[i])
                if(this.chats[i].id == chatID)
                   return this.chats[i];
        }
        // Если чата нет, то создать новый и его же вернуть
        // return this.addChat(chatID, 'какой-то текст или логин');
    }


    ViewMessenger.prototype.addMessage = function(chatID, messageID, aTime, aUser, aText) {
        // Найти чат для добавления в него сообщения
        var chat = this._getChat(chatID);
        // Отформатировать время
        var tempTime = aTime.toTimeString().split(' ')[0];
        // создать див сообщения и спаны
        var mesDiv = $('<div id="' + chat.name + chatID + messageID + '" class="view-messenger-message"></div>');
        var spanTime = $('<span class="view-messenger-text-time">' + '[' + tempTime + '] ' + '</span>');
        var spanUser = $('<span class="view-messenger-text-user sublayers-clickable">' + aUser.login + '</span>');
        var spanText = $('<span class="view-messenger-text-text">' + ': ' + aText + '</span>');

        // проверить, если мессадж с таким айди уже есть, то заменить в нём текст
        if ($("#" + chat.name+chatID+messageID + ' span:last-child').length) {
            $("#" + chat.name+chatID+messageID + ' span:last-child').text(aText);
            return;
        }

        // Добавить, предварительно скрыв
        mesDiv.hide();
        chat.textArea.append(mesDiv);
        mesDiv.append(spanTime);
        mesDiv.append(spanUser);
        mesDiv.append(spanText);

        // Повесить клик на юзер спан, чтобы по клику можно было определять какой юзер сейчас выбран
        if (chat.id >= 0)
            spanUser.on('click', {owner: aUser}, this.viewMessengerClickSpanUser);

        // Проверить, если своё сообщение, то добавить к спану класс совего сообщения
        if(aUser.login == user.login)
            spanUser.addClass("view-messenger-text-my-user");
        // Показать сообщение, опустивскрол дива
        mesDiv.slideDown('fast',function() {chat.textArea.scrollTop(99999999)});

    };


    ViewMessenger.prototype.addMessageToLog = function(aText, aLogType) {
        if (aLogType == "rpc") {
            this.rpcID++;
            this.addMessage(-4, this.rpcID, new Date(), {login: 'RPC к серверу #' + this.rpcID}, aText);
        }

        if (aLogType == "answer") {
            this.ansID++;
            this.addMessage(-3, this.ansID, new Date(), {login: 'Answer от сервера #' + this.ansID}, '<pre>' + aText + '</pre>');
        }

        if (aLogType == "push") {
            this.pushID++;
            this.addMessage(-1, this.pushID, new Date(), {login: 'Push от сервера #' + this.pushID}, '<pre>' + aText + '</pre>');
        }

    }


    ViewMessenger.prototype.addMessageToSystem = function(messID, aText) {
        this.addMessage(-2, messID, new Date(), {login: '#'}, aText);
    }


    ViewMessenger.prototype.viewMessngerSendMessage = function() {
        var str = chat.vMI.val();
        if (str.length) {
            sendChatMessage(str);
            chat.vMI.val('').focus();
        } else {
            chat.vMI.focus()
        }
    }


    ViewMessenger.prototype.clickForPageButton = function (event) {
        event.data.self.setActiveChat(event.data.id);
    }


    ViewMessenger.prototype.viewMessengerClickSpanUser = function (event) {
        var owner = event.data.owner;
        //alert("I\'m " + owner.login + "\nMy ID = " + owner.uid + (owner.car ? "\nMy Car ID = " + owner.car.ID : ""));

        if (owner.uid == user.ID)
            backLight.on(userCarMarker.marker);
        else
        if(owner.car)
            backLight.on(owner.car.marker);
    }

    return ViewMessenger;
})();
