# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sublayers_server.model.messages as messages
from sublayers_server.model import quest_events
from sublayers_server.model.registry.classes import notes
from sublayers_server.model.registry.tree import Root
from sublayers_server.model.events import event_deco
from sublayers_server.model.registry.tree import Subdoc
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.registry.odm.fields import (
    UniReferenceField, StringField, IntField, FloatField, ListField, EmbeddedDocumentField, DateTimeField, BooleanField,
)
from sublayers_server.model.vectors import Point
from sublayers_server.model.game_log_messages import QuestStartStopLogMessage
from sublayers_server.model.utils import getKarmaName

from functools import partial, wraps
import random


def unicode_args_substitution(func, template_renderer, **kw_dict):
    u"""Декоратор для вызывабельных объектов.
    Перебирает все аргументы `func` и обрабатывает темплетным подстановщиком `template_renderer`,
    передавая в него добавочный контекст `kw_dict`
    """
    @wraps(func)
    def closure(*av, **kw):
        av2 = []
        for v in av:
            v2 = v
            if isinstance(v, unicode):
                try:
                    v2 = template_renderer(v, **kw_dict)
                except Exception as e:
                    log.error('Error while render template {v!r} by template attr decorator')
            av2.append(v2)

        kw2 = {}
        for k, v in kw.items():
            v2 = v
            if isinstance(v, unicode):
                try:
                    v2 = template_renderer(v, **kw_dict)
                except Exception as e:
                    log.error('Error while render template {v!r} by template attr decorator')
            kw2[k] = v2

        return func(*av2, **kw2)

    return closure


class QuestException(Exception):
    pass


class Cancel(QuestException):
    pass


def script_compile(code, fn):
    import __future__
    return compile(
        code, fn, 'exec',
        flags=(0
           | __future__.unicode_literals.compiler_flag
           | __future__.print_function.compiler_flag
           | __future__.division.compiler_flag
        ),
    )


class LogRecord(Subdoc):
    quest_uid   = StringField  (tags="client", doc=u"UID of quest")
    time        = DateTimeField(tags="client", doc=u"Время создания записи")
    text        = StringField  (tags="client", doc=u"Текст записи")
    position    = PositionField(tags="client", doc=u"Привязанная к записи позиция на карте")
    # target  # todo: target of log record

    def __init__(self, quest=None, **kw):
        quest_uid = kw.pop('quest_uid', None) or quest and quest.uid
        super(LogRecord, self).__init__(quest_uid=quest_uid, **kw)


class QuestRange(Subdoc):
    min = FloatField(doc=u"Минимальное значение генерации")
    max = FloatField(doc=u"Максимальное значение генерации")

    def __init__(self, **kw):
        super(QuestRange, self).__init__(**kw)
        self.min, self.max = min(self.max, self.min), max(self.max, self.min)

    def get_random_int(self):
        int_max, int_min = int(self.max), int(self.min)
        return random.randint(int_min, int_max)


class QuestState(Root):
    id = StringField(doc=u"Идентификационное имя состояния внутри кевеста для использования в скриптах")
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
                    event.name is 'OnDie'
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

    def _exec_event_handler(self, quest, handler, event):
        code_text = getattr(self, handler, None)
        if not code_text:
            return

        # todo: Реализовать механизм получения URI места декларации конкретного значения атрибута (учет наследования)
        fn = '{uri}#states[{state.id}].{attr}'.format(uri=quest.node_hash(), state=self, attr=handler)
        try:
            code = script_compile(code_text, fn)
        except SyntaxError as e:
            log.error('Syntax error in quest handler.')
            raise e

        quest.local_context.update(state=self, event=event)
        try:
            exec code in quest.global_context, quest.local_context
        except Exception as e:
            log.exception('Runtime error in quest handler `%s`.', handler)
            quest._set_error_status(handler, event, e)
            #raise e
        finally:
            del quest.local_context

