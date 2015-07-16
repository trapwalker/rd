
var ItemBalanceClsManager = (function () {
    function ItemBalanceClsManager() {
        this.balance_cls = {};
    }

    ItemBalanceClsManager.prototype.load_from_server = function (balance_cls_name) {
        if (! this.balance_cls[balance_cls_name])
            clientManager.sendGetBalanceCls(balance_cls_name);
    };

    ItemBalanceClsManager.prototype.add_balance_cls = function (balance_cls) {
        this.balance_cls[balance_cls.name] = balance_cls;
    };

    ItemBalanceClsManager.prototype.get_balance_cls = function (balance_cls_name) {
        if (! this.balance_cls[balance_cls_name])
            this.load_from_server(balance_cls_name);
        return this.balance_cls[balance_cls_name];
    };

    ItemBalanceClsManager.prototype.activate_item = function (item) {
        var balance_cls = this.get_balance_cls(item.balance_cls);
        if (! balance_cls) return;

        switch (balance_cls.name) {
            case 'aaaaa':
                break;

            default:
                clientManager.sendActivateItem(item);

        }
    };



    return ItemBalanceClsManager;
})();


var item_balance_cls_manager = new ItemBalanceClsManager();