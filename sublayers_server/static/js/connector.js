
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
            adress_server: '',
            conference_suffixes: '',
            messenger: null  // объект чата, в который будут кидаться сообщения
        };
        if (options) setOptions(options, this.options);

        // создание коннекта и обвешивание евентами
        this.connection = new Strophe.Connection(this.options.adress_server);
    }


    JabberConnector.prototype.connect = function(){
        //console.log('JabberConnector.prototype.connect');
        var self = this;
        this.connection.connect(this.options.jid, this.options.password, function (status) {
                // иначе нельзя, так как нужно использовать self
                if (status == Strophe.Status.CONNECTING) {
                    //console.log('Strophe is connecting.');
                }
                else if (status == Strophe.Status.CONNFAIL) {
                    console.log('Strophe failed to connect.');
                }
                else if (status == Strophe.Status.DISCONNECTING) {
                    console.log('Strophe is disconnecting.');
                }
                else if (status == Strophe.Status.DISCONNECTED) {
                    console.log('Strophe is disconnected.');
                }
                else if (status == Strophe.Status.CONNECTED) {
                    console.log('Strophe is connected, ' + self.connection.jid);
                    //addHandler: function (handler, ns, name, type, id, from, options)
                    self.connection.addHandler(self.receiveMessage, null, 'message', null, null, null);
                    self.connection.addHandler(self.onGroupInvite, "jabber:x:conference", null, null, null, null);
                    self.connection.addHandler(self._muc_presence, Strophe.NS.MUC_USER, "presence", null, null, null);
                    self.connection.send($pres().tree());

                    // запрос текущих комнат
                    self._reinvite_me_to_rooms();

                    // вешаем евенты на исходящие сообщения от потока сообений
                    message_stream.addOutEvent({
                        key: 'send_chat_message',
                        cbFunc: 'sendMessage',
                        subject: self
                    });
                }
            }
        );
    };

    JabberConnector.prototype._muc_presence = function(data) {
        //console.log('JabberConnector.prototype._muc_presence', data);
        var code = null;
        var status = data.getElementsByTagName('status');
        var from = data.getAttribute('from').split('@')[0];

        if (status.length > 0) {
            code = status[0].getAttribute('code');
        }
        if (code == '307') {
            var items = data.getElementsByTagName('item');
            var nick = '';
            if (items.length > 0) {
                nick = items[0].getAttribute('nick');
            }
            if (user.login != nick)
                console.log('Пользователь [', nick, '] вышел из комнаты [', from, ']');
            else {
                var chat_name = from.split('@')[0];
                console.log('Вы вышли из комнаты [', chat_name, ']');
                if (chat_name.indexOf('party_') >= 0)
                    chat.deactivateParty(chat_name);
                else
                    chat.removeChat(chat_name);
            }
        }
        return true;
    };

    JabberConnector.prototype._reinvite_me_to_rooms = function () {
        var mes = {
            call: "get_my_xmpp_room_invite",
            rpc_call_id: rpcCallList.getID(),
            params: {}
        };
        rpcCallList.add(mes);

        message_stream.sendMessage({
            type: 'ws_message_send',
            body: mes
        });
    };

    // автоматический приём приглашения в группу
    JabberConnector.prototype.onGroupInvite = function (msg) {
        //console.log('JabberConnector.prototype.onGroupInvite', msg);
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');
        var type = msg.getAttribute('type');
        j_connector.connection.muc.join(from, user.login, null, null, null, null, null);
        // обязательно возвращать true
        var chat_name = from.split('@')[0];
        console.log('Приглашение в ', chat_name, '  принято');
        if (chat_name.indexOf('party_') >= 0)
            chat.activateParty(chat_name);
        else
            chat.addChat(chat_name);
        return true;
    };

    JabberConnector.prototype.sendMessage = function(msg){
        //console.log('JabberConnector.prototype.sendMessage', msg);
        var mes = this.encodeMessage(msg);
        this.connection.send(mes.tree());

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
        //console.log('JabberConnector.prototype.receiveMessage:', msg);
        // раскодировать входящее от сервера сообщение
        var mes = j_connector.decodeMessage(msg);

        // отправить сообщение в мессадж стрим
        if (mes)
            message_stream.receiveMessage(mes);

        // обязательно возвращать true
        return true;
    };

    JabberConnector.prototype.decodeMessage = function(msg){
        //console.log('JabberConnector.prototype.decodeMessage');
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from').split('/')[0];
        var type = msg.getAttribute('type');
        var elems = msg.getElementsByTagName('body');
        var message = {};

        if ((type === 'chat' || type === 'groupchat') && elems.length > 0) {
            if (type === 'chat')
                message = { type: 'message',
                    body: {
                        room_jid: from.split('@')[0],
                        user: {login: from.split('@')[0]},
                        text: Strophe.getText(elems[0])
                    }};
            if (type === 'groupchat')
                message = { type: 'message',
                    body: {
                        room_jid: from.split('@')[0],
                        user: {login: msg.getAttribute('from').split('/')[1]},
                        text: Strophe.getText(elems[0])
                    }};
        }
        return message;
    };

    JabberConnector.prototype.encodeMessage = function(msg){
        //console.log('JabberConnector.prototype.encodeMessage');
        // todo: обработать здесь правильно. иначе не будут работать приваты, а то сейчас все сообщения = групповые
        msg.to = msg.to + this.options.conference_suffixes;
        var type = (msg.to.indexOf('conference') > 0) ? 'groupchat' : 'chat';
        return $msg({to: msg.to, from: this.connection.jid, type: type}).c('body').t(msg.body);
    };


    return JabberConnector;
})(Connector);


