var ViewMessenger = (function () {
    function ViewMessenger(options) {
        this.options = {
            parentDiv: '',
            height: 400,
            width: 300,
            onSend: '',
            _visible: true
        };

        this.chats = [];

        if (options) {
            if (options.parentDiv) this.options.parentDiv = options.parentDiv;
            if (options.height) this.options.height = options.height;
            if (options.width) this.options.width = options.width;
            if (options.onSend) this.options.onChange = options.onChange;
        }

        //добавление основного дива
        this.vMA = $("<div id='viewMessengerArea'></div>");
        this.vMA.css({width: this.options.width});
        $("#" + this.options.parentDiv).append(this.vMA);

        //создание заголовка
        //добавление верхнего дива с заголовком и кнопками
        this.vMHA = $("<div id='viewMessengerHeaderArea'></div>");
        this.vMA.append(this.vMHA);

        //добавление дива с кнопкой Свернуть/Развернуть
        this.vMSB = $("<div id='viewMessengerSlideButton' class='viewMessengerSlideButtonShowed'></div>");
        this.vMHA.append(this.vMSB);
        this.vMSB.on('click', {self: this}, this.changeVisible);

        //добавление заголовка
        this.vMTA = $("<div id='viewMessengerTitleArea'><span class='messenger-text'>NUKE Messanger: </span></div>");
        this.vMTA.css({width: this.options.width - parseInt(this.vMSB.css('width')) -
                                                   parseInt(this.vMSB.css('margin-left')) -
                                                   parseInt(this.vMSB.css('margin-right'))});
        this.vMHTS = $("<span id='viewMessengerHeaderTitleSpan' class='messenger-text'>Test</span>");
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
        this.vMEB = $("<div id='viewMessengerEnterButton'></div>");
        this.vMFA.append(this.vMEB);
//  Повесить Send

        //добавление дива с Input
        this.vMIA = $("<div id='viewMessengerInputArea'></div>");
        this.vMIA.css({width: this.options.width - parseInt(this.vMEB.css('width')) -
                      2 * parseInt(this.vMEB.css('margin'))});
        this.vMFA.append(this.vMIA);

        //добавление Input
        this.vMI = $("<input id='viewMessengerInput' type='text'>");
        this.vMIA.append(this.vMI);

//  Повесить Send
        /*vMI.keydown(function (event) {
         if (event.keyCode == 13) {
         sendMessage();
         }
         });*/


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
            textArea: $('<div id="textArea' + aID + '" class="textOutArea">' + aName + '</div>'),
            pageButton: $('<div id="pageButton' + aID + '" class="pageButton">' + aName + '</div>')
        }

        this.vMTA.append(chat.textArea);
        this.vMPCCC.append(chat.pageButton);

        chat.pageButton.on('click', {self: this, id: chat.id}, clickForPageButton);

        this.vMTA.css({height: parseInt(this.vMDA.css('height')) -
                            parseInt(this.vMFA.css('height')) -
                            parseInt(this.vMPC.css('height'))});

        this.chats.push(chat);
        this.setActiveChat(chat.id);
    }


    ViewMessenger.prototype.setActiveChat = function(aID){
        this.chats.forEach(function(chat){
                if(chat.id == this.id){
                    chat.textArea.addClass('textOutAreaActive');
                    chat.pageButton.addClass('pageButtonActive');
                }
                else {
                    chat.textArea.removeClass('textOutAreaActive');
                    chat.pageButton.removeClass('pageButtonActive');
                }


            },
            {self: this, id: aID})
    }


    return ViewMessenger;
})();


function clickForPageButton(event){
    event.data.self.setActiveChat(event.data.id);
}