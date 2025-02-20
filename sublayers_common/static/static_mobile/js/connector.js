
/*
*   Класс Коннектор - абстрактный класс,
*   предназначенный для наследования другими классами-коннекторами
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


var WSConnector = (function(_super){
    __extends(WSConnector, _super);
    function WSConnector(options){
        _super.call(this);
        this.options = {};
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

    WSConnector.prototype.connect = function () {
        // создание коннекта и обвешивание евентами
        console.info('WSConnector connect to:', this.options.url);
        //alert('Try connect to ' + this.options.url);
        this.connection = new WebSocket(this.options.url);
        var self = this;
        this.connection.onopen = function () {
            self.isConnected = true;
            console.info('WSConnector success connected!');
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
                    // Автореконнект
                    var reconnect_interval;
                    function refresh_server_stat_request() {
                        $.ajax({
                            url: window.location.protocol + "//" + location.hostname + '/site_stat',
                            success: function () {
                                window.location.reload();
                            },
                            error: function () {
                                console.log('Сервер недоступен.');
                            }
                        });
                    }

                    reconnect_interval = setInterval(refresh_server_stat_request, 3000);
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
