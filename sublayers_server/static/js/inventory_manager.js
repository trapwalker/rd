var InventoryItemState = (function () {
    function InventoryItemState(t, max_val, val0, dvs) {
        this.t0 = t;
        this.max_val = max_val;
        this.val0 = val0;
        this.dvs = dvs;
    }

    InventoryItemState.prototype.val = function (t) {
        return Math.min(this.max_val, this.val0 - this.dvs * (t - this.t0));
    };

    InventoryItemState.prototype.is_changed = function () {
        return this.dvs != 0.0;
    };

    return InventoryItemState;
})();


var InventoryItem = (function (_super) {
    __extends(InventoryItem, _super);

    function InventoryItem(state, position, balance_cls, example) {
        _super.call(this, null);
        this._in_tm = false;
        this.position = position;
        this.balance_cls = balance_cls;
        this.inventory = null;
        this.widget = null;
        this.example = example;
        this.setState(state);
    }

    InventoryItem.prototype.setInventory = function(inventory, widget_class) {
        //console.log('InventoryItem.prototype.setInventory');
        this.inventory = inventory;
        this.widget = new widget_class(this);
    };

    InventoryItem.prototype.showItem = function(inventoryDiv) {
        this.widget.addViewDiv(inventoryDiv);
    };

    InventoryItem.prototype.visibleItemForInvDiv = function(inventoryDiv, filter) {
        if (filter) {
            if (this.hasTag(filter))
                this.widget.visibleViewForInvDiv(inventoryDiv, true);
            else
                this.widget.visibleViewForInvDiv(inventoryDiv, false);
        }
        else
            this.widget.visibleViewForInvDiv(inventoryDiv, true);
    };

    InventoryItem.prototype.getCurrentVal = function (time) {
        return this._item_state.val(time);
    };

    InventoryItem.prototype.getMaxVal = function () {
        return this._item_state.max_val;
    };

    InventoryItem.prototype._manage_tm = function () {
        // вызывается только из апдейтов
        var changed = this._item_state.is_changed();
        if (this._in_tm && !changed) {
            // если в timeManager и не меняется, то удалиться из таймменеджера
            timeManager.delTimerEvent(this, 'change');
            this._in_tm = false;
        }
        if (!this._in_tm && changed) {
            // если не в timeManager и меняется, то добавиться в таймменеджер
            timeManager.addTimerEvent(this, 'change');
            this._in_tm = true;
        }
    };

    InventoryItem.prototype.setState = function (item_state) {
        this._item_state = item_state;
        this._manage_tm();
        this.change();
    };

    InventoryItem.prototype.change = function () {
        visualManager.changeModelObject(this);
    };

    InventoryItem.prototype.delItem = function () {
        this.delFromVisualManager();
    };

    InventoryItem.prototype.activate = function () {
        switch (this.example.activate_type) {
            case 'none':
                console.warn('Активация неактивируемого итема');
                break;
            case 'self':
                clientManager.sendActivateItem(this);
                break;
            default:
                console.warn('Неизвестный типа активации итема !');
        }
    };

    // Работа с тегами

    // Есть ли данный тег у итема
    InventoryItem.prototype.hasTag = function (tag) {
        return this.example.tags.indexOf(tag) >= 0;
    };

    // Есть ли хоть один тег из списка у итема
    InventoryItem.prototype.hasOwnTag = function (tagList) {
        for (var i = 0; i < tagList.length; i++)
            if (this.hasTag(tagList[i]))
                return true;
        return false;
    };

    // Есть ли все теги из списка у итема
    InventoryItem.prototype.hasAllTags = function (tagList) {
        for (var i = 0; i < tagList.length; i++)
            if (!this.hasTag(tagList[i]))
                return false;
        return true;
    };

    return InventoryItem;
})(ClientObject);


