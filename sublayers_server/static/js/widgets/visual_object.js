var VisualObject = (function () {
    function VisualObject(model_objects) {
        this._model_objects = [];
        for (var i = 0; i < model_objects.length; i++)
            this._model_objects.push(model_objects[i])
        this.addToVisualManager();
    }

    VisualObject.prototype.addModelObject = function (mobj) {
        // Проверяем нет ли уже такого модельного объекта в _model_objects
        var i = 0;
        while ((i < this._model_objects.length) && (this._model_objects[i] != mobj)) i++;
        if (i < this._model_objects.length) return false;

        // Добавляем объект и подписку
        this._model_objects.push(mobj);
        visualManager.bindMobjToVobj(this, mobj);
        return true;
    };

    VisualObject.prototype.delModelObject = function (mobj) {
        //console.log('VisualObject.prototype.delModelObject');
        // Проверяем наличие модельного объекта в _model_objects
        var i = 0;
        while ((i < this._model_objects.length) && (this._model_objects[i] != mobj)) i++;
        if (i >= this._model_objects.length) return false;

        // Удаляем объект и подписку
        this._model_objects.splice(i, 1);
        visualManager.unbindMobjToVobj(this, mobj);

        // Удалить визуальный объект в случае если нет ни одного подписаного на него модельного объекта
        if (this._model_objects.length == 0)
            this.delFromVisualManager();
        return true;
    };

    VisualObject.prototype.addToVisualManager = function () {
        //console.log('VisualObject.prototype.addToVisualManager');
        visualManager.addVisualObject(this, this._model_objects);
    };

    VisualObject.prototype.delFromVisualManager = function () {
        //console.log('VisualObject.prototype.delFromVisualManager');
        visualManager.delVisualObject(this, this._model_objects);
    };

    return VisualObject;
})();
