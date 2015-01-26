
/*
*   Класс Коннектор - абстрактный класс,
*   предназначенный для наследования другими классами-коннекторами
*
*
* */


var Connector = (function(){
    function Connector(){
        this.connection = null;
        this.options = {};
    }

    Connector.prototype.sendMessage = function(){};

    Connector.prototype.receiveMessage = function(){};

    Connector.prototype.decodeMessage = function(){};

    Connector.prototype.encodeMessage = function(){};


    return Connector;
})();



var JabberConnector = (function(_super){
    __extends(JabberConnector, _super);
    function JabberConnector(options){
        _super.call(this);
        this.options = {
            jid: '',
            password: '',
            adress_server: 'localhost',
            messenger: null  // объект чата, в который будут кидаться сообщения
        };
        if (options) setOptions(options, this.options);

        // создание коннекта и обвешивание евентами
        this.connection = new Strophe.Connection(this.options.adress_server);
    }


    JabberConnector.prototype.connect = function(){
        var self = this;
        this.connection.connect(this.options.jid, this.options.password, function (status) {
                // иначе нельзя, так как нужно использовать self
                if (status == Strophe.Status.CONNECTING) {
                    //alert('Strophe is connecting.');
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
                    //alert('Strophe is connected, ' + self.connection.jid);
                    //addHandler: function (handler, ns, name, type, id, from, options)
                    self.connection.addHandler(self.receiveMessage, null, 'message', null, null, null);
                    self.connection.addHandler(self.onGroupInvite, "jabber:x:conference", null, null, null, null);
                    self.connection.send($pres().tree());

                    // вешаем евенты на исходящие сообщения от потока сообений
                    message_stream.addOutEvent({
                        key: 'send_chat_message',
                        cbFunc: self.sendMessage,
                        subject: self
                    });
                }
            }
        );
    };

    // автоматический приём приглашения в группу
    JabberConnector.prototype.onGroupInvite = function (msg) {
        //alert('onGroupMessage');
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');
        var type = msg.getAttribute('type');
        // todo: переделать на правильное обращение к объекту коннектора
        j_connector.connection.muc.join(from, user.login, null, null, null, null, null);
        // обязательно возвращать true
        return true;
    };

    JabberConnector.prototype.sendMessage = function(self, msg){
        // alert('sendMessage');
        var mes = self.encodeMessage(msg);
        self.connection.send(mes.tree());

        // сгенерировать сообщения для приватных джаббер чатов, чтобы отобразить своё сообщение
        if (mes.tree().getAttribute('type') === 'chat')
            message_stream.receiveMessage(self._forGenPrivateMessage(msg));

        return true;
    };

    JabberConnector.prototype._forGenPrivateMessage = function(msg){
        //alert('_forGenPrivateMessage');
        return {
            type: 'message',
            body: {
                chatID: msg.to,
                chatName: msg.to.split('@')[0],
                user: user,
                text: msg.body
            }
        };
    };

    JabberConnector.prototype.receiveMessage = function(msg){
        //alert('receiveMessage');
        // раскодировать входящее от сервера сообщение
        // todo: разобраться как обратиться к this
        var mes = j_connector.decodeMessage(msg);
        // отправить сообщение в мессадж стрим
        if (mes)
            message_stream.receiveMessage(mes);
        // обязательно возвращать true
        return true;
    };

    JabberConnector.prototype.decodeMessage = function(msg){
        // alert('decodeMessage');
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from').split('/')[0];
        var type = msg.getAttribute('type');
        var elems = msg.getElementsByTagName('body');
        var message = {};

        if ((type === 'chat' || type === 'groupchat') && elems.length > 0) {
            if (type === 'chat')
                message = { type: 'message',
                    body: {
                        chatID: from,
                        chatName: from.split('@')[0],
                        user: {login: from.split('@')[0]},
                        text: Strophe.getText(elems[0])
                    }};
            if (type === 'groupchat')
                message = { type: 'message',
                    body: {
                        chatID: from,
                        chatName: from.split('@')[0],
                        user: {login: msg.getAttribute('from').split('/')[1]},
                        text: Strophe.getText(elems[0])
                    }};
        }
        return message;

    };

    JabberConnector.prototype.encodeMessage = function(msg){
        //alert('JabberConnector encodeMessage');
        var type = (msg.to.indexOf('conference') > 0) ? 'groupchat' : 'chat';
        //
        var mes = $msg({to: msg.to, from: this.connection.jid, type: type}).c('body').t(msg.body);
        return mes;
    };


    return JabberConnector;
})(Connector);



var WSConnector = (function(_super){
    __extends(WSConnector, _super);
    function WSConnector(options){
        _super.call(this);
        this.options = {
            url: "ws://" + location.host + "/ws"
        };
        if (options) setOptions(options, this.options);

        this.isConnected = false;
        this.connection = {};

        this.max_time = 0;

        var self = this;
        setInterval(function () {
            console.log('max record of receiveMessage in last 10 seconds is ', self.max_time);
            self.max_time = 0;
        }, 10000)

       }

    WSConnector.prototype.connect = function(){
        // создание коннекта и обвешивание евентами
        this.connection = new WebSocket(this.options.url);
        var self = this;
        this.connection.onopen = function() {
            self.isConnected = true;

            self.connection.onmessage = function (event) {
                //receiveMesFromServ(event.data);
                self.receiveMessage(event.data);
            };

            self.connection.onerror = function (error) {
                this.isConnected = false;
            };

            self.connection.onclose = function (event) {
                // websocket is closed.
                self.isConnected = false;
                if (event.wasClean) {
                    alert('Соединение закрыто чисто');
                } else {
                    modalWindow.modalRestartShow();
                }
                //alert('Код: ' + event.code + ' причина: ' + event.reason);
            };

            // хендлер на отправку сообщения
            message_stream.addOutEvent({
                key: 'ws_message_send',
                cbFunc: 'sendMessage',
                subject: self
            })

        };
    };

    WSConnector.prototype.sendMessage = function(msg){
        //alert('WSConnector sendMessage');
        var mes = this.encodeMessage(msg);
        this.connection.send(JSON.stringify(mes));

        return true;
    };

    WSConnector.prototype.receiveMessage = function(msg){
        //console.log('WSConnector receiveMessage');
        // раскодировать входящее от сервера сообщение
        var time_start = clock.getCurrentTime();
        var mes = this.decodeMessage(msg);
        // отправить сообщение в мессадж стрим
        if (mes)
            message_stream.receiveMessage(mes);
        // обязательно возвращать true
        var time_length = clock.getCurrentTime() - time_start;
        if (time_length > this.max_time){
            this.max_time = time_length;
            //console.log('new max record of receiveMessage is ', time_length);
        }

        return true;
    };

    WSConnector.prototype.decodeMessage = function(msg){
        // alert('WSConnector decodeMessage');
        var mes = JSON.parse(msg, function(key, value){
            if((key === 'time') || (key === 'start_time')) return new Date(value * 1000).getTime();
            return value;
        });
        // todo: конкретизировать типы мессаджей, например push, answer и тд
        return {
            type: 'ws_message',
            body: mes

        };
    };

    WSConnector.prototype.encodeMessage = function(msg){
        //alert('WSConnector encodeMessage');
        return msg;
    };


    return WSConnector;
})(Connector);
