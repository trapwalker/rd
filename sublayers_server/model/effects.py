# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event
from sublayers_server.model.balance import EffectsDict


def get_effects(server):
    for d in EffectsDict.dicts:
        e = Effect(server=server, **d)
        log.info(e)

    log.info('Effects Ready: %s', len(server.effects.keys()))


class EffectStartEvent(Event):
    def __init__(self, effect, owner, **kw):
        assert effect
        super(EffectStartEvent, self).__init__(server=owner.server, **kw)
        self.effect = effect
        self.owner = owner

    def on_perform(self):
        super(EffectStartEvent, self).on_perform()
        if not self.owner.limbo:
            self.effect.on_start(owner=self.owner)
        else:
            self.effect.on_done(owner=self.owner)


class EffectDoneEvent(Event):
    def __init__(self, effect, owner, **kw):
        assert effect
        super(EffectDoneEvent, self).__init__(server=owner.server, **kw)
        self.effect = effect
        self.owner = owner

    def on_perform(self):
        super(EffectDoneEvent, self).on_perform()
        self.effect.on_done(owner=self.owner)


class Effect(object):
    def __init__(self, server, name, param_name, m_name, r_name, upd_method=None, sign=-1.0, is_stack=False,
                 absolute=False, message=None):
        super(Effect, self).__init__()
        self.absolute = absolute
        self.message = message
        self.name = name
        self.sign = sign
        self.is_stack = is_stack
        self.param_name = param_name
        self.m_name = m_name
        self.r_name = r_name
        self.upd_method = upd_method
        self.dependence_list = [m_name, r_name]
        server.effects.update({name: self})

    def __str__(self):
        return '{}<{} := ({}, {})>'.format(self.name, self.param_name, self.m_name, self.r_name)

    def start(self, owner):
        EffectStartEvent(effect=self, owner=owner).post()

    def done(self, owner, time=None):
        EffectDoneEvent(effect=self, owner=owner, time=time).post()

    def modify(self, on, p, m_value, r_value):
        sign = self.sign if on else -self.sign
        original = 1.0 if self.absolute else p.original
        p.current += sign * original * m_value * (1 - r_value)

    def on_update(self, owner, param_name, old_p_value):
        if param_name in self.dependence_list:
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            self.modify(on=False, p=p, m_value=(old_p_value if param_name == self.m_name else m.value),
                        r_value=(old_p_value if param_name == self.r_name else r.value))
            self.modify(on=True, p=p, m_value=m.value, r_value=r.value)

    def on_start(self, owner):
        if self.is_stack or not (self in owner.effects):
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            old_p = p.value
            self.modify(on=True, p=p, m_value=m.value, r_value=r.value)

            for effect in owner.effects:
                effect.on_update(owner=owner, param_name=self.param_name, old_p_value=old_p)

            if self.upd_method is not None:
                method = getattr(owner, self.upd_method)
                if method:
                    method()
            if self.message:
                if owner.owner:
                    self.message(agent=owner.owner, subj=owner, effect=self, is_start=True).post()

        owner.effects.append(self)

    def on_done(self, owner):
        if self not in owner.effects:
            return
        owner.effects.remove(self)
        if self.is_stack or not (self in owner.effects):
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            old_p = p.value
            self.modify(on=False, p=p, m_value=m.value, r_value=r.value)

            for effect in owner.effects:
                effect.on_update(owner=owner, param_name=self.param_name, old_p_value=old_p)

            if self.upd_method is not None:
                method = getattr(owner, self.upd_method)
                if method:
                    method()
            if self.message:
                if owner.owner:
                    self.message(agent=owner.owner, subj=owner, effect=self, is_start=False).post()
