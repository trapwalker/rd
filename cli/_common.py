# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_common.user_profile import User

from sublayers_common.ctx_timer import Timer


def agents_clean():
    with Timer() as tm:
        deleted_agents_count = Agent.objects.all().delete()
        log.info('All stored agents deleted: %s (%.3fs)', deleted_agents_count, tm.duration)


def profiles_reset():
    with Timer() as tm:
        res = User.objects.update(registration_status="nickname")
        log.info('All profiles reset to 2-nd registration step: %s (%.3fs)', res, tm.duration)


def save_to_file(registry, dest):
    try:
        with Timer() as tmr:
            registry.save_to_file(dest)
            log.info('Registry saved to file {.name} ({:.3f}s)'.format(dest, tmr.duration))
    except Exception as e:
        log.error("Can't save registry to file {!r}: {}".format(dest, e))
