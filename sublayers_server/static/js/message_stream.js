
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
        if (typeof(event.cbFunc) === 'function')
            this.eventList.push(event);
    };


    MessageStream.prototype.runEvents = function(msg){
        var delet_list = [];
        var type = msg.type;
        for(var index = 0; index < this.eventList.length; index++) {
            var event = this.eventList[index];
            if (!event.key || event.key === type) { // Если !key - то есть если key == null, значит вызвать всегда
                // если возвращается false, то нужно снять (удалить) этот листнер
                if(! event.cbFunc(event.subject, msg.body))
                    delet_list.push(index);
            }
        }

        // удаление ненужных event
        for (; delet_list.length > 0;) {
            var event_index = delet_list.pop();
            this.eventList.splice(event_index, 1);
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








