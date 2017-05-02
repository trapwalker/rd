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
        this.get_loot_observer = new GetLootObserver();
    }

    ContextPanel.prototype.addModelObject = function(mobj) {
        this.location_observer.addModelObject(mobj);
        this.invite_barter_observer.addModelObject(mobj);
        this.get_loot_observer.addModelObject(mobj);
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
        //console.log('DistanceObserver.prototype.change');
        var t_point = this.target_obj.getCurrentCoord(time);
        for (var i = 0; i < this._model_objects.length; i++) {
            var mobj = this._model_objects[i];
            if (this.target_obj != mobj) {
                if (this._get_compare_distance(mobj, time) > distancePoints2(t_point, mobj.getCurrentCoord(time))) {
                    this._add_to_observing_list(mobj);
                } else {
                    this._del_from_observing_list(mobj);
                }
            }
        }
    };

    DistanceObserver.prototype._get_compare_distance = function(mobj, time) {
        return this.observing_radius2;
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
        });
        this.obs_btn.removeClass('active');
    }

    EnterToLocationObserver.prototype._get_compare_distance = function(mobj, time) {
        if (mobj.hasOwnProperty('p_observing_range'))
            return mobj.p_observing_range * mobj.p_observing_range;
        return _super.prototype._get_compare_distance.call(this, mobj, time);
    };

    EnterToLocationObserver.prototype.on_add_obj = function(mobj) {
        _super.prototype.on_add_obj.call(this, mobj);
        //console.log('Добавлен статический объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length > 0) {
            this.obs_btn.addClass('active');
        }
    };

    EnterToLocationObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        //console.log('Удалён статический объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length <= 0) {
            this.obs_btn.removeClass('active');
        }
    };

    EnterToLocationObserver.prototype.open_window = function() {
        if (this.observing_list.length <= 0 ) return;
        if (this.observing_list.length == 1)
            this.activate_window(this.observing_list[0].ID);
        else
            windowTemplateManager.openUniqueWindow('locations_for_enter', '/context_panel/locations', null,
                contextPanel.location_observer.on_open_window);
    };

    EnterToLocationObserver.prototype.on_open_window = function(jq_window_div) {
        //console.log('EnterToLocationObserver.prototype.on_open_window', window_content_div);
        var self = contextPanel.location_observer;
        var jq_content_div = jq_window_div.find('.context-list').first();
        if (!jq_content_div) return;

        for (var i = 0; i < self.observing_list.length; i++) {
            var mobj = self.observing_list[i];
            var m_name = mobj.hasOwnProperty('town_name') ? mobj.town_name : mobj.cls;
            jq_content_div.append('<div class="context-list-item" data-id="' + mobj.ID + '">' + m_name +'</div>');
        }
        jq_content_div.find('.context-list-item').first().css('border', 'none');
        jq_content_div.find('.context-list-item').click(function() {
            contextPanel.location_observer.activate_window($(this).data('id'));
        });
    };

    EnterToLocationObserver.prototype.activate_window = function(location_id) {
        //console.log('EnterToLocationObserver.prototype.activate_window', location_id);
        for (var i = 0; i < this.observing_list.length; i++) {
            var mobj_id = this.observing_list[i].ID;
            if (mobj_id == location_id) {
                windowTemplateManager.closeUniqueWindow('locations_for_enter');
                clientManager.sendEnterToLocation(mobj_id);
            }
        }
    };

    return EnterToLocationObserver;
})(DistanceObserver);


