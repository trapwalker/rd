/*
 *
 * */

var EDischargeFirePNG_1 = (function () {

    function EDischargeFirePNG_1(position, direction){
        this.marker = null;
        // todo: сделать вычисление direction правильным способом!
        this.direction = direction;
        this.position = position;
        this.frame_numb = 0;
        this.duration = 0.0;
        this.time_start = null;
    }

    EDischargeFirePNG_1.prototype._createMarker = function(){
        var marker;
        var pos = summVector(this.position, polarPoint(30., this.direction));

        marker = L.rotatedMarker(map.unproject([pos.x, pos.y], map.getMaxZoom()));
        marker.options.angle = this.direction;
        this.div_id = 'EDischargeFirePNG' + (-generator_ID.getID());
        var myIcon1 = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            html: '<div id="' + this.div_id + '" class="effect-fire-discharge-png-1"></div>'
        });

        this.duration = 300;
        this.frame_count = 5;
        this._offset = 40; // сдвиг в пикселах
        this.time_of_frame = this.duration / this.frame_count;
        this.amimation_size = 200;

        this.marker = marker;
        marker.setIcon(myIcon1);
        this.time_start = clock.getClientMS();
        this._set_frame(this.time_start);
        marker.addTo(map);

        this.icon_div = document.getElementById(this.div_id);
        if (!this.icon_div) {
            console.error('Див не добавлен!')
        }

    };

    EDischargeFirePNG_1.prototype._set_frame = function(time){
        var t = (time - this.time_start) % this.duration;
        var frame_n = Math.floor(t / this.time_of_frame);
        if(this.frame_numb != frame_n) {
            this.frame_numb = frame_n;
            this.icon_div.style.backgroundPosition = (this.amimation_size - frame_n * this._offset) + 'px 0px';
        }
    };

    EDischargeFirePNG_1.prototype.change = function(t){
        this._set_frame(clock.getClientMS());
    };

    EDischargeFirePNG_1.prototype.start = function () {
        this._createMarker();
        timeManager.addTimeoutEvent(this, 'finish', this.duration);
        timeManager.addTimerEvent(this, 'change');
        return this
    };

    EDischargeFirePNG_1.prototype.finish = function () {
        timeManager.delTimerEvent(this, 'change');
        map.removeLayer(this.marker);
    };


    return EDischargeFirePNG_1
})();


var EDischargeFirePNG_2 = (function () {

    function EDischargeFirePNG_2(position, direction){
        this.marker = null;
        // todo: сделать вычисление direction правильным способом!
        this.direction = direction;
        this.position = position;
        this.frame_numb = 0;
        this.duration = 0.0;
        this.time_start = null;
    }

    EDischargeFirePNG_2.prototype._createMarker = function(){
        var marker;
        var pos = summVector(this.position, polarPoint(50., this.direction));

        marker = L.rotatedMarker(map.unproject([pos.x, pos.y], map.getMaxZoom()));
        marker.options.angle = this.direction;
        this.div_id = 'EDischargeFirePNG' + (-generator_ID.getID());
        var myIcon1 = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [75, 57],
            iconAnchor: [38, 29],
            html: '<div id="' + this.div_id + '" class="effect-fire-discharge-png-2"></div>'
        });

        this.duration = 1000;
        this.frame_count = 12;
        this._offset = 75; // сдвиг в пикселах
        this.time_of_frame = this.duration / this.frame_count;
        this.amimation_size = 900;

        this.marker = marker;
        marker.setIcon(myIcon1);
        this.time_start = clock.getClientMS();
        this._set_frame(this.time_start);
        marker.addTo(map);

        this.icon_div = document.getElementById(this.div_id);
        if (!this.icon_div) {
            console.error('Див не добавлен!')
        }

    };

    EDischargeFirePNG_2.prototype._set_frame = function(time){
        var t = (time - this.time_start) % this.duration;
        var frame_n = Math.floor(t / this.time_of_frame);
        if(this.frame_numb != frame_n) {
            this.frame_numb = frame_n;
            this.icon_div.style.backgroundPosition = (this.amimation_size - frame_n * this._offset) + 'px 0px';
        }
    };

    EDischargeFirePNG_2.prototype.change = function(t){
        this._set_frame(clock.getClientMS());
    };

    EDischargeFirePNG_2.prototype.start = function () {
        this._createMarker();
        timeManager.addTimeoutEvent(this, 'finish', this.duration);
        timeManager.addTimerEvent(this, 'change');
        return this
    };

    EDischargeFirePNG_2.prototype.finish = function () {
        timeManager.delTimerEvent(this, 'change');
        map.removeLayer(this.marker);
    };


    return EDischargeFirePNG_2
})();
