var GeneratorID = (function () {
    function GeneratorID() {
        this._id = 0;
    }

    GeneratorID.prototype.getID = function () {
        this._id--;
        return this._id;
    };

    return GeneratorID;
})();

var generator_ID = new GeneratorID();