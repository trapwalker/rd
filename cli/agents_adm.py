# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry_me.tree import get_global_registry, GRLPC, RegistryNodeIsNotFound
from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_common.user_profile import User

from ctx_timer import Timer
from collections import Counter
from pprint import pformat
from mongoengine import Q


class Select(object):

    def __init__(
            self,
            cls=Agent,
            reg = None,
            world_path=None, reg_reload=False,
            skip=0, limit=None, fltr=None, fixup=False, wipe_unsolved=False,
            progress_callback=None,
            raw_only=False,
    ):
        self.cls = Agent
        self.world_path = world_path
        self.reg_reload = reg_reload
        self.skip = skip
        self.limit = limit
        self.filter = fltr
        self.qs = None
        self.stat = stat = Counter()
        self.reg = reg
        self.fixup = fixup
        self._count = None
        self.wipe_unsolved = wipe_unsolved
        self.progress_callback = progress_callback
        self.raw_only = raw_only

        assert not (raw_only and (fixup or wipe_unsolved)), "You can't `fixup` or `wipe_unsolved` if `raw_only`: \т{}".format(
            pformat(locals()),
        )

        if world_path is not None and reg is None or reg_reload:
            self.reg = reg = get_global_registry(path=world_path, reload=reg_reload, save_loaded=False)
        stat['1. TOTAL'] = cls.objects.count()
        qs = cls.objects.as_pymongo()

        if skip:
            qs = qs.skip(skip)

        if limit:
            qs = qs.limit(limit)

        if fltr:
            query = eval(fltr, dict(Q=Q,))
            qs = qs.filter(query)
            log.debug('QUERY: {}'.format(qs._query))

        self.qs = qs

    def __iter__(self):
        i = self.skip or 0
        stat = self.stat
        fixup = self.fixup
        wipe_unsolved = self.wipe_unsolved
        progress_callback = self.progress_callback
        cls = self.cls
        raw_only = self.raw_only

        while True:
            try:
                a_raw = self.qs.next()
                stat['2. Processed'] += 1
            except StopIteration:
                break

            flags = 'Q' if a_raw['quick_flag'] else 'B'
            login = a_raw.get('login', '--- UNDEFINED --- ' + str(a_raw.get('_id')))

            a, problems, e = None, None, None
            t_save = None
            fixed = False
            deleted_count = 0
            wipe_try = False

            try:
                a = None
                if not raw_only:
                    with GRLPC as problems:
                        a = cls._from_son(a_raw)
                        stat['3. Loaded'] += 1

                    if problems:
                        stat['4. Need to FIX'] += 1
                        if fixup:
                            a._created = True
                            with Timer() as t_save:
                                a.save()
                                fixed = True
                                stat['5. FIXED'] += 1
                yield i, a_raw, a

            except RegistryNodeIsNotFound as e:
                stat['6. Need to delete'] += 1
                if wipe_unsolved:
                    wipe_try = True
                    deleted_count = Agent.objects.filter(pk=a_raw['_id']).delete()
                    stat['7. Delete try'] += 1
                    stat['8. Deleted'] += deleted_count

            if e:
                wipe_res = '{deleted_count:3}'.format(**locals()) if wipe_try else '---'
                res = 'WIPE: {wipe_res}: {e}'.format(**locals())
            else:
                if problems:
                    problems_count = int(problems) if problems is not None else '--'
                    res = 'FIX {problems_count:2} {fix_text}'.format(fix_text='DONE' if fixed else 'need', **locals())
                else:
                    res = ''

            if progress_callback:
                progress_callback(select=self, i=i, status=res)

            i += 1

    @property
    def count(self):
        if self._count is None:
            self._count = self.qs.count()
        return self._count
