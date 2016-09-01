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

        this.kalman_set = false;
        this.kalman_filter = new SimpleKalmanFilter(15);
    }

    GeoLocationManager.prototype.start_watch = function() {
        this.watch_id = navigator.geolocation.watchPosition(this._watch_success.bind(this), this._watch_error.bind(this), this.options);
    };

    GeoLocationManager.prototype.stop_watch = function() {
        navigator.geolocation.clearWatch(this.watch_id);
        this.watch_id = null;
    };

    GeoLocationManager.prototype._watch_success = function(position) {
        var pos = mapManager.project({lat: position.coords.latitude, lng: position.coords.longitude}, 18);

        clientManager.sendGeoCoord(this.geo_position_to_dict(position), pos);

        $('.v-indicator').text(position.coords.speed + ' km/h');
        // todo: стереть это потом!

        if (user && user.userCar && this.kalman_set) {
            var last_kalman_pos = this.kalman_filter.get_lat_lng();
            this.kalman_filter.process(position.coords.latitude, position.coords.longitude, position.coords.accuracy, position.timestamp);
            var current_kalman_pos = this.kalman_filter.get_lat_lng();
            pos = mapManager.project(current_kalman_pos, 18);
            console.log('Kalman:' + pos);
            // Определение направления, если это возможно
            var direction = null;
            if (last_kalman_pos) {
                var last_pos = mapManager.project(last_kalman_pos, 18);
                var direction_vector = subVector(pos, last_pos);
                if (direction_vector.abs() > 0.1)
                    direction = angleVectorRadCCW2(direction_vector);
            }

            user.userCar._motion_state.p0 = pos;
            user.userCar._motion_state.t0 = clock.getCurrentTime();
            user.userCar._motion_state.fi0 = direction || user.userCar._motion_state.fi0;
            user.userCar.change();
        }
        else {
            //console.log('GPS:' + pos);
        }

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


var SimpleKalmanFilter = (function(){
    function SimpleKalmanFilter(Q_metres_per_second){
        this.MinAccuracy = 1;
        this.Q_metres_per_second = Q_metres_per_second;    // float
        this.TimeStamp_milliseconds = null;
        this.lat = null;
        this.lng = null;
        this.variance = -1;
    }

    SimpleKalmanFilter.prototype.get_TimeStamp = function () {
        return this.TimeStamp_milliseconds;
    };

    SimpleKalmanFilter.prototype.get_lat_lng = function () {
        return this.lat && this.lng ? {lat: this.lat, lng: this.lng} : null;
    };

    SimpleKalmanFilter.prototype.get_accuracy = function () {
        return Math.sqrt(this.variance)
    };

    SimpleKalmanFilter.prototype.SetState = function(lat, lng, accuracy, TimeStamp_milliseconds) {
        this.lat=lat;
        this.lng=lng;
        this.variance = accuracy * accuracy;
        this.TimeStamp_milliseconds=TimeStamp_milliseconds;
    };

    SimpleKalmanFilter.prototype.process = function (lat_measurement, lng_measurement, accuracy, TimeStamp_milliseconds) {
        if (accuracy < this.MinAccuracy) accuracy = this.MinAccuracy;
        if (this.variance < 0) {
            // if variance < 0, object is unitialised, so initialise with current values
            this.TimeStamp_milliseconds = TimeStamp_milliseconds;
            this.lat = lat_measurement;
            this.lng = lng_measurement;
            this.variance = accuracy * accuracy;
        } else {
            // else apply Kalman filter methodology
            var TimeInc_milliseconds = TimeStamp_milliseconds - this.TimeStamp_milliseconds;
            if (TimeInc_milliseconds > 0) {
                // time has moved on, so the uncertainty in the current position increases
                this.variance += TimeInc_milliseconds * this.Q_metres_per_second * this.Q_metres_per_second / 1000;
                this.TimeStamp_milliseconds = TimeStamp_milliseconds;
                // TO DO: USE VELOCITY INFORMATION HERE TO GET A BETTER ESTIMATE OF CURRENT POSITION
            }
            // Kalman gain matrix K = Covarariance * Inverse(Covariance + MeasurementVariance)
            // NB: because K is dimensionless, it doesn't matter that variance has different units to lat and lng
            var K = this.variance / (this.variance + accuracy * accuracy);
            // apply K
            this.lat += K * (lat_measurement - this.lat);
            this.lng += K * (lng_measurement - this.lng);
            // new Covarariance  matrix is (IdentityMatrix - K) * Covarariance
            this.variance = (1 - K) * this.variance;
        }
    };

    return SimpleKalmanFilter;
})();