var WSConnector = (function(_super){
    __extends(WSConnector, _super);
    function WSConnector(options){
        _super.call(this);
        this.options = {
            url: "ws://" + location.host.split(':')[0] + ":" + $('#settings_ws_port').text() + "/ws"
        };
        console.info('connect to:', this.options.url);
        if (options) setOptions(options, this.options);

        this.isConnected = false;
        this.connection = {};

        this.max_time = 0;
        this.decode_time = 0;
        this.count = 0;


        var self = this;
        setInterval(function () {
           // console.log('Максимальное время обработки сообщения от сервера: ', self.max_time, '   Всего получено сообщений за период: ', self.count);
           // console.log('Максимальное время разбора сообщения от сервера: ', self.decode_time);
            self.max_time = 0;
            self.decode_time = 0;
            self.count = 0;
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
                    alert('Соединение закрыто чисто ', event);
                    console.log('Соединение закрыто чисто ', event);
                    timeManager.timerStop();
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
            });

            message_stream.addOutEvent({
                key: 'send_chat_message',
                cbFunc: 'sendMessage',
                subject: self
            });
        };
    };


    WSConnector.prototype.sendMessage = function(msg){
        //alert('WSConnector sendMessage');
        var mes = this.encodeMessage(msg);
        this.connection.send(JSON.stringify(mes));

        return true;
    };

    WSConnector.prototype.receiveMessage = function(msg){
        //console.log('WSConnector receiveMessage', msg);
        // раскодировать входящее от сервера сообщение
        var time_start = clock.getCurrentTime();
        var mes = this.decodeMessage(msg);
        var dec_time = clock.getCurrentTime() - time_start;
        if (dec_time > this.decode_time)
            this.decode_time = dec_time;
        // отправить сообщение в мессадж стрим
        if (mes)
            message_stream.receiveMessage(mes);
        // обязательно возвращать true
        var time_length = clock.getCurrentTime() - time_start;
        if (time_length > this.max_time)
            this.max_time = time_length;
        this.count ++;
        return true;
    };

    WSConnector.prototype.decodeMessage = function(msg){
        // alert('WSConnector decodeMessage');
        var mes = JSON.parse(msg, function(key, value) {
            if((key === 'time') || (key === 'start_time') || (key === 'serv_time') || (key === 'msg_time'))
                return new Date(value * 1000).getTime();
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