# Условия:
# - has([items], who=None)  # money too
# - attend(point|login|location|npc, who=None, radius=None, duration=None)
# - die(login|prototype|uid|None, count=1)  # None == self
# - buy(login|location|npc, [items], cost=None)
# - sale(login|location|npc, [items], cost=None)
# - time(duration)
# - trigger(name, value=None)
# - set_timer(name, duration)
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
    __not_a_fields__ = ['_states_map', '_go_state_name', '_global_context', '_local_context', '_error']
    first_state     = StringField(caption=u'Начальное состояние', doc=u'Id начального состояния квеста')
    current_state   = StringField(caption=u'Текущее состояние', doc=u'Имя текущего состояния квеста')
    states          = ListField(
        base_field=EmbeddedDocumentField(embedded_document_type=QuestState, reinst=True),
        reinst=True,
        caption=u"Состояния квеста",
        doc=u"Список возможных состояний квестов. Состояния включают в себя логику переходов.",
    )

    on_generate = StringField(caption=u'Скрипт генерации квеста', doc=u'''Python-скрпт, генерирующий квест.
        Любое исключение в скрипте отменяет его создание. Исключение Cancel тихо отменяет.''')
    on_start    = StringField(caption=u'Скрипт старта квеста', doc=u'''Python-скрпт, выполняющийся перед установкой
        стартового состояния. Любое исключение в скрипте отменяет принятие квеста. Исключение Cancel тихо отменяет.''')
    caption     = StringField(tags='client', caption=u'Заголовок квеста', doc=u'Может строиться и меняться по шаблону')
    text        = StringField(tags='client', caption=u'Текст, сопровождающий квест для журнала', doc=u'Может строиться и меняться по шаблону')
    text_short  = StringField(tags='client', caption=u'Короткий текст квеста для реплики npc', doc=u'Может строиться и меняться по шаблону')
    typename    = StringField(tags='client', caption=u'Тип квеста', doc=u'Может быть произвольным')
    list_icon   = StringField(tags='client', caption=u'Пиктограмма для списков', doc=u'Мальенькая картинка для отображения в списках')  # todo: use UrlField
    level       = IntField(tags='client', caption=u'Уровень квеста', doc=u'Обычно число, но подлежит обсуждению')  # todo: обсудить
    starttime   = DateTimeField(tags='client', caption=u'Начало выполнения', doc=u'Время старта квеста')
    deadline    = IntField(tags='client', caption=u'Срок выполнения этапа', doc=u'datetime до провала текущего этапа. Может меняться')

    hirer       = UniReferenceField(tags='client', caption=u'Заказчик', doc=u'NPC-заказчик квеста',
                                    reference_document_type='sublayers_server.model.registry.classes.poi.Institution', )
    town        = UniReferenceField(tags='client', caption=u'Город выдачи', doc=u'Город выдачи квеста',
                                    reference_document_type='sublayers_server.model.registry.classes.poi.Town', )
    agent       = UniReferenceField(tags='client', caption=u'Агент', doc=u'Исполнитель квеста',
                                    reference_document_type='sublayers_server.model.registry.classes.agents.Agent', )
    history     = ListField(
        tags='client',
        base_field=EmbeddedDocumentField(embedded_document_type=LogRecord, reinst=True),
        reinst=True,
        caption=u"Журнал квеста",
        doc=u"Записи добавляются в журнал методом quest.log(...)",
    )
    total_reward_money = IntField(caption=u'Общая сумма награды в нукойнах')
    karma_coef = FloatField(caption=u'Часть кармы от общей награды')
    money_coef = FloatField(caption=u'Часть нуокйнов от общей награды')
    reward_money = IntField(caption=u'Сумма денежной награды', tags='client')
    reward_karma = FloatField(caption=u'Величина кармической награды')
    reward_items = ListField(
        default=[],
        caption=u"Список итемов награды",
        base_field=EmbeddedDocumentField(
            embedded_document_type='sublayers_server.model.registry.classes.item.Item',
            caption=u"Итем для награды",
            reinst=True,
            tags='client',
        ),
        reinst=True,
        tags='client',
    )
    reward_items_list = ListField(
        default=[],
        caption=u"Список возможных комплектов для награды",
        base_field=ListField(
            default=[],
            caption=u"Список возможных наборов итемов для награды",
            base_field=EmbeddedDocumentField(
                embedded_document_type='sublayers_server.model.registry.classes.item.Item',
                caption=u"Необходимый итем",
                reinst=True,
            ),
            reinst=True,
        ),
        reinst=True,
    )

    # @property
    # def agent(self):
    #     return self.__dict__.get('_agent')
    #
    # @agent.setter
    # def agent(self, value):
    #     self.__dict__['_agent'] = value

    def _set_error_status(self, handler, event, e):
        self._error = True

    @property
    def states_map(self):
        states_map = getattr(self, '_states_map', None)
        if not states_map:
            states_map = {state.id: state for state in self.states}  # todo: optimize
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
        if getattr(self, '_error', None):
            return 'error'
        state = self.state
        return state and state.status

    @property
    def result(self):
        state = self.state
        return state and state.result

    def as_client_dict(self):
        # todo: render templates
        d = super(Quest, self).as_client_dict()
        d.update(
            status=self.status,
            result=self.result,
        )
        return d

    # todo: QuestUpdateMessage(agent=self.agent, time=time, quest=self).post()

    def generate(self, event, **kw):
        """
        :param event: sublayers_server.model.events.Event
        """
        code_text = self.on_generate
        if not code_text:
            return

        # todo: Реализовать механизм получения URI места декларации конкретного значения атрибута (учет наследования)
        fn = '{uri}#.{attr}'.format(uri=self.node_hash(), attr='on_generate')
        try:
            code = script_compile(code_text, fn)
        except SyntaxError as e:
            log.error('Syntax error in quest handler.')
            raise e  # todo: Подавить эту ошибку, чтобы сервер не падал

        time = kw.pop('time', event and event.time)
        self.local_context.update(
            event=event,
            agent=self.agent,
            Cancel=unicode_args_substitution(Cancel, self._template_render),
            time=time,
            **kw
        )
        try:
            exec code in self.global_context, self.local_context
        except Cancel as e:
            log.debug('Quest {uri} is cancelled: {e.message}'.format(uri=fn, e=e))
            return False
        except Exception as e:
            log.exception('Runtime error in quest handler `on_generate`.')
            self._set_error_status('on_generate', event, e)
            return False
            #raise e
        else:
            log.info('Quest %s generation accepted', self)
            return True
        finally:
            del self.local_context

    @event_deco
    def start(self, event, **kw):
        """
        :param event: sublayers_server.model.events.Event
        """
        assert not self.abstract

        code_text = self.on_start
        if code_text:  # todo: ##refactoring
            # todo: Реализовать механизм получения URI места декларации конкретного значения атрибута (учет наследования)
            fn = '{uri}#.{attr}'.format(uri=self.node_hash(), attr='on_start')
            try:
                code = script_compile(code_text, fn)
            except SyntaxError as e:
                log.error('Syntax error in quest handler.')
                raise e  # todo: Подавить эту ошибку, чтобы сервер не падал

            time = kw.pop('time', event and event.time)
            self.local_context.update(
                event=event,
                agent=self.agent,
                Cancel=unicode_args_substitution(Cancel, self._template_render),
                time=time,
                **kw
            )
            try:
                exec code in self.global_context, self.local_context
            except Cancel as e:
                log.debug('Starting quest is canceled {uri}: {e.message}'.format(uri=fn, e=e))
                return False
            except Exception as e:
                log.exception('Runtime error in quest handler `on_start`.')
                self._set_error_status('on_start', event, e)
                return False
                #raise e
            else:
                log.info('Quest starting accepted: %s', self)

                log.debug('QUEST is started {self} by {self.agent}'.format(**locals()))
                if self.agent:
                    self.agent.quests_unstarted.remove(self)
                    self.agent.quests_active.append(self)

                self.set_state(new_state=self.first_state, event=event)
                return True

            finally:
                del self.local_context

    def set_state(self, new_state, event):
        assert new_state
        assert not self.abstract

        old_status = self.status

        if isinstance(new_state, QuestState):
            new_state_id = new_state.id
        elif isinstance(new_state, basestring):
            new_state_id = new_state
            new_state = self.states_map[new_state_id]
        else:
            raise TypeError('Try to set state by {new_state!r} in quest {self!r}'.format(**locals()))

        old_state_id = self.current_state
        old_state = self.state

        # Мы можем переходить в то же состояние в котором уже находимся. Это нормально. Все так делают.
        # if new_state_id == old_state_id:
        #     return

        if old_state:
            self.do_state_exit(old_state, event)

        self.current_state = new_state_id
        self.do_state_enter(new_state, event)

        agent_model = self.agent and self.agent._agent_model
        if agent_model:
            QuestUpdateMessage(agent=agent_model, time=event.time, quest=self).post()
            if self.status == 'active' and old_status is None:  # quest started
                QuestStartStopLogMessage(agent=agent_model, time=event.time, quest=self, action=True).post()
            if self.status == 'end' and old_status == 'active':  # quest finished
                QuestStartStopLogMessage(agent=agent_model, time=event.time, quest=self, action=False).post()

    def make_global_context(self):
        ctx = dict(
            quest=self,
            agent=self.agent,
            log=lambda template, **kw: log.debug(self._template_render(template, **kw) or True),
            random=random,
        )
        ctx.update(quest_events.ALL)  # Вся коллекция квестовых классов подмешивается в глобальный контекст
        ctx.update(notes.ALL)         # Вся коллекция note-классов подмешивается в глобальный контекст
        return ctx

    def make_local_context(self):
        return dict()

    @property
    def global_context(self):
        ctx = getattr(self, '_global_context', None)
        if ctx is None:
            ctx = self.make_global_context()
            self._global_context = ctx

        return ctx

    @property
    def local_context(self):
        ctx = getattr(self, '_local_context', None)
        if ctx is None:
            ctx = self.make_local_context()
            self._local_context = ctx

        return ctx

    @local_context.deleter
    def local_context(self):
        self._local_context = None

    def _template_render(self, template, **kw):
        try:
            context = dict(self.global_context, **self.local_context)
            context.update(kw)
            return template.format(**context)
        except Exception as e:
            log.error('Template render error in quest %r. Template: %r; context: %r', self, template, context)
            raise e

    def do_state_exit(self, state, event):
        state._exec_event_handler(quest=self, handler='on_exit', event=event)

    def do_state_enter(self, state, event):
        self._go_state_name = None
        self.local_context.update(
            go=partial(self._go, event=event),
            set_timer=partial(self.set_timer, event=event),
        )
        state._exec_event_handler(quest=self, handler='on_enter', event=event)
        new_state = getattr(self, '_go_state_name', None)
        if new_state:
            self.set_state(new_state, event)

    def do_event(self, event):
        state = self.state
        assert state, 'Calling Quest.on_event {self!r} with undefined state: {self.current_state!r}'.format(**locals())
        self._go_state_name = None
        self.local_context.update(
            go=partial(self._go, event=event),
            set_timer=partial(self.set_timer, event=event),
        )
        state._exec_event_handler(quest=self, handler='on_event', event=event)
        new_state = getattr(self, '_go_state_name', None)
        if new_state:
            self.set_state(new_state, event)

    def set_timer(self, event, name=None, time=None, delay=None):
        if time is None:
            time = event.time

        if delay is not None:
            time += delay

        return quest_events.OnTimer(server=event.server, time=time, quest=self, name=name).post()

    def log(self, text, event=None, position=None, **kw):
        rendered_text = self._template_render(text, position=position, **kw)
        log_record = LogRecord(quest=self, time=event and event.time, text=rendered_text, position=position, **kw)
        self.history.append(log_record)
        return True

    def _go(self, new_state, event):
        self._go_state_name = new_state
        return True

    def can_give_items(self, items, event):
        if not self.agent.car:
            return False
        if self.agent._agent_model:
            self.agent._agent_model.inventory.save_to_example(time=event.time)
        return len(items) <= (self.agent.car.inventory.size - len(self.agent.car.inventory.items))

    def give_items(self, items, event):
        if not self.can_give_items(items=items, event=event):
            return False
        total_inventory_list = None if self.agent._agent_model.inventory is None else self.agent._agent_model.inventory.example.total_item_type_info()
        for item in items:
            self.agent.car.inventory.items.append(item.instantiate(amount=item.amount))
        if self.agent._agent_model:
            self.agent._agent_model.reload_inventory(time=event.time, save=False, total_inventory=total_inventory_list)
        return True

    def can_take_items(self, items, event):
        if not self.agent.car:
            return False

        if self.agent._agent_model and self.agent._agent_model.inventory:
            self.agent._agent_model.inventory.save_to_example(time=event.time)

        assortment = self.agent.car.inventory.total_item_type_info()
        for item in items:
            if assortment.get(item.node_hash(), None) is None:
                return False
            assortment[item.node_hash()] -= item.amount
            if assortment[item.node_hash()] < 0:
                return False
        return True

    def take_items(self, items, event):
        if not self.can_take_items(items=items, event=event):
            return False
        total_inventory_list = None if self.agent._agent_model.inventory is None else self.agent._agent_model.inventory.example.total_item_type_info()
        for item in items:
            self.agent.car.inventory.del_item(item=item, count=item.amount)
        if self.agent._agent_model:
            self.agent._agent_model.reload_inventory(time=event.time, save=False, total_inventory=total_inventory_list)
        return True

    def npc_replica(self, npc, replica, event):
        if self.agent._agent_model:
            messages.NPCReplicaMessage(agent=self.agent._agent_model, npc=npc, replica=replica, time=event.time).post()

    def generate_reward(self):
        self.reward_money = round(self.total_reward_money * self.money_coef)
        self.reward_karma = self.total_reward_money * self.karma_coef / 1000

        if len(self.reward_items_list) > 0:
            self.reward_items = self.reward_items_list[random.randint(0, len(self.reward_items_list) - 1)]


