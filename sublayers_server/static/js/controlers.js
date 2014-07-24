var Controllers = (function () {
    function Controllers(options) {
        // Активны ли сейчас контроллеры
        this.isActive = false;

        //Шкала топлива машины игрока
        this.fuelController = new ProgressBarFuel({
            parent: "divScaleCarFuel",
            max: fuelMaxProbka
        });

        //Шкала здоровья машины игрока
        this.hpController = new ProgressBarHP({
            parent: "divScaleCarHealth",
            max: hpMaxProbka
        });

        // создание слайдера зума
        this.zoomSetSlider = new SliderZoom({
            parentDiv: "zoomSetDivForZoomSlider",
            max: myMap.getMaxZoom(),
            min: myMap.getMinZoom(),
            step: 1,
            onChange: changeZoomOnSlider
        });
        this.zoomSetSlider.setZoom(myMap.getZoom());

        // создание слайдера скорости
        this.speedSetSlider = new SliderSpeed({
            parent: "speedSetDivForSpeedSlider",
            height: 320,
            parentCss: 'slider-speed-main',
            max: 125,
            min: 0,
            step: 1,
            onChange: changeSpeedOnSlider,
            onStop: stopSpeedOnSlider
        });

        // Тестовые вектора для контролера стрельбы
        var sectors = [
            new FireSector(gradToRad(0), gradToRad(30), 400, 1, 6 * 1000),
            new FireSector(gradToRad(180), gradToRad(50), 400, 2, 4 * 1000),
            new FireSector(gradToRad(90), gradToRad(70), 400, 3, 2 * 1000),
            new FireSector(gradToRad(-90), gradToRad(70), 400, 3, 2 * 1000)
        ];

        // Инициализация контролера стрельбы
        this.fireControl = new FireControl({
            parentDiv: 'fireControlArea',
            diameter: 150,
            sectors: sectors,
            sectorCallBack: cbForSectors,
            allCallBack: cbForAllBtn
        });


        // Так как все контролеры проинициализированы, то сделать их активными
        this.isActive = true;
    }

    Controllers.prototype.draw = function (directionCar, uCar) {
        // Если контролеры не активны, то не перерисовывать
        if(! this.isActive) return;
        var ttime = clock.getCurrentTime();
        // Отрисовка контролера скорости
        this.speedSetSlider.setRealSpeed(uCar.getCurrentSpeedAbs(ttime));

        // Отрисовка контроллера хп
        this.hpController.setValue(uCar.hp);
        // Отрисовка контроллера Fuel
        var tfuel = uCar.getCurrentFuel(ttime);
        this.fuelController.setValue(tfuel, tfuel * uCar.track.fuelDec);

        // Отрисовка контроллера стрельбы
        if (!(directionCar == 0)) // Пока присылаются два стопа, нужно это условие
            if (this.fireControl)
                if (Math.abs(this.fireControl.options.rotateAngle - directionCar) > 0.1)
                    this.fireControl.setRotate(directionCar);
    }

    return Controllers;
})();


// Колбеки Для работы с контроллерами
function changeSpeedOnSlider() {
    if (user.userCar)
        sendSetSpeed(controllers.speedSetSlider.getSpeed(), user.userCar.ID);
}

function stopSpeedOnSlider() {
    if (user.userCar) sendStopCar();
}

function changeZoomOnSlider(aSliderZoom) {
    if(! (myMap.getZoom() == aSliderZoom.getZoom()))
        myMap.setZoom(aSliderZoom.getZoom());
    if(userCarMarker)
        userCarMarker.tail.setActive(myMap.getZoom() > 14);
}

// колл бек для выстрела того или иного сектора
function cbForSectors(fs) {
    //alert('Выстрел из сектора id = '+fs.uid + '   Перезарядка = '+ fs.recharge);
}
// коллбек для кнопки All
function cbForAllBtn() {
    //alert('Дан залп из всех орудий своей машинки (user.userCar.id)');
}

