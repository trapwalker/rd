/*
 *
 * */

var EAnimationPNG = (function () {

    function EAnimationPNG(position, direction){
        this.duration = 0;
        this.frame_count = 0;
        this.time_of_frame = 0;
        this._offset = 0; // сдвиг в пикселах
        this.icon_size_x = 0;
        this.icon_size_y = 0;
        this.div_class = "";
        this.icon_offset = 0;
        this.marker = null;
        this.direction = direction;
        this.position = position;
        this.current_frame = 0;
        this.animation_timer = null;
    }

    EAnimationPNG.prototype._createMarker = function(){
        var marker;
        var pos = summVector(this.position, polarPoint(this.icon_offset, this.direction));

        marker = L.rotatedMarker(map.unproject([pos.x, pos.y], map.getMaxZoom()));
        marker.options.angle = this.direction;
        this.div_id = 'EAnimationPNG' + (-generator_ID.getID());
        var myIcon1 = L.divIcon({
            className: 'my-effect-icon',
            iconSize: [this.icon_size_x, this.icon_size_y],
            iconAnchor: [this.icon_size_x / 2, this.icon_size_y / 2],
            html: '<div id="' + this.div_id + '" class="' + this.div_class + '"></div>'
        });
        this.marker = marker;
        marker.setIcon(myIcon1);
        marker.addTo(map);

        this.icon_div = document.getElementById(this.div_id);
        if (!this.icon_div) {
            console.error('Див не добавлен!')
        }

    };

    EAnimationPNG.prototype._set_frame = function(){
        // todo: вызов производится в таймере, поэтому учесть, что он мог быть как с 0, так и с time_of_frame
        this.current_frame++;
        if(this.current_frame >= this.frame_count) this.current_frame = 0;
        this.icon_div.style.backgroundPosition = - this.current_frame * this._offset + 'px 0px';

    };

    EAnimationPNG.prototype._start = function () {
        this._createMarker();
        var self = this;
        this.animation_timer = setInterval(function () {
            self._set_frame();
        }, this.time_of_frame);
        if (this.duration > 0)
            timeManager.addTimeoutEvent(this, 'finish', this.duration);
    };

    EAnimationPNG.prototype.start = function(delay){
        if (delay)
            timeManager.addTimeoutEvent(this, '_start', delay);
        else
            this._start();
        return this;
    };

    EAnimationPNG.prototype.finish = function () {
        if(this.animation_timer) clearInterval(this.animation_timer);
        map.removeLayer(this.marker);
    };

    return EAnimationPNG
})();


var EDischargeFirePNG_1 = (function (_super) {
    __extends(EDischargeFirePNG_1, _super);

    function EDischargeFirePNG_1(position, direction){
        _super.call(this, position, direction);
        this.duration = 1000;
        this.frame_count = 12;
        this.time_of_frame = this.duration / this.frame_count;
        this._offset = 75;
        this.icon_size_x = 75;
        this.icon_size_y = 57;
        this.div_class = "effect-fire-discharge-png-2";
        this.icon_offset = 50;
    }

    return EDischargeFirePNG_1
})(EAnimationPNG);


var EDischargeFirePNG_2 = (function (_super) {
    __extends(EDischargeFirePNG_2, _super);

    function EDischargeFirePNG_2(position, direction){
        _super.call(this, position, direction);
        this.duration = 300;
        this.frame_count = 5;
        this.time_of_frame = this.duration / this.frame_count;
        this._offset = 40;
        this.icon_size_x = 40;
        this.icon_size_y = 40;
        this.div_class = "effect-fire-discharge-png-1";
        this.icon_offset = 30;
    }

    return EDischargeFirePNG_2
})(EAnimationPNG);


