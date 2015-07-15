var TownVisitorsManager = (function () {

    function TownVisitorsManager() {
        this.visitors = [];
    }

    TownVisitorsManager.prototype.visitor_record_click = function (event) {
        //console.log('TownVisitorsManager.prototype.visitor_record_click');
        clientManager.sendCreatePrivateChat($(event.target).data('visitor'))
    };

    TownVisitorsManager.prototype.add_visitor_record = function (visitor) {
        var visitorDiv = $('<div id="visitorRecord_' + visitor + '" class="VMG-message-message sublayers-clickable visitorRecord">' + visitor + '</div>');
        visitorDiv.data('visitor', visitor);
        visitorDiv.click(this.visitor_record_click);
        $('#visitorList').append(visitorDiv);
    };

    TownVisitorsManager.prototype.add_visitor = function (visitor) {
        //console.log('TownVisitorsManager.prototype.add_visitor');
        if (this.visitors.indexOf(visitor) < 0) {
            this.visitors.push(visitor);
            this.add_visitor_record(visitor);
        }
    };

    TownVisitorsManager.prototype.del_visitor_record = function (visitor) {
        $('#visitorRecord_' + visitor).remove();
    };

    TownVisitorsManager.prototype.del_visitor = function (visitor) {
        //console.log('TownVisitorsManager.prototype.del_visitor');
        var visitorIndex = this.visitors.indexOf(visitor);
        if (visitorIndex >= 0) {
            this.visitors.splice(visitorIndex, 1);
            this.del_visitor_record(visitor);
        }
    };

    TownVisitorsManager.prototype.clear_visitors = function() {
        for (var i = 0; i < this.visitors.length; i++)
            this.del_visitor_record(this.visitors[i]);
        this.visitors = [];
    };

    TownVisitorsManager.prototype.update_visitors = function() {
        for (var i = 0; i < this.visitors.length; i++) {
            this.del_visitor_record(this.visitors[i]);
            this.add_visitor_record(this.visitors[i]);
        }
    };

    return TownVisitorsManager;
})();


var townVisitorsManager = new TownVisitorsManager();
