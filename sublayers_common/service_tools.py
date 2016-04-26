#!/usr/bin/env python

import logging
log = logging.getLogger(__name__)

import signal
import os
import re


def set_terminate_handler(callback):
    def on_exit(sig, func=None):
        print '====== terminate', sig, func
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


class HGRevision(object):
    # todo: exceptions
    rev_parser = re.compile("([0-9a-f]+)(\+?)\s(\d+)(\+?)\s(.*)")
    # 7f9c68086b3e+ 1815+ website
    def __init__(self):
        with os.popen('hg id -ibn') as f:
            raw = f.read().rstrip('\n')

        h, hp, n, np, b = self.rev_parser.match(raw).groups()
        self.hash = h
        self.num = int(n)
        self.branch = b
        self.is_changed = bool(hp or np)

    def __str__(self):
        return '{self.branch}:{self.num} [{self.hash}{cf}]'.format(self=self, cf='+' if self.is_changed else '')


class HGVersion(object):
    @staticmethod
    def get_branche_size(branche):
        with os.popen('hg log -b {} | grep changeset | wc -l'.format(branche)) as f:
            return f.read().rstrip('\n')
    
    def __init__(self):
        self.main = '0'
        self.release = self.get_branche_size('release')
        self.default = self.get_branche_size('default')

    def __str__(self):
        return '{self.main}.{self.release}.{self.default}'.format(self=self)


if __name__ == '__main__':
    print 'version =', HGVersion()
    print 'revision = ', HGRevision()
