var JabberChatConnector = (function () {
    function JabberChatConnector(options) {
        this.options = {
            jid: '',
            password: '',
            adress_server: 'localhost',
            messenger: null  // объект чата, в который будут кидаться сообщения
        };

        if (options)
            setOptions(options, this.options);

        // создание коннекта и обвешивание евентами
        var self = this;

        // todo не работает из-за этого адреса. на рабочем компе есть правильный вариант!!!!
        this.connection = new Strophe.Connection('http://95.71.87.90:5280/http-bind');

        this.connection.connect('menkent@menkent-desktop/subclient', '1', function (status) {
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
                    //self.connection.addHandler(self.onMessageMeNkent, null, 'message', null, 'menkent2@menkent-desktop', {matchBare: true});
                    self.connection.addHandler(self.onMessage, null, 'message', null, null, null);
                    //self.connection.addHandler(self.onMessageMeNkent, null, 'message', null, 'menkent2@menkent-desktop/Пандион', null);
                    self.connection.send($pres().tree());
                }
            }
        );
    }


    JabberChatConnector.prototype.onMessage = function(msg) {
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');
        var type = msg.getAttribute('type');
        var elems = msg.getElementsByTagName('body');

        if (type == "chat" && elems.length > 0) {
            var body = elems[0];
            // todo имя чата = jid from
            // значит сделать добавления сообщения в чат и автоматическое создание чата по JIDу, обрубив сервер (всё что после собаки)

            //alert(from +'    say:   '+Strophe.getText(body));

            // todo подумать как тут лучше образаться к чату, чтоб не через глобальную переменную
            chat.addMessage(0, null, new Date(new Date().getTime()), {login:from.split('@')[0]}, Strophe.getText(body));
        }
        // we must return true to keep the handler alive.
        // returning false would remove it after it finishes.
        return true;
    };


    JabberChatConnector.prototype.onMessageMeNkent = function(msg) {
        alert('2222222222222');
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');
        var type = msg.getAttribute('type');
        var elems = msg.getElementsByTagName('body');

        if (type == "chat" && elems.length > 0) {
            var body = elems[0];
            alert(Strophe.getText(body), 'in');
        }
        // we must return true to keep the handler alive.
        // returning false would remove it after it finishes.
        return true;
    };


    JabberChatConnector.prototype.sendMessage = function(mto, mbody){
        // todo: сформироать XML для отправки
        var msg = $msg({to: mto, from: this.connection.jid, type: 'chat'}).c('body').t(mbody);
        this.connection.send(msg.tree());
    };


        return JabberChatConnector;
    })();
