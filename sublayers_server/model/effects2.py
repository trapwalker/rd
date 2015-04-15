# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event


class EffectStartEvent2(Event):
    def __init__(self, effect, owner, **kw):
        assert effect
        super(EffectStartEvent2, self).__init__(server=effect.owner.server, **kw)
        self.effect = effect
        self.owner = owner

    def on_perform(self):
        super(EffectStartEvent2, self).on_perform()
        if not self.owner.limbo:
            self.effect.on_start(owner=self.owner)
        else:
            self.effect.on_done(owner=self.owner)


class EffectDoneEvent2(Event):
    def __init__(self, effect, owner, **kw):
        assert effect
        super(EffectDoneEvent2, self).__init__(server=effect.owner.server, **kw)
        self.effect = effect
        self.owner = owner

    def on_perform(self):
        super(EffectDoneEvent2, self).on_perform()
        self.effect.on_done(owner=self.owner)


class Effect2(object):
    def __init__(self, param_name, m_name, r_name, upd_method):
        super(Effect2, self).__init__()
        self.param_name = param_name
        self.m_name = m_name
        self.r_name = r_name
        self.upd_method = upd_method
        self.dependence_list = [m_name, r_name]

    def start(self, owner):
        EffectStartEvent2(effect=self, owner=owner).post()

    def done(self, owner, time=None):
        EffectDoneEvent2(effect=self, owner=owner, time=time).post()

    def on_update(self, owner, param_name, old_p_value):
        if param_name in self.dependence_list:
            p = owner.parametrs.get(self.param_name)
            m = owner.parametrs.get(self.m_name)
            r = owner.parametrs.get(self.r_name)

            p.current -= p.original * (old_p_value if param_name == self.m_name else m.value) * \
                         (1 - (old_p_value if param_name == self.r_name else r.value))
            p.current += p.original * m.value * (1 - r.value)

    def on_start(self, owner):
        p = owner.parametrs.get(self.param_name)
        m = owner.parametrs.get(self.m_name)
        r = owner.parametrs.get(self.r_name)

        old_p = p.value
        p.current += p.original * m.value * (1 - r.value)

        for effect in owner.effects:  # todo: нужно ли проверять, что эффект не является сам собой
            effect.on_update(owner=owner, param_name=self.param_name, old_p_value=old_p)

        # getattr(owner, self.upd_method)()

        owner.effects.append(self)

    def on_done(self, owner):
        owner.effects.remove(self)
        p = owner.parametrs.get(self.param_name)
        m = owner.parametrs.get(self.m_name)
        r = owner.parametrs.get(self.r_name)

        old_p = p.value
        p.current -= p.original * m.value * (1 - r.value)

        for effect in owner.effects:  # todo: нужно ли проверять, что эффект не является сам собой
            effect.on_update(owner=owner, param_name=self.param_name, old_p_value=old_p)

        # getattr(owner, self.upd_method)()
