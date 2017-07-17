/*
* В этот объект-синглтон будут добавляться другие объекты во время начала своей загрузки
* Затем этот объект будет ждать окончания загрузки всех объектов (они по завершению должны сообщить)
* И только после завершения загрузки всех объектов вызовется метод load_complete
*/


var ResourceLoadManager = (function () {

    function ResourceLoadManager() {
        this.resource_list = [];
        // todo: сделать setTimeout на несколько секунд вперёд, чтобы сообщить в консоль, какие объекты не загружены ещё.
        this.load_complete_called = false;
        this.load_complete_init = false;

        // Если есть settings_connection_delay, то добавить себя в список ожидания и удалить после
        setTimeout(function () {
            var d = parseFloat($('#settings_connection_delay').text()) || 0;
            if (d > 0) {
                console.log('ws_connect_delay: ', d);
                setTimeout(function () {resourceLoadManager.add(resourceLoadManager);}, 0);
                setTimeout(function () {resourceLoadManager.del(resourceLoadManager);}, d * 1000);
            }
        }, 0);

    }

    ResourceLoadManager.prototype.add = function (obj) {
        //console.log('ResourceLoadManager: ', obj, '   added');
        this.resource_list.push(obj);
    };

    ResourceLoadManager.prototype.del = function (obj) {
        //console.log('ResourceLoadManager: load complete for ', obj);
        var index = -1;
        for (var i = 0; i < this.resource_list.length; i++)
            if (obj == this.resource_list[i])
                index = i;
        if (index >= 0)
            this.resource_list.splice(index, 1);
        if ((this.resource_list.length == 0) && this.load_complete_init)
            this.load_complete();
    };

    ResourceLoadManager.prototype.load_complete = function () {
        if (this.load_complete_called) return;
        this.load_complete_called = true;
        ws_connector.connect();
    };

    return ResourceLoadManager;
})();


var resourceLoadManager = new ResourceLoadManager();

