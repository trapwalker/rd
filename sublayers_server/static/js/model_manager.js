/*
* Класс для управления моделью.
* Подписывается на события входящих сообщений от вебсокета
* Отсылает исходящие сообщения в поток сообщений
*
* */



var ModelManager = ( function(){
    function ModelManager(){
        // подписаться на входящие сообщения типа ws_message
        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: this.receiveMessage,
            subject: this
        });
    }

    ModelManager.prototype.sendMessage = function(msg){
        //alert('ModelManager  sendMessage');
        // TODO: сейчас данная функция вызывается из функций wsjson.js, позже переделать!

        // формирование и отправка мессаджа
        message_stream.sendMessage({
            type: 'ws_message_send',
            body: msg
        });
    };



    ModelManager.prototype.receiveMessage = function (self, params) {
        //alert('ModelManager   receiveMessage');
        // TODO: написать правильный обработчик здесь. А пока так
        receiveMesFromServ(params);
        return true;
    };





    return ModelManager;
})();