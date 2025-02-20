# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import datetime
from mongoengine import Document, StringField, DateTimeField


class AdminLogRecord(Document):
    user_uid = StringField(max_length=64)  # uid User'
    created = DateTimeField(default=datetime.datetime.now, auto_now_on_insert=False)
    type = StringField(max_length=64)  # Тип логов: (connect, barter, npc_transaction, balance, items)
    text = StringField()

    def __init__(self, user=None, **kw):
        user_uid = kw.pop('user_uid', None) or user and str(user.pk)
        super(AdminLogRecord, self).__init__(user_uid=user_uid, **kw)

    def __str__(self):
        return '{self.user_uid}({self.type}|{self.created}): {self.text}'.format(self=self)

    @classmethod
    def all_used_types(cls):
        return cls.objects.distinct('type')

    def as_dict(self):
        return dict(user_uid=self.user_uid,
                    created=self.created.strftime("%Y-%m-%d %H:%M:%S"),
                    type=self.type,
                    text=self.text,
                    )

    def post(self, server=None):
        agent = server and server.agents.get(self.user_uid, None)
        if agent:
            agent._adm_logs.append(self)
        else:
            self.save()
