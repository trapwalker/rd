

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
    }

    EnterToLocationObserver.prototype.on_add_obj = function(mobj) {
        _super.prototype.on_add_obj.call(this, mobj);
        console.log('Добавлен статический объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
    };

    EnterToLocationObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        console.log('Удалён статический объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
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
    };

    InviteBarterObserver.prototype.on_del_obj = function(mobj) {
        _super.prototype.on_del_obj.call(this, mobj);
        console.log('Удалён Bot объект: ', mobj);

        // Теперь обновить вёрстку в зависимости от размера списка observing_list
    };

    return InviteBarterObserver;
})(DistanceObserver);