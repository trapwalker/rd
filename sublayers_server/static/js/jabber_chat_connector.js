var JabberChatConnector = (function () {
    function JabberChatConnector(options) {
        this.options = {
            jid: '',
            password: '',
            adress_server: 'localhost',
            messenger: null  // объект чата, в который будут кидаться сообщения
        };
        if (options) setOptions(options, this.options);

        // создание коннекта и обвешивание евентами
        this.connection = new Strophe.Connection(this.options.adress_server);
        var self = this;
        this.connection.connect(this.options.jid, this.options.password, function (status) {
                // иначе нельзя, так как нужно использовать self
                if (status == Strophe.Status.CONNECTING) {
                    alert('Strophe is connecting.');
                }
                else if (status == Strophe.Status.CONNFAIL) {
                    alert('Strophe failed to connect.');
                }
                else if (status == Strophe.Status.DISCONNECTING) {
                    alert('Strophe is disconnecting.');
                }
                else if (status == Strophe.Status.DISCONNECTED) {
                    alert('Strophe is disconnected.');
                }
                else if (status == Strophe.Status.CONNECTED) {
                    alert('Strophe is connected, ' + self.connection.jid);
                    //addHandler: function (handler, ns, name, type, id, from, options)
                    self.connection.addHandler(self.onMessage, null, 'message', null, null, null);
                    self.connection.addHandler(function(){alert('group!!!')}, null, 'message', 'groupchat', null, null);
                    self.connection.send($pres().tree());
                }
            }
        );

        // Эвенты от чата: инициализация
        this.eventList = [];
    }


    JabberChatConnector.prototype.onMessage = function(msg) {
        alert('onMessage');
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');
        var type = msg.getAttribute('type');
        var elems = msg.getElementsByTagName('body');

        if (type == "chat" && elems.length > 0) {
            var body = elems[0];
            // todo: придумать как не образаться к глобальной переменной
            chat_connector.runEvents('message', {
                chatID: from,
                chatName: from.split('@')[0],
                user: {login: from.split('@')[0]},
                text: Strophe.getText(body)
            });
        }
        // обязательно возвращать true
        return true;
    };




    JabberChatConnector.prototype.sendChatMessage = function(mto, mbody){
        // todo: сформироать XML для отправки
        var msg = $msg({to: mto, from: this.connection.jid, type: 'chat'}).c('body').t(mbody);
        this.connection.send(msg.tree());
        this.runEvents('message', {
            chatID: mto,
            chatName: mto.split('@')[0],
            user: user,
            text: mbody
        });

    };

    JabberChatConnector.prototype.addEvent = function(event){
        // event = {key: message | invite_room | leave_room | ... ,
        //          cbFunc: func
        //          subject: chat | другой объект, повесивший евент }
        if (event.key && (typeof(event.cbFunc) === 'function'))
            this.eventList.push(event);
    };

    JabberChatConnector.prototype.runEvents = function(key, params){
        for(var index in this.eventList) {
            var event = this.eventList[index];
            if (event.key === key)
                event.cbFunc(event.subject, params);
        }
    };



        return JabberChatConnector;
    })();