class QuestUpdateMessage(messages.Message):
    def __init__(self, quest, **kw):
        super(QuestUpdateMessage, self).__init__(**kw)
        self.quest = quest  # todo: weakref #refactor

    def as_dict(self):
        d = super(QuestUpdateMessage, self).as_dict()
        d.update(
            quest=self.quest.as_client_dict(),
        )
        #if self.quest.hirer is None:
        #    log.error('============ %s', self.__class__)
        return d


class QuestAddMessage(QuestUpdateMessage):
    pass


class QuestLogMessage(messages.Message):
    def __init__(self, event_record, **kw):
        super(QuestLogMessage, self).__init__(**kw)
        self.event_record = event_record  # todo: weakref #refactor

    def as_dict(self):
        d = super(QuestLogMessage, self).as_dict()
        d.update(
            quest_event=self.event_record.as_dict(),
        )
        return d


class KillerQuest(Quest):
    unique_victims = BooleanField(caption=u'Должны ли быть жертвы уникальными')
    price_victim = IntField(caption=u'Цена одной жертвы на первом уровне квеста в нукойнах')
    count_to_kill_range = EmbeddedDocumentField(
        embedded_document_type=QuestRange,
        caption=u"Диапазон количетсва жертв",
        reinst=True,
    )
    count_to_kill = IntField(caption=u'Количество убийств', tags='client')
    max_karma_victims = IntField(caption=u'Максимальное значение кармы жертвы')
    min_level_victims = IntField(caption=u'Минимальный уровень жертвы')
    victims = ListField(
        default=[],
        caption=u"Список жертв (заполняется динамически)",
        base_field=UniReferenceField(
            reference_document_type='sublayers_server.model.registry.classes.agents.Agent',
        ),
    )

    def as_client_dict(self):
        d = super(KillerQuest, self).as_client_dict()
        d.update(
            # todo: photo url send
            victims=[dict(name=agent.login, photo='', profile_id=agent.profile_id) for agent in self.victims],
        )
        return d

    def get_available_lvl(self):
        # todo: реализовать определение доступного уровня квеста для данного типа квестов
        # relation = self.agent.get_relationship(npc=self.hirer)
        # lvl_table = [-0.8, -0.6, 0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1]
        # for item in lvl_table:
        #     if relation < item:
        #         return lvl_table.index(item)
        # return len(lvl_table)
        return 10

    def init_level(self):
        self.level = self.get_available_lvl()
        # Этот код нужен чтобы всегда генерить хотябы самый слабый квест
        if self.level == 0:
            self.level = 1
        self.level = random.randint(1, self.level)

    def init_targets_info(self):
        self.max_karma_victims = 100 - self.level * 10 # чем выше уровень квеста, тем ниже максимальная карма
        self.min_level_victims = self.level
        self.count_to_kill = self.count_to_kill_range.get_random_int()  # Выбираем сколько человек нужно убить

    def init_text(self):
        self.text_short = u"Убейте {:.0f} игрока(ов).".format(
            self.count_to_kill
        )
        self.text = u"Убейте {:.0f} игрока(ов) с минимальным уровнем {:.0f} и кармой хуже {}. Награда: {:.0f}nc и {:.0f} кармы.".format(
            self.count_to_kill,
            self.min_level_victims,
            getKarmaName(self.max_karma_victims, 'ru'),
            self.reward_money,
            self.reward_karma
        )

    def init_deadline(self):
        if self.deadline:
            self.deadline = self.count_to_kill * self.deadline * (1 + self.level / 10)


