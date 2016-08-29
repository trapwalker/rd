# -*- coding: utf-8 -*-

import math


class KalmanLatLong(object):
    min_accuracy = 1  # float

    def __init__(self, q_metres_per_second):
        self.q_metres_per_second = q_metres_per_second  # float
        # P matrix.  Negative means object uninitialised.  NB: units irrelevant, as long as same units used throughout
        self.variance = -1  # float
        self.lat = None  # double
        self.lng = None  # double
        self.timestamp_milliseconds = None  # long

    def get_timestamp(self):  # long
        return self.timestamp_milliseconds

    def get_lat(self):  # double
        return self.lat

    def get_lng(self):  # double
        return self.lng

    def get_accuracy(self):  # float
        return math.sqrt(self.variance)

    def set_state(self, lat, lng, accuracy, timestamp_milliseconds):
        self.lat = lat
        self.lng = lng
        self.variance = accuracy * accuracy
        self.timestamp_milliseconds = timestamp_milliseconds

    def process(self, lat_measurement, lng_measurement, accuracy, timestamp_milliseconds):
        """
        Kalman filter processing for lattitude and longitude
        :param lat_measurement: new measurement of lattidude
        :param lng_measurement: new measurement of longitude
        :param accuracy: measurement of 1 standard deviation error in metres
        :param timestamp_milliseconds: time of measurement
        """
        if accuracy < self.min_accuracy:
            accuracy = self.min_accuracy

        if self.variance < 0:  # if variance < 0, object is unitialised, so initialise with current values
            self.timestamp_milliseconds = timestamp_milliseconds
            self.lat = lat_measurement
            self.lng = lng_measurement
            self.variance = accuracy * accuracy
        else:  # else apply Kalman filter methodology
            dt = timestamp_milliseconds - self.timestamp_milliseconds
            if dt > 0:  # time has moved on, so the uncertainty in the current position increases
                self.variance += dt * self.q_metres_per_second * self.q_metres_per_second / 1000
                self.timestamp_milliseconds = timestamp_milliseconds
                # TODO: USE VELOCITY INFORMATION HERE TO GET A BETTER ESTIMATE OF CURRENT POSITION

            # Kalman gain matrix k = Covarariance * Inverse(Covariance + MeasurementVariance)
            # NB: because k is dimensionless, it doesn't matter that variance has different units to lat and lng
            k = self.variance / (self.variance + accuracy * accuracy)
            # apply k
            self.lat += k * (lat_measurement - self.lat)
            self.lng += k * (lng_measurement - self.lng)
            # new Covarariance  matrix is (IdentityMatrix - k) * Covarariance
            self.variance *= (1 - k)
