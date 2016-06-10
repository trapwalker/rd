


var EditorManager = (function(){
    function EditorManager(){
        message_stream.addInEvent({
            key: 'ws_message',
            cbFunc: this.receiveMessage,
            subject: this
        });
    };

    EditorManager.prototype.sendMessage = function(msg){
        //alert('EditorManager  sendMessage');

        // формирование и отправка мессаджа
        message_stream.sendMessage({
            type: 'ws_message_send',
            body: msg
        });
    };


    EditorManager.prototype.receiveMessage = function (self, params) {
        alert('EditorManager receiveMessage');
        alert(params);

        return true;
    };



    return EditorManager;
})();