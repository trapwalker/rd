# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import Item
from sublayers_server.model.registry.attr import TextAttribute, Attribute
from sublayers_server.model.utils import SubscriptionList
from sublayers_server.model.messages import Message

from functools import update_wrapper


class O(dict):
    def __init__(self):
        super(O, self).__init__()
        self.__dict__ = self


def state_event(func):
    # return event_func
    def closure(*av, **kw):
        log.debug('{method}({args})'.format(
            method=func.__name__,
            args=', '.join([
                '{}={!r}'.format(k, v)
                for k, v in zip(func.func_code.co_varnames, av) + kw.items()
            ]),
        ))
        res = func(*av, **kw)
        return res
    update_wrapper(closure, func)
    return closure


class State(O):
    enter_state_message = None
    enter_state_message_template = None
    exit_state_message = None
    exit_state_message_template = None
    status = 'active'
    result = None

    def __init__(self, time, quest, name, **kw):
        super(State, self).__init__()
        self.name = name or self.__class__.__name__
        self.quest = quest
        self.start_time = time
        self.__dict__.update(kw)
        self.on_state_init()

    # todo: __getstate__ ##realize
    # todo: __setstate__ ##realize

    def __hash__(self):
        return id(self)  #todo: Так нельзя

    def subscribe(self, target):
        if isinstance(target, SubscriptionList):
            target.add(self)
        elif hasattr(target, 'subscriptions'):
            target.subscriptions.add(self)
        else:
            raise TypeError(u"State {!r} of quest {!r} can not be subscribed to {!r}".format(self, self.quest, target))

    def unsubscribe(self, target):
        if isinstance(target, SubscriptionList):
            target.remove(self)
        elif hasattr(target, 'subscriptions'):
            target.subscriptions.remove(self)
        else:
            raise TypeError(u"State {!r} of quest {!r} can not be unsubscribed from {!r}".format(
                self, self.quest, target))

    def as_dict(self):
        d = self.__dict__.copy()
        del d['quest']
        return d

    @state_event
    def on_see(self, agent, time, subj, obj):
        pass

    @state_event
    def on_out(self, agent, time, subj, obj):
        pass

    @state_event
    def on_disconnect(self, agent, time):
        # todo: call it
        pass

    @state_event
    def on_kill(self, agent, time, obj):
        pass

    @state_event
    def on_inv_change(self, agent, time, incomings, outgoings):
        pass

    @state_event
    def on_enter_location(self, agent, time, location):
        pass

    @state_event
    def on_exit_location(self, agent, time, location):
        pass

    @state_event
    def on_enter_npc(self, npc):
        pass

    @state_event
    def on_exit_npc(self, npc):
        pass

    @state_event
    def on_die(self):
        pass

    @state_event
    def on_trade_enter(self, agent, contragent, time, is_init):
        pass

    @state_event
    def on_trade_exit(self, agent, contragent, canceled, buy, sale, cost, time, is_init):
        pass

    @state_event
    def on_state_init(self):
        pass

    @state_event
    def on_state_enter(self, old_state):
        for agent in self.quest.agents:
            self.subscribe(agent)

        if self.enter_state_message_template:
            self.quest.log_fmt(template=self.enter_state_message_template, time=self.start_time)  # todo: send targets
        elif self.enter_state_message:
            self.quest.log(text=self.enter_state_message, time=self.start_time)  # todo: send targets, position

    @state_event
    def on_state_exit(self, next_state):
        for agent in self.quest.agents:
            self.unsubscribe(agent)
        # todo: may be need to send state_exit_message?


class FinalState(State):
    status = 'end'
    result = None

    def on_state_enter(self, old_state):
        pass

    def on_state_exit(self, next_state):
        pass


class StandartWin(FinalState):
    enter_state_message_template = u'Задание {quest.title} выполнено успешно.'
    result = 'win'


class StandartFail(FinalState):
    enter_state_message_template = u'Задание {quest.title} провалено.'
    result = 'fail'


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


class LogRecord(object):
    def __init__(self, quest, time, text, position=None, target=None):
        self.quest = quest  # todo: weakref #refactor
        self.time = time
        self.text = text
        self.position = position
        self.target = target

    def as_dict(self):
        return dict(
            quest=self.quest.id,
            time=self.time,
            text=self.text,
            position=self.position,
            target=self.target,
        )


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


