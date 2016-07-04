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
        itemDiv.find(this.itemDivCaptionStr).text(this.item.example.title);
        itemDiv.draggable("option", "disabled", false);
        itemDiv.find(this.itemDivPictureStr).css('background', 'transparent url(' + this.item.example.inv_icon_mid + ') no-repeat 100% 100%');

        var self = this;
        itemDiv.on('dblclick', function () {
            self.item.activate();
        });
        this.change();

        itemDiv.on('click', function (event) {
            // снимаем выделение у всех итемов
            $(inventoryDiv).find(".mainCarInfoWindow-body-trunk-body-right-item-wrap").removeClass('active');

            // выделяем текущий итем
            $(event.target).parent().addClass('active');

            // настраиваем информационное окно инвентаря
            //var inv_parent =  $(inventoryDiv).parent();
            var inv_parent =  $(inventoryDiv).parents('.mainDivWindow');
            inv_parent.find(".mainCarInfoWindow-body-trunk-body-left-picture-picture").css('background',
                    'transparent url(' + self.item.example.inv_icon_mid + ') no-repeat 100% 100%');
            inv_parent.find(".mainCarInfoWindow-body-trunk-body-left-name").text(self.item.example.title);
            inv_parent.find(".mainCarInfoWindow-body-trunk-body-left-description").text(self.item.example.description);

            // добавляем поисковый класс для выделенных левых частей инвентаря
            var infoWindow = inv_parent.find(".mainCarInfoWindow-body-trunk-body-left");
            infoWindow.data('inv_id', self.item.inventory.owner_id);
            infoWindow.data('item_pos', self.item.position);

            // настройка кнопки активации
            var activateBtn = inv_parent.find('.mainCarInfoWindow-body-trunk-body-left-activate');
            activateBtn.data('inv_id', self.item.inventory.owner_id);
            activateBtn.data('item_pos', self.item.position);
        });
    };

    WInventoryItem.prototype.visibleViewForInvDiv = function(inventoryDiv, visible) {
        //console.log('WInventoryItem.prototype.hideViewForDiv', inventoryDiv, this.item);
        if (visible)
            $(inventoryDiv).find(this.itemDivStr).parent().css('display', 'block');
        else
            $(inventoryDiv).find(this.itemDivStr).parent().css('display', 'none');
    };

    WInventoryItem.prototype.change = function() {
        //console.log(' WInventoryItem.prototype.change', this.item.position, this);
        var time = clock.getCurrentTime();
        var value = this.item.getCurrentVal(time);
        $(this.itemDivStr).find(this.itemDivCountStr).text(value.toFixed(1));
    };

    WInventoryItem.prototype.delFromVisualManager = function () {
        //console.log('WInventoryItem.prototype.delFromVisualManager');
        var self = this;

        // снетси верстку и отключить таскание
        var itemDiv = $(this.inventoryDivStr).find(this.itemDivStr);
        itemDiv.find(this.itemDivCaptionStr).text('Пусто');
        itemDiv.find(this.itemDivCountStr).text('');
        itemDiv.find(this.itemDivPictureStr).css('background', '');
        itemDiv.draggable("option", "disabled", true);
        itemDiv.off('dblclick');
        itemDiv.off('click');

        // развыделяем текущий итем
        itemDiv.parent().removeClass('active');

        // удаление информационных вёрсток
        $(this.inventoryDivStr).parent().find(".mainCarInfoWindow-body-trunk-body-left").each(function(){
            var dpos = $(this).data('item_pos');
            var dinv = $(this).data('inv_id');
            if ((dinv == self.item.inventory.owner_id) && (dpos == self.item.position)) {
                // очистить вёрстку в этом информационном окне
                $(this).find(".mainCarInfoWindow-body-trunk-body-left-picture-picture").css('background', '');
                $(this).find(".mainCarInfoWindow-body-trunk-body-left-name").text('');
                $(this).find(".mainCarInfoWindow-body-trunk-body-left-description").text('');

                // брасываем активационную кнопку
                var activateBtn = $(this).find('.mainCarInfoWindow-body-trunk-body-left-activate');
                activateBtn.data('inv_id', -1);
                activateBtn.data('item_pos', -1);
            }
        });

        this.item = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WInventoryItem;
})(VisualObject);
