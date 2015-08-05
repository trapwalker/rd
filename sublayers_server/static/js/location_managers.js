var LocationVisitorsManager = (function () {

    function LocationVisitorsManager() {
        this.visitors = [];
    }

    LocationVisitorsManager.prototype.visitor_record_click = function (event) {
        //console.log('LocationVisitorsManager.prototype.visitor_record_click');
        clientManager.sendCreatePrivateChat($(event.target).data('visitor'))
    };

    LocationVisitorsManager.prototype.add_visitor_record = function (visitor) {
        var visitorDiv = $('<div id="visitorRecord_' + visitor + '" class="VMG-message-message sublayers-clickable visitorRecord">' + visitor + '</div>');
        visitorDiv.data('visitor', visitor);
        visitorDiv.click(this.visitor_record_click);
        $('#visitorList').append(visitorDiv);
    };

    LocationVisitorsManager.prototype.add_visitor = function (visitor) {
        //console.log('LocationVisitorsManager.prototype.add_visitor');
        if (this.visitors.indexOf(visitor) < 0) {
            this.visitors.push(visitor);
            this.add_visitor_record(visitor);
        }
    };

    LocationVisitorsManager.prototype.del_visitor_record = function (visitor) {
        $('#visitorRecord_' + visitor).remove();
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
        for (var i = 0; i < this.visitors.length; i++) {
            this.del_visitor_record(this.visitors[i]);
            this.add_visitor_record(this.visitors[i]);
        }
    };

    return LocationVisitorsManager;
})();


var NucoilManager = (function () {

    function NucoilManager() {
        this.tank_list = [];
        this.tank_summ = 0;
    }

    NucoilManager.prototype.update = function() {
        this.clear();
        var self = this;
        // Запросить инвентаря своего агента
        var item;
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {
            console.warn('Ивентарь агента (' + user.ID + ') не найден');
            return
        }

        var items = inventory.getItemsByFilter(['Tank10', 'Tank20', 'tank10', 'tank20']);

        console.log(items);

        var inv_show_div = $('#activeTownDiv').find('.mainMenuNucoilWindow-body-fuel-right').first();

        for (var i = 0; i < items.length; i++) {
            item = items[i];

            var itemDiv = $('<div class="mainMenuNucoilWindow-body-fuel-right-item"></div>');
            var itemDivName = $('<div class="mainMenuNucoilWindow-body-fuel-right-item-name-empty">[ ] ' +
                item.example.value_fuel + ' л.</div>');
            var itemDivPictWrap = $('<div class="mainMenuNucoilWindow-body-fuel-right-item-picture-empty-wrap"></div>');
            var itemDivPict = $('<div class="mainMenuNucoilWindow-body-fuel-right-item-picture-empty"></div>');

            $(inv_show_div).append(itemDiv);
            itemDiv.append(itemDivName);
            itemDiv.append(itemDivPictWrap);
            itemDivPictWrap.append(itemDivPict);
            itemDivPict.css('background', 'transparent url(' + item.example.inv_icon_small + ') no-repeat 100% 100%');

            itemDiv.data('checked', false);
            itemDiv.data('position', item.position);
            itemDiv.data('value_fuel', item.example.value_fuel);

            itemDiv.on('click', function (event) {
                var target = $(event.target);
                var ch = ! target.data('checked');
                var pos = target.data('position');
                target.data('checked', ch);
                if (ch) {
                    // включить галочку
                    target.find('.mainMenuNucoilWindow-body-fuel-right-item-name-empty')
                        .text('[x] ' + target.data('value_fuel') + ' л.');
                    self.tank_summ += target.data('value_fuel');
                    self.tank_list.push(pos);
                }
                else {
                    // выключить галочку
                    target.find('.mainMenuNucoilWindow-body-fuel-right-item-name-empty')
                        .text('[ ] ' + target.data('value_fuel') + ' л.');
                    self.tank_summ -= target.data('value_fuel');
                    self.tank_list.splice(self.tank_list.indexOf(pos), 1);
                }
                console.log(self.tank_list);
                setupFuelTotal();
                setupTankFuelValue();
            });
        }
    };

    NucoilManager.prototype.clear = function() {
        console.log('NucoilManager.prototype.clear');
        this.tank_summ = 0;
        this.tank_list = [];
        var jq_town_div = $('#activeTownDiv');
        jq_town_div.find('.mainMenuNucoilWindow-body-fuel-right-item').off('click');
        jq_town_div.find('.mainMenuNucoilWindow-body-fuel-right').empty();

    };

    return NucoilManager;
})();



var nucoilManager = new NucoilManager();
var locationVisitorsManager = new LocationVisitorsManager();


