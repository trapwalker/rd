
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
        this.options = {
            url: (location.protocol == "https:" ? "wss://" : "ws://")  + location.host + "/ws"
        };
        if (options) setOptions(options, this.options);

        this.isConnected = false;
        this.connection = {};

        this.max_time = 0;
        this.decode_time = 0;
        this.count = 0;

        var self = this;
        setInterval(function () {
            //console.log('Максимальное время обработки сообщения от сервера: ', self.max_time, '   Всего получено сообщений за период: ', self.count);
            //console.log('Максимальное время разбора сообщения от сервера: ', self.decode_time);
            self.max_time = 0;
            self.decode_time = 0;
            self.count = 0;
        }, 10000);
    }

    WSConnector.prototype.connect = function(){
        // создание коннекта и обвешивание евентами
        console.info('WSConnector connect to:', this.options.url);
        if(this.isConnected) return;
        this.connection = new WebSocket(this.options.url);
        var self = this;
        this.connection.onopen = function() {
            self.isConnected = true;

            // Google Analytics
            if(basic_server_mode)
                analytics.client_main_ws_connect();
            else
                analytics.client_quick_ws_connect();

            // Отправка на сервер разрешения экрана
            setTimeout(resizeWindowHandler, 10);

            self.connection.onmessage = function (event) {
                //receiveMesFromServ(event.data);
                self.receiveMessage(event.data);
            };

            self.connection.onerror = function (error) {
                this.isConnected = false;
                console.error('onerror ', error);
            };

            self.connection.onclose = function (event) {
                // console.log('onclose ', event);
                // websocket is closed.
                self.isConnected = false;
                timeManager.timerStop();
                if (event.wasClean) {
                    // console.log('Соединение закрыто чисто ', event);
                    setTimeout(function(){ location.reload();}, 60000); // Сразу ставим максимальный таймаут
                    textConsoleManager.start('dc_console');
                } else {
                    textConsoleManager.start('dc_console');
                    // Автореконнект
                    var ping_link = window.location.protocol + "//" + location.hostname +
                                    $('#settings_server_mode_link_path').text() + '/site_stat';
                    function refresh_server_stat_request() {
                        $.ajax({
                            url: ping_link,
                            timeout: 5000,
                            success: function() {
                                window.location.reload();
                            },
                            error: function() {
                                console.log('Server not available. Next try in 20s.');
                                setTimeout(refresh_server_stat_request, 20000);
                            }
                        });
                    }
                    setTimeout(refresh_server_stat_request, 10000);
                }
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
        if (dec_time > this.decode_time) {
            this.decode_time = dec_time;
            if (dec_time > 0.01) {
                console.warn('Превышено максимальное время разбора сообщения от сервера: ', this.decode_time, mes);
                var mes_type = "ws_message";
                if (mes.hasOwnProperty("body") && mes.body.hasOwnProperty("events") && mes.body.events) {
                    mes_type = mes.body.events[0].cls;
                }
                clientManager.sendAgentLog("ClientWarning: decode_time for message<" + mes_type + ">  " + this.decode_time + " s");
            }
        }

        if (mes.body && mes.body.events && mes.body.events[0] && _ttt_)
            console.log(msg.length, mes.body.events[0]);
            //console.log(mes.body.events[0].cls);

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


var _ttt_ = false;