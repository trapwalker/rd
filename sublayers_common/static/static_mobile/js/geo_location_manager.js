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
        console.log(pos);
    };

    GeoLocationManager.prototype._watch_error = function(error) {
        alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
    };


    return GeoLocationManager;
})(ClientObject);


var geoLocationManager;