var constFlashTickCount = 30;           // количество тиков перерисовки отведенное на мерцание
var constNotFlashTickCount = 1200;      // количество тиков перерисовки без мерцания
var constNoiseFrameCount = 5;           // количество кадров в анимации шума
var constMainNoiseOpacity = 0.36;       // базовая прозрачность шума
var constFlashNoiseOpacity = 1;         // верхний предел прозрачности шума во время вспышки

var CanvasNoise = (function(){
    function CanvasNoise() {
        this.state = constFlashTickCount;
        this.img = [];

        for (var i = 0; i < constNoiseFrameCount; i++)
            this.img.push(new Image());

        //this.img[0].src = '/static/img/noise/noise_stroke1.png';
        //this.img[1].src = '/static/img/noise/noise_stroke2.png';
        //this.img[2].src = '/static/img/noise/noise_stroke3.png';
        //this.img[3].src = '/static/img/noise/noise_stroke4.png';

        //this.img[0].src = '/static/img/noise/1_noise60.png';
        //this.img[1].src = '/static/img/noise/2_noise60.png';
        //this.img[2].src = '/static/img/noise/3_noise60.png';
        //this.img[3].src = '/static/img/noise/4_noise60.png';

        this.img[0].src = '/static/static_site/img/noise/n_noise_001.png';
        this.img[1].src = '/static/static_site/img/noise/n_noise_002.png';
        this.img[2].src = '/static/static_site/img/noise/n_noise_003.png';
        this.img[3].src = '/static/static_site/img/noise/n_noise_004.png';
        this.img[4].src = '/static/static_site/img/noise/n_noise_005.png';

        if (canvasManager) canvasManager.add_obj(this, 0);
    }

    CanvasNoise.prototype.flashNoise = function() {
        this.state = constFlashTickCount;
    };

    CanvasNoise.prototype.redraw = function(context, time) {
        context.globalAlpha = constMainNoiseOpacity;

        if (this.state > 0) context.globalAlpha = Math.random() * constFlashNoiseOpacity;
        if (this.state < 0) context.globalAlpha = constMainNoiseOpacity;
        if (this.state < -constNotFlashTickCount) this.state = constFlashTickCount;
        this.state --;

        context.fillStyle = context.createPattern(this.img[Math.round(Math.random() * 3)], "repeat");
        context.fillRect(0, 0, canvasManager.width, canvasManager.height);
        context.globalAlpha = 1;
    };

    return CanvasNoise;
})();

var canvasNoise;