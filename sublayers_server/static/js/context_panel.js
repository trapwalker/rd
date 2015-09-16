

/*
* Контекстная панель.
* Содержит набор контекстных (зависит от контекста) объектов:
*   - войти в локацию
*   - подобрать лут (автоматический подбор лута)
*   - кинуть бартер рядом-стоящим машинкам
* */

var ContextPanel = (function () {
    function ContextPanel() {

    }

    return ContextPanel;
})();

var contextPanel = new ContextPanel();


/*
* Менеджер работает по принципу радара - то есть он унаследован от VisualObject и добавляет в свою прослушку остальные объекты
* Когда объекты меняются, у него вызывается пересчёт.
* Он сам проверяет расстояния до городов и других локаций
* По такому принципу можно сделать и проверку бартера
* По такому принципу можно сделать и проверку сундуков
* */
var EnterToLocationObserver = (function(_super){
    __extends(EnterToLocationObserver, _super);
    function EnterToLocationObserver() {
        _super.call(this, []);

    };

    // вызывается из клиент-менеджера при эвенте See
    EnterToLocationObserver.prototype.addModelObject = function (mobj) {
        //todo: если данный объект нам подходит, то мы его добавляем в список
        _super.prototype.addModelObject.call(this, mobj)

    };


    EnterToLocationObserver.prototype.change = function () {

    };

    return EnterToLocationObserver;
})(VisualObject);