class DeliveryQuest(Quest):
    reward_relation_hirer = FloatField(caption=u'Награда в отношение за выполнение')
    distance_table = UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.disttable.DistTable')

    recipient_list = ListField(
        default=[],
        caption=u"Список возможных получателей доставки",
        base_field=UniReferenceField(
            reference_document_type='sublayers_server.model.registry.classes.poi.Institution', )
    )
    recipient = UniReferenceField(tags='client', caption=u'Получатель доставки',
                                  reference_document_type='sublayers_server.model.registry.classes.poi.Institution', )
    total_delivery_money_coef = FloatField(
        caption=u'Множитель общей стоимости награды за квест от стоимости доставляемого товара')
    delivery_set_list = ListField(
        default=[],
        caption=u"Список возможных комплектов для доставки",
        base_field=ListField(
            caption=u"Список возможных наборов итемов для доставки",
            base_field=EmbeddedDocumentField(
                embedded_document_type='sublayers_server.model.registry.classes.item.Item',
                caption=u"Необходимый итем",
                reinst=True,
                tags='client',
            ),
            reinst=True,
        ),
        reinst=True,
    )
    delivery_set = ListField(
        caption=u"Список итемов для доставки",
        base_field=EmbeddedDocumentField(
            embedded_document_type='sublayers_server.model.registry.classes.item.Item',
            caption=u"Необходимый итем",
            reinst=True,
            tags='client',
        ),
    )

    def init_text(self):
        self.text_short = u"Доставьте груз в гороод {}.".format(self.recipient.hometown.title)
        self.text = u"Доставьте груз: {} - к {} в гороод {}. Награда: {:.0f}nc.".format(
            ', '.join([item.title for item in self.delivery_set]),
            self.recipient.title,
            self.recipient.hometown.title,
            self.reward_money
        )

    def as_client_dict(self):
        d = super(DeliveryQuest, self).as_client_dict()
        d.update(
            delivery_set=[delivery_rec.as_client_dict() for delivery_rec in self.delivery_set],
        )
        return d


