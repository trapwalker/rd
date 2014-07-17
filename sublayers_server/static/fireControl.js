/**
 * Created by Andrey on 16.07.2014.
 */
var FireControl = (function () {
    function FireControl(options) {
        this.options = {
            parentDiv: '',
            diameter: 200,
            rotateAngle: 0,
            sectors: [],
            sectorCallBack: null,   // CallBack для всех секторов, в него передастся объект FireSector
            allCallBack: null       // CallBack для кнопки All
            //onFireAll: ''
        };

        if (options) {
            if (options.parentDiv) this.options.parentDiv = options.parentDiv;
            if (options.diameter) this.options.diameter = options.diameter;
            if (options.sectorCallBack) this.options.sectorCallBack = options.sectorCallBack;
            if (options.allCallBack) this.options.allCallBack = options.allCallBack;
        }
        this.radiusOut = this.options.diameter / 2;
        this.radiusIn = this.options.diameter / 6;

        this.center = {
            x: this.options.diameter / 2,
            y: this.options.diameter / 2
        };

        // Инициализация векторного дива
        if (this.options.parentDiv) this.paper = Raphael(this.options.parentDiv, this.options.diameter, this.options.diameter)
        else this.paper = Raphael(0, 0, this.options.diameter, this.options.diameter);
        // Кнопка All
        this.allFire = this.paper.circle(this.center.x, this.center.y, this.radiusIn);
        // Класс кнопки All
        $(this.allFire.node).attr('class', 'fire-control-all');
        // Событие кнопки All
        $(this.allFire.node).on('click', {self: this}, allFireEvent);

        // Сделать addSector для каждого элемента массива options.sectors
        if(options.sectors)
            for(var i = 0; i < options.sectors.length; i++) {
                this.addSector(options.sectors[i]);
            }

    }

    FireControl.prototype.addSector = function(fireSector) {
        var tempWidth = fireSector.widthAngle / 2;
        var vertVOut = new Point(0, -this.radiusOut);
        var vertVIn = new Point(0, -this.radiusIn);
        // Много математики
        var l_out = (4 / 3) * Math.tan(0.25 * fireSector.widthAngle) * this.radiusOut;
        var l_in = (4 / 3) * Math.tan(0.25 * fireSector.widthAngle) * this.radiusIn;

        var rightVOut = new Point((-vertVOut.y * Math.sin(tempWidth)),
                                 (vertVOut.y * Math.cos(tempWidth)));
        var leftVOut = new Point((vertVOut.y * Math.sin(tempWidth)),
                                 (vertVOut.y * Math.cos(tempWidth)));

        var rightVIn = new Point((-vertVIn.y * Math.sin(tempWidth)),
                                (vertVIn.y * Math.cos(tempWidth)));

        var leftVIn  = new Point((vertVIn.y * Math.sin(tempWidth)),
                                (vertVIn.y * Math.cos(tempWidth)));

        var p1out = mulScalVector(normVector(getPerpendicular(rightVOut)), l_out);
        var p2out = mulScalVector(normVector(getPerpendicular(leftVOut)), -l_out);

        var p1in = mulScalVector(normVector(getPerpendicular(rightVIn)), l_in);
        var p2in = mulScalVector(normVector(getPerpendicular(leftVIn)), -l_in);

        rightVOut = summVector(rightVOut, this.center);
        leftVOut = summVector(leftVOut, this.center);

        rightVIn = summVector(rightVIn, this.center);
        leftVIn = summVector(leftVIn, this.center);

        p1out = summVector(p1out, rightVOut);
        p2out = summVector(p2out, leftVOut);

        p1in = summVector(p1in, rightVIn);
        p2in = summVector(p2in, leftVIn);

        // Подготовка командной строки для рисования сектора
        var pathstr = 'M'+ rightVIn.x + ',' + rightVIn.y +
            'L'+ rightVOut.x + ',' + rightVOut.y +
            'C' + p1out.x + ',' + p1out.y + ',' + p2out.x +','+ p2out.y + ','+ leftVOut.x+','+leftVOut.y +
            'L'+ leftVIn.x + ',' + leftVIn.y +
            'C' + p2in.x + ',' + p2in.y + ',' + p1in.x +','+ p1in.y + ','+ rightVIn.x+','+rightVIn.y +
            'Z';
        // Рисование
        var sector = this.paper.path(pathstr);
        // Сектор запоминает свой изначальный угол (без учёта текущего поворота всего Объекта)
        sector.myAngle = radToGrad(fireSector.directionAngle + this.options.rotateAngle);
        // Поворачиваем сектор на свой угол
        sector.transform('R'+ sector.myAngle +' '+this.center.x + ' ' + this.center.y);
        // Ставим сектору атрибут класс - по умолчанию
        $(sector.node).attr('class', 'fire-control-sector');
        // Вешаем на сектор обработчик клика данного сектора
        $(sector.node).on('click', {sector: sector}, fireSectorEvent);
        // Добавить в сектор ссылку на fireSector, чтобы при вызове коллбека передать первым параметром
        sector._fs = fireSector;
        // Добавить в сектор ссылку на свой собственный колл-бек
        sector._cbSectorFunc = this.options.sectorCallBack;
        // устанавливаем флаг речарджа сектора в false
        sector.recharged = false
        // Помещаем сектор в массив секторов данного объекта
        this.options.sectors.push(sector);
    }

    FireControl.prototype.setRotate = function(angle) {
        var tAngle = (angle - this.options.rotateAngle);
        this.options.rotateAngle = tAngle;
        tAngle = tAngle *180/Math.PI;
        this.options.sectors.forEach(function(sector){
            sector.transform('R'+ (this.an + sector.myAngle)+' '+
                       this.x + ' ' + this.y);
        }, {x: this.center.x, y: this.center.y, an: tAngle});
        tAngle = null;
    }


    return FireControl;
})();

function getPerpendicular(aPoint) {
    return new Point(aPoint.y, -aPoint.x);
}



// Обработчики кликов !!
function allFireEvent(event){
    var obj = event.data.self;
    if(typeof(obj.options.allCallBack) === 'function')
        obj.options.allCallBack();

}

function fireSectorEvent(event) {
    // Получить сектор, для которого вызвано событие
    var sector = event.data.sector;
    // уйти в перезарядку
    if(! sector.recharged) {
        // установить sector.recharged в true
        sector.recharged = true;
        $(sector.node).attr('class', 'fire-control-sector-recharge');
        // Запустить timeOut речарджа
        setTimeout(function () {
                sector.recharged = false;
                $(sector.node).attr('class', 'fire-control-sector');
            },
            sector._fs.recharge);
        // Вызвать свой коллБэк и передать туда fireSector
        if (typeof(sector._cbSectorFunc) === 'function')
            sector._cbSectorFunc(sector._fs);
    }
}