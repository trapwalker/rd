
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
        if (typeof(event.subject[event.cbFunc]) === 'function')
            this.eventList.push(event);

    };


    MessageStream.prototype.runEvents = function(msg){
        this.eventList.forEach(function (event) {
            if (!event.key || event.key === msg.type) { // Если !key - то есть если key == null, значит вызвать всегда
                // если возвращается false, то нужно снять (удалить) этот листнер
                event.subject[event.cbFunc](msg.body);
            }
        });
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








