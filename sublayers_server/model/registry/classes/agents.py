# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Root, Subdoc
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.registry.odm.fields import (
    FloatField, StringField, ListField, UniReferenceField, EmbeddedDocumentField, IntField, BooleanField
)
from sublayers_server.model import quest_events
from sublayers_server.model.registry.classes.quests import QuestAddMessage
from sublayers_server.model.registry.classes.notes import AddNoteMessage, DelNoteMessage
from sublayers_server.model.messages import ChangeAgentKarma, ChangeAgentBalance
from sublayers_server.model.game_log_messages import LvlLogMessage, ExpLogMessage
from sublayers_server.model.utils import getKarmaName

from itertools import chain


class RelationshipRec(Subdoc):
    npc = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.poi.Institution',
        tags='client',
        caption=u"Целевой NPC",
    )
    rel_index = FloatField(default=0, caption=u"Накапливаемое отношение")

    def get_index_norm(self):
        return min(max(self.rel_index / 100.0, -1), 1)

    def set_index(self, d_index):
        self.rel_index = min(max(self.rel_index + d_index, -100), 100)

    def get_relationship(self, agent):
        npc = self.npc
        return (npc.koef_rel_index * self.get_index_norm() +
                npc.koef_karma  * (1 - abs(agent.karma_norm - self.npc.karma_norm)))
                # + npc.koef_pont_points * agent.get_pont_points())  # todo: norm pont_points


