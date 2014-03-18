# -*- coding: utf-8 -*-


class Event(object):
    def __init__(self, e_type, position=None):
        """
        @param int e_type: Event type
        @param model.vectors.Point | None position: Event location
        """
        self.position = position
        self.e_type = e_type

