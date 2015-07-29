/*
 * Виджет для отрисовки итема
 */

var WInventoryItem = (function (_super) {
    __extends(WInventoryItem, _super);

    function WInventoryItem(item) {
        _super.call(this, [item]);
        this.item = item;
        this._setDivInfo();
        this._createView();
    }

    WInventoryItem.prototype._setDivInfo = function() {
        this.inventoryDivStr = '.inventory-' + this.item.inventory.owner_id;
        this.itemDivStr = '.inventory-' + this.item.inventory.owner_id + '-pos-' + this.item.position;
        this.itemDivCaptionStr = '.mainCarInfoWindow-body-trunk-body-right-item-name-empty';
        this.itemDivPictureStr = '.mainCarInfoWindow-body-trunk-body-right-item-picture-empty';
        this.itemDivCountStr = '.mainCarInfoWindow-body-trunk-body-right-item-count-empty';
    };

    WInventoryItem.prototype._createView = function() {
        var self = this;
        $(this.inventoryDivStr).each(function() {
            self.addViewDiv(this);
        });
    };

    WInventoryItem.prototype.addViewDiv = function(inventoryDiv) {
        //console.log('WInventoryItem.prototype.addViewDiv', inventoryDiv, this.item);
        var itemDiv = $(inventoryDiv).find(this.itemDivStr);
        itemDiv.find(this.itemDivCaptionStr).text(this.item.balance_cls);
        itemDiv.draggable("option", "disabled", false);

        var self = this;
        itemDiv.on('dblclick', function () {
            item_balance_cls_manager.activate_item(self.item);
        });
        this.change();
    };

    WInventoryItem.prototype.visibleViewForInvDiv = function(inventoryDiv, visible) {
        //console.log('WInventoryItem.prototype.hideViewForDiv', inventoryDiv, this.item);
        if (visible)
            $(inventoryDiv).find(this.itemDivStr).parent().css('display', 'block');
        else
            $(inventoryDiv).find(this.itemDivStr).parent().css('display', 'none');
    };

    WInventoryItem.prototype.change = function() {
        var time = clock.getCurrentTime();
        var value = this.item.getCurrentVal(time);
        $(this.itemDivStr).find(this.itemDivCountStr).text(value.toFixed(1));
    };

    WInventoryItem.prototype.delFromVisualManager = function () {
        //console.log('WInventoryItem.prototype.delFromVisualManager');
        this.item = null;

        // снетси верстку и отключить таскание
        var itemDiv = $(this.inventoryDivStr).find(this.itemDivStr);
        itemDiv.find(this.itemDivCaptionStr).text('Пусто');
        itemDiv.find(this.itemDivCountStr).text('');
        itemDiv.draggable("option", "disabled", true);
        itemDiv.off('dblclick');
        _super.prototype.delFromVisualManager.call(this);
    };

    return WInventoryItem;
})(VisualObject);


var WInventoryItemNPC = (function (_super) {
    __extends(WInventoryItemNPC, _super);

    function WInventoryItemNPC(item) {
        _super.call(this, item);
    }

    WInventoryItemNPC.prototype._setDivInfo = function() {
        this.inventoryDivStr = '.npcInventory-' + this.item.inventory.owner_id;
        this.itemDivStr = '.inventory-' + this.item.inventory.owner_id + '-pos-' + this.item.position;
        this.itemDivCaptionStr = '.npcInventory-nameEmpty';
        this.itemDivPictureStr = '.npcInventory-pictureEmpty';
        this.itemDivCountStr = '.npcInventory-countEmpty';
    };

    WInventoryItemNPC.prototype.addViewDiv = function(inventoryDiv) {
        //console.log('WInventoryItemNPC.prototype.addViewDiv');
        var itemDiv = $(inventoryDiv).find(this.itemDivStr);
        itemDiv.find(this.itemDivCaptionStr).text(this.item.balance_cls);
        itemDiv.draggable("option", "disabled", false);
        this.change();
    };

    return WInventoryItemNPC;
})(WInventoryItem);