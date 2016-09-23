# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Root
from sublayers_server.model.utils import SubscriptionList
from sublayers_server.model.messages import Message
from sublayers_server.model.registry.tree import Subdoc
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.registry.odm.fields import (
    UniReferenceField, StringField, IntField, FloatField, ListField, EmbeddedDocumentField, DateTimeField,
)


class QuestState(Root):
    name = StringField()
    enter_state_message = StringField(doc=u"Сообщение в журнал при входе в состояние")
    exit_state_message = StringField(doc=u"Сообщение в журнал при выходе из состояния")
    status = StringField(doc=u"Статус квеста при данном текущем состоянии (None/active/end)")
    result = StringField(doc=u"Результат квеста данном текущем состоянии (None/win/fail)")

    def on_see(self, agent, time, subj, obj):
        pass

    def on_out(self, agent, time, subj, obj):
        pass

    def on_disconnect(self, agent, time):
        # todo: call it
        pass

    def on_kill(self, agent, time, obj):
        pass

    def on_inv_change(self, agent, time, incomings, outgoings):
        pass

    def on_enter_location(self, agent, time, location):
        pass

    def on_exit_location(self, agent, time, location):
        pass

    def on_enter_npc(self, npc):
        pass

    def on_exit_npc(self, npc):
        pass

    def on_die(self):
        pass

    def on_trade_enter(self, agent, contragent, time, is_init):
        pass

    def on_trade_exit(self, agent, contragent, canceled, buy, sale, cost, time, is_init):
        pass

    def on_state_init(self):
        pass

    def on_state_enter(self, quest, old_state):
        self.subscribe(quest.agent)  # todo: fixit

        if self.enter_state_message_template:
            quest.log_fmt(template=self.enter_state_message_template, time=self.start_time)  # todo: send targets
        elif self.enter_state_message:
            quest.log(text=self.enter_state_message, time=self.start_time)  # todo: send targets, position

    def on_state_exit(self, quest, next_state):
        self.unsubscribe(quest.agent)
        # todo: may be need to send state_exit_message?


# Условия:
# - has([items], who=None)  # money too
# - attend(point|login|location|npc, who=None, radius=None, duration=None)
# - die(login|prototype|uid|None, count=1)  # None == self
# - buy(login|location|npc, [items], cost=None)
# - sale(login|location|npc, [items], cost=None)
# - time(duration)
# - trigger(name, value=None)
# - heal(login|prototype|uid, count=1)

# Действия:
# - give([items])
# - drop([items])
# - tp(point|login|location|npc, who=Mone, radius=None)
# - kill(login|uid)
# - confiscate([items])
# - нанести урон
# - say(text, npc=None|link, dest=login|None)
# - ask(variants={True: 'Yes', False: 'None'}, text=None, title=None)
# - log(text, position=None, dest=login|None)
## - like(diff=1, dest=login|None, who=None|npc|location)

