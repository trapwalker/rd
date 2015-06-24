var TownVisitorsManager = (function () {

    function TownVisitorsManager() {
        this.visitors = [];
    }

    TownVisitorsManager.prototype.add_visitor = function (visitor) {
        if (this.visitors.indexOf(visitor) < 0) {
            this.visitors.push(visitor);
            // изменение вёрстки
        }
    };

    TownVisitorsManager.prototype.del_visitor = function (visitor) {
        if (this.visitors.indexOf(visitor) >= 0) {
            this.visitors.push(visitor);
            // изменение вёрстки
        }
    };

    TownVisitorsManager.prototype.clear_visitors = function() {
        this.visitors = [];
    };

    return TownVisitorsManager;
})();


var townVisitorsManager = new TownVisitorsManager();
