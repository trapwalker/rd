var constTextBlurDelay = 50;         // врем€ смены €ркости шрифта


var TextBlurBlink = (function(){
    function TextBlurBlink() {
        this.last_time = timeManager.getTime();
        timeManager.addTimerEvent(this, 'redraw');
    }

    TextBlurBlink.prototype.redraw = function(time) {
        if ((time - this.last_time) >= constTextBlurDelay) {
            this.last_time = time;
            $('.text-blur').animate({
                'textShadowBlur': Math.floor(Math.random() * 15) + 10
//              'textShadowColor': 'rgba(0,255,0,' + (Math.floor(Math.random() * 200) + 55) + ')'
            });
        }
    };

    return TextBlurBlink;
})();

var textBlurBlink;



var constTextBlurDelayMax = 10000;        // врем€ смены €ркости шрифта
var constTextBlurDelayMin = 5000;         // врем€ смены €ркости шрифта

var TextBlurBlink2 = (function(){
    function TextBlurBlink2() {
        this.next_time = timeManager.getTime();
        timeManager.addTimerEvent(this, 'redraw');
    }

    // text-shadow: 0 0 1px #00ff00, 0 0 10px #00ff00;

    TextBlurBlink2.prototype.redraw = function(time) {
        if (this.next_time < time) {
            // Ќачинаем процесс обновлени€ text-shadow
            var body = $('body').first();
            setTimeout(function() {
                body.css({'text-shadow': '0 0 3px #00ff00, 0 0 10px #00ff00'});
            }, 20);


            setTimeout(function() {
                body.css({'text-shadow': '0 0 3px #00ff00, 0 0 10px #00ff00'});
            }, 100);
            setTimeout(function() {
                body.css({'text-shadow': '1px 1px 1px #00ff00, 0 0 10px #00ff00'});
            }, 200);
            setTimeout(function() {
                body.css({'text-shadow': '1px 1px 2px #00ff00, 0 0 8px #00ff00'});
            }, 300);
            setTimeout(function() {
                body.css({'text-shadow': '0 0 1px #00ff00, 0 0 10px #00ff00'});
            }, 500);


            setTimeout(function() {
                body.css({'text-shadow': '0 0 1px #00ff00, 0 0 10px #00ff00'});
            }, 600);


            this.next_time += constTextBlurDelayMin + Math.floor(Math.random() * (constTextBlurDelayMax - constTextBlurDelayMin));

            console.log(this.next_time);
        }


    };

    return TextBlurBlink2;
})();

var OneBlinkTextShadow = function () {
    var body = $('body').first();
    setTimeout(function () {
        body.css({'text-shadow': '0 0 3px #00ff00, 0 0 10px #00ff00'});
    }, 20);

    setTimeout(function () {
        body.css({'text-shadow': '0 0 3px #00ff00, 0 0 10px #00ff00'});
    }, 100);
    setTimeout(function () {
        body.css({'text-shadow': '1px 1px 1px #00ff00, 0 0 10px #00ff00'});
    }, 200);
    setTimeout(function () {
        body.css({'text-shadow': '1px 1px 2px #00ff00, 0 0 8px #00ff00'});
    }, 300);
    setTimeout(function () {
        body.css({'text-shadow': '0 0 1px #00ff00, 0 0 15px #00ff00'});
    }, 500);


    setTimeout(function () {
        body.css({'text-shadow': '0 0 1px #00ff00, 0 0 10px #00ff00'});
    }, 600);
};