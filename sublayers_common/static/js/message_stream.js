var MessageStream = (function () {
    function MessageStream(options) {
        this.options = {};
        if (options) setOptions(options, this.options);

        // инициализация евент-листа (здесь хендлеры)
        this.eventList = [];
    }

    MessageStream.prototype.addEvent = function(event){
        // event = {key: message | invite_room | leave_room | ... text-type of event,
        //          cbFunc: func
        //          subject: chat | другой объект, повесивший евент }
        // todo: убедиться, что key может быть null - хорошая идея

        for (var i = 0; i < this.eventList.length; i++) {
            var old_event = this.eventList[i];
            if (old_event.key == event.key && old_event.cbFunc == event.cbFunc && old_event.subject == event.subject) {
                console.warn('MessageStream.prototype.addEvent: Повторное добавление: ', event);
                return;
            }
        }

        if (typeof(event.subject[event.cbFunc]) === 'function')
            this.eventList.push(event);
    };

    MessageStream.prototype.runEvents = function (msg) {
        /*
         this.eventList.forEach(function (event) {
         if (!event.key || event.key === msg.type) { // Если !key - то есть если key == null, значит вызвать всегда
         event.subject[event.cbFunc](msg.body);
         }
         });
         */
        var event = null;
        for (var i = 0; i < this.eventList.length; i++) {
            event = this.eventList[i];
            if (!event.key || event.key === msg.type) { // Если !key - то есть если key == null, значит вызвать всегда
                event.subject[event.cbFunc](msg.body);
            }
        }
    };

    return MessageStream;
})();


var MessageConnector = (function () {
    function MessageConnector(options) {
        this.options = {};
        if (options) setOptions(options, this.options);

        this.in_stream = new MessageStream();
        this.out_stream = new MessageStream();
    }

    // Получение сообщения от сервер-коннекторов, т.е. евенты для in_stream
    MessageConnector.prototype.receiveMessage = function(msg){
        //alert('MessageConnector receiveMessage');
        this.in_stream.runEvents(msg);
    };

    // Получение сообщения от клиент-объектов, т.е. евенты для out_stream
    MessageConnector.prototype.sendMessage = function(msg){
        this.out_stream.runEvents(msg)
    };

    MessageConnector.prototype.addInEvent = function(event){
        this.in_stream.addEvent(event);
    };

    MessageConnector.prototype.addOutEvent = function(event){
        this.out_stream.addEvent(event);
    };


    return MessageConnector;
})();


var message_stream = new MessageConnector();








