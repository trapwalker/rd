var Controllers = (function () {
    function Controllers(options) {
        // Активны ли сейчас контроллеры
        this.isActive = false;

        /*
        //Шкала топлива машины игрока
        this.fuelController = new ProgressBarFuel({
            parent: "divScaleCarFuel",
            max: options.fuelMax ? options.fuelMax : 100
        });
        */
    }

    Controllers.prototype.setNewParams = function(options){
        //Шкала топлива машины игрока - установить новый максимальный параметр
        //this.fuelController.setMax(options.fuelMax ? options.fuelMax : 100);
    };

    Controllers.prototype.draw = function (directionCar, uCar) {
        // Если контролеры не активны, то не перерисовывать
        //if(! this.isActive) return;
        // Отрисовка контроллера стрельбы
        //if (!(directionCar == 0)) // Пока присылаются два стопа, нужно это условие
        //    if (this.fireControl)
        //        this.fireControl.setRotate(directionCar);
    };  

    return Controllers;
})();