class Quest(Root):
    first_state = StringField(caption=u'Начальное состояние', doc=u'Имя начального состояния квеста')
    current_state = StringField(caption=u'Текущее состояние', doc=u'Имя текущего состояния квеста')
    states = ListField(base_field=EmbeddedDocumentField(embedded_document_type=QuestState), caption=u"Состояния квеста")

    caption = StringField(tags='client', caption=u'Заголовок квеста', doc=u'Может строиться и меняться по шаблону')
    text = StringField(tags='client', caption=u'Текст, оспровождающий квест', doc=u'Может строиться и меняться по шаблону')
    text_short = StringField(tags='client', caption=u'Короткий текст квеста', doc=u'Может строиться и меняться по шаблону')
    typename = StringField(tags='client', caption=u'Тип квеста', doc=u'Может быть произвольным')
    list_icon = StringField(tags='client', caption=u'Пиктограмма для списков', doc=u'Мальенькая картинка для отображения в списках')  # todo: use UrlField
    level = IntField(tags='client', caption=u'Уровень квеста', doc=u'Обычно число, но подлежит обсуждению')  # todo: обсудить
    starttime = DateTimeField(tags='client', caption=u'Начало выполнения', doc=u'Время старта квеста')
    deadline = DateTimeField(tags='client', caption=u'Срок выполнения этапа', doc=u'datetime до провала текущего этапа. Может меняться')

    hirer = UniReferenceField(tags='client', caption=u'Заказчик', doc=u'NPC-заказчик квеста')
    town = UniReferenceField(tags='client', caption=u'Город выдачи', doc=u'Город выдачи квеста')
    agent = UniReferenceField(tags='client', caption=u'Агент', doc=u'Исполнитель квеста')

    def get_states_dict(self):
        return {state.name: state for state in self.states}  # todo: optimize

    @property
    def state(self):
        if self.current_state:
            try:
                return self.get_states_dict()[self.current_state]
            except KeyError:
                raise KeyError('Wrong state named {self.current_state!r} in quest {self!r}.'.format(self=self))

    @property
    def status(self):
        state = self.state
        return state and state.status

    @property
    def result(self):
        state = self.state
        return state and state.result

    def instantiate(self, *av, **kw):
        inst = super(Quest, self).instantiate(*av, **kw)
        #inst.key = inst.gen_key(**kw)
        return inst

    # todo: make questkey system
    def gen_key(self, agent=None, npc=None, **kw):
        u"""Генерирует ключ уникальности квеста для агента.
        Этот ключ определяет может ли агент получить этот квест у данного персонажа.
        Перекрывая этот метод в квестах можно добиться запрета повторной выдачи квеста как в глобальном,
        так и в локальном смысле. В ключ можно добавлять дополнительные обстоятельства, например если мы взяли квест по
        доставке фуфаек и больше не должны иметь возможности взять этот квест по фуфайкам, зато можно взять по доставке
        медикаментов, то нужно включить в кортеж ключа uri прототипа доставляемого товара.
        """
        if agent is None:
            agent = self.agent

        return self.uid, agent.uid, npc and npc.uid

    def as_client_dict(self):
        d = super(Quest, self).as_client_dict()
        d.update(
            status=self.status,
            result=self.result,
            #log=self._log,
        )
        return d

    def log_fmt(self, template, position=None, target=None, context=None):
        context = context.copy() if context else {}
        context.update(position=position, target=target, quest=self)
        text = self._template_render(template, context)
        self.log(text, position=position, target=target)

    def log(self, time, text, position=None, target=None):
        log_record = LogRecord(quest=self, time=time, text=text, position=position, target=target)
        self._log.append(log_record)
        self.update(time=time)  # todo: refactor (send quest event message)

    def _template_render(self, template, context):
        try:
            return template.format(**context)
        except Exception as e:
            log.error('Template render error in quest %r. Template: %r; context: %r', self, template, context)
            raise e

    def update(self, time):
        # todo: #refactor
        if self.title_template:
            self.title = self._template_render(self.title_template, dict(quest=self, time=time))

        if self.description_template:
            self.description = self._template_render(self.description_template, dict(quest=self, time=time))

        QuestUpdateMessage(agent=self.agent, time=time, quest=self).post()

    def start(self, time, agent=None, **kw):
        assert not self.abstract
        if agent:
            self.agent = agent

        self.set_state(self.first_state, time=time)

    def set_state(self, value, time):
        assert value
        assert not self.abstract

        if isinstance(value, QuestState):
            new_state = value
        elif isinstance(value, str):
            new_state = self.get_states_dict()[value]
        else:
            raise TypeError('Try to set state by {!r}'.format(value))

        old_state = self.state

        if old_state is not None:
            old_state.on_state_exit(quest=self, next_state=new_state)

        self._state = new_state
        new_state.on_state_enter(quest=self, old_state=old_state)

    def __getstate__(self):
        d = super(Quest, self).__getstate__()
        d.update(state=self.state.as_dict())
        return d



class QNKills(Quest):

    class Begin(State):
        def on_state_init(self):
            State.on_state_init(self)
            self.kills_count = 0

        def on_kill(self, agent, time, obj):
            super(QNKills.Begin, self).on_kill(agent, time, obj)
            self.kills_count += 1
            if self.kills_count >= 5:
                self.quest.set_state(self.quest.Win, time=time)


class QMortalCurse(Quest):
    u"""Смертное прокльятье.
    Каждое 13 убийство влечет смерть самого игрока.
    Избавиться можно только пожертвовав 13 разным проходимцам какие-нибудь вещи бесплатно.
    """

    class Begin(State):
        caption = u'Начало'

        def on_state_init(self):
            State.on_state_init(self)
            self.kills_count = 0
            self.tramps = set()
            self.magic_count = 13

        def on_kill(self, agent, time, obj):
            State.on_kill(self, agent, time, obj)
            if agent is self.quest.agent:
                self.kills_count += 1
                if (self.kills_count % self.magic_count) == 0:
                    self.agent.die()

        def on_trade_exit(self, agent, contragent, canceled, buy, sale, cost, time, is_init):
            State.on_trade_exit(self, agent, contragent, canceled, buy, sale, cost, time, is_init)
            if agent in self.quest.agents and contragent not in self.quest.agents and sale and not buy and cost == 0:
                self.tramps.add(contragent.user.name)
                if len(self.tramps) >= self.magic_count:
                    self.quest.set_state(self.quest.Win, time=time)


class LogRecord(Subdoc):
    quest_uid   = StringField  (tags="client", doc=u"UID of quest")
    time        = DateTimeField(tags="client", doc=u"Время создания записи")
    text        = StringField  (tags="client", doc=u"Текст записи")
    position    = PositionField(tags="client", doc=u"Привязанная к записи позиция на карте")
    # target  # todo: target of log record


class QuestUpdateMessage(Message):
    def __init__(self, quest, **kw):
        super(QuestUpdateMessage, self).__init__(**kw)
        self.quest = quest  # todo: weakref #refactor

    def as_dict(self):
        d = super(QuestUpdateMessage, self).as_dict()
        d.update(
            quest=self.quest.as_client_dict(),
        )
        return d


class QuestLogMessage(Message):
    def __init__(self, event_record, **kw):
        super(QuestLogMessage, self).__init__(**kw)
        self.event_record = event_record  # todo: weakref #refactor

    def as_dict(self):
        d = super(QuestLogMessage, self).as_dict()
        d.update(
            quest_event=self.event_record.as_dict(),
        )
        return d
