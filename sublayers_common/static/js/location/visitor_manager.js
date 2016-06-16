var LocationVisitorsManager = (function () {

    function LocationVisitorsManager() {
        this.visitors = [];
        this.jq_main_div = $();
    }

    LocationVisitorsManager.prototype.visitor_record_click = function (event) {
        //console.log('LocationVisitorsManager.prototype.visitor_record_click');
        //clientManager.sendCreatePrivateChat($(event.target).parent().data('visitor'))
    };

    LocationVisitorsManager.prototype.visitor_record_info_click = function (event) {
        //console.log('LocationVisitorsManager.prototype.visitor_record_info_click', $(event.target).parent().data('visitor'));
        var person = $(event.target).parent().data('visitor');
        locationManager.location_chat.interaction_manager.activate(person);
    };

    LocationVisitorsManager.prototype.add_visitor_record = function (visitor) {
        var visitorDiv = $(
            '<div class="visitor-record sublayers-clickable" data-visitor="' + visitor + '">' +
                '<div class="visitor-record-label">' + visitor + '</div>'+
                '<div class="visitor-record-button"></div>'+
            '</div>'
        );

        visitorDiv.find('.visitor-record-label').first().click(this.visitor_record_click);
        visitorDiv.find('.visitor-record-button').first().click(this.visitor_record_info_click);

        this.jq_main_div.append(visitorDiv);
    };

    LocationVisitorsManager.prototype.del_visitor_record = function (visitor) {
        this.jq_main_div.find('#visitorRecord_' + visitor).remove();
    };

    LocationVisitorsManager.prototype.add_visitor = function (visitor) {
        //console.log('LocationVisitorsManager.prototype.add_visitor', visitor);
        if (this.visitors.indexOf(visitor) < 0) {
            this.visitors.push(visitor);
            this.add_visitor_record(visitor);
        }
    };

    LocationVisitorsManager.prototype.del_visitor = function (visitor) {
        //console.log('LocationVisitorsManager.prototype.del_visitor');
        var visitorIndex = this.visitors.indexOf(visitor);
        if (visitorIndex >= 0) {
            this.visitors.splice(visitorIndex, 1);
            this.del_visitor_record(visitor);
        }
    };

    LocationVisitorsManager.prototype.clear_visitors = function() {
        for (var i = 0; i < this.visitors.length; i++)
            this.del_visitor_record(this.visitors[i]);
        this.visitors = [];
    };

    LocationVisitorsManager.prototype.update_visitors = function() {
        this.jq_main_div = locationManager.jq_town_div.find('#visitorList');
        for (var i = 0; i < this.visitors.length; i++) {
            this.del_visitor_record(this.visitors[i]);
            this.add_visitor_record(this.visitors[i]);
        }
    };

    return LocationVisitorsManager;
})();
