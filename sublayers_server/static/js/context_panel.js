/*
* Контекстная панель.
* Содержит набор контекстных (зависит от контекста) объектов:
*   - войти в локацию
*   - подобрать лут (автоматический подбор лута)
*   - кинуть бартер рядом-стоящим машинкам
*   - просмотреть список своих бартеров
* */


// todo: удаление делать так: так как все Observerы - это визуальные объекты, то перехватить метод удаления визуального объекта
// или в модел_менеджер поставить вызов на удаление своей машинки - это правильнее))

var ContextPanel = (function () {
    function ContextPanel() {
        this.location_observer = new EnterToLocationObserver();
        this.invite_barter_observer = new InviteBarterObserver();
        this.activate_barter_manager = new CPActivateBarterManager();
    }

    ContextPanel.prototype.addModelObject = function(mobj) {
        this.location_observer.addModelObject(mobj);
        this.invite_barter_observer.addModelObject(mobj);
    };



    return ContextPanel;
})();

var contextPanel;


/*
* Менеджер работает по принципу радара - то есть он унаследован от VisualObject и добавляет в свою прослушку остальные объекты
* Когда объекты меняются, у него вызывается пересчёт.
* Он сам проверяет расстояния до городов и других локаций
* По такому принципу можно сделать и проверку бартера
* По такому принципу можно сделать и проверку сундуков
* */
var DistanceObserver = (function(_super){
    __extends(DistanceObserver, _super);
    function DistanceObserver(target_obj, cls_list, observing_radius) {
        _super.call(this, [target_obj]);
        this.target_obj = target_obj;
        this.cls_list = cls_list;
        this.observing_radius = observing_radius;
        this.observing_radius2 = observing_radius * observing_radius;
        this.observing_list = [];  // в этом списке всегда хранится актуальная информация

    };

    // вызывается из клиент-менеджера при эвенте See
    DistanceObserver.prototype.addModelObject = function (mobj) {
        //todo: если данный объект нам подходит, то мы его добавляем в список
        if ((this.cls_list.indexOf(mobj.cls) >= 0) &&
            ((mobj instanceof StaticObject) || (mobj instanceof DynamicObject)) &&
            (this.target_obj != mobj)) {
//            console.log('Добавлен новый модельный объект типа ' + mobj.cls + '[' + mobj.ID + ']');
            _super.prototype.addModelObject.call(this, mobj);
            this.change(clock.getCurrentTime());
        }
    };

    DistanceObserver.prototype.delModelObject = function (mobj) {
        this._del_from_observing_list(mobj);
        _super.prototype.delModelObject.call(this, mobj);
    };

    DistanceObserver.prototype._add_to_observing_list = function (mobj) {
        if (this.observing_list.indexOf(mobj) < 0) {
            this.observing_list.push(mobj);
            this.on_add_obj(mobj);
        }
    };

    DistanceObserver.prototype._del_from_observing_list = function (mobj) {
        var index = this.observing_list.indexOf(mobj);
        if (index >= 0) {
            this.observing_list.splice(index, 1);
            this.on_del_obj(mobj);
        }
    };

    DistanceObserver.prototype.change = function (time) {
//        console.log('DistanceObserver.prototype.change   ', time);
        var t_point = this.target_obj.getCurrentCoord(time);
        for (var i = 0; i < this._model_objects.length; i++) {
            var mobj = this._model_objects[i];
            if (this.target_obj != mobj) {
                if (this.observing_radius2 > distancePoints2(t_point, mobj.getCurrentCoord(time))) {
                    this._add_to_observing_list(mobj);
                } else {
                    this._del_from_observing_list(mobj);
                }
            }
        }
    };

    DistanceObserver.prototype.on_add_obj = function(mobj) {};

    DistanceObserver.prototype.on_del_obj = function(mobj) {};

    return DistanceObserver;
})(VisualObject);


var EnterToLocationObserver = (function(_super){
    __extends(EnterToLocationObserver, _super);
    function EnterToLocationObserver() {
//        console.log('Создание EnterToLocationObserver ======> ', user.userCar);
        _super.call(this, user.userCar, ['GasStation', 'Town'], 100.0);

        // Вешаем клик на див с икнонкой
        this.obs_btn = $('#cpEnterToLocationIcon');
        this.obs_btn.click(function() {
            if (contextPanel) contextPanel.location_observer.open_window();
        })
    }

    EnterToLocationObserver.prototype.on_add_obj = function(mobj) {
        _super.prototype.on_add_obj.call(this, mobj);
        //console.log('Добавлен статический объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length > 0) {
            this.obs_btn.addClass('cp_button_icon_active');
        }
    };

    EnterToLocationObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        //console.log('Удалён статический объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length <= 0) {
            this.obs_btn.removeClass('cp_button_icon_active');
        }
    };

    EnterToLocationObserver.prototype.open_window = function() {
        // Если город один, то просто в него войти
        if (this.observing_list.length == 1) {
            clientManager.sendEnterToLocation(this.observing_list[0].ID);
            return;
        }
        // Если городов и заправок много, то вызывать окно через сервер и на callback добавить список городов
        if (this.observing_list.length > 1) {
            windowTemplateManager.openUniqueWindow('locations_for_enter', '/context_panel/locations', null, function(content_div) {
                if (contextPanel) contextPanel.location_observer.on_open_window(content_div);
            });
        }
    };

    EnterToLocationObserver.prototype.on_open_window = function(window_content_div) {
        //console.log('EnterToLocationObserver.prototype.on_open_window', window_content_div);
        var content_div = window_content_div.find('.context_panel_locatios_content').first();
        if (! content_div) return;

        for (var i = 0; i < this.observing_list.length; i++) {
            var mobj = this.observing_list[i];
            var m_name = mobj.hasOwnProperty('town_name') ? mobj.town_name : mobj.cls;
            var m_div = '<div class="context_panel_location_info"' +
                ' onClick="contextPanel.location_observer.activate_window('+ mobj.ID +');"'+
                '>' + m_name +'</div>';
            content_div.append(m_div);
        }
    };


    EnterToLocationObserver.prototype.activate_window = function(location_id) {
        console.log('EnterToLocationObserver.prototype.activate_window', location_id);
        for (var i = 0; i < this.observing_list.length; i++) {
            var mobj_id = this.observing_list[i].ID;
            if (mobj_id == location_id) clientManager.sendEnterToLocation(mobj_id);
        }
    };

    return EnterToLocationObserver;
})(DistanceObserver);


