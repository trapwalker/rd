# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Subdoc, get_uuid
from sublayers_server.model.registry.odm.fields import (
    StringField, ListField, UniReferenceField, EmbeddedDocumentField, IntField, UUIDField,
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
    quest_uid = UUIDField(tags='client')

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


class NPCDeliveryNote(NPCPageNote):
    pass


class NPCRewardItemsNote(NPCPageNote):
    pass


class NPCWantedNote(NPCPageNote):
    pass


# Ноты обучения

class GetQuestTeachingNote(Note):
    target_quest_uid = UUIDField(tags='client')


class FinishQuestTeachingNote(GetQuestTeachingNote):
    target_note_uid = UUIDField(tags='client')
    target_build_name = StringField(tags='client')
    target_build_coord = StringField(tags='client')

class HangarTeachingNote(Note): pass
class NukoilTeachingNote(Note): pass
class TraderTeachingNote(Note): pass
class ArmorerTeachingNote(Note): pass
class JournalTeachingNote(Note): pass
class TrainerTeachingNote(Note): pass

class CruiseSpeedTeachingMapNote(Note): pass

# todo: Сделать регистрацию классов нотов через метакласс
ALL = {name: value for name, value in locals().items() if isinstance(value, type) and issubclass(value, Note)}
