/**
 * Created by Andrey on 16.07.2014.
 */
var FireControl = (function () {
    function FireControl(options) {
        this.options = {
            parentDiv: '',
            diameter: 200,
            rotateAngle: 0,
            sectorCallBackShoot: null,   // CallBack для всех секторов, в него передастся объект FireSector
            sectorCallBackRecharged: null,   // CallBack для всех секторов, в него передастся объект FireSector
            allCallBack: null       // CallBack для кнопки All
            //onFireAll: ''
        };

        if (options) {
            if (options.parentDiv) this.options.parentDiv = options.parentDiv;
            if (options.diameter) this.options.diameter = options.diameter;
            if (options.sectorCallBackShoot) this.options.sectorCallBackShoot = options.sectorCallBackShoot;
            if (options.sectorCallBackRecharged) this.options.sectorCallBackRecharged = options.sectorCallBackRecharged;
            if (options.allCallBack) this.options.allCallBack = options.allCallBack;
        }

        this.sectors = [];

        $('#' + this.options.parentDiv).addClass('fire-control-parent');
        $('#' + this.options.parentDiv).css('margin-left', - this.options.diameter / 2);

        this.radiusOut = this.options.diameter / 2;
        this.radiusIn = this.options.diameter / 6;

        this.center = {
            x: this.options.diameter / 2,
            y: this.options.diameter / 2
        };

        // Создание SVG полотна
        this.NS = 'http://www.w3.org/2000/svg';
        this.SVG = document.createElementNS(this.NS, 'svg');
        this.SVG.setAttribute('height', this.options.diameter);
        this.SVG.setAttribute('width', this.options.diameter);
        document.getElementById(this.options.parentDiv).appendChild(this.SVG);

        // Создание unclickable фона для контроллера (прозрачного круга)
        this.backgroundCircle = document.createElementNS(this.NS, 'circle');
        this.backgroundCircle.setAttribute('class', 'fire-control-background sublayers-unclickable');
        this.backgroundCircle.setAttribute('r', this.radiusOut);
        this.backgroundCircle.setAttribute('cx', this.center.x);
        this.backgroundCircle.setAttribute('cy', this.center.y);
        this.SVG.appendChild(this.backgroundCircle);

        // Кнопка All
        this.allFire = document.createElementNS(this.NS, 'circle');
        this.allFire.setAttribute('class', 'fire-control-all sublayers-clickable');
        this.allFire.setAttribute('r', this.radiusIn);
        this.allFire.setAttribute('cx', this.center.x);
        this.allFire.setAttribute('cy', this.center.y);
        this.SVG.appendChild(this.allFire);
        $(this.allFire).on('click', {self: this}, this._allFireEvent);

        // Создание общей группы для трансформации секторов
        this.SVGSectorsGroup = document.createElementNS(this.NS, 'g');
        this.SVG.appendChild(this.SVGSectorsGroup);

        // Сделать addSector для каждого элемента массива options.sectors
        if (options.sectors)
            for (var i = 0; i < options.sectors.length; i++) {
                this.addSector(options.sectors[i]);
            }
    };

    FireControl.prototype._getSVGPathSector = function(fireSector, radiusPath) {
        var tempWidth = fireSector.widthAngle / 2;
        var radiusOut = this.radiusOut * radiusPath -1;
        var vertVOut = new Point(radiusOut, 0);
        var vertVIn = new Point(this.radiusIn + 7, 0);
        var rightVOut = rotateVector(vertVOut, tempWidth);
        var leftVOut = rotateVector(vertVOut, -tempWidth);
        var rightVIn = rotateVector(vertVIn, tempWidth);
        var leftVIn  = rotateVector(vertVIn, -tempWidth);

        // Составить svg-path
        return 'M' + rightVIn.x + ',' + rightVIn.y +
            'L' + rightVOut.x + ',' + rightVOut.y +
            'A' + radiusOut + ',' + radiusOut + ', 0, 0, 0, ' + leftVOut.x + ',' + leftVOut.y +
            'L' + leftVIn.x + ',' + leftVIn.y +
            'A' + this.radiusIn + ',' + this.radiusIn + ', 0, 0, 1, ' + rightVIn.x + ',' + rightVIn.y +
            'Z';
    };


    FireControl.prototype.addSector = function (fireSector) {
        var pathStr = this._getSVGPathSector(fireSector, 1);

        // Создание объекта Сектор, в в котором будет вся информация о сектора
        var sector = {};

        // Создание и добавление группы для сектора
        sector.SVGGroup = document.createElementNS(this.NS, "g");
        this.SVGSectorsGroup.appendChild(sector.SVGGroup);
        sector.SVGGroup.setAttribute('transform', 'translate(' + this.center.x + ', ' + this.center.y + ') ' +
            'rotate(' + radToGrad(fireSector.directionAngle) + ')');

        // Рисование
        sector.SVGPath = document.createElementNS(this.NS, "path");
        sector.SVGPath.setAttribute('class', 'fire-control-sector sublayers-clickable');
        sector.SVGPath.setAttribute('d', pathStr);
        sector.SVGGroup.appendChild(sector.SVGPath);

        // Добавить в сектор ссылку на fireSector, чтобы при вызове коллбека передать первым параметром
        sector._fs = fireSector;
        // Добавить в сектор ссылку на свой собственный колл-бек
        sector._cbSectorShoot = this.options.sectorCallBackShoot;
        sector._cbSectorRecharged = this.options.sectorCallBackRecharged;
        // устанавливаем флаг речарджа сектора в false
        sector.recharged = false;
        // Вешаем на сектор обработчик клика данного сектора
        $(sector.SVGPath).on('click', {sector: sector}, this._fireSectorEvent);
        // Помещаем сектор в массив секторов данного объекта
        this.sectors.push(sector);
    };

    FireControl.prototype.setRotate = function(angle) {
        this.SVGSectorsGroup.setAttribute('transform', 'rotate(' +
            radToGrad(angle) + ', ' + this.center.x + ', ' + this.center.y + ')'
        );
    };


    FireControl.prototype.clearSectors = function() {
       // alert('Unbind');
        this.options.sectors.forEach(function(sector){
            // Снять клик с каждого сектора
            $(sector.SVGPath).off('click',this._fireSectorEvent);
            $(sector.SVGPath).remove();
            $(sector.SVGGroup).remove();
        });
        this.sectors = [];
    };


// Обработчики кликов !!
    FireControl.prototype._allFireEvent = function(event){
        var obj = event.data.self;
        if(typeof(obj.options.allCallBack) === 'function')
            obj.options.allCallBack();

    }


    FireControl.prototype._fireSectorEvent = function(event) {
        // Получить сектор, для которого вызвано событие
        var sector = event.data.sector;
        // уйти в перезарядку
        if(! sector.recharged) {
            // установить sector.recharged в true
            sector.recharged = true;
            sector.SVGPath.setAttribute('class', 'fire-control-sector-recharge');
            // Запустить timeOut речарджа
            setTimeout(function () {
                    sector.recharged = false;
                    sector.SVGPath.setAttribute('class', 'fire-control-sector sublayers-clickable');
                    if (typeof(sector._cbSectorRecharged) === 'function')
                        sector._cbSectorRecharged(sector._fs);
                },
                sector._fs.recharge);
            // Вызвать свой коллБэк и передать туда fireSector
            if (typeof(sector._cbSectorShoot) === 'function')
                sector._cbSectorShoot(sector._fs);
        }
    }


    return FireControl;
})();
