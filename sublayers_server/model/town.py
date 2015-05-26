# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.balance import BALANCE


class RadioPoint(Observer):
    def __init__(self, time, conference_name, observing_range=BALANCE.RadioPoint.observing_range, **kw):
        super(RadioPoint, self).__init__(time=time, observing_range=observing_range, **kw)
        self.conference_name = conference_name
        self.xmpp = self.server.app.xmpp_manager
        self.room_jid = None

    def on_init(self, event):
        super(RadioPoint, self).on_init(event)
        if self.xmpp is None:
            return
        self.room_jid = self.xmpp.create_room(room=self.conference_name)

    def on_contact_in(self, time, obj):
        super(RadioPoint, self).on_contact_in(time=time, obj=obj)
        if (obj.owner is not None) and (obj.owner.xmpp is not None) and (self.room_jid is not None):
            self.xmpp.invite_to_room(room_jid=self.room_jid, jid=obj.owner.xmpp.get('jid'))

    def on_contact_out(self, time, obj):
        super(RadioPoint, self).on_contact_out(time=time, obj=obj)
        log.debug('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Out RP %s', obj)
        if (obj.owner is not None) and (obj.owner.xmpp is not None) and (self.room_jid is not None):

            self.xmpp.kick_from_room(room_jid=self.room_jid, jid=obj.owner.xmpp.get('jid'))