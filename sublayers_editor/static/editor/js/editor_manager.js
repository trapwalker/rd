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
        // TODO: сейчас данная функция вызывается из функций wsjson.js, позже переделать!

        // формирование и отправка мессаджа
        message_stream.sendMessage({
            type: 'ws_message_send',
            body: msg
        });
    };


    EditorManager.prototype.receiveMessage = function (self, params) {
        //alert('EditorManager receiveMessage');
        params.obj.id = params.obj._id['$oid'];

        switch (params.cls){
            case 'addObject':
                repositoryMO.addObjectFromServer(params.obj.object_type, params.obj);
                break;
            case 'delObject':
                repositoryMO.delObjectFromServer(params.obj.object_type, params.obj.id);
                break;
            case 'changeObject':
                repositoryMO.changeObjectFromServer(params.obj.object_type, params.obj);
                break;
            default:
                break;
        }

        return true;
    };

    EditorManager.prototype.addObject = function(obj){
        var mes = {
            call: "addObject",
            params: obj
        };
        this.sendMessage(mes);
    };

    EditorManager.prototype.delObject = function(id){
        var mes = {
            call: "delObject",
            params: {id: id}
        };
        this.sendMessage(mes);
    };

    EditorManager.prototype.changeObject = function(obj){
        var mes = {
            call: "changeObject",
            params: obj
        };
        this.sendMessage(mes);
    };


    return EditorManager;
})();