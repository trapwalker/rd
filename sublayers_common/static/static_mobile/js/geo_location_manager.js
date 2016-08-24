var GeoLocationManager = (function(_super){
    __extends(GeoLocationManager, _super);

    function GeoLocationManager(){
        _super.call(this);
        this.watch_id = null;

        this.options = {
            maximumAge: 3600000,
            timeout: 2000,
            enableHighAccuracy: true
        };
    }

    GeoLocationManager.prototype.start_watch = function() {
        this.watch_id = navigator.geolocation.watchPosition(this._watch_success.bind(this), this._watch_error.bind(this), this.options);
    };

    GeoLocationManager.prototype.stop_watch = function() {
        navigator.geolocation.clearWatch(this.watch_id);
        this.watch_id = null;
    };

    GeoLocationManager.prototype._watch_success = function(position) {
        var pos = map.project([position.coords.latitude, position.coords.longitude], 18);

        clientManager.sendGeoCoord(position, pos);

        // todo: стереть это потом!
        console.log(pos);
        if (user.userCar) {
            user.userCar._motion_state.p0 = pos;
            user.userCar._motion_state.t0 = clock.getCurrentTime();
            user.userCar._motion_state.fi0 = position.coords.heading || user.userCar._motion_state.fi0;

        }
    };

    GeoLocationManager.prototype._watch_error = function(error) {
        alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
    };


    return GeoLocationManager;
})(ClientObject);


var geoLocationManager;