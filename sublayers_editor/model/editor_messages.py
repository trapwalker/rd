# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from bson.json_util import dumps

def make_push_package(message):
    return dict(
        message_type='push',
        message=message,
    )

class Message(object):
    def __init__(self, client):
        super(Message, self).__init__()
        self.client = client

    def send(self):
        # todo: online status optimization
        connection = self.client.connection
        log.debug('\n\ntry_to_send message: %s by connection %s', self, connection)
        if connection:
            connection.send(dumps(self.as_dict()))

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        return dict(
            cls=self.classname,
        )


class AddObject(Message):
    def __init__(self, obj, **kw):
        super(AddObject, self).__init__(**kw)
        self.obj = obj

    def as_dict(self):
        d = super(AddObject, self).as_dict()
        d.update(object=self.obj.as_dict())
        return d


if __name__ == "__main__":
    m = Message(None)
    #print m.classname
    print dumps(m.as_dict())
