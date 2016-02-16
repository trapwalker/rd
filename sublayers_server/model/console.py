# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import functools
from itertools import chain
from collections import Iterable
import re


class StreamHub(object):
    # todo: move to tools module
    def __init__(self, *av):
        # todo: optional weak reference to streams
        # todo: reading methods
        self.streams = []
        for stream in av:
            if hasattr(stream, 'write'):
                self.streams.append(stream)
            elif isinstance(stream, Iterable):
                self.streams.extend(stream)
            else:
                raise TypeError('Wrong type of stream or stream list.')

    def write(self, text):
        # todo: closed streams
        for stream in self.streams:
            stream.write(text)

    def writelines(self,lines):
        for line in lines:
            self.write(line)

    def close(self):
        self.streams = []


class LogStream(object):
    def __init__(self, logger=None, level=logging.INFO):
        self.logger = logger or log
        self.level = level

    def write(self, text):
        self.logger.log(self.level, text)


class ConsoleError(Exception):
    pass


class UnknownConsoleCommandError(ConsoleError):
    pass


class ConsoleCommandExecutionError(ConsoleError):
    pass


class Console(object):
    def __init__(self, agent_api):
        self.agent_api = agent_api
        self.stream_out = StreamHub(LogStream())  # todo: add AgentLogStream

    _RE_PARAMS = re.compile(r'''
        (?:
            "[^"]*?"|
            '[^']*?'|
            [^'"]\S+
        )\s
    ''', flags=re.X)

    _RE_KW_PARAM = re.compile(r'''
        ([_a-zA-Z]\w*)=(
            "[^"]*?"|
            '[^']*?'|
            [^'"]\S+
        )
    ''', flags=re.X)


    def _call_fmt(self, cmd, av, kw):
        return u'{}({})'.format(cmd, u', '.join(chain(
            map(repr, av),
            (u'{k}={v!r}'.format(k=k, v=v) for k, v in kw.items())
        )))

    def on_cmd(self, cmdline):
        cmd, params = cmdline.split(' ', 1)
        params += ' '  # todo: refactor this hack
        av = []
        kw = {}
        for p in self._RE_PARAMS.findall(params):
            p = p.strip()
            m = self._RE_KW_PARAM.match(p)
            if m:
                k, v = m.groups()
                kw[k] = v  # todo: type cast
            else:
                av.append(p)  # todo: type cast

        self.stream_out.write(u'CALL: {}'.format(self._call_fmt(cmd, av, kw)))
        try:
            result = self.on_call(cmd, *av, **kw)
            self.stream_out.write(u'RESULT: {!r}'.format(result))  # todo: pformat
        except ConsoleCommandExecutionError as e:
            self.stream_out.write(u'ERROR: {!r}'.format(e))  # todo: pformat
        except Exception as e:
            log.exception(repr(e))
            raise e

    def on_call(self, f, *av, **kw):
        func = getattr(self, f, None)
        if func is None:
            raise UnknownConsoleCommandError('Unknown console command "{}"'.format(f))
        # todo: test to valid console function
        try:
            return func(*av, **kw)
        except Exception as e:
            raise ConsoleCommandExecutionError('{}: {}'.format(e.__class__.__name__, e.message))

    def test(self, *av, **kw):
        self.stream_out.write('test done')
        print av, kw


def command_deco(func):
    def closure(*av, **kw):
        return func(*av, **kw)

    functools.update_wrapper(closure, func)
    return closure


class Shell(object):
    def __init__(self, global_context, local_context=None):
        self.global_context = global_context
        self.local_context = local_context or {}
        self.local_context.update(
            CON=self,
            __name__="__console__",
            __doc__=None,
        )

    def run(self, cmd):
        exec cmd in self.global_context, self.local_context


if __name__ == '__main__':
    con = Console(None)
    con.on_cmd('test asd fgh asddd')
