

var RadialMenu = (function(){
    function RadialMenu(options){
        this.options = {
            radiusOut: 100, // Внешний радиус, по сути означает радиус всего меню
            radiusIn: 75,    // Внутренний радиус
            count: 4,      // кол-во элементов меню
            menuName: 'radialMenuName',
            parentSVG: '',
            parentDiv: '',
            gradBetwElements: 0 // расстояние в градусах между элементами меню
        };

        if(options){
            if(options.radiusOut) this.options.radiusOut = options.radiusOut;
            if(options.radiusIn) this.options.radiusIn = options.radiusIn;
            if(options.count) this.options.count = options.count;
            if(options.menuName) this.options.menuName = options.menuName;
            if(options.parentSVG) this.options.parentSVG = options.parentSVG;
            if(options.parentDiv) this.options.parentDiv = options.parentDiv;
            if(options.gradBetwElements) this.options.gradBetwElements = options.gradBetwElements;
        }

        this.parent = $('#'+this.options.parentDiv);

        this.currAngle = 0; // текущий угол поворота
        this.angleStep = gradToRad(360 / this.options.count); // шаг в радианах
        this.currSectorAcnive = 0;


        this.sectors = [];    // ссылки на каждый элемент меню
        this.NS = "http://www.w3.org/2000/svg";
        this.SVG = document.getElementById(this.options.parentSVG);
        this.SVG.setAttribute('height', this.options.radiusOut * 2);
        this.SVG.setAttribute('width', this.options.radiusOut * 2);

        /*
         this.SVG=document.createElementNS(this.NS,"svg");
         var parent = document.getElementById('testRadMenu');
         parent.appendChild(this.SVG);
         */
        this._createSectors();
    }

    RadialMenu.prototype.rotate = function (angle) {
        this.currAngle = gradToRad(angle);
        this.groupRM.setAttribute('transform',
                'rotate(' + angle + ', ' + this.options.radiusOut + ',' + this.options.radiusOut + ')');
    };
    RadialMenu.prototype.translate = function (aPoint) {
        this.groupRM.setAttribute('transform',
                'translate(' + aPoint.x + ', ' + aPoint.y + ')');
    };
    RadialMenu.prototype.getSector = function (index) {
        if (index < this.sectors.length)
            return this.sectors[index];
    };
    RadialMenu.prototype._createSectors = function(){
        // Создать <symbol> сектор, для последующего использования

        // Получить половину от угла одного сектора в радианах
        var tempWidth = ( ((Math.PI * 2) / this.options.count) - gradToRad(this.options.gradBetwElements)) / 2;
        // Получить внешний и внутренний радиусы
        var vertVOut = new Point(this.options.radiusOut, 0);
        var vertVIn = new Point(this.options.radiusIn, 0);
        // Получить повёрнутые вектора для внутреннего и внешнего радиусов
        var rightVOut = rotateVector(vertVOut, tempWidth);
        var leftVOut = rotateVector(vertVOut, -tempWidth);
        var rightVIn = rotateVector(vertVIn, tempWidth);
        var leftVIn  = rotateVector(vertVIn, -tempWidth);

        // Составить svg-path
        var pathstr = 'M'+ rightVIn.x + ',' + rightVIn.y +
            'L'+ rightVOut.x + ',' + rightVOut.y +
            'A' + this.options.radiusOut + ',' + this.options.radiusOut + ', 0, 0, 0, '+ leftVOut.x+','+leftVOut.y +
            'L'+ leftVIn.x + ',' + leftVIn.y +
            'A' + this.options.radiusIn + ',' + this.options.radiusIn + ', 0, 0, 1, '+ rightVIn.x+','+rightVIn.y +
            'Z';


        // TODO: Разобраться и сделать через <symbol id="symbID"> и <use xlink:href="symbID">
        // добавить в svg symbol, а в него path
        //this.symbolSector = document.createElementNS(this.NS, "symbol");
        //this.symbolSector.setAttribute('id', this.options.menuName+'SymbolSector');
        //var pathSector = document.createElementNS(this.NS,"path");
        //pathSector.setAttribute('class', 'radial-menu-sector-default');
        //pathSector.setAttribute('d', pathstr);
        //pathSector.setAttribute('transform', 'translate('+ this.options.radiusOut +', ' + this.options.radiusOut + ')');
        //this.SVG.appendChild(this.symbolSector);
        //this.symbolSector.appendChild(pathSector);
  //      this.SVG.appendChild(pathSector);

        // Созать g - группу для удобного манипулирования
        this.groupRM = document.createElementNS(this.NS,"g");
        this.SVG.appendChild(this.groupRM);


        // в цикле заполнить секторами this.groupRM
        for(var i=0;i<this.options.count; i++){
            // Создать сектор
            /* TODO: разобраться с symbol
            var sector = document.createElementNS(this.NS,"use");
            sector.setAttribute('xlink:href', '#'+this.options.menuName+'SymbolSector');
            sector.setAttribute('transform', 'rotate(' + (i * 360 / this.options.count) + ')');
            */

            var sector = {};
            sector.path = document.createElementNS(this.NS,"path");
            sector.path.setAttribute('class', 'radial-menu-sector-default');
            sector.path.setAttribute('d', pathstr);
            sector.path.setAttribute('transform', 'translate('+ this.options.radiusOut +', ' + this.options.radiusOut + ') '+
                'rotate(' + (i * 360 / this.options.count) +')');
            this.groupRM.appendChild(sector.path);
            // установка дополнительных характеристик сектора
            sector.angle = gradToRad(i * 360 / this.options.count);
            sector.id = i;
            this.sectors.push(sector);
        }


    };


    RadialMenu.prototype.showMenu = function(aPoint, aAngle){
        // переместить меню в нужную позицию
        this.parent.css('top', (aPoint.y - this.options.radiusOut) + 'px');
        this.parent.css('left', (aPoint.x - this.options.radiusOut) + 'px');
        // Повернуть на угол машинки в момент отображения меню
        this.rotate(radToGrad(aAngle));

        this.parent.show();
        return this;
    };


    RadialMenu.prototype.hideMenu = function(isFire){
        this.parent.hide();
         //если была стрельба
        if(isFire){
            // взять последний активный сектор и стрельнуть из него this.currSectorActive
            if(this.currSectorActive){
                var fs = controllers.fireControl._getSectorByID(this.currSectorActive.id);
                controllers.fireControl._fireSectorEvent({data:{sector: fs}});
            }
        }

        // обнулить выбранный сектор
        if(this.currSectorActive) {
            this.currSectorActive.path.setAttribute('class', 'radial-menu-sector-default');
            this.currSectorActive=0;
        }


        return this;
    };

    RadialMenu.prototype._getSectorByAngle = function(angle){
        for(var i=0; i < this.sectors.length; i++){
            // если разница углов между секторами меньше чем шаг, то это нужный сектор
            if(Math.abs(getDiffAngle((this.sectors[i].angle + this.currAngle), angle)) < (this.angleStep/2)) {
                chat.addMessageToSystem('angle_rm'+i, "diff_angle" + i + " = " + radToGrad(getDiffAngle(this.sectors[i].angle, angle)));
                return this.sectors[i];
            }
        }
    };


    RadialMenu.prototype.setActiveSector = function(angle){
        var nSector = this._getSectorByAngle(angle);
        chat.addMessageToSystem('angle_rm', "a = " + radToGrad(angle));
        if (!this.currSectorActive) {
            this.currSectorActive = nSector;
            this.currSectorActive.path.setAttribute('class', 'radial-menu-sector-active');
        }
        else {
            if (this.currSectorActive.id != nSector.id) { // если новый сектор
                this.currSectorActive = nSector;
                // сбросить все сектора
                for (var i = 0; i < this.sectors.length; i++) {
                    this.sectors[i].path.setAttribute('class', 'radial-menu-sector-default');
                }
                this.currSectorActive.path.setAttribute('class', 'radial-menu-sector-active');
                chat.addMessageToSystem('rm_new_sector', "Sector angle !!!!!!! = " + radToGrad(this.currSectorActive.angle));
            }
        }
    };


    // TODO: в wsjson вызвать функцию, которая по углам сделает соответствие айдишникам секторов



    return RadialMenu;
})();