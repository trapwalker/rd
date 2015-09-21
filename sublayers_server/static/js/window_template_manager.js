var WindowTemplateManager = (function () {
    function WindowTemplateManager() {
        this.unique = {}; // ассоциативный массив для уникальных окон, имеющих имя
    }

    WindowTemplateManager.prototype.closeAllWindows = function () {
        for(var key in this.unique)
            if (this.unique.hasOwnProperty(key))
                this.closeUniqueWindow(key);
    };

    WindowTemplateManager.prototype.openUniqueWindow = function (win_name, win_url, win_data, call_back) {
        var self = this;
        if (this.unique[win_name] != null) this.closeUniqueWindow(win_name);
        // todo: возможно стоит передавать уникальное имя в сам объект-окно, чтобы когда окно закрывается само, оно закрывалось через этот менеджер
        this.unique[win_name] = 'waiting';
        $.ajax({
            url: "http://" + location.host + '/api' + win_url,
            data: win_data,
            success: function(data){
                if (self.unique[win_name] != 'waiting') return;
                var temp_window = new TemplateWindow({
                    parentDiv: 'bodydiv',
                    win_name: win_name
                });
                temp_window.mainDiv.append(data);
                temp_window.showWindow(true);
                var drag_elem = temp_window.mainDiv.find('.windowDragCloseHeader-main').first();
                var close_elem = temp_window.mainDiv.find('.windowDragCloseHeader-close').first();
                temp_window.setupDragElement(drag_elem);
                temp_window.setupCloseElement(close_elem);

                self.unique[win_name] = temp_window;

                if (call_back) call_back(temp_window.mainDiv);
            }
        });
    };

    WindowTemplateManager.prototype.openWindow = function (win_url, win_data) {
        $.ajax({
            url: "http://" + location.host + win_url,
            data: win_data,
            success: function(data){
                var temp_window = new TemplateWindow({
                    parentDiv: 'bodydiv'
                });
                temp_window.mainDiv.append(data);
                temp_window.showWindow(true);
                var drag_elem = temp_window.mainDiv.find('.windowDragCloseHeader-main').first();
                var close_elem = temp_window.mainDiv.find('.windowDragCloseHeader-close').first();
                temp_window.setupDragElement(drag_elem);
                temp_window.setupCloseElement(close_elem);
            }
        });
    };

    WindowTemplateManager.prototype.closeUniqueWindow = function (win_name) {
        if (this.unique[win_name] != null) {
            if (this.unique[win_name] != 'waiting')
                this.unique[win_name].closeWindow();
            this.unique[win_name] = null;
        }
    };

    WindowTemplateManager.prototype.isOpen = function (win_name) {
        return (this.unique[win_name]) && (this.unique[win_name] != null)
    };

    WindowTemplateManager.prototype.isClose = function (win_name) {
        return (!this.unique[win_name]) || (this.unique[win_name] == null)
    };

    return WindowTemplateManager;
})();


var windowTemplateManager = new WindowTemplateManager();