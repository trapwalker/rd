var VisualManager = (function () {
    function VisualManager() {
        this._model_list = {}; // хранятся объекты {obj: modelObject, list: [visualObjects в]}. Ключ: объект модели
        this._visual_list = []; // хранятся объекты {vo: visualObject, changed: boolean}. Ключ: объект вида
    }

    VisualManager.prototype.addModelObject = function (obj) {
        if (!this._model_list[obj])
            this._model_list[obj] = {
                obj: obj,
                list: []
            }
    };

    VisualManager.prototype.delModelObject = function (obj) {
        if (this._model_list[obj])
            delete this._model_list[obj];
    };

    VisualManager.prototype.changeModelObject = function (obj) {
        if (this._model_list[obj])
            for (var i = 0; i < this._model_list[obj].list.length; i++)
                this._model_list[obj].list[i].changed = true;
    };

    // Добавляет визуальный объект и подписывает его на модельные объекты из model_objects
    VisualManager.prototype.addVisualObject = function (vobj, model_objects) {
        // todo: добавить проверку на присутствие vobj в this._visual_list
        var vo = {obj: vobj, changed: false};
        this._visual_list.push(vo);
        for (var i = 0; i < model_objects.length; i++)
            // если ошибка, значит мы неправильно работаем с моделью и визуалменеджером
            this._model_list[model_objects[i]].list.push(vo);
    };

    // Удаляет визуальный объект и отписывает его от модельных объектов из model_objects
    VisualManager.prototype.delVisualObject = function (vobj, model_objects) {
        var i = 0;
        while ((i < this._visual_list.length) && (this._visual_list[i].obj != vobj)) i++;
        if (i >= this._visual_list.length) return;
        var vo = this._visual_list[i];
        this._visual_list.splice(i, 1);
        for (var j = 0; j < model_objects.length; j++) {
            var mo = this._model_list[model_objects[j]].list;
            var k = 0;
            while ((k < mo.length) && (mo[k] != vo)) k++;
            if (k < mo.length) mo.splice(k, 1);
        }
    };

    // Проходит по всем визуальным объектам и при необходимости перерисовывает их
    // (автоматически вызывается из timeManager)
    VisualManager.prototype.perform = function () {
        for (var i = 0; i < this._visual_list.length; i++) {
            e = this._visual_list[i];
            if (e.changed) {
                e.change();
                e.changed = false;
            }
        }
    };

    return VisualManager;
})();

var visualManager = new VisualManager();
