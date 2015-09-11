var BarterManager = (function () {

    function BarterManager() {
    }

    BarterManager.prototype.LockBarter = function (barter_id) {
        console.log('BarterManager.prototype.LockBarter', barter_id);

        // Подмена кнопки на "Отмена"
        $('#barterInventoryWindow-apply-button-' + barter_id).css('display', 'none');
        $('#barterInventoryWindow-cancel-button-' + barter_id).css('display', 'block');

        // Включить блокировку инвентарей
        $('#barterInventoryWindow-' + barter_id).find('.barterInventoryWindow-lock-div').css('display', 'block');
    };

    BarterManager.prototype.UnlockBarter = function (barter_id) {
        console.log('BarterManager.prototype.UnlockBarter', barter_id);

        // Подмена кнопки на "Подтвердить сделку"
        $('#barterInventoryWindow-apply-button-' + barter_id).css('display', 'block');
        $('#barterInventoryWindow-cancel-button-' + barter_id).css('display', 'none');

        // Выключить блокировку инвентарей
        $('#barterInventoryWindow-' + barter_id).find('.barterInventoryWindow-lock-div').css('display', 'none');
    };

    return BarterManager;
})();

var barterManager = new BarterManager();