var Inventory = (function () {
    function Inventory(owner_id, max_size) {
        this.items = {};
        this.owner_id = owner_id;
        this.max_size = max_size;

        this.item_widget_class = WInventoryItem;

        var self = this;
        $('.inventory-' + owner_id).each(function() {
            self.showInventory(this);
        });
    }

    Inventory.prototype.showInventory = function (inventoryDiv) {
        //console.log('Inventory.prototype.showInventory', this, inventoryDiv);
        for (var i = 0; i < this.max_size; i++) {
            /*
                Тут добавлена обертка для итема т.к. нельзя чтобы один элемент был и дропабл и драгбл одновременно (точнее
                можно, но он не будет ловить сам себя и итем будет проваливаться сквозь окно на карту)
            */
            var emptyItemDiv = '<div class="mainCarInfoWindow-body-trunk-body-right-item-wrap inventory-wrap-' + this.owner_id +
                '-pos-' + i + '" data-owner_id="' + this.owner_id + '" data-pos="' + i + '">' +
                '<div class="mainCarInfoWindow-body-trunk-body-right-item inventory-' + this.owner_id +
                '-pos-' + i + '" data-owner_id="' + this.owner_id + '" data-pos="' + i + '">' +
                '<div class="mainCarInfoWindow-body-trunk-body-right-item-name-empty">Пусто</div>' +
                '<div class="mainCarInfoWindow-body-trunk-body-right-item-picture-empty">' +
                '<div class="mainCarInfoWindow-body-trunk-body-right-item-count-empty"></div></div></div></div>';
            $(inventoryDiv).append(emptyItemDiv);

            $(inventoryDiv).find('.inventory-wrap-' + this.owner_id + '-pos-' + i + '').droppable({
                greedy: true,
                accept: function(target) {
                    return target.hasClass('mainCarInfoWindow-body-trunk-body-right-item');
                },
                drop: function(event, ui) {
                    var dragOwnerID = ui.draggable.data('owner_id');
                    var dragPos = ui.draggable.data('pos');
                    var dropOwnerID = $(event.target).data('owner_id');
                    var dropPos = $(event.target).data('pos');

                    // Проверим не сами ли в себя мы перемещаемся
                    if ((dragOwnerID != dropOwnerID) || (dragPos != dropPos))
                        clientManager.sendItemActionInventory(dragOwnerID, dragPos, dropOwnerID, dropPos);
                }
            });

            $(inventoryDiv).find('.inventory-' + this.owner_id + '-pos-' + i + '').draggable({
                disabled: true,
                helper: 'clone',
                opacity: 0.8,
                revert: true,
                revertDuration: 0,
                zIndex: 1,
                appendTo: '#map'
            });
        }

        for (var pos in this.items)
            if (this.items.hasOwnProperty(pos))
                this.items[pos].showItem(inventoryDiv);

        var activateBtn = $(inventoryDiv).parent().find('.mainCarInfoWindow-body-trunk-body-left-activate');
        activateBtn.data('inv_id', -1);
        activateBtn.data('item_pos', -1);
        activateBtn.on('click', function(event) {
            var target = $(event.target);
            var inv_id = target.data('inv_id');
            var item_pos = target.data('item_pos');
            if ((item_pos < 0) || (inv_id < 0)) return;
            var inventory = inventoryList.getInventory(inv_id);
            if (!inventory) return;
            var item = inventory.getItem(item_pos);
            if (!item) return;
            item.activate();
        })
    };

    Inventory.prototype.addItem = function (item) {
        if (this.items[item.position] != null) return;
        this.items[item.position] = item;
        item.setInventory(this, this.item_widget_class);
    };

    Inventory.prototype.delItem = function (position) {
        var item = this.items[position];
        if (item == null) return;
        item.delItem();
        delete this.items[position];
    };

    Inventory.prototype.destroyInventory = function () {
        //console.log("Inventory.prototype.destroyInventory");
        for (var key in this.items)
            if (this.items.hasOwnProperty(key)) {
                this.items[key].delItem();
                delete this.items[key];
            }
        // todo: снять драг анд дроп
    };

    Inventory.prototype.getItem = function (position) {
        return this.items[position]
    };

    Inventory.prototype.showInvByFilter = function (inventoryDiv, filter) {
        //console.log('Inventory.prototype.showInventory', this, inventoryDiv);
        for (var pos in this.items)
            if (this.items.hasOwnProperty(pos))
                this.items[pos].visibleItemForInvDiv(inventoryDiv, filter);
    };

    Inventory.prototype.getItemsByTags = function (tagList, allTag) {
        var res_list = [];
        for (var pos in this.items)
            if (this.items.hasOwnProperty(pos))
                if (allTag) {
                    if (this.items[pos].hasAllTags(tagList))
                        res_list.push(this.items[pos]);
                }
                else {
                    if (this.items[pos].hasOwnTag(tagList))
                        res_list.push(this.items[pos]);
                }
        return res_list;
    };

    return Inventory;
})();


var InventoryList = (function () {
    function InventoryList() {
        this.inventories = {};
    }

    InventoryList.prototype.addInventory = function (inventory) {
        //console.log('InventoryList.prototype.addInventory', inventory.owner_id);
        if (this.inventories[inventory.owner_id] != null) return;
        this.inventories[inventory.owner_id] = inventory;
    };

    InventoryList.prototype.delInventory = function (owner_id) {
        var inv = this.inventories[owner_id];
        if (inv == null) return;
        inv.destroyInventory();
        delete this.inventories[owner_id];
    };

    InventoryList.prototype.getInventory = function (owner_id) {
        return this.inventories[owner_id]
    };

    InventoryList.prototype.showInventory = function (owner_id, inventory_div) {
        var inv = this.getInventory(owner_id);
        if (inv)
            inv.showInventory(inventory_div);
        else
            clientManager.sendShowInventory(owner_id);
    };

    InventoryList.prototype.showInvByFilter = function (owner_id, inventory_div, filter) {
        var inv = this.getInventory(owner_id);
        if (inv)
            inv.showInvByFilter(inventory_div, filter);
        else
            console.error('showInvByFilter:: Инвентарь машинки <', owner_id ,'>  не найден');
    };

    return InventoryList;
})();


var inventoryList = new InventoryList();