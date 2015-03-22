var WindowTemplateManager = (function () {
    function WindowTemplateManager() {
        this.unique = {}; // ассоциативный массив для уникальных окон, имеющих имя


    }


    WindowTemplateManager.prototype.openUniqueWindow = function (win_name, win_url) {
        var self = this;
        if (this.unique[win_name] != null) this.closeUniqueWindow(win_name);
        // todo: возможно стоит передавать уникальное имя в сам объект-окно, чтобы когда окно закрывается само, оно закрывалось через этот менеджер
        $.ajax({
            url: "http://" + location.host + win_url,
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

                self.unique[win_name] = temp_window;
            }
        });
    };


    WindowTemplateManager.prototype.closeUniqueWindow = function (win_name) {
        if (this.unique[win_name] != null) {
            this.unique[win_name].closeWindow();
            this.unique[win_name] = null;
        }
    };


    return WindowTemplateManager;
})();


var windowTemplateManager = new WindowTemplateManager();