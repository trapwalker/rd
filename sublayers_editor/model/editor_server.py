# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from pymongo import Connection


class EditorServer(object):

    def __init__(self, app, uid=None):
        self.app = app
        # подключение к базе
        self.db_connection = Connection()
        self.db = self.db_connection.maindb








if __name__ == "__main__":

    a = EditorServer(app=None)
    #a.db.geo_objects.insert({'type':'town','name':'test_town5', 'population': '4'})

    for e in a.db.geo_objects.find():
        print e['name']

