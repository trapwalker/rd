

/*
* Контекстная панель.
* Содержит набор контекстных (зависит от контекста) объектов:
*   - войти в локацию
*   - подобрать лут (автоматический подбор лута)
*   - кинуть бартер рядом-стоящим машинкам
* */

var ContextPanel = (function () {
    function ContextPanel() {
        this.location_observer = new EnterToLocationObserver();
        this.invite_barter_observer = new InviteBarterObserver();
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


// todo: Проблема, так как города не удаляются после входа в город и приходят сообщения "такой объект есть на клиенте"
// todo: обойти данную проблему в model_manager.js
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
        console.log('Добавлен статический объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length > 0) {
            this.obs_btn.addClass('cp_button_icon_active');
        }
    };

    EnterToLocationObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        console.log('Удалён статический объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length <= 0) {
            this.obs_btn.removeClass('cp_button_icon_active');
        }
    };

    EnterToLocationObserver.prototype.open_window = function() {
        // Если город один, то просто в него войти
        //if (this.observing_list.length == 1) {
        //    clientManager.sendEnterToLocation(this.observing_list[0].ID);
        //    return;
        //}
        // Если городов и заправок много, то вызывать окно через сервер и на callback добавить список городов
        if (this.observing_list.length >= 1) {
            windowTemplateManager.openUniqueWindow('locations_for_enter', '/context_panel/locations', null, function(content_div) {
                if (contextPanel) contextPanel.location_observer.on_open_window(content_div);
            });
        }
    };

    EnterToLocationObserver.prototype.on_open_window = function(content_div) {
        console.log('EnterToLocationObserver.prototype.on_open_window', content_div);
        var content_div = content_div.find('.context_panel_locatios_content').first();
        if (! content_div) return;

        for (var i = 0; i < this.observing_list.length; i++) {
            var mobj = this.observing_list[i];
            var m_name = mobj.hasOwnProperty('town_name') ? mobj.town_name : mobj.cls;
            var m_div = '<div class="context_panel_location_info">' + m_name +'</div>';
            content_div.append(m_div);
        }
    };

    return EnterToLocationObserver;
})(DistanceObserver);


var InviteBarterObserver = (function(_super){
    __extends(InviteBarterObserver, _super);
    function InviteBarterObserver() {
//        console.log('Создание EnterToLocationObserver ======> ', user.userCar);
        _super.call(this, user.userCar, ['Bot'], 50.0);
    }

    InviteBarterObserver.prototype.on_add_obj = function(mobj) {
        _super.prototype.on_add_obj.call(this, mobj);
        console.log('Добавлен Bot объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length > 0) {
            this.obs_btn.addClass('cp_button_icon_active');
        }
    };

    InviteBarterObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        console.log('Удалён Bot объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
        if (this.observing_list.length <= 0) {
            this.obs_btn.removeClass('cp_button_icon_active');
        }
    };

    return InviteBarterObserver;
})(DistanceObserver);