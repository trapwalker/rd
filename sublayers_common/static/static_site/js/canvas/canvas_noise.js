var constFlashTickCount = 30;           // ���������� ����� ����������� ���������� �� ��������
var constNotFlashTickCount = 1200;      // ���������� ����� ����������� ��� ��������
var constMainNoiseOpacity = 0.36;       // ������� ������������ ����
var constFlashNoiseOpacity = 1;         // ������� ������ ������������ ���� �� ����� �������

var CanvasNoise = (function(){
    function CanvasNoise() {
        this.state = constFlashTickCount;
        this.img = [];
        this.patterns = [];

        var image_array = [
            '/static/static_site/img/noise/n_noise_001.png',
            '/static/static_site/img/noise/n_noise_002.png',
            '/static/static_site/img/noise/n_noise_003.png',
            '/static/static_site/img/noise/n_noise_004.png',
            '/static/static_site/img/noise/n_noise_005.png'
        ];
        var self = this;
        var context = canvasManager.context;
        for (var i = 0; i < image_array.length; i++) {
            var image = new Image();
            image.src = image_array[i];
            SetImageOnLoad(image, function(img) {
                self.img.push(img);
                self.patterns.push(context.createPattern(img, "repeat"));
            });
        }

        if (canvasManager) canvasManager.add_obj(this, 0);
    }

    CanvasNoise.prototype.flashNoise = function() {
        this.state = constFlashTickCount;
    };

    CanvasNoise.prototype.redraw = function(context, time) {
        if (this.img.length == 0) return;
        //return;

        context.save();
        context.globalAlpha = constMainNoiseOpacity;

        if (this.state > 0) context.globalAlpha = Math.random() * constFlashNoiseOpacity;
        if (this.state < 0) context.globalAlpha = constMainNoiseOpacity;
        if (this.state < -constNotFlashTickCount) this.state = constFlashTickCount;
        this.state --;
        // todo: �� ����, ��� ������������ ��������� ��������. �� ����� ��������
        //context.fillStyle = context.createPattern(this.img[Math.floor(Math.random() * this.img.length - 0.001)], "repeat");
        context.fillStyle = this.patterns[Math.floor(Math.random() * this.patterns.length - 0.001)];
        context.fillRect(0, 0, canvasManager.width, canvasManager.height);

        context.restore();
    };

    return CanvasNoise;
})();

var canvasNoise;