class AIQuickQuest(Quest):
    route = ListField(
        default=[],
        caption=u"Маршрут патрулирования",
        base_field=PositionField(caption=u"Точка патрулирования", reinst=True,),
        reinst=True,
    )
    route_index = IntField(caption=u'Индекс текущей точки патрулирования')

    def get_next_route_point(self):
        if not self.route:
            return Point.random_point(self.agent._agent_model.server.quick_game_start_pos,
                                      self.agent._agent_model.server.quick_game_play_radius)
        if self.route_index + 1 >= len(self.route):
            self.route_index = 0
        else:
            self.route_index = self.route_index + 1
        return self.route[self.route_index].as_point()

    def use_heal(self, time):
        agent_model = self.agent and self.agent._agent_model
        if not agent_model:
            return
        car = agent_model.car
        if not car:
            return
        inventory = car.inventory
        if not inventory:
            return
        from sublayers_server.model.events import ItemPreActivationEvent
        # Найти любую аптечку в инвентаре и использовать её
        position = None
        for item_rec in inventory.get_all_items():
            if item_rec["item"].example.is_ancestor(agent_model.server.reg['items/usable/build_set']):
                position = item_rec["position"]
        if position:
            ItemPreActivationEvent(agent=agent_model, owner_id=car.uid, position=position, target_id=car.uid,
                                   time=time).post()