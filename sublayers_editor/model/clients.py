# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

class Client(object):
    def __init__(self, connection, srv):
        log.info('!!!!!!!!Agent before init')
        super(Client, self).__init__()
        self._connection = connection
        self.server = srv

    @property
    def is_online(self):
        return self._connection is not None

    @property
    def connection(self):
        return self._connection

    @connection.setter
    def connection(self, new_connection):
        self._connection = new_connection

