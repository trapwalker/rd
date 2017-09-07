#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import re
from collections import OrderedDict
from itertools import chain
from pprint import pprint as pp


def fix_loca(fn):
    attr_names = 'title description caption'.split()
    attr_names_rx = u'|'.join([u'(?:{})'.format(aname) for aname in attr_names])

    r = re.compile(r"""
	    ^
        (?P<payload>
          (?P<tab>[ \t]*)  
          (?P<name>{attr_names_rx}) [ \t]*:[ \t]*
          (?P<value>
            (?:\"[^\"]*\") | 
            (?:\'[^\']*\') | 
            (?:[^|>#\s][^#\r\n]*?)
           )[ \t]*
        )
        (?P<comment>\#.*)?
	    $
	""".format(**locals()), flags=re.MULTILINE | re.UNICODE | re.VERBOSE)

    def repl(match):
        payload, tab, name, value, comment = match.groups()
        #locals().update(match.groupdict())
        w = len(payload) - len(name) - 2
        comment_tab = ' ' * w if comment else ''
        comment = comment or ''
        todo_en = '  #TODO: ##LOCALIZATION' if any(map(lambda c: ord(c) > 127, value)) else ''
        todo_ru = '  #TODO: ##LOCALIZATION' if all(map(lambda c: ord(c) < 127, value)) else ''
        return (
            u'{tab}{name}: {comment_tab}{comment}\n'
            u'{tab}    en: {value}{todo_en}\n'
            u'{tab}    ru: {value}{todo_ru}\n'
        ).format(**locals())

    with open(fn) as f:
        s = f.read().decode('utf-8')
        s2, n2 = r.subn(repl, s)
        #print s
        print '#### total replaced:', n2
        s3, n3 = r.subn(repl, s2)
        assert n3 == 0, 'Double replace occured'

    # with open(fn + '.old', 'w') as f:
    #     f.write(s.encode('utf-8'))

    if n2:
        with open(
            fn
            #+ '.new'
            , 'w'
        ) as f:
            f.write(s2.encode('utf-8'))

    globals().update(**locals())



class Obj(object):
    def __init__(self, _strict=False, _parent=None, *av, **kw):
        self._parent = _parent
        self._data = OrderedDict(*av, **kw)
        self._strict = _strict

    def keys(self):
        data = self._data
        parent = self._parent
        if parent:
            keys = parent.keys()
            keyset = frozenset(keys)
            keys.extend((key for key in data.keys() if key not in keyset))
            return keys
        else:
            return data.keys()

    def __iter__(self):
        iter(self.keys())

    def inherit(self, **kw):
        kw.setdefault('_strict', self._strict)
        return self.__class__(_parent=self, **kw)

    def __contains__(self, item):
        data = self._data
        if item in data:
            return True

        parent = self._parent
        if parent and item in parent:
            return True

        return False

    def get(self, key, *default):
        data = self._data
        parent = self._parent

        if key in data:
            return data.get(key)

        if parent and key in parent:
            return parent.get(key)

        if default:
            return default[0]

        if not self._strict:
            return None

        raise KeyError('Object has not atribute {item}'.format(**locals()))

    def __getattr__(self, item):
        if item in ('_parent', '_data', '_strict',):
            return super(Obj, self).__getattr__(item)

        return self.get(item)

    def __setattr__(self, key, value):
        if key in ('_parent', '_data', '_strict',):
            return super(Obj, self).__setattr__(key, value)

        self._data[key] = value

    def __delattr__(self, item):
        del(self._data[item])


class FileIterator(object):
    def __iter__(self):
        return NotImplemented()


class FIWalker(FileIterator):
    def __init__(self, path):
        self.path = path

    def __iter__(self):
        for p, ds, fs in os.walk(self.path):
            pass



if __name__ == '__main__':

    arg = sys.argv[1:]

    #if not arg: arg = [r'a.yaml']
    o = Obj(x=3, y=5)
    print o.x

    if arg:
        for fname in arg:
            print '======', fname
            fix_loca(fname)
    else:
        print 'No input files'
