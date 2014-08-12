



$(document).ready(function () {

    // 0-0 всегда будет в 400 400
    // Создание SVG полотна
    var NS = 'http://www.w3.org/2000/svg';
    var SVG = document.getElementById('mainSVG');
    SVG.setAttribute('height', 800+'px');
    SVG.setAttribute('width', 800+'px');
    document.getElementById('testRadMenu').appendChild(SVG);


    // создаём G, с переносом центра в 400 400
    var mainG = document.createElementNS(NS, 'g');
    mainG.setAttribute('transform', 'translate(400, 400)');
    SVG.appendChild(mainG);


    // рисуем центр координат
    var cent1 = document.createElementNS(NS, 'path');
    cent1.setAttribute('d', 'M0,-400 L 0, 400');
    cent1.setAttribute('class','coordinates');
    mainG.appendChild(cent1);

    var cent2 = document.createElementNS(NS, 'path');
    cent2.setAttribute('d', 'M-400,0 L 400, 0');
    cent2.setAttribute('class','coordinates');
    mainG.appendChild(cent2);

    // Создать точку

    var A = document.createElementNS(NS, 'circle');
    A.setAttribute('cx', '-200');
    A.setAttribute('cy','200');
    A.setAttribute('r','5');
    mainG.appendChild(A);



    /*
    // Создание unclickable фона для контроллера (прозрачного круга)
    this.backgroundCircle = document.createElementNS(this.NS, 'circle');
    this.backgroundCircle.setAttribute('class', 'fire-control-background sublayers-unclickable');
    this.backgroundCircle.setAttribute('r', this.radiusOut);
    this.backgroundCircle.setAttribute('cx', this.center.x);
    this.backgroundCircle.setAttribute('cy', this.center.y);
    this.SVG.appendChild(this.backgroundCircle);


*/



});