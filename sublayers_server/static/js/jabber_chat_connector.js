


var JabberChatConnector = (function () {
    function JabberChatConnector(options) {
        this.options = {
            jid: '',
            password: '',
            adress_server: 'localhost',
            messenger: null  // объект чата, в который будут кидаться сообщения
        };
        setOptions(options, this.options);

        // создание коннекта и обвешивание евентами
        var self = this;

        // todo не работает из-за этого адреса. на рабочем компе есть правильный вариант!!!!
        this.connection = new Strophe.Connection('http://localhost/http-bind');

        this.connection.connect('menkent@menkent-desktop', '1', function (status) {
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
                    alert('URRRRRRRRRRAAAAAAAAAAAAAAA!!!   Strophe is connected, ' + self.connection.jid);
                    // addHandler: function (handler, ns, name, type, id, from, options) // в type нужно указать chat и groupchat, если захотим различать
                    alert('1');
                    self.connection.addHandler(this.onMessage, null, 'message', null, null, null);
                    self.connection.addHandler(this.onMessageMeNkent, null, 'message', null, 'menkent2@menkent-desktop', null);
                    self.connection.send($pres().tree());
                    alert('2');
                }
            }
        );


    }


    JabberChatConnector.prototype.onMessage = function(msg) {
        alert('11111111111111');
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
