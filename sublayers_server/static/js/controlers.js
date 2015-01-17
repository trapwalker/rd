/*
    1. Создание болванок контроллеров - запускается при старте страницы
    2. Задание параметров контроллеров - срабатывает при InitMessage - передаются сектора обстрела, maxHP и maxFuel
    3. Деактивация контроллеров - срабатывает при дисконнекте, контроллеры должны вернуться к состоянию 1 - т.е. к болванкам
*/

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

        //Шкала здоровья машины игрока
        this.hpController = new ProgressBarHP({
            parent: "divScaleCarHealth",
            max: options.hpMax ? options.hpMax : 100
        });

        // Инициализация контролера стрельбы
        this.fireControl = new FireControl({
            parentDiv: 'fireControlArea',
            diameter: 150,
            sectors: options.fireSectors,
            sectorCallBackShoot: cbForSectorsShoot,
            sectorCallBackRecharged: cbForSectorsRecharged,
            sectorCallBackFireRequest: sendFire,
            allCallBack: cbForAllBtn,
            _rotated: cookieStorage.optionsFCRotate
        });

        this.fireControl.setVisible(cookieStorage.radarVisible);


        // Так как все контролеры проинициализированы, то сделать их активными
        this.isActive = true;
        */

    }

    Controllers.prototype.setNewParams = function(options){
        //Шкала топлива машины игрока - установить новый максимальный параметр
        this.fuelController.setMax(options.fuelMax ? options.fuelMax : 100);

        //Шкала здоровья машины игрока - установить новый максимальный параметр
        this.hpController.setMax(options.hpMax ? options.hpMax : 100);

        // Слайдер зума не трогаем

        // Меняем максимальную и установленную скорости
        this.speedSetSlider.setMaxSpeed(options.max_velocity);
        this.speedSetSlider._slide({},{value: options.set_velocity});
        this.speedSetSlider.setSpeed(options.set_velocity);

        // Инициализация контролера стрельбы
        this.fireControl.clearSectors();

        for(var i in options.sectors)
            this.fireControl.addSector(options.sectors[i]);

        // Так как все контролеры проинициализированы, то сделать их активными
        this.isActive = true;
    };

    Controllers.prototype.draw = function (directionCar, uCar) {
        // Если контролеры не активны, то не перерисовывать
        if(! this.isActive) return;
        var ttime = clock.getCurrentTime();
        // Отрисовка контролера скорости
        this.speedSetSlider.setRealSpeed(uCar.getCurrentSpeed(ttime));

        // Отрисовка контроллера хп
        this.hpController.setValue(uCar.hp);
        // Отрисовка контроллера Fuel
        //var tfuel = uCar.getCurrentFuel(ttime);
        //this.fuelController.setValue(tfuel, tfuel * uCar.state.fuelDec);

        // Отрисовка контроллера стрельбы
        if (!(directionCar == 0)) // Пока присылаются два стопа, нужно это условие
            if (this.fireControl)
                this.fireControl.setRotate(directionCar);
    };  

    return Controllers;
})();

// Колбеки Для работы с контроллерами
// колл бек для выстрела того или иного сектора
function cbForSectorsShoot(aFireSector) {
    //alert('Выстрел из сектора id = '+aFireSector.uid + '   Перезарядка = '+ aFireSector.recharge);
    userCarMarker.sectorsView.setShootState(aFireSector);
}

// колл бек для окончания перезарядки того или иного сектора
function cbForSectorsRecharged(aFireSector) {
    //alert('Выстрел из сектора id = '+aFireSector.uid + '   Перезарядка = '+ aFireSector.recharge);
    userCarMarker.sectorsView.setNormalState(aFireSector);
}

// коллбек для кнопки All
function cbForAllBtn() {
    //alert('Дан залп из всех орудий своей машинки (user.userCar.id)');
}

