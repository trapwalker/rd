# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sublayers_server.model.messages as messages
from sublayers_server.model import quest_events
from sublayers_server.model.registry_me.classes import notes
from sublayers_server.model.registry_me.tree import (
    Node, Subdoc, UUIDField, Document,
    StringField, IntField, FloatField, ListField, EmbeddedDocumentField, DateTimeField, BooleanField, MapField,
    EmbeddedNodeField, RegistryLinkField, PositionField,
    GenericEmbeddedDocumentField, DynamicSubdoc,
    LocalizedStringField, LocalizedString,
)
from sublayers_server.model.events import event_deco
from sublayers_server.model.vectors import Point
from sublayers_server.model.game_log_messages import QuestStartStopLogMessage, QuestLogMessage
from sublayers_common.site_locale import locale

from ctx_timer import Timer
from functools import partial, wraps
import random
from itertools import chain


instantiate_stat = dict()


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
    quest_uid   = UUIDField(doc=u"UID of quest", tags={'client'})
    time        = FloatField(tags={'client'}, doc=u"Время создания записи")
    text        = StringField(tags={'client'}, doc=u"Текст записи")
    position    = PositionField(tags={'client'}, doc=u"Привязанная к записи позиция на карте")
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


class QuestState_(object):
    status = 'active'
    result = None

    def __init__(self, id=None):
        self.id = id or self.__class__.__name__

    def on_enter_(self, quest, event):
        pass

    def on_exit_(self, quest, event):
        pass

    def on_event_(self, quest, event):
        pass


class FinalState(QuestState_):
    status = 'end'


class WinState(FinalState):
    result = 'win'


class FailState(FinalState):
    result = 'fail'


class FailByCancelState(FailState):
    pass


# todo: ##DEPRECATED
class QuestState(Node):
    id = StringField(doc=u"Идентификационное имя состояния внутри кевеста для использования в скриптах")
    enter_state_message = LocalizedStringField(doc=u"Сообщение в журнал при входе в состояние")
    exit_state_message = LocalizedStringField(doc=u"Сообщение в журнал при выходе из состояния")
    status = StringField(doc=u"Статус квеста при данном текущем состоянии (None/active/end)")
    result = StringField(doc=u"Результат квеста данном текущем состоянии (None/win/fail)")

    on_enter = StringField(caption=u"Python скрипт, выполняемый при входе в состояние")
    on_exit = StringField(caption=u"Python скрипт, выполняемый при выходе из состояния")
    on_event = StringField(caption=u"Python скрипт, выполняемый по факту любого события")

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

    def on_enter_(self, quest, event):
        # todo: ##DEPRECATED
        quest.local_context.update(
            go=partial(quest._go, event=event),
            set_timer=partial(quest.set_timer, event=event),
        )
        self._exec_event_handler(quest=quest, handler='on_enter', event=event)

    def on_exit_(self, quest, event):
        # todo: ##DEPRECATED
        self._exec_event_handler(quest=quest, handler='on_exit', event=event)

    def on_event_(self, quest, event):
        # todo: ##DEPRECATED
        quest.local_context.update(
            go=partial(quest._go, event=event),
            set_timer=partial(quest.set_timer, event=event),
        )
        self._exec_event_handler(quest=quest, handler='on_event', event=event)


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

class QuestEndRec(Document):
    user_id = StringField(caption=u'Идентификатор профиля владельца', sparse=True, identify=True)
    quest = EmbeddedNodeField(
        document_type='sublayers_server.model.registry_me.classes.quests.Quest',
    )


