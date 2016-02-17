# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import functools
from itertools import chain
from collections import Iterable
import re

# todo: add AgentLogStream


class StreamHub(list):
    # todo: move to tools module
    # todo: optional weak reference to streams
    # todo: reading methods
    def __init__(self, *av):
        super(StreamHub, self).__init__()
        self.add(av)

    def add(self, stream):
        if hasattr(stream, 'write'):
            self.append(stream)
        elif isinstance(stream, Iterable):
            for substream in stream:
                self.add(substream)
        else:
            raise TypeError('Wrong type of stream or stream list.')

    def write(self, text):
        # todo: closed streams
        for stream in self:
            stream.write(text)

    def writelines(self,lines):
        for line in lines:
            self.write(line)

    def close(self):
        while self:
            self.pop()


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


class NameSpace(object):
    def __init__(self, **kw):
        self.update_scope(**kw)

    def update_scope(self, **kw):
        self.__dict__.update(kw)


class NSTest(NameSpace):
    def test(self, *av, **kw):
        if hasattr(self, write):
            self.write('test done\n')
        return av, kw, '.'


class Console(object):
    def __init__(self, root=None, stream=None, stream_log=None):
        self.stream_log = stream_log or LogStream()
        self.stream_out = stream or self.stream_log
        self.root = root or NSTest(write=self.stream_out.write)

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

        self.stream_log.write(u'CALL: {}\n'.format(self._call_fmt(cmd, av, kw)))
        try:
            result = self.on_call(cmd, *av, **kw)
            self.stream_log.write(u'RESULT: {!r}\n'.format(result))  # todo: pformat
        except ConsoleCommandExecutionError as e:
            self.stream_log.write(u'ERROR: {!r}\n'.format(e))  # todo: pformat
        except Exception as e:
            log.exception(repr(e))
            raise e

    def on_call(self, f, *av, **kw):
        func = getattr(self.root, f, None)
        if func is None:
            raise UnknownConsoleCommandError('Unknown console command "{}"'.format(f))
        # todo: test to valid console function
        try:
            return func(*av, **kw)
        except Exception as e:
            raise ConsoleCommandExecutionError('{}: {}'.format(e.__class__.__name__, e.message))


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
    import sys

    class NSTest2(NameSpace):
        def test2(self, *av, **kw):
            self.write('test2 done\n')
            raise Exception('qqq')
            print 'qwe'
            return av, kw, '.2'

    con = Console(root=NSTest2(), stream_log=sys.stderr)
    con.root.write = sys.stdout.write
    con.on_cmd('test2 asd fgh asddd')