class Quest(Item):
    # todo: Сделать квесты не итемами
    first_state = TextAttribute(default='Begin', caption=u'Начальное состояние', doc=u'Имя начального состояния квеста')

    caption = TextAttribute(tags='client', caption=u'Заголовок квеста', doc=u'Может строиться и меняться по шаблону')
    text = TextAttribute(tags='client', caption=u'Текст, оспровождающий квест', doc=u'Может строиться и меняться по шаблону')
    text_short = TextAttribute(tags='client', caption=u'Короткий текст квеста', doc=u'Может строиться и меняться по шаблону')
    typename = TextAttribute(tags='client', caption=u'Тип квеста', doc=u'Может быть произвольным')
    list_icon = Attribute(tags='client', caption=u'Пиктограмма для списков', doc=u'Мальенькая картинка для отображения в списках')
    level = Attribute(tags='client', caption=u'Уровень квеста', doc=u'Обычно число, но подлежит обсуждению')  # todo: обсудить
    deadline = Attribute(tags='client', caption=u'Срок выполнения этапа', doc=u'datetime до провала текущего этапа. Может меняться')

    hirer = Attribute(tags='client', caption=u'Заказчик', doc=u'NPC-заказчик квеста')
    town = Attribute(tags='client', caption=u'Город выдачи', doc=u'Город выдачи квеста')

    def __init__(self, agents=None, npc=None, **kw):
        super(Quest, self).__init__(**kw)
        self._state = None
        self.agents = agents or []  # todo: weakset
        self.npc = npc  # todo: weakset
        self._log = []
        self.key = None

    def instantiate(self, *av, **kw):
        inst = super(Quest, self).instantiate(*av, **kw)
        inst.key = inst.gen_key(**kw)
        return inst

    def gen_key(self, agents=None, npc=None, **kw):
        u"""Генерирует ключ уникальности квеста для агента.
        Этот ключ определяет может ли агент получить этот квест у данного персонажа.
        Перекрывая этот метод в квестах можно добиться запрета повторной выдачи квеста как в глобальном,
        так и в локальном смысле. В ключ можно добавлять дополнительные обстоятельства, например если мы взяли квест по
        доставке фуфаек и больше не должны иметь возможности взять этот квест по фуфайкам, зато можно взять по доставке
        медикаментов, то нужно включить в кортеж ключа uri прототипа доставляемого товара.
        """
        if agents is None:
            agents = self.agents
        if npc is None:
            npc = getattr(self, 'npc', None)

        return self.id, tuple([agent.user.name for agent in agents]), npc.id

    def as_client_dict(self):
        d = super(Quest, self).as_client_dict()
        d.update(
            status=self.state.status if self.state else None,
            result=self.state.result if self.state else None,
            log=self._log,
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

        for agent in self.agents:
            QuestUpdateMessage(agent=agent, time=time, quest=self).post()

    def start(self, time, agents=None, **kw):
        assert not self.abstract
        if agents:
            self.agents.append(agents)
        for agent in self.agents:
            agent.quests.append(self)
        self.set_state(self.first_state, time=time)

    @property
    def state(self):
        return self._state

    def set_state(self, value, time):
        assert value
        assert not self.abstract

        if isinstance(value, State):
            new_state = value
        else:
            if isinstance(value, str):
                new_state_cls = getattr(self, value)
                new_state_name = value
            elif isinstance(value, type):
                new_state_cls = value
                new_state_name = new_state_cls.__name__
            else:
                raise TypeError('Try to set state by {!r}'.format(value))

            new_state = new_state_cls(quest=self, name=new_state_name, time=time)

        old_state = self._state

        if old_state is not None:
            old_state.on_state_exit(next_state=new_state)

        self._state = new_state
        new_state.on_state_enter(old_state=old_state)

    def __getstate__(self):
        d = super(Quest, self).__getstate__()
        d.update(state=self.state.as_dict())
        return d

    def __setstate__(self, state):
        st = state.pop('state', None)
        if st:
            self.set_state(getattr(self, st['name'])(quest=self, **st))
        super(Quest, self).__setstate__(state)

    class Begin(State):
        u"""Стартовое состояние квеста"""
        caption = u'Начало'

    class Win(StandartWin):
        u"""Состояние успешного прохождения квеста"""
        caption = u'Успех'

    class Fail(StandartFail):
        u"""Состояния провала квеста"""
        caption = u'Провал'


class UserQuest(Quest):
    class Begin(Quest.Begin):
        pass


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
                    for a in self.quest.agents:
                        a.die()

        def on_trade_exit(self, agent, contragent, canceled, buy, sale, cost, time, is_init):
            State.on_trade_exit(self, agent, contragent, canceled, buy, sale, cost, time, is_init)
            if agent in self.quest.agents and contragent not in self.quest.agents and sale and not buy and cost == 0:
                self.tramps.add(contragent.user.name)
                if len(self.tramps) >= self.magic_count:
                    self.quest.set_state(self.quest.Win, time=time)