class Quest(Node):
    first_state     = StringField(caption=u'Начальное состояние', doc=u'Id начального состояния квеста')
    current_state   = StringField(caption=u'Текущее состояние', doc=u'Имя текущего состояния квеста')
    states          = ListField(
        field=EmbeddedNodeField(document_type=QuestState),
        root_default=list,
        readonly=True,  # todo: ##DEPRECATED
        caption=u"Состояния квеста",
        doc=u"Список возможных состояний квестов. Состояния включают в себя логику переходов.",
    )
    # todo: change states list to MapField (states inheritance support)
    # todo: ##FIXIT в стейтах внутри квеста почему-то реинстанцируются строки с кодом обработчиков событий
    # todo: restart timers by load
    timers      = MapField(
        field=EmbeddedDocumentField(document_type=quest_events.QuestTimer),
        root_default=dict,
        reinst=True,
        caption=u"Установленные таймеры",
        doc=u"Список установленных квестом таймеров",
    )
    dc          = GenericEmbeddedDocumentField(
        default=lambda: DynamicSubdoc(),
        not_inherited=True,
        reinst=True,
        caption=u'Динамический контекст',
        doc=u'Персистентное динамическое хранилище данных состояния квеста (не поддерживает EmbeddedNodeField)',
    )
    on_generate = StringField(caption=u'Скрипт генерации квеста', doc=u'''Python-скрпт, генерирующий квест.
        Любое исключение в скрипте отменяет его создание. Исключение Cancel тихо отменяет.''')
    on_start    = StringField(caption=u'Скрипт старта квеста', doc=u'''Python-скрпт, выполняющийся перед установкой
        стартового состояния. Любое исключение в скрипте отменяет принятие квеста. Исключение Cancel тихо отменяет.''')
    caption     = LocalizedStringField(tags={'client'}, caption=u'Заголовок квеста', doc=u'Может строиться и меняться по шаблону')
    text        = LocalizedStringField(tags={'client'}, caption=u'Текст, оспровождающий квест', doc=u'Может строиться и меняться по шаблону')
    text_short  = LocalizedStringField(tags={'client'}, caption=u'Короткий текст квеста', doc=u'Может строиться и меняться по шаблону')
    typename    = LocalizedStringField(tags={'client'}, caption=u'Тип квеста', doc=u'Может быть произвольным')
    list_icon   = StringField(tags={'client'}, caption=u'Пиктограмма для списков', doc=u'Мальенькая картинка для отображения в списках')  # todo: use UrlField
    map_icon_full    = StringField(tags={'client'}, caption=u'Пиктограмма отображения нот на карте', doc=u'')  # todo: use UrlField
    map_icon_circle  = StringField(tags={'client'}, caption=u'Пиктограмма отображения нот на карте', doc=u'')  # todo: use UrlField
    level       = IntField(tags={'client'}, caption=u'Уровень квеста', doc=u'Обычно число, но подлежит обсуждению')  # todo: обсудить
    starttime   = FloatField(tags={'client'}, caption=u'Начало выполнения', doc=u'Время старта квеста')
    endtime     = FloatField(root_default=0, caption=u'Завершение выполнения', doc=u'Время завершения/провала квеста')
    generation_group = StringField(caption=u'Тэг семейство квеста')
    generation_max_count = IntField(root_default=1, caption=u'Максимально еколичество квестов данного типа у агента')
    generation_cooldown = IntField(root_default=0, caption=u'Cooldown после завершения', doc=u'Время, которое должно пройти после завершения квеста для следующей генерации')
    deadline    = IntField(tags={'client'}, caption=u'Срок выполнения этапа', doc=u'datetime до провала текущего этапа. Может меняться')
    design_speed = FloatField(caption=u'Скорость в px/с с которой должен двигаться игрок чтобы успеть (если = 0, то время не ограничено)', root_default=3)
    generate_time = IntField(root_default=0, caption=u"Время генерации квеста")
    shelf_life_time = IntField(root_default=0, caption=u"Время срока годности сгенерированного, но не взятого квеста")
    hirer       = RegistryLinkField(
        tags={'client'}, caption=u'Заказчик', doc=u'NPC-заказчик квеста',
        document_type='sublayers_server.model.registry_me.classes.poi.Institution',
    )
    town        = RegistryLinkField(
        caption=u'Город выдачи', doc=u'Город выдачи квеста',
        document_type='sublayers_server.model.registry_me.classes.poi.Town',
    )
    history     = ListField(
        field=EmbeddedDocumentField(document_type=LogRecord),
        root_default=list,
        tags={'client'},
        reinst=True,
        caption=u"Журнал квеста",
        doc=u"Записи добавляются в журнал методом quest.log(...)",
    )
    total_reward_money = IntField(root_default=0, caption=u'Общая сумма награды в нукойнах')
    karma_coef = FloatField(root_default=0, caption=u'Часть кармы от общей награды')
    money_coef = FloatField(root_default=0, caption=u'Часть нукойнов от общей награды')
    reward_money = IntField(root_default=0, caption=u'Сумма денежной награды', tags={'client'})
    reward_karma = FloatField(root_default=0, caption=u'Величина кармической награды')
    reward_relation_hirer = FloatField(caption=u'Награда в отношение за выполнение')
    reward_exp = FloatField(root_default=0, caption=u'Награда в exp за квест')
    reward_items = ListField(
        root_default=list,
        caption=u"Список итемов награды",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.item.Item',
            caption=u"Итем для награды",
            tags={'client'},
        ),
        tags={'client'},
    )
    reward_items_list = ListField(
        root_default=list,
        caption=u"Список возможных комплектов для награды",
        field=ListField(
            caption=u"Список возможных наборов итемов для награды",
            field=EmbeddedNodeField(
                document_type='sublayers_server.model.registry_me.classes.item.Item',
                caption=u"Необходимый итем",
            ),
        ),
    )
    active_notes_view = BooleanField(caption=u'Отображение визуальных нот.', root_default=True, tags={'client'})
    build_view = BooleanField(caption=u'Отрисовывать ли данный квест в квестах задния.', root_default=True, tags={'client'})

    @property
    def agent(self):
        return self._agent

    # @agent.setter
    # def agent(self, value):
    #     self.__dict__['_agent'] = value

    def __init__(self, **kw):
        super(Quest, self).__init__(**kw)
        self._go_state_name = None
        self._states_map = None
        self._global_context = None
        self._local_context = None
        self._error = None
        self._agent = None
        self._state = None

    def instantiate(self, **kw):
        with Timer(name='quest_instantiate', log_start=None, logger=None, log_stop=None) as quest_instantiate_timer:
            q = super(Quest, self).instantiate(**kw)

        cl_name = 'inst_{}'.format(self.__class__.__name__)
        if instantiate_stat.get(cl_name, None):
            instantiate_stat[cl_name]["count"] += 1
            instantiate_stat[cl_name]["duration"] += quest_instantiate_timer.duration
        else:
            instantiate_stat[cl_name] = {"count": 1, "duration": quest_instantiate_timer.duration, 'name': cl_name}
        return q

    def _set_error_status(self, handler, event, e):
        self._error = True

    # todo: ##DEPRECATED
    @property
    def states_map(self):
        states_map = getattr(self, '_states_map', None)
        states = self.states
        if not states_map:
            states_map = states and {state.id: state for state in states} or {}  # todo: optimize
            self._states_map = states_map

        return states_map

    @property
    def state(self):
        state = self._state
        current_state_name = self.current_state
        if current_state_name is None:
            return

        # todo: ##DEPRECATED
        if state is None:
            state = self.states_map.get(current_state_name, None)

        if state is None:
            state = self.make_state(current_state_name)

        return state

    @property
    def status(self):
        st = self._error
        if st:
            return st
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
            #log=self._log,
        )
        return d

    def as_unstarted_quest_dict(self):
        d = dict()
        d.update(
            uid=self.uid,
            status=self.status,
            build_view=self.build_view,
            result=self.result,
            hirer=dict(node_hash=self.hirer and self.hirer.node_hash()),
            caption=self.caption,
            text=self.text,
            text_short=self.text_short,
            list_icon=self.list_icon,
            level=self.level,
            deadline=self.deadline,
        )
        return d

    # todo: QuestUpdateMessage(agent=self.agent, time=time, quest=self).post()

    def on_generate_(self, event, **kw):
        # todo: ##DEPRECATED Удалить устаревший вызов кода из текста
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
        finally:
            del self.local_context

    def generate(self, event, agent, **kw):
        """
        :param event: sublayers_server.model.events.Event
        """
        self._agent = agent
        #time = kw.pop('time', event and event.time)

        try:
            with Timer(name='quest_gen', log_start=None, logger=None, log_stop=None) as quest_gen:
                self.on_generate_(event=event, **kw)

            cl_name = 'gen_{}'.format(self.__class__.__name__)
            if instantiate_stat.get(cl_name, None):
                instantiate_stat[cl_name]["count"] += 1
                instantiate_stat[cl_name]["duration"] += quest_gen.duration
            else:
                instantiate_stat[cl_name] = {"count": 1, "duration": quest_gen.duration, 'name': cl_name}

        except Cancel as e:
            log.debug('Quest %r generation canceled: %s', self, e)
            return False
        except Exception as e:
            log.exception('Runtime error in quest handler `on_generate`.')
            self._set_error_status('on_generate', event, e)
            return False
        else:
            self.generate_time = event.time  # Запоминаем время генерации каждого квеста
            return True

    def on_start_(self, event, **kw):
        # todo: ##DEPRECATED Удалить устаревший вызов кода из текста
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
            finally:
                del self.local_context

    @event_deco
    def start(self, event, **kw):
        """
        :param event: sublayers_server.model.events.Event
        """
        try:
            self.on_start_(event, **kw)
        except Cancel as e:
            # log.debug('Starting quest is canceled {uri}: {e.message}'.format(uri=fn, e=e)) # todo: не знаю что такое fn
            return False
        except Exception as e:
            log.exception('Runtime error in quest handler `on_start`.')
            self._set_error_status('on_start', event, e)
            return False
        else:
            # log.debug('QUEST is started {self!r} by {self.agent!r}'.format(**locals()))
            if self.agent:
                self.agent.profile.quests_unstarted.remove(self)
                self.agent.profile.quests_active.append(self)

            self.set_state(new_state=self.first_state, event=event)
            return True

    def make_state(self, state_name):
        state = self.states_map.get(state_name, None)
        if state is None:
            state = getattr(self, state_name, None)

        assert (
            isinstance(state, QuestState_) or
            isinstance(state, type) and issubclass(state, QuestState_) or
            # todo: ##DEPRECATED
            isinstance(state, QuestState)
        ), "New state type of quest {!r} is wrong: {!r}".format(self, state)

        if isinstance(state, type):
            state = state(id=state_name)

        if state.id != state_name:
            log.warning(
                'State id %r.id==%r is not match to required %r in quest %r',
                state, state.id, state_name, self
            )

        assert state is not None, "Fail to make state named {!r} in quest {!r}".format(state_name, self)
        return state

    def set_state(self, new_state, event):
        assert new_state
        assert not self.abstract
        old_status = self.status
        next_state = None

        if not isinstance(new_state, basestring):
            raise TypeError('Try to set state by {new_state!r} in quest {self!r}'.format(**locals()))

        next_state = self.make_state(new_state)
        old_state = self.state

        if old_state:
            self.do_state_exit(old_state, event)

        self.current_state = next_state.id
        self._state = next_state

        agent_model = self.agent and self.agent.profile._agent_model
        if agent_model:
            QuestUpdateMessage(agent=agent_model, time=event.time, quest=self).post()
            if self.status == 'active' and old_status is None:  # quest started
                QuestStartStopLogMessage(agent=agent_model, time=event.time, quest=self, action=True).post()
                self.starttime = event.time
            if self.status == 'end' and old_status == 'active':  # quest finished
                QuestStartStopLogMessage(agent=agent_model, time=event.time, quest=self, action=False).post()
                self.endtime = event.time
                self._on_end_quest(event)

        self.do_state_enter(next_state, event)

    def _on_end_quest(self, event, save_old_quests=True):
        agent_example = self.agent and self.agent.profile
        if agent_example:
            # Чистим список завершенных квестов и все "ненужные" выкидываем в отдельную коллекцию
            quests = agent_example.quests_ended
            old_quest_list = []
            for q in quests:
                if (q.parent == self.parent) and \
                        (q.hirer == self.hirer) and \
                        (q.generation_group == self.generation_group) and \
                        ((q.endtime + q.generation_cooldown) < event.time):
                    old_quest_list.append(q)

            for q in old_quest_list:
                agent_example.quests_ended.remove(q)
                if save_old_quests:
                    QuestEndRec(quest=self, user_id=self.agent.user_id).save()

            # Обязательно добавляем ПОСЛЕДНИЙ завершенный (текущий) квест
            agent_example.quests_ended.append(self)
            agent_example.on_event(event=event, cls=quest_events.OnQuestChange, target_quest_uid=self.uid)

            try:
                agent_example.quests_active.remove(self)
            except ValueError as e:
                log.warning(u'Квеста (%r) не оказалось в списке активных по его окончании у агента %r', self, self.agent)
                log.exception(e)

    # todo: ##DEPRECATED
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

    # todo: ##DEPRECATED
    def make_local_context(self):
        return dict()

    # todo: ##DEPRECATED
    @property
    def global_context(self):
        ctx = getattr(self, '_global_context', None)
        if ctx is None:
            ctx = self.make_global_context()
            self._global_context = ctx

        return ctx

    # todo: ##DEPRECATED
    @property
    def local_context(self):
        ctx = getattr(self, '_local_context', None)
        if ctx is None:
            ctx = self.make_local_context()
            self._local_context = ctx

        return ctx

    # todo: ##DEPRECATED
    @local_context.deleter
    def local_context(self):
        self._local_context = None

    # todo: ##DEPRECATED
    def _template_render(self, template, **kw):
        if template is None:
            log.warning('quest text to render is None in quest: {!r}; context: {!r}'.format(self, kw))
            return u''
        try:
            context = dict(self.global_context, **self.local_context)
            context.update(kw)
            return template.format(**context)
        except Exception as e:
            log.error('Template render error in quest %r. Template: %r; context: %r', self, template, context)
            raise e

    def do_state_exit(self, state, event):
        state.on_exit_(quest=self, event=event)
        assert self._go_state_name is None, u'State switching cause into the state exit handler: {}, {}'.format(
            state, self,
        )

    def do_state_enter(self, state, event):
        assert self._go_state_name is None, u'State switching artefacft ({self._go_state_name}): {st}, {self}'.format(
            st=state, self=self,
        )
        #self._go_state_name = None
        state.on_enter_(quest=self, event=event)
        new_state = self._go_state_name
        self._go_state_name = None
        if new_state:
            self.set_state(new_state, event)

    def do_event(self, event):
        state = self.state
        assert state, 'Calling Quest.on_event {self!r} with undefined state: {self.current_state!r}'.format(**locals())
        assert self._go_state_name is None, u'State switching artefacft ({self._go_state_name}): {st}, {self}'.format(
            st=state, self=self,
        )
        #self._go_state_name = None
        state.on_event_(quest=self, event=event)
        new_state = self._go_state_name
        self._go_state_name = None
        if new_state:
            self.set_state(new_state, event)

    def set_timer(self, event, name=None, time=None, delay=None):
        if time is None:
            time = event.time

        if delay is not None:
            time += delay

        return quest_events.OnTimer(server=event.server, time=time, quest=self, name=name).post()

    def reset_timers(self):
        pass  # todo: ##IMPLEMENTATION

    def log(self, text, event=None, position=None, game_log_only=False, **kw):
        if isinstance(text, LocalizedString):
            text = self.locale(text)
        rendered_text = self._template_render(text, position=position, **kw)
        log_record = LogRecord(quest=self, time=event and event.time, text=rendered_text, position=position, **kw)
        if not game_log_only:
            self.history.append(log_record)
        if event and self.agent and self.agent.profile._agent_model:
            if not game_log_only:
                QuestUpdateMessage(time=event.time, quest=self, agent=self.agent.profile._agent_model).post()
            QuestLogMessage(time=event.time, record=log_record, agent=self.agent.profile._agent_model).post()
        return True

    def go(self, new_state, event):
        self._go_state_name = new_state
        return True

    _go = go  # todo: ##DEPRECATED

    def can_give_items(self, items, event):
        if not self.agent.profile.car:
            return False
        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.inventory.save_to_example(time=event.time)
        return len(items) <= (self.agent.profile.car.inventory.size - len(self.agent.profile.car.inventory.items))

    def give_items(self, items, event):
        if not self.can_give_items(items=items, event=event):
            return False
        total_inventory_list = None if self.agent.profile._agent_model.inventory is None else self.agent.profile._agent_model.inventory.example.total_item_type_info()
        for item in items:
            self.agent.profile.car.inventory.items.append(item.instantiate(amount=item.amount))
        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.reload_inventory(time=event.time, save=False, total_inventory=total_inventory_list)
        return True

    def can_take_items(self, items, event):
        if not self.agent.profile.car:
            return False

        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.inventory.save_to_example(time=event.time)

        assortment = self.agent.profile.car.inventory.total_item_type_info()
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
        total_inventory_list = None if self.agent.profile._agent_model.inventory is None else self.agent.profile._agent_model.inventory.example.total_item_type_info()
        for item in items:
            self.agent.profile.car.inventory.del_item(item=item, count=item.amount)
        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.reload_inventory(time=event.time, save=False, total_inventory=total_inventory_list)
        return True

    def locale(self, key, loc=None):
        lang = loc or self.agent and self.agent.profile._agent_model and self.agent.profile._agent_model.user and self.agent.profile._agent_model.user.lang or 'en'
        return locale(lang=lang, key=key)

    def npc_replica(self, npc, replica, event, replica_type='Error'):
        if isinstance(replica, LocalizedString):
            replica = self.locale(replica)

        if self.agent.profile._agent_model:
            messages.NPCReplicaMessage(agent=self.agent.profile._agent_model, npc=npc, replica=replica,
                                       replica_type=replica_type, time=event.time).post()

    def generate_reward(self):
        self.reward_money = round(self.total_reward_money * self.money_coef)
        self.reward_karma = self.total_reward_money * self.karma_coef / 1000

        if self.reward_items_list:
            self.reward_items = random.choice(self.reward_items_list)

    def init_level(self):
        self.level = 1

    def active_notes_view_change(self, active, time):
        if active == self.active_notes_view:
            return
        self.active_notes_view = active
        if self.agent.profile._agent_model:
            messages.QuestsChangeMessage(agent=self.agent.profile._agent_model, time=time, quest=self).post()

    def deadline_to_str(self):
        m, s = divmod(self.deadline, 60)
        h, m = divmod(m, 60)
        return "%d:%02d:%02d" % (h, m, s)

    def can_generate(self, event):
        # log.debug('can_generate {} {!r}'.format(self.generation_group, self.parent))
        # закоментировано и возвращает всегда True, так как основная проверка в can_instantiate
        # agent = self.agent
        # agent_all_quests = agent.profile.quests
        # agent_quests_active_ended = chain(agent.profile.quests_ended, agent.profile.quests_active)
        #
        # # Этапы генерации:
        # # Квест не сгенерируется, если:
        # # - парент одинаковый и
        # # - достигнуто максимальное количество квестов у данного нпц в данной generation_group и
        # # - После сдачи квеста не вышел кулдаун и
        # # - Такой квест был последним взятым у данного нпц
        #
        # def get_count_quest(target_quest, quests, current_time):
        #     res = 0
        #     target_parent = target_quest.parent
        #     target_hirer = target_quest.hirer
        #     target_group = target_quest.generation_group
        #     for q in quests:
        #         if q.parent == target_parent and q.hirer == target_hirer and q.generation_group == target_group:
        #             if not q.endtime or q.endtime + q.generation_cooldown > current_time:  # todo: правильно проверять завершённые квестов
        #                 res += 1
        #     return res
        #
        # def last_taken_quest_from_npc(npc, quests):  # возвращает последний взятый у данного нпц квест
        #     res = None
        #     if npc is None:
        #         return None
        #     for q in quests:
        #         if q.hirer and npc.node_hash() == q.hirer.node_hash() and (res is None or res.starttime and res.starttime < q.starttime):
        #             res = q
        #     return res
        #
        # if self.hirer is None:  # если hirer не указан, то можно генерировать
        #     return True
        #
        # generation_count = get_count_quest(self, agent_all_quests, event.time)
        # # log.debug('generation_count {}  >  {}'.format(generation_count, self.generation_max_count))
        #
        # if generation_count >= self.generation_max_count:
        #     return False
        #
        # # Если взят последний квест такой же - то не генерировать новый, даже если позволяет количество
        # last_npc_q = last_taken_quest_from_npc(self.hirer, agent_quests_active_ended)
        # if last_npc_q and last_npc_q.parent == self.parent and last_npc_q.generation_group == self.generation_group:
        #     return False

        return True

    def can_instantiate(self, event, agent, hirer):  # info: попытка сделать can_generate до инстанцирования квеста
        if agent is None:
            return False

        if hirer is None:  # если hirer не указан, то можно генерировать
            return True

        agent_all_quests = agent.profile.quests
        agent_quests_active_ended = chain(agent.profile.quests_ended, agent.profile.quests_active)

        # Этапы генерации:
        # Квест не сгенерируется, если:
        # - парент одинаковый и
        # - достигнуто максимальное количество квестов у данного нпц в данной generation_group и
        # - После сдачи квеста не вышел кулдаун и
        # - Такой квест был последним взятым у данного нпц

        def get_count_quest(target_quest, quests, current_time):
            res = 0
            target_parent = target_quest.parent
            target_hirer = hirer
            target_group = target_quest.generation_group
            for q in quests:
                if q.parent == target_parent and q.hirer == target_hirer and q.generation_group == target_group:
                    if not q.endtime or ((q.endtime + q.generation_cooldown) > current_time):  # todo: правильно проверять завершённые квестов
                        res += 1
            return res

        def last_taken_quest_from_npc(npc, quests):  # возвращает последний взятый у данного нпц квест
            res = None
            res_starttime = None

            if npc is None:
                return None

            npc_node_hash = npc.node_hash()

            for q in quests:
                if (
                    q.hirer and
                    npc_node_hash == q.hirer.node_hash() and
                    (res is None or res_starttime and res_starttime < q.starttime)
                ):
                    res = q
                    res_starttime = res.starttime

            return res

        generation_count = get_count_quest(self, agent_all_quests, event.time)
        # log.debug('generation_count {}  >  {}'.format(generation_count, self.generation_max_count))

        if generation_count >= self.generation_max_count:
            return False

        # Если взят последний квест такой же - то не генерировать новый, даже если позволяет количество
        last_npc_q = last_taken_quest_from_npc(hirer, agent_quests_active_ended)
        if last_npc_q and last_npc_q.parent == self.parent and last_npc_q.generation_group == self.generation_group:
            return False

        return True

    def check_unstarted(self, event):
        return self.shelf_life_time and ((self.shelf_life_time + self.generate_time) < event.time)

    def get_distance_cost(self, distance):
        return round(distance / 1000)


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
    def as_dict(self):
        d = super(QuestUpdateMessage, self).as_dict()
        d.update(
            quest=self.quest.as_unstarted_quest_dict(),
        )
        return d


