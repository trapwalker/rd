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


class EventHandler(Subdoc):
    event = StringField(doc=u"Сигнатура события: onDie, onEnterLocation, onQuest")
    id = StringField(doc=u"Идентификатор события. Локальное имя события внутри квеста.")


class QuestState(Root):
    enter_state_message = StringField(doc=u"Сообщение в журнал при входе в состояние")
    exit_state_message = StringField(doc=u"Сообщение в журнал при выходе из состояния")
    status = StringField(doc=u"Статус квеста при данном текущем состоянии (None/active/end)")
    result = StringField(doc=u"Результат квеста данном текущем состоянии (None/win/fail)")
    on_enter = StringField(
        caption=u"Python скрипт, выполняемый при входе в состояние",
        doc=u"""
        В контекст получает:
            - объекты: [agent, quest, state, event]
            - функции-условия: ???
            - функции-действия: [say, add_event, del_event, ...]
        """
    )
    on_exit = StringField(
        caption=u"Python скрипт, выполняемый при выходе из состояния",
        doc=u"""
        В контекст получает:
            - объекты: [agent, quest, state, event]
            - функции-условия: ???
            - функции-действия: [say, add_event, del_event, ...]
        """
    )
    on_event = StringField(
        caption=u"Python скрипт, выполняемый по факту любого события",
        doc=u"""
            В контекст получает:
                - объекты: [agent, quest, state, event]
                - функции-условия: ???
                - функции-действия:
                    - go("new_state_name") - переход в состояние с именем new_state_name
                    - say(state.exit_state_message) - произнести от имени NPC фразу по указанному шаблону
                    - add_event(id="SomeTimerName", delay=60*60*3) - запустить именованный таймер на 3 часа
                    - add_event(id="SomeActionName", caption=u"Сделай это!", action='reg://.../trader3') - создать
                        для игрока кнопку действия с заданной надписью у указанного NPC
                    - del_event(id="SomeActionName") - удалить запланированное событиеили экшн.
                    - quest.log("some message about {quest.name}") - добавить запись в журнал квеста

            Пример:
                (
                event.name is 'onDie'
                and agent.inventory.has('reg:///registry/items/usable/tanks/tank_full')
                and agent.inventory.has('reg:///registry/items/slot_item/mechanic_item/engine/sparkplug')
                and say(u"Boom!")
                and bang(position=agent.car.position, power=1000)
                and go("win")

                or event.id is 'quest_fail_timer'
                and say("I'm so sorry")
                and go("fail")
                )

            Пример 2:
                if (
                    event.name is 'onDie'
                    and agent.inventory.has('reg:///registry/items/usable/tanks/tank_full')
                    and agent.inventory.has('reg:///registry/items/slot_item/mechanic_item/engine/sparkplug')
                ):
                    say(u"Boom!")
                    bang(position=agent.car.position, power=1000)
                    go("win")

                if (event.id is 'quest_fail_timer'):
                    say("I'm so sorry")
                    go("fail")

        """,
    )

    def _exec_event_handler(self, quest, handler, local_ctx, **kw):
        code_text = getattr(self, handler, None)
        if not code_text:
            return

        # todo: Реализовать механизм получения URI места декларации конкретного значения атрибута (учет наследования)
        fn = '{uri}#states[{state.name}].on_extit'.format(uri=quest.node_hash(), state=self, attr=handler)
        try:
            code = compile(code_text, fn, 'exec')
        except SyntaxError as e:
            log.error('Syntax error in quest handler.')
            raise e

        global_ctx = quest._get_global_context(state=self, **kw)
        try:
            exec code in global_ctx, local_ctx
        except Exception as e:
            log.error('Runtime error in quest handler.')
            raise e

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
    __not_a_fields__ = ['_context', '_states_map']
    first_state = StringField(caption=u'Начальное состояние', doc=u'Имя начального состояния квеста')
    current_state = StringField(caption=u'Текущее состояние', doc=u'Имя текущего состояния квеста')
    states = ListField(
        base_field=EmbeddedDocumentField(embedded_document_type=QuestState, reinst=True),
        reinst=True,
        caption=u"Состояния квеста",
        doc=u"Список возможных состояний квестов. Состояния включают в себя логику переходов.",
    )

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

    def _get_global_context(self, **kw):
        return dict(
            quest=self,
            agent=self.agent,
            log=log.debug,
            **kw
        )

    @property
    def context(self):
        context = getattr(self, '_context', None)
        if context is None:
            context = dict()
            self._context = context

    def do_state_exit(self, event, state):
        state._exec_event_handler(quest=self, handler='on_exit', local_ctx=self.context, event=event)

    def do_state_enter(self, event, state):
        state._exec_event_handler(quest=self, handler='on_enter', local_ctx=self.context, event=event)

    def do_event(self, event):
        state = self.state
        assert state, 'Calling Quest.on_event {self!r} with undefined state: {self.current_state!r}'.format(**locals())
        state._exec_event_handler(quest=self, handler='on_event', local_ctx=self.context, event=event)

    @property
    def states_map(self):
        states_map = getattr(self, '_states_map', None)
        if not states_map:
            states_map = {state.name: state for state in self.states}  # todo: optimize
            self._states_map = states_map

        return states_map

    @property
    def state(self):
        if self.current_state is None:
            return
        try:
            return self.states_map[self.current_state]
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

    def log_fmt(self, time, template, position=None, target=None, context=None):
        context = context.copy() if context else {}
        context.update(position=position, target=target, quest=self, time=time)
        text = self._template_render(template, context)
        self.log(time, text, position=position, target=target)

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

    def start(self, event, agent=None, **kw):
        assert not self.abstract
        if agent:
            self.agent = agent

        self.set_state(event=event, new_state=self.first_state)

    def _go(self, event, new_state):
        self.set_state(event, new_state)
        return True

    def set_state(self, event, new_state):
        assert new_state
        assert not self.abstract

        if isinstance(new_state, QuestState):
            new_state_name = new_state.name
        elif isinstance(new_state, basestring):
            new_state_name = new_state
            new_state = self.states_map[new_state_name]
        else:
            raise TypeError('Try to set state by {new_state!r} in quest {self!r}'.format(**locals()))

        old_state_name = self.current_state
        old_state = self.state

        if new_state_name == old_state_name:
            return

        if old_state:
            self.do_state_exit(event, old_state)

        self.current_state = new_state_name
        self.do_state_enter(event, new_state)


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