class Agent(Root):
    __not_a_fields__ = ['_agent_model']
    profile_id = StringField(caption=u'Идентификатор профиля владельца', sparse=True, identify=True)
    login = StringField(caption=u'Уникальное имя пользователя', tags='client', sparse=True)
    about_self = StringField(default=u'', caption=u'О себе', tags='client')
    teaching_flag = BooleanField(caption=u'Является ли этот агент агентом обучения')
    quick_flag = BooleanField(caption=u'Является ли этот агент агентом быстрой игры')

    # Карма и отношения
    karma = FloatField(default=0, caption=u"Значение кармы игрока", tags='client')  # значения от -100 до 100 имеют влияние
    npc_rel_list = ListField(
        base_field=EmbeddedDocumentField(embedded_document_type=RelationshipRec),
        caption=u'Список взаимоотношений игрока с NPCs',
        default=list,
        tags='client',
        reinst=True,
    )

    # Поля статистики агента
    _exp = FloatField(default=0, caption=u"Количество опыта")
    _frag = IntField(default=0, caption=u"Количество убийств")

    car = EmbeddedDocumentField(
        embedded_document_type='sublayers_server.model.registry.classes.mobiles.Car',
        caption=u"Активный автомобиль",
    )  # todo: test to prefix path like: /mobile/cars/*
    car_list = ListField(
        base_field=EmbeddedDocumentField(embedded_document_type='sublayers_server.model.registry.classes.mobiles.Car'),
        default=list, caption=u"Список всех машин, кроме активной",
        reinst=True,
    )

    position = PositionField(caption=u"Последние координаты агента", reinst=True)
    balance = FloatField(caption=u"Количество литров на счете агента", tags='client')  # todo: обсудить #release

    last_town = UniReferenceField(
        caption=u"Последний посещенный город",
        reference_document_type='sublayers_server.model.registry.classes.poi.Town',
    )
    current_location = UniReferenceField(
        caption=u"Текущая локация",
        reference_document_type='sublayers_server.model.registry.classes.poi.Town',
    )
    # todo: party link
    # todo: invites list
    # todo: chats list?

    # Механизм перков
    perks = ListField(
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.perks.Perk'),
        caption=u'Список прокачанных перков',
        reinst=True,
    )

    # Механизм скилов
    exp_table = UniReferenceField(
        caption=u"Таблица опыта",
        default='reg:///registry/rpg_settings/exptable',
        reference_document_type='sublayers_server.model.registry.classes.exptable.ExpTable',
    )
    role_class = UniReferenceField(  # todo: Проверить нужно ли декларировать default
        caption=u"Ролевой класс",
        reference_document_type='sublayers_server.model.registry.classes.role_class.RoleClass',
    )

    # todo: Избавиться от пакета покупных скиллов.
    # Инфу этих документов нужно разместить в обычных скиллах.
    buy_driving = EmbeddedDocumentField(
        caption=u"Купленные очки навыка вождения",
        default='reg:///registry/rpg_settings/buy_skill/driving',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
        reinst=True,
    )
    buy_shooting = EmbeddedDocumentField(
        caption=u"Купленные очки навыка стрельбы",
        default='reg:///registry/rpg_settings/buy_skill/shooting',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
        reinst=True,
    )
    buy_masking = EmbeddedDocumentField(
        caption=u"Купленные очки навыка маскировки",
        default='reg:///registry/rpg_settings/buy_skill/masking',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
        reinst=True,
    )
    buy_leading = EmbeddedDocumentField(
        caption=u"Купленные очки навыка лидерства",
        default='reg:///registry/rpg_settings/buy_skill/leading',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
        reinst=True,
    )
    buy_trading = EmbeddedDocumentField(
        caption=u"Купленные очки навыка торговли",
        default='reg:///registry/rpg_settings/buy_skill/trading',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
        reinst=True,
    )
    buy_engineering = EmbeddedDocumentField(
        caption=u"Купленные очки навыка инженеринга",
        default='reg:///registry/rpg_settings/buy_skill/engineering',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
        reinst=True,
    )

    driving = EmbeddedDocumentField(
        caption=u"Навык вождения", tags='skill',
        default='reg:///registry/rpg_settings/skill/driving',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
        reinst=True,
    )
    shooting = EmbeddedDocumentField(
        caption=u"Навык стрельбы", tags='skill',
        default='reg:///registry/rpg_settings/skill/shooting',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
        reinst=True,
    )
    masking = EmbeddedDocumentField(
        caption=u"Навык маскировки", tags='skill',
        default='reg:///registry/rpg_settings/skill/masking',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
        reinst=True,
    )
    leading = EmbeddedDocumentField(
        caption=u"Навык лидерства", tags='skill',
        default='reg:///registry/rpg_settings/skill/leading',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
        reinst=True,
    )
    trading = EmbeddedDocumentField(
        caption=u"Навык торговли", tags='skill',
        default='reg:///registry/rpg_settings/skill/trading',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
        reinst=True,
    )
    engineering = EmbeddedDocumentField(
        caption=u"Навык инженеринга", tags='skill',
        default='reg:///registry/rpg_settings/skill/engineering',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
        reinst=True,
    )

    quests_unstarted = ListField(
        caption=u"Список доступных (невзятых) квестов",
        reinst=True,
        base_field=EmbeddedDocumentField(
            embedded_document_type='sublayers_server.model.registry.classes.quests.Quest',
            reinst = True,
        ),
    )
    quests_active = ListField(
        caption=u"Список активных квестов",
        reinst=True,
        base_field=EmbeddedDocumentField(
            embedded_document_type='sublayers_server.model.registry.classes.quests.Quest',
            reinst = True,
        ),
    )
    quests_ended = ListField(
        caption=u"Список законченных квестов (пройденных или проваленных)",
        reinst=True,
        base_field=EmbeddedDocumentField(
            embedded_document_type='sublayers_server.model.registry.classes.quests.Quest',
            reinst = True,
        ),
    )

    notes = ListField(
        base_field=EmbeddedDocumentField(embedded_document_type='sublayers_server.model.registry.classes.notes.Note'),
        default=list, caption=u"Список доступных нотесов",
        reinst=True,
    )

    def get_lvl(self):
        lvl, (next_lvl, next_lvl_exp), rest_exp = self.exp_table.by_exp(exp=self.exp)
        return lvl

    @property
    def karma_norm(self):
        return min(max(self.karma / 100, -1), 1)

    def karma_name(self, lang='ru'):
        return getKarmaName(self.karma_norm, lang)

    @property
    def quests(self):
        """
        :rtype: list[sublayers_server.model.registry.classes.quests.Quest]
        """
        return chain(self.quests_unstarted or [], self.quests_active or [], self.quests_ended or [])

    def __init__(self, **kw):
        super(Agent, self).__init__(**kw)
        self._agent_model = None

    def get_relationship(self, npc):
        rel_list = self.npc_rel_list
        for rel_rec in rel_list:
            if npc is rel_rec.npc:
                return rel_rec.get_relationship(agent=self)
        rel_rec = RelationshipRec(npc=npc)
        rel_list.append(rel_rec)
        return rel_rec.get_relationship(agent=self)

    def set_relationship(self, time, npc, dvalue):
        self.get_relationship(npc)
        relation = None
        for relation_rec in self.npc_rel_list:
            if npc is relation_rec.npc:
                relation = relation_rec
                break
        if dvalue is not None and relation is not None:
            old_norm_index = relation.get_index_norm()
            relation.set_index(dvalue)
            if self._agent_model and old_norm_index != relation.get_index_norm():
                ChangeAgentKarma(agent=self._agent_model, time=time).post()

    def set_balance(self, time, new_balance=None, delta=None):
        if new_balance is not None:
            self.balance = new_balance

        if delta:
            self.balance += delta

        agent_model = self._agent_model
        if agent_model and (delta or new_balance is not None):
            ChangeAgentBalance(agent=agent_model, time=time).post()
        return self.balance

    def iter_skills(self):  # todo: need review
        for name, attr, getter in self.iter_attrs(tags='skill'):
            yield name, getter().calc_value()

    def iter_perks(self):  # todo: need review
        for perk in self.perks:
            yield perk
            
    def skill_point_summ(self):
        return (
            self.driving.value +
            self.shooting.value +
            self.masking.value +
            self.leading.value +
            self.trading.value +
            self.engineering.value
        )

    def as_client_dict(self):
        d = super(Agent, self).as_client_dict()
        for name, calc_value in self.iter_skills():
            d[name] = calc_value
        d['role_class'] = '' if self.role_class is None else self.role_class.description
        # todo: список перков
        # todo: машинка
        return d

    def get_car_list_by_npc(self, npc):
        # todo: this method need to testing !
        # type of npc = Institution
        res = []
        # todo: refactor to id
        for car in self.car_list:
            if car.last_parking_npc == npc.node_hash():
                res.append(car)
        return res

    # Для того, чтобы "закрыть" поле
    @property
    def exp(self):
        return self._exp

    def set_exp(self, time, value=None, dvalue=None):
        assert dvalue is None or dvalue >= 0, '_exp={} value={}, dvalue={}'.format(self._exp, value, dvalue)
        assert value is None or value >= 0, '_exp={} value={}, dvalue={}'.format(self._exp, value, dvalue)
        old_lvl = self.get_lvl()
        if value is not None:
            self._exp = value
        if dvalue is not None:
            self._exp += dvalue
        if self._agent_model:
            ExpLogMessage(agent=self._agent_model, d_exp=dvalue, time=time).post()
            lvl = self.get_lvl()
            if lvl > old_lvl:
                LvlLogMessage(agent=self._agent_model, time=time, lvl=lvl).post()
        assert self._exp >= 0, 'value={}, dvalue={}'.format(value, dvalue)

    def set_karma(self, time, value=None, dvalue=None):
        if value is not None:
            self.karma = value
        if dvalue is not None:
            self.karma += dvalue
        if self._agent_model:
            ChangeAgentKarma(agent=self._agent_model, time=time).post()

    @property
    def frag(self):
        return self._frag

    def set_frag(self, value=None, dvalue=None):
        if value is not None:
            self._frag = value
        if dvalue is not None:
            self._frag += dvalue

    def add_quest(self, quest, time):  # todo: Пробросить event
        self.quests_unstarted.append(quest)
        model = self._agent_model
        if model:
            QuestAddMessage(agent=model, time=time, quest=quest).post()
        else:
            log.warning("Can't send message: agent %s is offline", self)

    def start_quest(self, quest_uid, server, time):
        quest = None
        for q in self.quests_unstarted:
            if q.uid == quest_uid:
                quest = q

        if quest is None:
            log.error('Trying to start unknown quest by uid %r. Agent: %s', quest_uid, self)
            return

        quest.start(server=server, time=time)

    def get_quest(self, uid):
        for q in self.quests:
            if q.uid == uid:
                return q

    def on_event(self, event, cls=quest_events.QuestEvent, **kw):
        for q in self.quests_active:
            cls(server=event.server, time=event.time, quest=q, **kw).post()

    def get_pont_points(self):
        return 0

    def add_note(self, note_class, time, **kw):
        note = note_class(**kw)
        self.notes.append(note)
        # отправить сообщение на клиент
        if self._agent_model:
            AddNoteMessage(agent=self._agent_model, note=note, time=time).post()
        return note.uid

    def get_note(self, uid):
        for note in self.notes:
            if note.uid == uid:
                return note

    def del_note(self, uid, time):
        note = self.get_note(uid)
        if note:
            self.notes.remove(note)
            # отправить сообщение на клиент
            if self._agent_model:
                DelNoteMessage(agent=self._agent_model, note_uid=note.uid, time=time).post()


class AIQuickAgent(Agent):
    ai_quest = EmbeddedDocumentField(
        embedded_document_type='sublayers_server.model.registry.classes.quests.Quest',
        reinst=True,
    )