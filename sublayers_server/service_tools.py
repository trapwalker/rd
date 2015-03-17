#!/usr/bin/env python

import logging
log = logging.getLogger(__name__)

import signal
import os


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
