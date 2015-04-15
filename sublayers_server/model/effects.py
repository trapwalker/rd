# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event

def get_effects(server):
    Effect(server=server, name='EffectWood', param_name, m_name, r_name, upd_method, sign=-1.0, is_stack=False)


class EffectStartEvent(Event):
    def __init__(self, effect, owner, **kw):
        assert effect
        super(EffectStartEvent, self).__init__(server=effect.owner.server, **kw)
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
        super(EffectDoneEvent, self).__init__(server=effect.owner.server, **kw)
        self.effect = effect
        self.owner = owner

    def on_perform(self):
        super(EffectDoneEvent, self).on_perform()
        self.effect.on_done(owner=self.owner)


class Effect(object):
    def __init__(self, server, name, param_name, m_name, r_name, upd_method, sign=-1.0, is_stack=False):
        super(Effect, self).__init__()
        self.name = name
        self.sign = sign
        self.is_stack = is_stack
        self.param_name = param_name
        self.m_name = m_name
        self.r_name = r_name
        self.upd_method = upd_method
        self.dependence_list = [m_name, r_name]
        server.effects.update({name: self})

    def start(self, owner):
        EffectStartEvent(effect=self, owner=owner).post()

    def done(self, owner, time=None):
        EffectDoneEvent(effect=self, owner=owner, time=time).post()

    def on_update(self, owner, param_name, old_p_value):
        if param_name in self.dependence_list:
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            p.current -= self.sign * p.original * (old_p_value if param_name == self.m_name else m.value) * \
                         (1 - (old_p_value if param_name == self.r_name else r.value))
            p.current += self.sign * p.original * m.value * (1 - r.value)

    def on_start(self, owner):
        if self.is_stack or not (self in owner.effects):
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            old_p = p.value
            p.current += self.sign * p.original * m.value * (1 - r.value)

            for effect in owner.effects:
                effect.on_update(owner=owner, param_name=self.param_name, old_p_value=old_p)

            getattr(owner, self.upd_method)()

        owner.effects.append(self)

    def on_done(self, owner):
        if not self in owner.effects:
            return
        owner.effects.remove(self)
        if self.is_stack or not (self in owner.effects):
            p = owner.params.get(self.param_name)
            m = owner.params.get(self.m_name)
            r = owner.params.get(self.r_name)
            assert p and m and r
            old_p = p.value
            p.current -= self.sign * p.original * m.value * (1 - r.value)

            for effect in owner.effects:
                effect.on_update(owner=owner, param_name=self.param_name, old_p_value=old_p)

            getattr(owner, self.upd_method)()