var InviteBarterObserver = (function(_super){
    __extends(InviteBarterObserver, _super);
    function InviteBarterObserver() {
        _super.call(this, user.userCar, ['Bot'], 50.0);

        // Вешаем клик на див с икнонкой
        this.obs_btn = $('#cpBarterSendInvite');
        this.obs_btn.click(function() {
            if (contextPanel) contextPanel.invite_barter_observer.open_window();
        });
        this.obs_btn.removeClass('active');
    }

    InviteBarterObserver.prototype.on_add_obj = function(mobj) {
        _super.prototype.on_add_obj.call(this, mobj);
        //console.log('Добавлен Bot объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length > 0) {
            this.obs_btn.addClass('active');
        }
    };

    InviteBarterObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        //console.log('Удалён Bot объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length <= 0) {
            this.obs_btn.removeClass('active');
        }

        if (mobj.owner && mobj.owner.login) {
            clientManager.sendOutBarterRange(mobj.owner.login);
        }
        else {
            console.warn(mobj, ' Не найдено mobj.owner или mobj.owner.login');
        }
    };

    InviteBarterObserver.prototype.open_window = function() {
        // Открывать окно в любом случае, так как нужно конкретно видеть кому кидается инвайт
        if (this.observing_list.length <= 0) return;
        if (this.observing_list.length == 1)
            this.activate_window(this.observing_list[0].owner.login);
        else
            windowTemplateManager.openUniqueWindow('cp_send_barter', '/context_panel/barter_send', null, contextPanel.invite_barter_observer.on_open_window);
    };

    InviteBarterObserver.prototype.on_open_window = function(jq_window_div) {
        //console.log('InviteBarterObserver.prototype.on_open_window', jq_window_div);
        var self = contextPanel.invite_barter_observer;
        var jq_content_div = jq_window_div.find('.context-list').first();
        if (!jq_content_div) return;
        for (var i = 0; i < self.observing_list.length; i++) {
            var mobj = self.observing_list[i];
            if ((mobj.owner) && (mobj.owner.login)) {
                var print_name = mobj.owner.quick ? getQuickUserLogin(mobj.owner.login) : mobj.owner.login;
                jq_content_div.append('<div class="context-list-item" data-login="' + mobj.owner.login + '">' + print_name +'</div>');
            }

            //if ((mobj.owner) && (mobj.owner.login))
            //    jq_content_div.append('<div class="context-list-item" data-login="' + mobj.owner.login + '">' + mobj.owner.login +'</div>');
        }
        jq_content_div.find('.context-list-item').first().css('border', 'none');
        jq_content_div.find('.context-list-item').click(function() {
            contextPanel.invite_barter_observer.activate_window($(this).data('login'));
        });
    };

    InviteBarterObserver.prototype.activate_window = function(recipient_login) {
        //console.log('InviteBarterObserver.prototype.activate_window', recipient_login);
        for (var i = 0; i < this.observing_list.length; i++) {
            var mobj = this.observing_list[i];
            if ((mobj.owner) && (mobj.owner.login) && (mobj.owner.login == recipient_login)) {
                windowTemplateManager.closeUniqueWindow('cp_send_barter');
                clientManager.sendInitBarter(recipient_login);
            }
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
        });
        this.obs_btn.removeClass('active');
    }

    CPActivateBarterManager.prototype.add_barter = function(barter_id, sender_name) {
        for (var i = 0; i < this.barters.length; i++)
            if (this.barters[i].id == barter_id) return;
        this.barters.push({ id: barter_id, sender: sender_name });
        if (this.barters.length > 0)
            this.obs_btn.addClass('active');
    };

    CPActivateBarterManager.prototype.del_barter = function(barter_id) {
        var index = -1;
        for (var i = 0; i < this.barters.length; i++)
            if (this.barters[i].id == barter_id) {
                index = i;
                break;
            }
        if (index < 0) return;
        this.barters.splice(index, 1);
        if (this.barters.length <= 0)
            this.obs_btn.removeClass('active');
    };

    CPActivateBarterManager.prototype.open_window = function() {
        if (this.barters.length > 0) {
            windowTemplateManager.openUniqueWindow('cp_barter_info', '/context_panel/barter_info', null,
                contextPanel.activate_barter_manager.on_open_window);
        }
    };

    CPActivateBarterManager.prototype.on_open_window = function(jq_window_div) {
        //console.log('CPActivateBarterManager.prototype.on_open_window', jq_window_div);
        var self = contextPanel.activate_barter_manager;
        var jq_content_div = jq_window_div.find('.context-list').first();
        if (!jq_content_div) return;
        for (var i = 0; i < self.barters.length; i++) {
            var barter = self.barters[i];
            var print_name = user.quick ? getQuickUserLogin(user.login) : user.login;
            jq_content_div.append('<div class="context-list-item" data-id="' + barter.id + '">' + print_name + ' < > ' + barter.sender +'</div>');
        }
        jq_content_div.find('.context-list-item').first().css('border', 'none');
        jq_content_div.find('.context-list-item').click(function() {
            contextPanel.activate_barter_manager.activate_barter($(this).data('id'));
        });
    };

    CPActivateBarterManager.prototype.activate_barter = function(barter_id) {
        //console.log('CPActivateBarterManager.prototype.activate_barter', barter_id);
        windowTemplateManager.closeUniqueWindow('cp_barter_info');
        clientManager.sendActivateBarter(barter_id);
    };

    return CPActivateBarterManager;
})();


var GetLootObserver = (function(_super){
    __extends(GetLootObserver, _super);
    function GetLootObserver() {
        _super.call(this, user.userCar, ['POICorpse', 'POILoot'], 50);
        // Вешаем клик на див с икнонкой
        this.obs_btn = $('#cpGetLootIcon');
        this.obs_btn.click(function() {
            if (contextPanel) contextPanel.get_loot_observer.activate();
        });
        this.obs_btn.removeClass('active');
        this._is_active = false;
    }

    GetLootObserver.prototype._get_compare_distance = function(mobj, time) {
        if (mobj.hasOwnProperty('p_observing_range'))
            return mobj.p_observing_range * mobj.p_observing_range;
        return _super.prototype._get_compare_distance.call(this, mobj, time);
    };

    GetLootObserver.prototype.on_add_obj = function(mobj) {
        _super.prototype.on_add_obj.call(this, mobj);
        if (this.observing_list.length > 0) {
            this.obs_btn.addClass('active');
            this._is_active = true;
        }
        // Включить подсветку лута
        var marker = visualManager.getVobjByType(mobj, WCanvasLootMarker);
        if (marker) marker.is_backlight = true;
    };

    GetLootObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        if (this.observing_list.length <= 0) {
            this.obs_btn.removeClass('active');
            this._is_active = false;
        }
        // Выключить подсветку лута
        var marker = visualManager.getVobjByType(mobj, WCanvasLootMarker);
        if (marker) marker.is_backlight = false;
    };

    GetLootObserver.prototype.activate = function() {
        if (! this._is_active) return;
        clientManager.sendMassiveLootAround();
    };

    return GetLootObserver;
})(DistanceObserver);
