

var RadialMenu = (function(){
    function RadialMenu(options){
        this.options = {
            radiusOut: 100, // Внешний радиус, по сути означает радиус всего меню
            radiusIn: 75,    // Внутренний радиус
            count: 4,      // кол-во элементов меню
            menuName: 'radialMenuName',
            parentSVG: '',
            gradBetwElements: 5 // расстояние в градусах между элементами меню
        }

        if(options){
            if(options.radiusOut) this.options.radiusOut = options.radiusOut;
            if(options.radiusIn) this.options.radiusIn = options.radiusIn;
            if(options.count) this.options.count = options.count;
            if(options.menuName) this.options.menuName = options.menuName;
            if(options.parentSVG) this.options.parentSVG = options.parentSVG;
            if(options.gradBetwElements) this.options.gradBetwElements = options.gradBetwElements;
        }


        this.sectors = [];    // ссылки на каждый элемент меню
        this.NS = "http://www.w3.org/2000/svg";
        this.SVG = document.getElementById(this.options.parentSVG);
        /*
         this.SVG=document.createElementNS(this.NS,"svg");
         var parent = document.getElementById('testRadMenu');
         parent.appendChild(this.SVG);
         */
        this._createSectors();
    }

    RadialMenu.prototype.rotate = function (angle) {
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

            var sector = document.createElementNS(this.NS,"path");
            sector.setAttribute('class', 'radial-menu-sector-default');
            sector.setAttribute('d', pathstr);
            sector.setAttribute('transform', 'translate('+ this.options.radiusOut +', ' + this.options.radiusOut + ') '+
                'rotate(' + (i * 360 / this.options.count) +')');
            //sector.setAttribute('transform', );
            this.groupRM.appendChild(sector);
            this.sectors.push(sector);
        }


    };


    return RadialMenu;
})();