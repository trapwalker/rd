var BarterManager = (function () {

    function BarterManager() {
        this.timers = {};
    }

    BarterManager.prototype._clearBarterTimer = function (barter_id) {
        //console.log('BarterManager.prototype._clearBarterTimer', barter_id);
        if (barterManager.timers[barter_id]) {
            clearTimeout(barterManager.timers[barter_id]);
            barterManager.timers[barter_id] = -1;
            $('#barterInventoryWindow-cancel-button-' + barter_id).text('Отмена');
        }
    };

    BarterManager.prototype.ActivateBarter = function (barter_id) {
        //console.log('BarterManager.prototype.ActivateBarter', barter_id);

        // Запрос на открытие окна
        windowTemplateManager.openUniqueWindow('barter' + barter_id, '/barter', {barter_id: barter_id});
    };

    BarterManager.prototype.LockBarter = function (barter_id) {
        //console.log('BarterManager.prototype.LockBarter', barter_id);

        // Удаляем таймер если он есть
        this._clearBarterTimer(barter_id);

        // Подмена кнопки на "Отмена"
        $('#barterInventoryWindow-apply-button-' + barter_id).css('display', 'none');
        $('#barterInventoryWindow-cancel-button-' + barter_id).css('display', 'block');

        // Включить блокировку инвентарей
        $('#barterInventoryWindow-' + barter_id).find('.barterInventoryWindow-lock-div').css('display', 'block');
    };

    BarterManager.prototype.UnlockBarter = function (barter_id) {
        //console.log('BarterManager.prototype.UnlockBarter', barter_id);

        // Удаляем таймер если он есть
        this._clearBarterTimer(barter_id);

        // Подмена кнопки на "Подтвердить сделку"
        $('#barterInventoryWindow-apply-button-' + barter_id).css('display', 'block');
        $('#barterInventoryWindow-cancel-button-' + barter_id).css('display', 'none');

        // Выключить блокировку инвентарей
        $('#barterInventoryWindow-' + barter_id).find('.barterInventoryWindow-lock-div').css('display', 'none');
    };

    BarterManager.prototype.StartBarterTimer = function (barter_id, success_delay) {
        //console.log('BarterManager.prototype.StartBarterTimer', barter_id, success_delay);
        $('#barterInventoryWindow-cancel-button-' + barter_id).text('Отмена(' + success_delay + ')');

        // Запускаем таймер
        barterManager.timers[barter_id] = setTimeout(function tick(barter_id, success_delay) {
            success_delay--;
            if ((success_delay >= 0) && (barterManager.timers[barter_id] != -1)) {
                $('#barterInventoryWindow-cancel-button-' + barter_id).text('Отмена(' + success_delay + ')');
                barterManager.timers[barter_id] = setTimeout(tick, 1000, barter_id, success_delay);
            }
            else {
                $('#barterInventoryWindow-cancel-button-' + barter_id).text('Отмена');
                barterManager.timers[barter_id] = null;
            }
        }, 1000, barter_id, success_delay);
    };

    BarterManager.prototype.SuccessBarter = function (barter_id) {
        //console.log('BarterManager.prototype.SuccessBarter', barter_id);

        // Удаляем таймер если он есть
        this._clearBarterTimer(barter_id);

        // Закрытие окна
        windowTemplateManager.closeUniqueWindow('barter' + barter_id);
    };

    BarterManager.prototype.CancelBarter = function (barter_id) {
        //console.log('BarterManager.prototype.CancelBarter', barter_id);

        // Удаляем таймер если он есть
        this._clearBarterTimer(barter_id);

        // Закрытие окна
        windowTemplateManager.closeUniqueWindow('barter' + barter_id);
    };

    return BarterManager;
})();

var barterManager = new BarterManager();
