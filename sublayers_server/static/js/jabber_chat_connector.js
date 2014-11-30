/*
 login = abbir
 jid = abbir@sublayers.net
 abbir
 private from = abbir@sublayers.net/sublayers
 group from = city1@conference.sublayers.net/abbir

 */

var JabberChatConnector = (function () {
    function JabberChatConnector(options) {
        this.options = {
            jid: '',
            password: '',
            adress_server: 'localhost'
        };

        if (options) setOptions(options, this.options);

        this.connection = new Strophe.Connection(this.options.adress_server);

        // создание коннекта и обвешивание евентами
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
                    //addHandler: function (handler, ns, name, type, id, from, options) // в type нужно указать chat и groupchat, если захотим различать
                    self.connection.addHandler(self.onMessage, null, 'message', null, null, null); // обработка приватных сообщений
                    self.connection.send($pres().tree());
                }
            }
        );

        // Эвенты от чата: инициализация
        this.eventList = [];

    }


    JabberChatConnector.prototype.onMessage = function(msg) {
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');
        var type = msg.getAttribute('type');
        var elems = msg.getElementsByTagName('body');
        //from = from.split('@')[0];
        if (type == "chat" && elems.length > 0) {
            var body = elems[0];
            alert(body);
            // значит сделать добавления сообщения в чат и автоматическое создание чата по JIDу, обрубив сервер (всё что после собаки)
            // todo подумать как тут лучше образаться к чату, чтоб не через глобальную переменную
            /*chat_connector.runEvents('message', {
                chatID: from,
                chatName: from,
                user: {login: from},
                text: body
            });
            */
        }
        // we must return true to keep the handler alive.
        // returning false would remove it after it finishes.
        return true;
    };




    JabberChatConnector.prototype.sendChatMessage = function(mto, mbody){
        // todo: сформироать XML для отправки
        var msg = $msg({to: mto, from: this.connection.jid, type: 'chat'}).c('body').t(mbody);
        this.connection.send(msg.tree());
    };

    JabberChatConnector.prototype.addEvent1 = function(event){
        // event = {key: message | invite_room | leave_room | ... ,
        //          cbFunc: func
        //          subject: chat | другой объект, повесивший евент }
        if (event.key && (type(event.cbFunc) === 'function'))
            this.eventList.push(event);
    };

    JabberChatConnector.prototype.runEvents = function(key, params){
        for(var event in this.eventList)
            if(event.key === key)
                event.cbFunc(event.subject, params);
    };



        return JabberChatConnector;
    })();