# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Subdoc, get_uuid
from sublayers_server.model.registry.odm.fields import (
    FloatField, StringField, ListField, UniReferenceField, EmbeddedDocumentField, IntField, UUIDField
)

from sublayers_server.model.messages import Message


class AddNoteMessage(Message):
    def __init__(self, note, **kw):
        super(AddNoteMessage, self).__init__(**kw)
        self.note = note

    def as_dict(self):
        d = super(AddNoteMessage, self).as_dict()
        d.update(note=self.note.as_client_dict())
        return d


class DelNoteMessage(Message):
    def __init__(self, note_uid, **kw):
        super(DelNoteMessage, self).__init__(**kw)
        self.note_uid = note_uid

    def as_dict(self):
        d = super(DelNoteMessage, self).as_dict()
        d.update(note_uid=self.note_uid)
        return d


class Note(Subdoc):
    uid = UUIDField(default=get_uuid, unique=True, identify=True, tags="client")
    quest_id = StringField(tags='client')

    @property
    def cls(self):
        return self.__class__.__name__

    def as_client_dict(self):
        d = super(Note, self).as_client_dict()
        d.update(cls=self.cls)
        return d


class NPCPageNote(Note):
    page_caption = StringField(caption=u'Название кнопки у нпц', tags='client')
    btn1_caption = StringField(default=u'<br>Сдать', caption=u'Текст для кнопки btn1', tags='client')
    npc = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.poi.Institution',
        tags='client',
        caption=u"Целевой NPC ноты",
    )


class DeliveryItem(Subdoc):
    count = IntField(default=0, caption=u"Количество данного типа товара", tags='client')
    item = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.item.Item',
        tags='client',
        caption=u"Необходимый итем",
    )


class DeliveryNote(NPCPageNote):
    delivery_items = ListField(
        base_field=EmbeddedDocumentField(embedded_document_type=DeliveryItem),
        caption=u'Список итемов',
        default=list,
        tags='client',
    )


class NPCWantedNote(NPCPageNote):
    pass


# todo: Сделать регистрацию классов нотов через метакласс
ALL = {name: value for name, value in locals().items() if isinstance(value, type) and issubclass(value, Note)}