var EAutoFirePNG = (function (_super) {
    __extends(EAutoFirePNG, _super);

    function EAutoFirePNG(car, side) {
        this.car = car;
        this.direction = user.userCar.fireSidesMng.sides[side].direction;
        _super.call(this, car.getCurrentCoord(clock.getCurrentTime()), this.direction);
        this.frame_count = 2;
        this.time_of_frame = 100;
        this._offset = 20;
        this.icon_size_x = 20;
        this.icon_size_y = 32;
        this.div_class = "effect-fire-auto-png";
        if (side == 'front')
            this.icon_offset = 35;
        else
            this.icon_offset = 20;
    }

    EAutoFirePNG.prototype.change = function() {
        //console.log('EAutoFirePNG.prototype.change');
        var time = clock.getCurrentTime();
        var tempPoint = this.car.getCurrentCoord(time);
        var dir = this.car.getCurrentDirection(time) + this.direction;

        var pos = summVector(tempPoint, polarPoint(this.icon_offset, dir));
        var tempLatLng = map.unproject([pos.x, pos.y], map.getMaxZoom());
        this.marker.options.angle = dir;
        this.marker.setLatLng(tempLatLng);
    };

    EAutoFirePNG.prototype.start = function (delay) {
        _super.prototype.start.call(this, delay);
        timeManager.addTimerEvent(this, 'change');
        return this
    };


    return EAutoFirePNG
})(EAnimationPNG);


var EHeavyBangPNG_1 = (function (_super) {
    __extends(EHeavyBangPNG_1, _super);

    function EHeavyBangPNG_1(position){
        _super.call(this, position, 0);
        this.duration = 1200;
        this.frame_count = 12;
        this.time_of_frame = this.duration / this.frame_count;
        this._offset = 115;
        this.icon_size_x = 115;
        this.icon_size_y = 115;
        this.div_class = "effect-heavy-bang-png-1";
    }

    return EHeavyBangPNG_1
})(EAnimationPNG);


var EHeavyBangPNG_2 = (function (_super) {
    __extends(EHeavyBangPNG_2, _super);

    function EHeavyBangPNG_2(position){
        _super.call(this, position, 0);
        this.duration = 1200;
        this.frame_count = 12;
        this.time_of_frame = this.duration / this.frame_count;
        this._offset = 115;
        this.icon_size_x = 115;
        this.icon_size_y = 115;
        this.div_class = "effect-heavy-bang-png-2";
    }

    return EHeavyBangPNG_2
})(EAnimationPNG);


var ELightBangPNG_1 = (function (_super) {
    __extends(ELightBangPNG_1, _super);

    function ELightBangPNG_1(position){
        _super.call(this, position, 0);
        this.duration = 300;
        this.frame_count = 3;
        this.time_of_frame = this.duration / this.frame_count;
        this._offset = 22;
        this.icon_size_x = 22;
        this.icon_size_y = 22;
        this.div_class = "effect-light-bang-png-1";
    }

    return ELightBangPNG_1
})(EAnimationPNG);


var ELightBangPNG_2 = (function (_super) {
    __extends(ELightBangPNG_2, _super);

    function ELightBangPNG_2(position, direction){
        _super.call(this, position, direction);
        this.duration = 300;
        this.frame_count = 3;
        this.time_of_frame = this.duration / this.frame_count;
        this._offset = 22;
        this.icon_size_x = 22;
        this.icon_size_y = 22;
        this.div_class = "effect-light-bang-png-2";
    }

    return ELightBangPNG_2
})(EAnimationPNG);


var EHeavyBangOrientedPNG_1 = (function (_super) {
    __extends(EHeavyBangOrientedPNG_1, _super);

    function EHeavyBangOrientedPNG_1(position, direction){
        _super.call(this, position, direction);
        this.duration = 1200;
        this.frame_count = 12;
        this.time_of_frame = this.duration / this.frame_count;
        this._offset = 107;
        this.icon_size_x = 107;
        this.icon_size_y = 107;
        this.div_class = "effect-heavy-bang-oriented-png-1";
        this.icon_offset = -35;
    }

    return EHeavyBangOrientedPNG_1
})(EAnimationPNG);


var EHeavyBangOrientedPNG_2 = (function (_super) {
    __extends(EHeavyBangOrientedPNG_2, _super);

    function EHeavyBangOrientedPNG_2(position, direction){
        _super.call(this, position, direction);
        this.duration = 1200;
        this.frame_count = 12;
        this.time_of_frame = this.duration / this.frame_count;
        this._offset = 107;
        this.icon_size_x = 107;
        this.icon_size_y = 107;
        this.div_class = "effect-heavy-bang-oriented-png-2";
        this.icon_offset = -35;
    }

    return EHeavyBangOrientedPNG_2
})(EAnimationPNG);
