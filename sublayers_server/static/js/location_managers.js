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

                setupFuelTotal();
                setupTankFuelValue();
            });
        }
    };

    NucoilManager.prototype.clear = function() {
        //console.log('NucoilManager.prototype.clear');
        this.tank_summ = 0;
        this.tank_list = [];
        var jq_town_div = $('#activeTownDiv');
        jq_town_div.find('.mainMenuNucoilWindow-body-fuel-right-item').off('click');
        jq_town_div.find('.mainMenuNucoilWindow-body-fuel-right').empty();
    };

    return NucoilManager;
})();


var ArmorerManager = (function () {

    function ArmorerManager() {
        this.items = {};
        this.inv_show_div = null;
        this.armorer_slots = [];
    }

    ArmorerManager.prototype._addEmptyInventorySlot = function(position) {
        var itemWrapDiv = $('<div class="npcInventory-itemWrap armorer-itemWrap-' + position +
                            '" data-pos="' + position + '"></div>');
        itemWrapDiv.droppable({
            greedy: true,
            drop: function(event, ui) {
                var dragPos = ui.draggable.data('pos');
                var dropPos = $(event.target).data('pos');
                armorerManager.changeItem(dragPos, dropPos);
            }
        });
        this.inv_show_div.append(itemWrapDiv);
    };

    ArmorerManager.prototype.update = function(armorer_slots) {
        console.log('ArmorerManager.prototype.update');
        if (armorer_slots) this.armorer_slots = armorer_slots;

        this.clear();
        var self = this;
        var item;

        // Проверить если город
        this.inv_show_div = $('#activeTownDiv').find('.armorer-footer').find('.npcInventory-inventory').first();
        if (this.inv_show_div.length == 0) {
            console.warn('Вёрстка города не найдена');
            return
        }

        // Добавить итемы инвентаря своего агента
        var inventory = inventoryList.getInventory(user.ID);
        if (! inventory) {
            console.warn('Ивентарь агента (' + user.ID + ') не найден');
            return
        }
        for (var i = 0; i < inventory.max_size; i++) {
            var item_rec = {
                example: null,
                position: null,
                direction: 'front'
            };
            item = inventory.getItem(i);
            item_rec.position = i;
            if (item) {
                // todo: сделать фильтрацию итемов
                this._addEmptyInventorySlot(i);
                item_rec.example = item.example;
                this.items[i] = item_rec;
            }
            else {
                this._addEmptyInventorySlot(i);
                item_rec.example = null;
                this.items[i] = item_rec;
            }
        }
        resizeArmorerInventory();

        // Добавить итемы слотов
        for (var i = 0; i < this.armorer_slots.length; i++) {
            var item_rec = {
                example: this.armorer_slots[i].value,
                position: this.armorer_slots[i].name,
                direction: 'front'
            };
            this.items[item_rec.position] = item_rec;

            var rect = $('#top_' + item_rec.position);
            console.log(rect);
            rect.data('pos', item_rec.position);

            rect.draggable({
                helper: 'clone',
                opacity: 0.8,
                revert: true,
                revertDuration: 0,
                zIndex: 1,
                appendTo: '#map',
                start: function(event, ui) {
                    console.log('11111111111');
                }
            });

//            rect.droppable({
//                greedy: true,
//                drop: function(event, ui) {
//                    console.log('SVG DROPABLE');
//                    var dragPos = ui.draggable.data('pos');
//                    var dropPos = $(event.target).data('pos');
//                    armorerManager.changeItem(dragPos, dropPos);
//                }
//            });
        }



        // Отрисовать верстку
        for (var key in this.items)
            if (this.items.hasOwnProperty(key))
                this.reDrawItem(key);
    };

    ArmorerManager.prototype.clear = function() {
        console.log('ArmorerManager.prototype.clear');
    };

    ArmorerManager.prototype.reDrawItem = function(position) {
        //console.log('ArmorerManager.prototype.reDrawItem');
        if (position.toString().indexOf('slot') >= 0) {
            // Позиция в слотах
            console.log(position, $('#top_' + position).data('pos'));
        }
        else {
            // Позиция в инвентаре

            var itemWrapDiv = this.inv_show_div.find('.armorer-itemWrap-' + position).first();
            //itemWrapDiv.find('.npcInventory-item').draggable("destroy");
            itemWrapDiv.empty();

            var itemDiv = $('<div class="npcInventory-item" data-pos="' + position + '"></div>');
            var emptyItemDiv = '<div class="npcInventory-pictureWrap"><div class="npcInventory-picture"></div></div>' +
                '<div class="npcInventory-name">Пусто</div>';
            itemDiv.append(emptyItemDiv);
            var item = this.items[position];
            if (item.example) {
                itemDiv.find('.npcInventory-name').text(item.example.title);
                itemDiv.find('.npcInventory-picture')
                    .css('background', 'transparent url(' + item.example.inv_icon_small + ') no-repeat 100% 100%');
                itemDiv.draggable({
                    helper: 'clone',
                    opacity: 0.8,
                    revert: true,
                    revertDuration: 0,
                    zIndex: 1,
                    appendTo: '#map'
                });
            }
            itemWrapDiv.append(itemDiv);
        }
    };

    ArmorerManager.prototype.changeItem = function(src, dest) {
        console.log('ArmorerManager.prototype.changeItem', src, dest);
        var item = this.items[src];
        this.items[src] = this.items[dest];
        this.items[dest] = item;
        this.reDrawItem(src);
        this.reDrawItem(dest);
    };

    return ArmorerManager;
})();


var armorerManager = new ArmorerManager();
var nucoilManager = new NucoilManager();
var locationVisitorsManager = new LocationVisitorsManager();



