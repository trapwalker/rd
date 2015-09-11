var BarterManager = (function () {

    function BarterManager() {
    }

    BarterManager.prototype.ActivateBarter = function (barter_id) {
        //console.log('BarterManager.prototype.ActivateBarter', barter_id);

        // Запрос на открытие окна
        windowTemplateManager.openUniqueWindow('barter' + barter_id, '/barter', {barter_id: barter_id});
    };

    BarterManager.prototype.LockBarter = function (barter_id) {
        //console.log('BarterManager.prototype.LockBarter', barter_id);

        // Подмена кнопки на "Отмена"
        $('#barterInventoryWindow-apply-button-' + barter_id).css('display', 'none');
        $('#barterInventoryWindow-cancel-button-' + barter_id).css('display', 'block');

        // Включить блокировку инвентарей
        $('#barterInventoryWindow-' + barter_id).find('.barterInventoryWindow-lock-div').css('display', 'block');
    };

    BarterManager.prototype.UnlockBarter = function (barter_id) {
        //console.log('BarterManager.prototype.UnlockBarter', barter_id);

        // Подмена кнопки на "Подтвердить сделку"
        $('#barterInventoryWindow-apply-button-' + barter_id).css('display', 'block');
        $('#barterInventoryWindow-cancel-button-' + barter_id).css('display', 'none');

        // Выключить блокировку инвентарей
        $('#barterInventoryWindow-' + barter_id).find('.barterInventoryWindow-lock-div').css('display', 'none');
    };

    BarterManager.prototype.SuccessBarter = function (barter_id) {
        //console.log('BarterManager.prototype.SuccessBarter', barter_id);

        // Закрытие окна
        windowTemplateManager.closeUniqueWindow('barter' + barter_id);
    };

    BarterManager.prototype.CancelBarter = function (barter_id) {
        //console.log('BarterManager.prototype.CancelBarter', barter_id);

        // Закрытие окна
        windowTemplateManager.closeUniqueWindow('barter' + barter_id);
    };

    return BarterManager;
})();

var barterManager = new BarterManager();
