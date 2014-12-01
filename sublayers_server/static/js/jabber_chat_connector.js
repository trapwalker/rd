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
                    self.connection.addHandler(self.onPrivateMessage, null, 'message', null, null, null);
                    //self.connection.addHandler(self.onGroupMessage, null, 'message', 'groupchat', null, null);
                    self.connection.addHandler(self.onGroupMessage, "jabber:x:conference", null, null, null, null);
                    self.connection.send($pres().tree());
                }
            }
        );

        // Эвенты от чата: инициализация
        this.eventList = [];
    }





    JabberChatConnector.prototype.onPrivateMessage = function(msg) {
        //alert('onPrivateMessage');
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from').split('/')[0];
        var type = msg.getAttribute('type');
        var elems = msg.getElementsByTagName('body');

        if (type === 'chat' || type === 'groupchat')
            if (elems.length > 0) {
                var body = elems[0]
                if (type === 'chat') {
                        // todo: придумать как не образаться к глобальной переменной
                        chat_connector.runEvents('message', {
                            chatID: from,
                            chatName: from.split('@')[0],
                            user: {login: from.split('@')[0]},
                            text: Strophe.getText(body)
                        });
                    }
                if (type === 'groupchat') {
                        chat_connector.runEvents('message', {
                            chatID: from,
                            chatName: from.split('@')[0],
                            user: {login: msg.getAttribute('from').split('/')[1]},
                            text: Strophe.getText(body)
                        })
                    }
            }
        // обязательно возвращать true
        return true;
    };


    JabberChatConnector.prototype.onGroupMessage = function(msg) {
        //alert('onGroupMessage');
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');
        var type = msg.getAttribute('type');

        chat_connector.connection.muc.join(from, user.login, null, null, null, null, null);

        // обязательно возвращать true
        return true;
    };


    JabberChatConnector.prototype.sendChatMessage = function(mto, mbody){
        var type = (mto.indexOf('conference') > 0) ? 'groupchat' : 'chat';

        var msg = $msg({to: mto, from: this.connection.jid, type: type}).c('body').t(mbody);
        this.connection.send(msg.tree());

        if (type === 'chat')
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