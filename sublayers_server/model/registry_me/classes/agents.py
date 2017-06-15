﻿# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model import quest_events
from sublayers_server.model.messages import ChangeAgentKarma, ChangeAgentBalance, UserExampleSelfRPGMessage
from sublayers_server.model.registry_me.odm_position import PositionField
from sublayers_server.model.registry_me.classes.quests import QuestAddMessage
from sublayers_server.model.registry_me.classes.notes import AddNoteMessage, DelNoteMessage
from sublayers_server.model.registry_me.classes.quest_item import QuestInventoryField, ModifierQuestItem
from sublayers_server.model.registry_me.tree import Node, Document, Subdoc, EmbeddedNodeField, RegistryLinkField

from mongoengine import StringField, ListField, IntField, FloatField, EmbeddedDocumentField, BooleanField

from itertools import chain


class RelationshipRec(Subdoc):
    npc = RegistryLinkField(
        document_type='sublayers_server.model.registry_me.classes.poi.Institution',
        tags={'client'},
        caption=u"Целевой NPC",
    )
    rel_index = FloatField(root_default=-100, caption=u"Накапливаемое отношение")

    def get_index_norm(self):
        return min(max(self.rel_index / 100.0, -1), 1)

    def set_index(self, d_index):
        self.rel_index = min(max(self.rel_index + d_index, -100), 100)

    def get_relationship(self, agent):
        npc = self.npc
        return (npc.koef_rel_index * self.get_index_norm() +
                npc.koef_karma  * (1 - abs(agent.karma_norm - self.npc.karma_norm)))
                # + npc.koef_pont_points * agent.get_pont_points())  # todo: norm pont_points


