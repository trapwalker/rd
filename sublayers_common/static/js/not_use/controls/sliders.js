var ProgressBarFuel = (function () {
    function ProgressBarFuel(options) {
        this.options = {
            parent: '',
            max: 100
        }
        var parent = options.parent;
        if (options.max)
            this.options.max = options.max;
        this.koeff = 100 / this.options.max;
        // Добавление класса для родителя
        $('#' + parent).addClass('pbar-fuel-parent');
        // создать 2 дива: левый и правый
        var nodeParentLeft = '<div id="pbarFuelLeft"></div>';
        var nodeParentRight = '<div id="pbarFuelRight"></div>';
        // Добавить их внутрь parent
        $('#' + parent).append(nodeParentLeft);
        $('#' + parent).append(nodeParentRight);
        // Создать 3 дива для правого дива: цифры. шкала, надпись
        var nodeRightDigits = '<div id="pbarFuelRightDigits">' +
            '<span class="pbarRightsDigitsLeft">0</span>' +
            '<span class="pbarRightsDigitsCenter">1/2</span>' +
            '<span class="pbarRightsDigitsRight">F</span>' +
            '</div>';
        var nodeRightBar = '<div id="pbarFuelRightBar"></div>';
        var nodeRightLabel = '<div id="pbarFuelRightLabel">' +
            '<span class="pbarFuelRightLabelt1">Fuel:</span>' +
            '<span class="pbarFuelRightLabelt2" id="pbarFuelRightLabelt2ID">0</span>' +
            '<span class="pbarFuelRightLabelt3">Range:</span>' +
            '<span class="pbarFuelRightLabelt4" id="pbarFuelRightLabelt4ID">0 km</span>' +
            '</div>';
        // Добавить эти 3 дива
        $('#pbarFuelRight').append(nodeRightDigits);
        $('#pbarFuelRight').append(nodeRightBar);
        $('#pbarFuelRight').append(nodeRightLabel);
        // в pbarFuelRightBar добавить pbarFuelBarFiller, pbarFuelBarScale, pbarFuelBarArrow
        var nodeRightFiller = '<div id="pbarFuelBarFiller"></div>';
        var nodeRightScale = '<div id="pbarFuelBarScale"></div>';
        var nodeRightArrow = '<div id="pbarFuelBarArrow"></div>';
        $('#pbarFuelRightBar').append(nodeRightFiller);
        $('#pbarFuelRightBar').append(nodeRightScale);
        $('#pbarFuelRightBar').append(nodeRightArrow);
        // Теперь в pbarFuelBarFiller добавить pbarFuelBarFillerFill чтобы именно в pbarFuelBarFiller  сделать overflow-x
        // А допустим стрелка могла спокойно выезжать за пределы своего pbarFuelRightBar
        var nodeRightFillerFill = '<div id="pbarFuelBarFillerFill"></div>';
        $('#pbarFuelBarFiller').append(nodeRightFillerFill);
    }

    ProgressBarFuel.prototype.setValue = function (value, distance) { // distance = rashod * value
        var temp = 100 - (value * this.koeff);
        if((temp > 100) || (temp < 0)) return;
        var tdist = distance > 0 ? distance.toFixed(0) + ' km' : "--------";
        $('#pbarFuelBarFillerFill').css('right', temp + '%');
        $('#pbarFuelBarArrow').css('right', temp + '%');
        // Установить значение остатка value и ввести второй параметр, сколько можем ещё проехать.
        $('#pbarFuelRightLabelt2ID').text(value.toFixed(0));
        $('#pbarFuelRightLabelt4ID').text(tdist);
    }

    ProgressBarFuel.prototype.setMax = function (value) {
        this.options.max = value;
        this.koeff = 100 / value;
    }


    return ProgressBarFuel;
})();

var _SlidersMass = [];


