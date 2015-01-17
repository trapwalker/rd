var VisualManager = (function () {
    function VisualManager() {
        this._model_list = {}; // хранятся объекты {obj: modelObject, list: [visualObjects в]}. Ключ: объект модели
        this._visual_list = []; // хранятся объекты {vo: visualObject, changed: boolean}. Ключ: объект вида
    }

    VisualManager.prototype.addModelObject = function (mobj) {
        console.log('VisualManager.prototype.addModelObject', mobj, this._model_list[mobj.ID]);
        if (!this._model_list[mobj.ID])
            this._model_list[mobj.ID] = {
                obj: mobj,
                list: []
            };
        console.log('_model_list = ', this._model_list);
    };

    VisualManager.prototype.delModelObject = function (mobj) {
        if (this._model_list[mobj.ID])
            delete this._model_list[mobj.ID];
    };

    VisualManager.prototype.changeModelObject = function (mobj) {
        console.log('VisualManager.prototype.changeModelObject', mobj);
        console.log(this._model_list);
        if (this._model_list[mobj.ID])
            for (var i = 0; i < this._model_list[mobj.ID].list.length; i++)
                this._model_list[mobj.ID].list[i].changed = true;
    };

    // Возвращается список визуальных объектов для переданного модельного объекта
    VisualManager.prototype.getVobjsByMobj = function(mobj){
        var res_list = [];
        var list = this._model_list[mobj.ID].list;
        for (var i=0; i< list.length; i++)
            res_list.push(list[i].obj);
    };

    // Добавляет визуальный объект и подписывает его на модельные объекты из model_objects
    VisualManager.prototype.addVisualObject = function (vobj, model_objects) {
        console.log('VisualManager.prototype.addVisualObject', model_objects);
        // todo: добавить проверку на присутствие vobj в this._visual_list
        var vo = {obj: vobj, changed: false};
        this._visual_list.push(vo);
        for (var i = 0; i < model_objects.length; i++)
            // если ошибка, значит мы неправильно работаем с моделью и визуалменеджером
            this._model_list[model_objects[i].ID].list.push(vo);
    };

    // Удаляет визуальный объект и отписывает его от модельных объектов из model_objects
    VisualManager.prototype.delVisualObject = function (vobj, model_objects) {
        var i = 0;
        while ((i < this._visual_list.length) && (this._visual_list[i].obj != vobj)) i++;
        if (i >= this._visual_list.length) return;
        var vo = this._visual_list[i];
        this._visual_list.splice(i, 1);
        for (var j = 0; j < model_objects.length; j++) {
            var mo = this._model_list[model_objects[j].ID].list;
            var k = 0;
            while ((k < mo.length) && (mo[k] != vo)) k++;
            if (k < mo.length) mo.splice(k, 1);
        }
    };

    // Проходит по всем визуальным объектам и при необходимости перерисовывает их
    // (автоматически вызывается из timeManager)
    VisualManager.prototype.perform = function (time) {
        for (var i = 0; i < this._visual_list.length; i++) {
            e = this._visual_list[i];
            if (e.changed) {
                e.obj.change(time);
                e.changed = false;
            }
        }
    };

    return VisualManager;
})();

var visualManager = new VisualManager();
