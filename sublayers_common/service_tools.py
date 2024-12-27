#!/usr/bin/env python

import sys
import logging
log = logging.getLogger(__name__)

from collections import namedtuple
import subprocess
import signal
import os
import re


def set_terminate_handler(callback):
    def on_exit(sig, func=None):
        print('====== terminate', sig, func)
        log.debug('====== exit handler triggered')
        callback()

    signal.signal(signal.SIGTERM, on_exit)
    #signal.signal(signal.SIGINT, on_exit)


def pidfile_save(filename):
    pid = os.getpid()
    log.info('Service started with PID=%s', pid)
    if filename:
        try:
            with open(filename, 'w') as f_pid:
                f_pid.write(str(pid))
        except Exception as e:
            log.error("[FAIL] Can't store PID into the file '%s': %s", filename, e)
        else:
            log.info("[DONE] PID stored into the file '%s'", filename)


class RevisionGettingError(Exception):
    pass


def run(cmd):
    encoding = sys.getfilesystemencoding()
    cmd = [word.encode(encoding) if isinstance(word, unicode) else word for word in cmd]
    data = subprocess.check_output(cmd, shell=os.name == "nt").decode(encoding)
    return data.strip()
    

HGRevisionCls = namedtuple('HGRevisionCls', 'hash num branch is_changed')

class HGRevision(HGRevisionCls):
    # todo: exceptions
    _rev_parser = re.compile("([0-9a-f]+)(\+?)\s(\d+)(\+?)\s(.*)")
    # 7f9c68086b3e+ 1815+ website
    def __new__(cls, path=None):
        cmd = ['hg', 'id', '-ibn'] + (['-R', path] if path else [])
        try:
            raw = run(cmd)
        except subprocess.CalledProcessError as e:
            raise RevisionGettingError(e)

        m = cls._rev_parser.match(raw)
        if m is None:
            RevisionGettingError('Wrong revision format: {!r}'.format(raw))

        h, hp, n, np, b = m.groups()
        return HGRevisionCls.__new__(cls, h, int(n), b, bool(hp or np))

    def __repr__(self):
        return (
            '{self.__class__.__name__}('
            'hash={self.hash!r}, '
            'num={self.num!r}, '
            'branch={self.branch!r}, '
            'is_changed={self.is_changed!r})'
        ).format(self=self)

    def __str__(self):
        return '{self.branch}:{self.num} [{self.hash}{cf}]'.format(self=self, cf='+' if self.is_changed else '')


HGVersionCls = namedtuple('HGVersionCls', 'main release default')


class HGVersion(HGVersionCls):
    @staticmethod
    def get_branche_size(branche, path=None):
        cmd = (
            ['hg', 'log'] + (['-R', path] if path else []) + ['-b', branche,]
            #+ ['|', 'grep', 'changeset',] +
            #+ ['|', 'wc', '-l']
        )
        try:
            return len(run(cmd).strip('\n').split('\n\n'))
        except subprocess.CalledProcessError as e:
            raise RevisionGettingError(e)

    def __new__(cls, path=None):
        return HGVersionCls.__new__(
            cls,
            '0',
            cls.get_branche_size('release', path=path),
            cls.get_branche_size('default', path=path),
        )

    def __str__(self):
        return '{self.main}.{self.release}.{self.default}'.format(self=self)


if __name__ == '__main__':
    log = logging.getLogger()
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

    import ctx_timer
    with ctx_timer.Timer(log_start=None):
        print('version =', HGVersion())

    with ctx_timer.Timer(log_start=None):        
        print('revision =', end='')
        r = HGRevision()
        print(r)
