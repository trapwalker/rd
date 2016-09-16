var LocationTraderNPC = (function (_super) {
    __extends(LocationTraderNPC, _super);

    function LocationTraderNPC(npc_rec, jq_town_div, building_name) {
        _super.call(this, npc_rec, jq_town_div, building_name);

        this.playerInvCls = "player-inventory-droppable-item";
        this.playerTableCls = "player-table-droppable-item";
        this.traderInvCls = "trader-inventory-droppable-item";
        this.traderTableCls = "trader-table-droppable-item";

        this.trader_assortment = [];
        this.agent_assortment = [];

        this.playerInv = [];
        this.playerTable = [];
        this.playerInvDiv = null;
        this.playerTableDiv = null;

        this.traderInv = [];
        this.traderTable = [];
        this.traderInvDiv = null;
        this.traderTableDiv = null;

        this.price_list = {};
        this.update();
    }

    LocationTraderNPC.prototype._clearPlayerInv = function() {
        //console.log('LocationTraderNPC.prototype._clearPlayerInv');
        if (this.playerInvDiv) {
            this.playerInvDiv.find('.npcInventory-itemWrap').remove();
            this.playerInvDiv = null;
        }
        if (this.playerTableDiv) {
            this.playerTableDiv.find('.npcInventory-itemWrap').remove();
            this.playerTableDiv = null;
        }
        this.calcPriceTables();
    };

    LocationTraderNPC.prototype._clearTraderInv = function() {
        if (this.traderInvDiv) {
            this.traderInvDiv.find('.npcInventory-itemWrap').remove();
            this.traderInvDiv = null;
        }
        if (this.traderTableDiv) {
            this.traderTableDiv.find('.npcInventory-itemWrap').remove();
            this.traderTableDiv = null;
        }
        this.calcPriceTables();
    };

    LocationTraderNPC.prototype._search_in_assertment = function(assertment, item) {
        for (var i = 0; i < assertment.length; i++)
            if (item.uid == assertment[i].item.uid)
                return i;
        return -1;
    };

    LocationTraderNPC.prototype.updatePlayerInv = function() {
        //console.log('LocationTraderNPC.prototype.updatePlayerInv', this.agent_assortment);
        this._clearPlayerInv();
        var self = this;
        var item;

        // Отрисовать собственный счет
        this.jq_main_div.find('.trader-player-total').text(user.example_agent.balance + 'NC');

        // Обновить столик игрока
        var temp_player_table = [];
        for (var i = 0; i < this.playerTable.length; i++) {
            item = this.playerTable[i];
            var assertment_index = this._search_in_assertment(this.agent_assortment, item);
            if ((assertment_index != -1) && (item.count <= this.agent_assortment[assertment_index].count)) {
                temp_player_table.push(item);
                item.price = this.agent_assortment[assertment_index].price;
                this.agent_assortment[assertment_index].__start_table_count = item.count;
            }
        }
        this.playerTable = temp_player_table;

        // Формирование инвентаря игрока
        this.playerInv = [];
        for (var i = 0; i < this.agent_assortment.length; i++) {
            item = this.agent_assortment[i].item;
            item.count = this.agent_assortment[i].count -
                (this.agent_assortment[i].__start_table_count ? this.agent_assortment[i].__start_table_count : 0);
            if (item.count > 0) {
                this.playerInv.push(item);
                item.price = this.agent_assortment[i].price;
            }
        }

        // Установить дивы инвентарей
        this.playerInvDiv = this.jq_main_div.find('.trader-center-area-player-body').first();
        this.playerTableDiv = this.jq_main_div.find('.trader-center-area-player-exchange-body').first();

        // Повесить дропаблы
        this.playerInvDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.playerTableCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemDropable(item_pos, self.playerTable, self.playerInv, self.playerTableDiv,
                                      self.playerInvDiv , self.playerTableCls, self.playerInvCls);
            }
        });

        this.playerTableDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.playerInvCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemDropable(item_pos, self.playerInv, self.playerTable, self.playerInvDiv,
                                      self.playerTableDiv, self.playerInvCls, self.playerTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.playerInvDiv, this.playerInv, this.playerInvCls);
        this._reDrawItemList(this.playerTableDiv, this.playerTable, this.playerTableCls);
    };

    LocationTraderNPC.prototype.updateTraderInv = function() {
        //console.log('LocationTraderNPC.prototype.updateTraderInv');
        this._clearTraderInv();
        var self = this;
        var item;

        // Обновить столик торговца
        var temp_trader_table = [];
        for (var i = 0; i < this.traderTable.length; i++) {
            item = this.traderTable[i];
            var assertment_index = this._search_in_assertment(this.trader_assortment, item);
            if ((assertment_index != -1) && ((item.count <= this.trader_assortment[assertment_index].count) ||
                this.trader_assortment[assertment_index].infinity)) {
                temp_trader_table.push(item);
                item.price = this.trader_assortment[assertment_index].price;
                this.trader_assortment[assertment_index].__start_table_count = item.count;
            }
        }
        this.traderTable = temp_trader_table;

        // Формирование инвентаря торговца
        this.traderInv = [];
        for (var i = 0; i < this.trader_assortment.length; i++) {
            //this.trader_assortment[i].count;
            item = this.trader_assortment[i].item;
            item.count = this.trader_assortment[i].count -
                (this.trader_assortment[i].__start_table_count ? this.trader_assortment[i].__start_table_count : 0);
            if ((item.count > 0) || this.trader_assortment[i].infinity) {
                item._trader_infinity = this.trader_assortment[i].infinity;
                item.price = this.trader_assortment[i].price;
                this.traderInv.push(item);
            }
        }

        // Установить дивы инвентарей
        this.traderInvDiv = this.jq_main_div.find('.trader-center-area-trader-body').first();
        this.traderTableDiv = this.jq_main_div.find('.trader-center-area-trader-exchange-body').first();

        // Повесить дропаблы
        this.traderInvDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.traderTableCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemDropable(item_pos, self.traderTable, self.traderInv, self.traderTableDiv,
                                      self.traderInvDiv , self.traderTableCls, self.traderInvCls);
            }
        });

        this.traderTableDiv.droppable({
            greedy: true,
            accept: function(target) { return target.hasClass(self.traderInvCls); },
            drop: function(event, ui) {
                var item_pos = ui.draggable.data('pos');
                self.changeItemDropable(item_pos, self.traderInv, self.traderTable, self.traderInvDiv,
                                      self.traderTableDiv, self.traderInvCls, self.traderTableCls);
            }
        });

        // Отрисовать верстку
        this._reDrawItemList(this.traderInvDiv, this.traderInv, this.traderInvCls);
        this._reDrawItemList(this.traderTableDiv, this.traderTable, this.traderTableCls);
    };

    LocationTraderNPC.prototype._reDrawItemList = function(parentDiv, itemList, dropCls) {
        var self = this;
        for(var i = 0; i < itemList.length; i++) {
            var example = itemList[i];
            var count_str = example._trader_infinity ? '---' : example.count.toFixed(0);  // '&infin;'
            var itemDiv = $(
                '<div class="npcInventory-itemWrap ' + dropCls + '" data-pos="' + i + '">' +
                    '<div class="npcInventory-item" data-img_link="' + example.inv_icon_mid + '">' +
                        '<div class="npcInventory-pictureWrap town-interlacing" ' + 'style="background: url(' + example.inv_icon_mid + ') no-repeat center"></div>' +
                        '<div class="npcInventory-text name">' + example.title + '</div>' +
                        '<div class="npcInventory-text count">' + count_str + '</div>' +
                    '</div>' +
                '</div>'
            );

            itemDiv.draggable({
                helper: function(event) {
                    var img_link = $(event.target).parent().data('img_link');
                    return $('<img width="130" height="70" src="' + img_link + '">')
                },
                opacity: 0.8,
                revert: true,
                revertDuration: 0,
                zIndex: 1,
                appendTo: '#location-content',
                start: LocationPlace.start_drag_handler,
                drag: LocationPlace.drag_handler
            });

            itemDiv.mouseenter({example: itemList[i]}, function(event) {
                locationManager.panel_right.show({text: event.data.example.description }, 'description');
            });
            itemDiv.mouseleave({}, function(event) { locationManager.panel_right.show({text: '' }, 'description'); });

            itemDiv.click({}, function(event) {
                var item_pos = $(this).data('pos');
                if (dropCls == self.playerInvCls)
                    self.changeItemDropable(item_pos, self.playerInv, self.playerTable, self.playerInvDiv,
                        self.playerTableDiv, self.playerInvCls, self.playerTableCls);
                if (dropCls == self.playerTableCls)
                    self.changeItemDropable(item_pos, self.playerTable, self.playerInv, self.playerTableDiv,
                        self.playerInvDiv, self.playerTableCls, self.playerInvCls);
                if (dropCls == self.traderInvCls)
                    self.changeItemDropable(item_pos, self.traderInv, self.traderTable, self.traderInvDiv,
                        self.traderTableDiv, self.traderInvCls, self.traderTableCls);
                if (dropCls == self.traderTableCls)
                    self.changeItemDropable(item_pos, self.traderTable, self.traderInv, self.traderTableDiv,
                        self.traderInvDiv, self.traderTableCls, self.traderInvCls);
            });
            
            parentDiv.append(itemDiv);
        }
    };

    LocationTraderNPC.prototype.calcPriceTables = function() {
        var i;
        var price_player = 0;
        var price_trader = 0;
        for (i = 0; i < this.playerTable.length; i++)
            price_player += this.playerTable[i].count * this.playerTable[i].price.buy / this.playerTable[i].stack_size;

        for (i = 0; i < this.traderTable.length; i++)
            price_trader += this.traderTable[i].count * this.traderTable[i].price.sale / this.traderTable[i].stack_size;

        price_player = Math.floor(price_player);
        price_trader = Math.ceil(price_trader);

        this.jq_main_div.find('.trader-player-exchange-total').text(price_trader + 'NC');
        this.jq_main_div.find('.trader-trader-exchange-total').text(price_player + 'NC');
    };

    LocationTraderNPC.prototype.changeItemPlayer = function(pos, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        destDiv.find('.npcInventory-itemWrap').remove();
        srcDiv.find('.npcInventory-itemWrap').remove();

        destList.push(srcList[pos]);
        srcList.splice(pos, 1);

        this._reDrawItemList(destDiv, destList, destCls);
        this._reDrawItemList(srcDiv, srcList, srcCls);

        this.calcPriceTables();
    };

    LocationTraderNPC.prototype.changeItemTrader = function(pos, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        if (destDiv != srcDiv) this.traderTableDiv.find('.npcInventory-itemWrap').remove();

        if (destDiv == this.traderTableDiv) destList.push(srcList[pos]);
        if (srcDiv == this.traderTableDiv) srcList.splice(pos, 1);

        this._reDrawItemList(this.traderTableDiv, this.traderTable, this.traderTableCls);

        this.calcPriceTables();
    };

    LocationTraderNPC.prototype.changeItemDropable = function(pos, srcList, destList, srcDiv, destDiv, srcCls, destCls) {
        var item = srcList[pos];
        if (! item) return;

        destDiv.find('.npcInventory-itemWrap').remove();
        srcDiv.find('.npcInventory-itemWrap').remove();

        // Отнять единицу товара из исходного итема
        item.count--;
        if (item.count == 0)
            srcList.splice(pos, 1);

        var item_index = -1;
        for (var i = 0; i < destList.length && item_index == -1; i++)
            if (item.uid == destList[i].uid)
                item_index = i;

        if (item_index == -1) {
            item = cloneObject(item);
            item.count = 1;
            item._trader_infinity = false;
            destList.push(item);
        }
        else
            destList[item_index].count++;


        this._reDrawItemList(destDiv, destList, destCls);
        this._reDrawItemList(srcDiv, srcList, srcCls);

        this.calcPriceTables();
    };

    LocationTraderNPC.prototype.updatePrice = function(event) {
        //console.log('TraderManager.prototype.updatePrice', event.trader_assortment);
        this.trader_assortment = event.trader_assortment;
        this.agent_assortment = event.agent_assortment;
        this.updateTraderInv();
        this.updatePlayerInv();
        this.calcPriceTables();
    };

    LocationTraderNPC.prototype.clear = function() {
        this._clearPlayerInv();
        this._clearTraderInv();
    };

    LocationTraderNPC.prototype.apply = function() {
        //console.log('TraderManager.prototype.apply');
        clientManager.sendTraderApply(this);
    };

    LocationTraderNPC.prototype.cancel = function() {
        //console.log('TraderManager.prototype.cancel');
        this.update();
    };

    LocationTraderNPC.prototype.update = function(data) {
        //console.log('LocationTraderNPC.prototype.update');
        this.updatePlayerInv();
        this.updateTraderInv();
        _super.prototype.update.call(this, data);
    };

    LocationTraderNPC.prototype.getPlayerTable = function() {
//        console.log('LocationTraderNPC.prototype.getPlayerTable');
        var res = [];
        for (var i = 0; i < this.playerTable.length; i++)
            res.push(this.playerTable[i].uid);
        return res;
    };

    LocationTraderNPC.prototype.getTraderTable = function() {
//        console.log('LocationTraderNPC.prototype.getTraderTable');
        var res = [];
        for (var i = 0; i < this.traderTable.length; i++)
            res.push(this.traderTable[i].uid);
        return res;
    };

    LocationTraderNPC.prototype.get_self_info = function () {
        clientManager.sendGetTraderInfo(this);
    };

    LocationTraderNPC.prototype.set_buttons = function () {
        //console.log('LocationParkingNPC.prototype.set_buttons', this.cars_list.length);
        if (!locationManager.isActivePlace(this)) return;
        locationManager.setBtnState(1, 'Подтвердить</br>сделку', true);
        locationManager.setBtnState(2, '</br>Отмена', true);
        locationManager.setBtnState(3, '</br>Назад', true);
        locationManager.setBtnState(4, '</br>Выход', true);
    };

    LocationTraderNPC.prototype.set_panels = function () {
        if (!locationManager.isActivePlace(this)) return;
        _super.prototype.set_panels.call(this);
        locationManager.panel_left.show({transactions: this.transactions}, 'npc_transaction_info');
        locationManager.panel_right.show({text: '' }, 'description');
    };

    LocationTraderNPC.prototype.clickBtn = function (btnIndex) {
        //console.log('LocationHangarNPC.prototype.clickBtn', btnIndex);
        switch (btnIndex) {
            case '1':
                this.apply();
                break;
            case '2':
                this.cancel();
                break;
            default:
                _super.prototype.clickBtn.call(this, btnIndex);
        }
    };

    return LocationTraderNPC;
})(LocationPlaceNPC);


var LocationBarmanNPC = (function (_super) {
    __extends(LocationBarmanNPC, _super);

    function LocationBarmanNPC(npc_rec, jq_town_div, building_name) {
        _super.call(this, npc_rec, jq_town_div, building_name);
        this.jq_main_div.find('.trader-center-player-table-label').text('Ваши квесты:');
        this.jq_main_div.find('.trader-center-trader-table-label').text('Квесты на продажу:');
    }

    LocationBarmanNPC.prototype.get_self_info = function () {
        //console.log('LocationBarmanNPC.prototype.get_self_info');
    };

    LocationBarmanNPC.prototype.apply = function() {
        //console.log('LocationBarmanNPC.prototype.apply');
    };

    return LocationBarmanNPC;
})(LocationTraderNPC);