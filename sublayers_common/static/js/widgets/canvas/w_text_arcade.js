var WTextArcade = (function () {
    WTextArcade.prototype.queue = [];

    function WTextArcade(text){
        this.start_time = 0; // start current phase
        this.text = text || "";
        this.position = 500;

        this.center = new Point(mapCanvasManager.canvas.width / 2.0, 150);

        this.phases_dur = {
            start: 1700,
            freeze: 200,
            finish: 600
        };

        this.phase = null;
    }

    WTextArcade.prototype.start = function() {
        this.queue.push(this);
        if (this.queue.length == 1) this._start();
    };

    WTextArcade.prototype._start = function () {
        this.start_time = clock.getClientTime();
        mapCanvasManager.add_vobj(this, 96);
        this.phase = "start";
    };

    WTextArcade.prototype._phase_progress = function (phase_dur, time) {
        return (time - this.start_time) / phase_dur;
    };

    WTextArcade.prototype._test_phase = function(time) {
        var prc = 0;
        if (this.phase == "start") {
            prc = this._phase_progress(this.phases_dur.start, time);
            if (prc < 0 || prc >= 1.0) { // Смена фазы
                this.phase = "freeze";
                this.start_time += this.phases_dur.start;
            }
        }

        if (this.phase == "freeze") {
            var phaze_dur = this.queue.length == 1 ? 3 * this.phases_dur.freeze : this.phases_dur.freeze; // если нет других сообщений, то удвоить длину этой фазы
            prc = this._phase_progress(phaze_dur, time);
            if (prc < 0 || prc >= 1.0) { // Смена фазы
                this.phase = "finish";
                this.start_time = time;
            }
        }

        if (this.phase == "finish") {
            prc = this._phase_progress(this.phases_dur.finish, time);
            if (prc < 0 || prc >= 1.0) { // Завершение
                this.phase = null;
                this.start_time = null;
                this.finish();
            }
        }

        return Math.max(Math.min(prc, 1.0), 0.0);
    };

    WTextArcade.prototype._get_alpha = function (prc, time, pos) {
        var center_x = this.center.x;
        var path_of_visibility = center_x * 0.2;
        if (this.phase == "start") {
            if (pos > -path_of_visibility) return 1.0;
            pos = pos - (-path_of_visibility);
            return 1.0 - (-pos / (center_x - path_of_visibility));
        }
        if (this.phase == "finish") {
            if (pos < path_of_visibility) return 1.0;
            pos = pos - path_of_visibility;
            return 1.0 - pos / (center_x - path_of_visibility);
        }
        return 1.0;
    };

    WTextArcade.prototype._get_position = function (prc, time) {

        function easeOutElastic(x, t, b, c, d) {
            // x: percent of animate, t: current time, b: begInnIng value, c: change In value, d: duration
            if (x > 0.68) return 0;
            var s = 1.70158;
            var p = 0;
            var a = c;
            if (t == 0) return b;
            if ((t /= d) == 1) return b + c;
            if (!p) p = d * .3;
            if (a < Math.abs(c)) {
                a = c;
                var s = p / 4;
            }
            else var s = p / (2 * Math.PI) * Math.asin(c / a);
            return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
        }

        function easeInBack(x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            return c * (t /= d) * t * ((s + 1) * t - s) + b;
        }

        if (this.phase == "start") {
            return easeOutElastic(prc, time - this.start_time, -this.center.x, this.center.x, this.phases_dur.start);
        }
        if (this.phase == "finish") {
            return easeInBack(prc, time - this.start_time, 0, this.center.x, this.phases_dur.finish)
        }
        return 0;
    };

    WTextArcade.prototype.finish = function () {
        //console.log("WTextArcade.prototype.finish");
        mapCanvasManager.del_vobj(this);
        var index = this.queue.indexOf(this);
        if (index >=0) this.queue.splice(index, 1);
        if (this.queue.length > 0) this.queue[0]._start();
    };

    WTextArcade.prototype.redraw = function (ctx, time) {
        time = clock.getClientTime(); // Здесь нужно именно клиентское время для плавности
        var prc = this._test_phase(time);
        //console.log(prc, this.start_time);
        if (!this.start_time) return;
        ctx.save();
        var pos = this._get_position(prc, time);
        ctx.globalAlpha = this._get_alpha(prc, time, pos);
        ctx.translate(this.center.x + pos, this.center.y);
        ctx.textAlign = "center";
        ctx.textBaseline = "center";
        ctx.font = "42px Calculate_01";
        ctx.fillStyle = '#fffc00';
        ctx.shadowColor = '#fffc00';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 10;
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    };

    return WTextArcade
})();



function TextArcadeTest() {
    new WTextArcade("Двойное убийство").start();
    new WTextArcade("40 очков!").start();
    new WTextArcade("Тройное убийство").start();
    new WTextArcade("60 очков!").start();
    new WTextArcade("Щит активирован").start();
    new WTextArcade("20 очков!").start();
}