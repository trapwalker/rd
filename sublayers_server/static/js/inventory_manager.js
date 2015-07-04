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

    function InventoryItem(state, position, balance_cls) {
        _super.call(this, null);
        this._item_state = state;
        this._in_tm = false;
        this.position = position;
        this.balance_cls = balance_cls;
    }

    InventoryItem.prototype.getCurrentVal = function (time) {
        return this._item_state.val(time);
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

    return InventoryItem;
})(ClientObject);


var Inventory = (function () {
    function Inventory(owner_id, max_size) {
        this.items = {};
        this.owner_id = owner_id;
        this.max_size = max_size;
    }

    Inventory.prototype.addItem = function (item) {
        if (this.items[item.position] != null) return;
        this.items[item.position] = item;
    };

    Inventory.prototype.delItem = function (position) {
        var item = this.items[position];
        if (item == null) return;
        item.delItem();
        delete this.items[position];
    };

    Inventory.prototype.destroyInventory = function () {
        for (var key in this.items)
            if (this.items.hasOwnProperty(key)) {
                this.items[key].delItem();
                delete this.items[key];
            }
    };

    Inventory.prototype.getItem = function (position) {
        return this.items[position]
    };

    return Inventory;
})();


var InventoryList = (function () {
    function InventoryList() {
        this.inventories = {};
    }

    InventoryList.prototype.addInventory = function (inventory) {
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

    return InventoryList;
})();


var inventoryList = new InventoryList();