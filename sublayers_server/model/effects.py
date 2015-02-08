# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import events


class EffectStartEvent(events.Event):
    def __init__(self, effect, **kw):
        assert effect
        super(EffectStartEvent, self).__init__(server=effect.owner.server, **kw)
        self.effect = effect

    def on_perform(self):
        super(EffectStartEvent, self).on_perform()
        if not self.effect.owner.limbo:
            self.effect.on_start(self)
        else:
            self.effect.on_done(self)


class EffectDoneEvent(events.Event):
    def __init__(self, effect, **kw):
        assert effect
        super(EffectDoneEvent, self).__init__(server=effect.owner.server, **kw)
        self.effect = effect

    def on_perform(self):
        super(EffectDoneEvent, self).on_perform()
        self.effect.on_done(self)


class Effect(object):
    def __init__(self, owner):
        super(Effect, self).__init__()
        self.owner = owner
        self.actual = False

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        return dict(
            cls=self.classname,
        )

    def start(self):
        EffectStartEvent(effect=self).post()

    def done(self, time=None):
        if self.actual:
            EffectDoneEvent(effect=self, time=time).post()

    def on_start(self, event):
        self.owner.effects.append(self)
        self.actual = True

    def on_done(self, event):
        if self in self.owner.effects:
            self.owner.effects.remove(self)

    # todo: пока будет здесь! Вомзожно переедет в другой класс
    def _cancel_effects(self):
        do_diff = True
        for effect in self.owner.effects:
            if effect != self and isinstance(effect, self.__class__) and effect.actual:
                effect.actual = False
                do_diff = False
        return do_diff