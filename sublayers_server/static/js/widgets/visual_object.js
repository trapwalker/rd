var VisualObject = (function () {
    function VisualObject(model_objects) {
        this._model_objects = [];
        for (var i = 0; i < model_objects.length; i++) {
            this._model_objects.push(model_objects[i])
        }
        this.addToVisualManager();
    }

    VisualObject.prototype.addToVisualManager = function () {
        visualManager.addVisualObject(this, this._model_objects)
    };

    VisualObject.prototype.delFromVisualManager = function () {
        visualManager.delVisualObject(this, this._model_objects)
    };

    return VisualObject;
})();