var InviteBarterObserver = (function(_super){
    __extends(InviteBarterObserver, _super);
    function InviteBarterObserver() {
//        console.log('Создание EnterToLocationObserver ======> ', user.userCar);
        _super.call(this, user.userCar, ['Bot'], 50.0);

        // Вешаем клик на див с икнонкой
        this.obs_btn = $('#cpBarterSendInvite');
        this.obs_btn.click(function() {
            if (contextPanel) contextPanel.invite_barter_observer.open_window();
        })
    }

    InviteBarterObserver.prototype.on_add_obj = function(mobj) {
        _super.prototype.on_add_obj.call(this, mobj);
        //console.log('Добавлен Bot объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length > 0) {
            this.obs_btn.addClass('cp_button_icon_active');
        }
    };

    InviteBarterObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        //console.log('Удалён Bot объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length <= 0) {
            this.obs_btn.removeClass('cp_button_icon_active');
        }
    };

    InviteBarterObserver.prototype.open_window = function() {
        // Открывать окно в любом случае, так как нужно конкретно видеть кому кидается инвайт
        if (this.observing_list.length > 0) {
            windowTemplateManager.openUniqueWindow('cp_send_barter', '/context_panel/barter_send', null, function(content_div) {
                if (contextPanel) contextPanel.invite_barter_observer.on_open_window(content_div);
            });
        }
    };

    InviteBarterObserver.prototype.on_open_window = function(window_content_div) {
        //console.log('InviteBarterObserver.prototype.on_open_window', window_content_div);
        var content_div = window_content_div.find('.context_panel_send_barter_content').first();
        if (! content_div) return;

        for (var i = 0; i < this.observing_list.length; i++) {
            var mobj = this.observing_list[i];
            if ((mobj.owner) && (mobj.owner.login)){
                var login = mobj.owner.login;
                var m_div = '<div class="context_panel_send_barter_user_info"' +
                ' onClick="contextPanel.invite_barter_observer.activate_window('+ login +');' +
                    'windowTemplateManager.closeUniqueWindow(`cp_send_barter`)"'+
                '>' + login +'</div>';
                content_div.append(m_div);
            }
        }
    };

    InviteBarterObserver.prototype.activate_window = function(recipient_login) {
        //console.log('InviteBarterObserver.prototype.activate_window', recipient_login);
        for (var i = 0; i < this.observing_list.length; i++) {
            var mobj = this.observing_list[i];
            if ((mobj.owner) && (mobj.owner.login) && (mobj.owner.login == recipient_login))
                clientManager.sendInitBarter(recipient_login);
        }
    };

    return InviteBarterObserver;
})(DistanceObserver);


var CPActivateBarterManager = (function () {
    function CPActivateBarterManager() {
        this.barters = [];

        // Вешаем клик на див с икнонкой
        this.obs_btn = $('#cpBarterInfoInvite');
        this.obs_btn.click(function() {
            if (contextPanel) contextPanel.activate_barter_manager.open_window();
        })
    }

    CPActivateBarterManager.prototype.open_window = function() {
        if (this.barters.length > 0) {
            windowTemplateManager.openUniqueWindow('cp_barter_info', '/context_panel/barter_info', null);
        }
    };

    CPActivateBarterManager.prototype.add_barter = function(barter_id) {
        if (this.barters.indexOf(barter_id) >= 0) return;
        this.barters.push(barter_id.toString());

        if (this.barters.length > 0) {
            this.obs_btn.addClass('cp_button_icon_active');
        }
    };

    CPActivateBarterManager.prototype.del_barter = function(barter_id) {
        var index = this.barters.indexOf(barter_id.toString());
        if (index < 0) return;
        this.barters.splice(index, 1);

        if (this.barters.length <= 0) {
            this.obs_btn.removeClass('cp_button_icon_active');
        }

    };

    CPActivateBarterManager.prototype.activate_barter = function(barter_id) {
        //console.log('CPActivateBarterManager.prototype.activate_barter', barter_id);
        this.del_barter(barter_id);
        clientManager.sendActivateBarter(barter_id);
    };


    return CPActivateBarterManager;
})();