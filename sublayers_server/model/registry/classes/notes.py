# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Root, Subdoc
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


class Note(Root):
    pass


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


# todo: Сделать регистрацию классов нотов через метакласс
ALL = {name: value for name, value in locals().items() if isinstance(value, Note)}
