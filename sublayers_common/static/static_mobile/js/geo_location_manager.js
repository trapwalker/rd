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

        this._last_position = null;
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

        clientManager.sendGeoCoord(this.geo_position_to_dict(position), pos);
        // todo: стереть это потом!
        console.log(pos);
        /*if (user && user.userCar) {
            user.userCar._motion_state.p0 = pos;
            user.userCar._motion_state.t0 = clock.getCurrentTime();
            user.userCar._motion_state.fi0 = position.coords.heading || user.userCar._motion_state.fi0;
            user.userCar.change();
        }/**/
        this._last_position = position;
    };

    GeoLocationManager.prototype._watch_error = function(error) {
        alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
    };

    GeoLocationManager.prototype.geo_position_to_dict = function (position) {
        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            altitude_accuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
        };
    };


    return GeoLocationManager;
})(ClientObject);


var geoLocationManager;