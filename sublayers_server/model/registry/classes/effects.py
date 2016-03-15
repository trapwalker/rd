# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, TextAttribute

from sublayers_server.model.events import Event
from sublayers_server.model.balance import EffectsDict


# def get_effects(server):
#     for d in EffectsDict.dicts:
#         e = Effect(server=server, **d)
#         log.info(e)
# 
#     log.info('Effects Ready: %s', len(server.effects.keys()))


class Effect(Root):
    param_name  = TextAttribute(caption=u'Параметр')
    m_name      = TextAttribute(caption=u'Модификатор')
    r_name      = TextAttribute(caption=u'Резист')
    upd_method  = TextAttribute(caption=u'Callback', default=None)
    sign        = TextAttribute(caption=u'Знак', default=-1)
    is_stack    = TextAttribute(caption=u'Стекается?', default=False)
    absolute    = TextAttribute(caption=u'Абсолютное значение', default=False)
    message     = TextAttribute(caption=u'Класс сообщения клиенту', default=None)

    def __init__(self, *av, **kw):
        super(Effect, self).__init__(*av, **kw)
        self.dependence_list = [self.m_name, self.r_name]
        # server.effects.update({name: self})

    def __str__(self):
        return ('<{self.uri} {details}>'.format(
            self=self,
            details= (
                'ABSTRACT' if self.abstract else
                '{self.param_name}=*{self.m_name}/{self.r_name})'.format(self=self)
            )
        ))

    def start(self, owner, time):
        EffectStartEvent(effect=self, owner=owner, time=time).post()

    def done(self, owner, time):
        EffectDoneEvent(effect=self, owner=owner, time=time).post()

    def _modify(self, on, p, m_value, r_value):
        assert not self.abstract
        sign = self.sign if on else -self.sign
        original = 1.0 if self.absolute else p.original
        p.current += sign * original * m_value * (1 - r_value)

    def on_update(self, owner, param_name, old_p_value):
        assert not self.abstract
        if param_name in self.dependence_list:
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            self._modify(on=False, p=p, m_value=(old_p_value if param_name == self.m_name else m.value),
                        r_value=(old_p_value if param_name == self.r_name else r.value))
            self._modify(on=True, p=p, m_value=m.value, r_value=r.value)

    def on_start(self, owner, time):
        assert not self.abstract
        if self.is_stack or not (self in owner.effects):
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            old_p = p.value
            self._modify(on=True, p=p, m_value=m.value, r_value=r.value)

            for effect in owner.effects:
                effect.on_update(owner=owner, param_name=self.param_name, old_p_value=old_p)

            if self.upd_method is not None:
                method = getattr(owner, self.upd_method)
                if method:
                    method(time=time)
            if self.message:
                if owner.owner:
                    self.message(agent=owner.owner, subj=owner, effect=self, is_start=True).post()

        owner.effects.append(self)

    def on_done(self, owner, time):
        assert not self.abstract
        if self not in owner.effects:
            return
        owner.effects.remove(self)
        if self.is_stack or self not in owner.effects:
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            old_p = p.value
            self._modify(on=False, p=p, m_value=m.value, r_value=r.value)

            for effect in owner.effects:
                effect.on_update(owner=owner, param_name=self.param_name, old_p_value=old_p)

            if self.upd_method is not None:
                method = getattr(owner, self.upd_method)
                if method:
                    method(time=time)
            if self.message:
                if owner.owner:
                    self.message(agent=owner.owner, subj=owner, effect=self, is_start=False).post()


class EffectStartEvent(Event):
    def __init__(self, effect, owner, **kw):
        assert effect
        super(EffectStartEvent, self).__init__(server=owner.server, **kw)
        self.effect = effect
        self.owner = owner

    def on_perform(self):
        super(EffectStartEvent, self).on_perform()
        if not self.owner.limbo:
            self.effect.on_start(owner=self.owner, time=self.time)
        else:
            self.effect.on_done(owner=self.owner, time=self.time)


class EffectDoneEvent(Event):
    def __init__(self, effect, owner, **kw):
        assert effect
        super(EffectDoneEvent, self).__init__(server=owner.server, **kw)
        self.effect = effect
        self.owner = owner

    def on_perform(self):
        super(EffectDoneEvent, self).on_perform()
        self.effect.on_done(owner=self.owner, time=self.time)