class QuestDelMessage(messages.Message):
    def __init__(self, quest, **kw):
        super(QuestDelMessage, self).__init__(**kw)
        self.quest = quest  # todo: weakref #refactor

    def as_dict(self):
        d = super(QuestDelMessage, self).as_dict()
        d.update(
            quest_uid=self.quest.uid,
        )
        return d


class AIQuickQuest(Quest):
    route = ListField(
        root_default=list,
        caption=u"Маршрут патрулирования",
        field=PositionField(caption=u"Точка патрулирования"),
    )
    route_index = IntField(caption=u'Индекс текущей точки патрулирования')

    def get_next_route_point(self):
        if not self.route:
            return Point.random_point(
                self.agent.profile._agent_model.server.quick_game_play_radius,
                self.agent.profile._agent_model.server.quick_game_start_pos
            )
        if self.route_index + 1 >= len(self.route):
            self.route_index = 0
        else:
            self.route_index = self.route_index + 1
        return self.route[self.route_index].as_point()

    def use_heal(self, time):
        agent_model = self.agent and self.agent.profile._agent_model
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
            if item_rec["item"].example.is_ancestor(agent_model.server.reg.get('/registry/items/usable/build_set')):
                position = item_rec["position"]
        if position:
            ItemPreActivationEvent(agent=agent_model, owner_id=car.uid, position=position, target_id=car.uid, time=time).post()


class MarkerMapObject(Subdoc):
    position = PositionField(caption=u"Координаты объекта")
    radius = FloatField(default=50, caption=u"Радиус взаимодействия с объектом", tags={'client'})

    def is_near(self, position, radius=None):
        radius = radius or self.radius
        if isinstance(position, PositionField):
            position = position.as_point()
        if isinstance(position, Point):
            distance = self.position.as_point().distance(target=position)
            return distance <= radius
        return False

    def generate_random_point(self, radius=None):
        radius = radius or self.radius
        return Point.random_point(radius=radius, center=self.position.as_point())

    def as_client_dict(self):
        d = super(MarkerMapObject, self).as_client_dict()
        d.update(position=self.position.as_point())
        return d
