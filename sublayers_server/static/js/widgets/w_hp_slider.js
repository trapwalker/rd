/*
 * Виджет слайдер HP
 */

var WHPSlider = (function (_super) {
    __extends(WHPSlider, _super);

    function WHPSlider(car) {
        _super.call(this, [car]);
        this.car = car;

        this.options = {
            parent: 'divScaleCarHealth',
            max: car._hp_state.max_hp
        };

        var parent = $('#' + this.options.parent);
        this.koeff = 100 / this.options.max;
        // Добавление класса для родителя
        parent.addClass('pbar-hp-parent');
        // создать 2 дива: левый и правый
        var nodeParentLeft = '<div id="pbarHPLeft"></div>';
        var nodeParentRight = '<div id="pbarHPRight"></div>';
        // Добавить их внутрь parent
        parent.append(nodeParentLeft);
        parent.append(nodeParentRight);
        // Создать 3 дива для правого дива: цифры. шкала, надпись
        var nodeRightDigits = '<div id="pbarHPRightDigits">' +
            '<span class="pbarHPRightsDigitsLeft">0</span>' +
            '<span class="pbarHPRightsDigitsCenter">50</span>' +
            '<span class="pbarHPRightsDigitsRight">100</span>' +
            '</div>';
        var nodeRightBar = '<div id="pbarHPRightBar"></div>';
        var nodeRightLabel = '<div id="pbarHPRightLabel">' +
            '<span class="pbarHPRightLabelt1">Vehicle health:</span>' +
            '<span class="pbarHPRightLabelt2" id="pbarHPRightLabelt2ID">0%</span>' +
            '</div>';
        // Добавить эти 3 дива
        var r_bar = $('#pbarHPRight');
        r_bar.append(nodeRightDigits);
        r_bar.append(nodeRightBar);
        r_bar.append(nodeRightLabel);
        // в pbarHPRightBar добавить pbarHPBarFiller, pbarHPBarScale, pbarHPBarArrow
        var nodeRightFiller = '<div id="pbarHPBarFiller"></div>';
        var nodeRightScale = '<div id="pbarHPBarScale"></div>';
        var nodeRightArrow = '<div id="pbarHPBarArrow"></div>';
        var r_bar2 = $('#pbarHPRightBar');
        r_bar2.append(nodeRightFiller);
        r_bar2.append(nodeRightScale);
        r_bar2.append(nodeRightArrow);
        // Теперь в pbarHPBarFiller добавить pbarHPBarFillerFill чтобы именно в pbarHPBarFiller  сделать overflow-x
        // А допустим стрелка могла спокойно выезжать за пределы своего pbarHPRightBar
        var nodeRightFillerFill = '<div id="pbarHPBarFillerFill"></div>';
        $('#pbarHPBarFiller').append(nodeRightFillerFill);
        this.change(clock.getCurrentTime());
    }

    WHPSlider.prototype.change = function (time) {
        var value = this.car.getCurrentHP(time);
        var temp = 100 - (value * this.koeff);
        if((temp > 100) || (temp < 0)) return;
        $('#pbarHPBarFillerFill').css('right', temp + '%');
        $('#pbarHPBarArrow').css('right', temp + '%');
        // Установить значение остатка value и ввести второй параметр, сколько можем ещё проехать.
        $('#pbarHPRightLabelt2ID').text((100-temp).toFixed(0) + '%');
    };

    WHPSlider.prototype.setMax = function (value) {
        this.options.max = value;
        this.koeff = 100 / value;
        this.change(clock.getCurrentTime());
    };

    WHPSlider.prototype.delFromVisualManager = function () {
        // todo: удалить свою вёрстку
        this.car = null;
        _super.prototype.delFromVisualManager.call(this);
    };

    return WHPSlider;
})(VisualObject);