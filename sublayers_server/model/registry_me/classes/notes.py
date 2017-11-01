# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.messages import Message
from sublayers_server.model.registry_me.tree import (
    Subdoc, get_uuid,
    IntField, StringField, UUIDField, FloatField,    
    RegistryLinkField, PositionField,
    LocalizedStringField, LocalizedString,
)

from sublayers_server.model.vectors import Point


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
    uid = UUIDField(default=get_uuid, unique=True, identify=True, tags={'client'})
    quest_uid = UUIDField(tags={'client'})

    @property
    def cls(self):
        return self.__class__.__name__

    def as_client_dict(self):
        d = super(Note, self).as_client_dict()
        d.update(cls=self.cls)
        return d


class MapMarkerNote(Note):
    position = PositionField(caption=u"Координаты объекта", tags={'client'})
    radius = FloatField(caption=u"Радиус взаимодействия с объектом", tags={'client'})

    def is_near(self, position):
        radius = self.radius or 0  # todo: review !!! if self.radius is None
        if isinstance(position, PositionField):
            position = position.as_point()
        if isinstance(position, Point):
            distance = self.position.as_point().distance(target=position)
            return distance <= radius
        return False
class MaskingMapMarkerNote(MapMarkerNote): pass
class MaskingTurretMapMarkerNote(MapMarkerNote): pass

class NPCPageNote(Note):
    page_caption = LocalizedStringField(caption=u'Название кнопки у нпц', tags={'client'})
    btn1_caption = LocalizedStringField(default=LocalizedString(ru=u'<br>Сдать', en=u'<br>Complete'), caption=u'Текст для кнопки btn1', tags={'client'})
    npc = RegistryLinkField(
        document_type='sublayers_server.model.registry_me.classes.poi.Institution',
        tags={'client'},
        caption=u"Целевой NPC ноты",
    )

class NPCDeliveryNote(NPCPageNote): pass
class NPCDeliveryNotePackage(NPCPageNote): pass
class NPCDeliveryNoteCourier(NPCPageNote):  pass
class NPCDeliveryCarNote(NPCPageNote): pass

class NPCRewardItemsNote(NPCPageNote):  pass

class NPCWantedNote(NPCPageNote):  pass
class NPCWantedBossNote(NPCPageNote):  pass

class QuestRadiationNPCFinish(NPCPageNote): pass
class MapActivationNoteFinish(NPCPageNote): pass
class MapActivationRadarsNoteFinish(NPCPageNote): pass

# Классовые ноты
class FirstOutNote(Note): pass
class NPCTypePageNote(Note):
    page_caption = LocalizedStringField(caption=u'Название кнопки у нпц', tags={'client'})
    btn1_caption = LocalizedStringField(default=LocalizedString(ru=u'<br>Сдать', en=u'<br>Complete'), caption=u'Текст для кнопки btn1', tags={'client'})
    npc_type = StringField(caption=u'Тип NPC', tags={'client'})

class VisitTrainerNote(NPCTypePageNote): pass
class SelectTeacherNote(NPCTypePageNote): pass

class GetClassCarQuestNote(NPCPageNote): pass
class MaskingNPCQuestNote(NPCPageNote): pass
class KillsClassQuestNote(NPCPageNote): pass
class GetPartyExpQuestNote(NPCPageNote): pass
class SetMechanicItemsQuestNote(NPCPageNote): pass
class InvisibleAttackQuestNote(NPCPageNote): pass
class VisitTownsQuestNote(NPCPageNote): pass
class GetMaxCarLvlQuestNote(NPCPageNote): pass

# Ноты обучения
class GetQuestTeachingNote(Note):
    target_quest_uid = UUIDField(tags={'client'})

class FinishQuestTeachingNote(GetQuestTeachingNote):
    target_note_uid = UUIDField(tags={'client'})
    target_build_name = StringField(tags={'client'})
    target_build_coord = StringField(tags={'client'})

class HangarTeachingNote(Note): pass
class NukoilTeachingNote(Note): pass
class TraderTeachingNote(Note): pass
class ArmorerTeachingNote(Note): pass
class JournalTeachingNote(Note): pass
class TrainerTeachingNote(Note): pass
class ExitBtnTeachingNote(Note): pass

class CruiseSpeedTeachingMapNote(Note): pass
class CruiseZoneTeachingMapNote(Note): pass
class CruiseSpeedControlTeachingMapNote(Note): pass
class CruiseSpeedBtnTeachingMapNote(Note): pass
class DrivingControlTeachingMapNote(Note): pass
class CruiseRadialTeachingMapNote(Note): pass
class ZoomSliderTeachingMapNote(Note): pass
class DischargeShootingTeachingMapNote(Note): pass
class AutoShootingTeachingMapNote(Note): pass
class TryKillTeachingMapNote(Note): pass
class TryGameTeachingMapNote(Note): pass

# todo: Сделать регистрацию классов нотов через метакласс
ALL = {name: value for name, value in locals().items() if isinstance(value, type) and issubclass(value, Note)}