class AgentProfile(Node):
    '''Inheritable data about agent'''
    # todo: remove ##deprecated
    teaching_flag = BooleanField(caption=u'deprecated flag')
    # todo: remove ##deprecated
    quick_flag = BooleanField(caption=u'deprecated flag')

    about_self = StringField(root_default=u'', caption=u'О себе', tags={'client'})

    # Карма и отношения
    karma = FloatField(root_default=0, caption=u"Значение кармы игрока")  # значения от -100 до 100 имеют влияние
    npc_rel_list = ListField(
        field=EmbeddedDocumentField(document_type=RelationshipRec, reinst=True),
        caption=u'Список взаимоотношений игрока с NPCs',
        root_default=list,
        tags={'client'},
        reinst=True,
    )

    # Поля статистики агента
    _exp = FloatField(root_default=0, caption=u"Количество опыта")
    _frag = IntField(root_default=0, caption=u"Количество убийств")

    car = EmbeddedNodeField(
        document_type='sublayers_server.model.registry_me.classes.mobiles.Car',
        caption=u"Активный автомобиль",
    )  # todo: test to prefix path like: /mobile/cars/*
    car_list = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.mobiles.Car', reinst=True),
        root_default=list, caption=u"Список всех машин, кроме активной",
        reinst=True,
    )

    position = PositionField(caption=u"Последние координаты агента", reinst=True)
    balance = FloatField(caption=u"Количество литров на счете агента", tags={'client'})  # todo: обсудить #release

    last_town = RegistryLinkField(
        caption=u"Последний посещенный город",
        document_type='sublayers_server.model.registry_me.classes.poi.Town',
    )
    current_location = RegistryLinkField(
        caption=u"Текущая локация",
        document_type='sublayers_server.model.registry_me.classes.poi.Town',
    )
    # todo: party link
    # todo: invites list
    # todo: chats list?

    # Механизм перков
    perks = ListField(
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.perks.Perk'),
        caption=u'Список прокачанных перков',
        einst=True,
    )

    # Механизм скилов
    exp_table = RegistryLinkField(
        caption=u"Таблица опыта",
        root_default='reg:///registry/rpg_settings/exptable',
        document_type='sublayers_server.model.registry_me.classes.exptable.ExpTable',
    )
    role_class = RegistryLinkField(  # todo: Проверить нужно ли декларировать default
        caption=u"Ролевой класс",
        document_type='sublayers_server.model.registry_me.classes.role_class.RoleClass',
    )

    # todo: Избавиться от пакета покупных скиллов.
    # Инфу этих документов нужно разместить в обычных скиллах.
    buy_driving = EmbeddedNodeField(
        caption=u"Купленные очки навыка вождения",
        root_default='reg:///registry/rpg_settings/buy_skill/driving',
        document_type='sublayers_server.model.registry_me.classes.skills.BuySkill',
        reinst=True,
    )
    buy_shooting = EmbeddedNodeField(
        caption=u"Купленные очки навыка стрельбы",
        root_default='reg:///registry/rpg_settings/buy_skill/shooting',
        document_type='sublayers_server.model.registry_me.classes.skills.BuySkill',
        reinst=True,
    )
    buy_masking = EmbeddedNodeField(
        caption=u"Купленные очки навыка маскировки",
        root_default='reg:///registry/rpg_settings/buy_skill/masking',
        document_type='sublayers_server.model.registry_me.classes.skills.BuySkill',
        reinst=True,
    )
    buy_leading = EmbeddedNodeField(
        caption=u"Купленные очки навыка лидерства",
        root_default='reg:///registry/rpg_settings/buy_skill/leading',
        document_type='sublayers_server.model.registry_me.classes.skills.BuySkill',
        reinst=True,
    )
    buy_trading = EmbeddedNodeField(
        caption=u"Купленные очки навыка торговли",
        root_default='reg:///registry/rpg_settings/buy_skill/trading',
        document_type='sublayers_server.model.registry_me.classes.skills.BuySkill',
        reinst=True,
    )
    buy_engineering = EmbeddedNodeField(
        caption=u"Купленные очки навыка инженеринга",
        root_default='reg:///registry/rpg_settings/buy_skill/engineering',
        document_type='sublayers_server.model.registry_me.classes.skills.BuySkill',
        reinst=True,
    )

    driving = EmbeddedNodeField(
        caption=u"Навык вождения", tags={'skill'},
        root_default='reg:///registry/rpg_settings/skill/driving',
        document_type='sublayers_server.model.registry_me.classes.skills.Skill',
        reinst=True,
    )
    shooting = EmbeddedNodeField(
        caption=u"Навык стрельбы", tags={'skill'},
        root_default='reg:///registry/rpg_settings/skill/shooting',
        document_type='sublayers_server.model.registry_me.classes.skills.Skill',
        reinst=True,
    )
    masking = EmbeddedNodeField(
        caption=u"Навык маскировки", tags={'skill'},
        root_default='reg:///registry/rpg_settings/skill/masking',
        document_type='sublayers_server.model.registry_me.classes.skills.Skill',
        reinst=True,
    )
    leading = EmbeddedNodeField(
        caption=u"Навык лидерства", tags={'skill'},
        root_default='reg:///registry/rpg_settings/skill/leading',
        document_type='sublayers_server.model.registry_me.classes.skills.Skill',
        reinst=True,
    )
    trading = EmbeddedNodeField(
        caption=u"Навык торговли", tags={'skill'},
        root_default='reg:///registry/rpg_settings/skill/trading',
        document_type='sublayers_server.model.registry_me.classes.skills.Skill',
        reinst=True,
    )
    engineering = EmbeddedNodeField(
        caption=u"Навык инженеринга", tags={'skill'},
        root_default='reg:///registry/rpg_settings/skill/engineering',
        document_type='sublayers_server.model.registry_me.classes.skills.Skill',
        reinst=True,
    )

    quests_unstarted = ListField(
        caption=u"Список доступных (невзятых) квестов",
        reinst=True,
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.quests.Quest',
            reinst = True,
        ),
    )
    quests_active = ListField(
        caption=u"Список активных квестов",
        reinst=True,
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.quests.Quest',
            reinst = True,
        ),
    )
    quests_ended = ListField(
        caption=u"Список законченных квестов (пройденных или проваленных)",
        reinst=True,
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.quests.Quest',
            reinst = True,
        ),
    )

    notes = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.notes.Note'),
        root_default=list, caption=u"Список доступных нотесов",
        reinst=True,
    )

    quest_inventory = QuestInventoryField(caption=u"Квестовый инвентарь", reinst=True,)

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
        :rtype: list[sublayers_server.model.registry_me.classes.quests.Quest]
        """
        return chain(self.quests_unstarted or [], self.quests_active or [], self.quests_ended or [])

    def __init__(self, **kw):
        super(AgentProfile, self).__init__(**kw)
        # todo: move '_agent_model' attribute to Agent
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
        # todo: move method to Agent from AgentProfile
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
        for name, attr, getter in self.iter_attrs(tags={'skill'}):
            yield name, getter().calc_value()

    def get_quest_skill_modifier(self):
        d = dict()
        if len(self.quest_inventory.items) == 0:
            return d
        # Инициализация дикта с полями
        for name, attr, getter in self.quest_inventory.items[0].iter_attrs(tags='aggregate'):
            d[name] = 0

        for item in self.quest_inventory.items:
                for name in d.keys():
                    d[name] += getattr(item, name, 0)
        return d

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
        d = super(AgentProfile, self).as_client_dict()
        for name, calc_value in self.iter_skills():
            d[name] = calc_value
        d['role_class'] = '' if self.role_class is None else self.role_class.description
        d['insurance'] = self.insurance.as_client_dict()
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
        quest._agent = self._instance  # todo: Здесь присваивается слабая прокси-ссылка на агента. Нужно унифицировать
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

    def change_quest_inventory(self, event):
        if self._agent_model:
           UserExampleSelfRPGMessage(agent=self._agent_model, time=event.time).post()

    def get_agent_effects(self, time):
        effects = []  # каждый эффект должен иметь поля: source, title, description, deadline
        # эффекты от квестовых итемов
        for item in self.quest_inventory.items:
            if item.effect_title and item.effect_description:
                effects.append(dict(
                    source=item.title,
                    title=item.effect_title,
                    description=item.effect_description,
                    deadline=0 if item.deadline == 0 else item.deadline + item.starttime
                ))

        return effects

    @property
    def insurance(self):
        for item in self.quest_inventory.items:
            if isinstance(item, Insurance):
                return item
        assert False, 'for {} not found Insurance'.format(self)

class AIQuickAgentProfile(AgentProfile):
    ai_quest = EmbeddedNodeField(
        document_type='sublayers_server.model.registry_me.classes.quests.Quest',
        reinst=True,
    )


class Agent(Document):
    '''Agent account in database'''
    user_id = StringField(caption=u'Идентификатор профиля владельца', sparse=True, identify=True)  # todo: renamed from `profile_id`
    login = StringField(caption=u'Уникальное имя пользователя', tags={'client'}, sparse=True)
    profile = EmbeddedNodeField(caption=u'Профиль агента (наследуемые параметры)', document_type=AgentProfile, tags={'client'})
    teaching_flag = BooleanField(caption=u'Является ли этот агент агентом обучения')
    quick_flag = BooleanField(caption=u'Является ли этот агент агентом быстрой игры')

    def __init__(self, *av, **kw):
        super(Agent, self).__init__(*av, **kw)
        assert isinstance(self.profile, AgentProfile)
        for q in chain(
            self.profile.quests_unstarted,
            self.profile.quests_active,
            self.profile.quests_ended,
        ):
            q._agent = self

    def __nonzero__(self):
        return True

    def as_client_dict(self):
        d = self.profile.as_client_dict()
        d.update(login=self.login)
        return d

