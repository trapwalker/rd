#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import re
from collections import OrderedDict
from itertools import chain
from pprint import pprint as pp
import logging
log = logging.getLogger(__name__ if __name__ != '__main__' else None)


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

    @classmethod
    def _to_text(cls, items, key_align=False, key_align_to='<', indent=2, depth=None, _root_tab_size=0):
        from pprint import pformat
        #items = self.items()
        key_width = max((len(k) for k, v in items)) if key_align else 0
        l = []
        for key, value in items:
            value_text = '...'
            if isinstance(value, Obj):
                if depth is None or depth > 1:
                    value_text = value.to_text(key_align=key_align, key_align_to=key_align_to, indent=indent, depth=depth and depth - 1)
            else:
                if depth is None or depth > 1:
                    try:
                        value_text = pformat(value, indent=indent, depth=depth and depth - 1)
                    except Exception as e:
                        log.error(e)
                        value_text = '<error>'

            if '\n' in value_text:
                value_text = u'\n{tab}'.format(tab=' ' * indent).join(value_text.split('\n'))

            l.append(u'{tab}{key:{key_align_to}{key_width}}: {value_text}'.format(tab=' ' * _root_tab_size, **locals()))
        return u'\n'.join(l)

    def to_text(self, *av, **kw):
        return self._to_text(self.items(), *av, **kw)

    def unicode(self):
        return self.to_text(key_align=True)

    def __repr__(self):
        items = self._data.items()
        if self._parent is not None:
            items.append(('_parent', self._parent))

        return u'{self.__class__.__name__}(\n{body}\n)'.format(
            body=self._to_text(items, _root_tab_size=4, indent=4, key_align=True),
            self=self,
        ).encode('utf-8')

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

    def iteritems(self):
        for key in self.keys():
            yield key, self.get(key)

    def items(self):
        return list(self.iteritems())

    def itervalues(self):
        for k, v in self.iteritems():
            yield v

    def values(self):
        return list(self.itervalues())

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

        raise KeyError('Object has not atribute {key}'.format(**locals()))

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
            is_next_folder = True
            for fn in fs:
                yield Obj(
                    _strict=True,
                    path=self.path,
                    rest_path=p,
                    fn=fn,
                    full_file_path=os.path.join(self.path, p, fn),
                    local_dirs=ds,
                    local_files=fs,
                    is_next_folder=is_next_folder,
                )
                is_next_folder = False


def fix_condition():
    conditions = (u'Нов.', u'Свеж.', u'Исп.', u'Изн.', u'Ржав.')
    condition2idx = dict(zip(conditions, [5, 4, 3, 2, 1]))
    conditions_rx = u'|'.join([u'(?:{})'.format(c.replace('.', ur'\.')) for c in conditions])  #ur'(?:Нов\.)|(?:Свеж\.)|(?:Исп\.)|(?:Изн\.)|(?:Ржав\.)'
    r = re.compile(
        ur'''
            ^
            (?P<tab>[ \t]*)
            (?P<name>(?:title)|(?:doc))
            (?P<title_spaces>[ \t]*):[ \t]*
            (?P<cond>{})
            (?P<cond_spaces>[ \t]*)
            (?P<value>
                (?:\"[^\"]*\") | 
                (?:\'[^\']*\') | 
                (?:[^|>#\s][^#\r\n]*?)
            )
            (?P<value_spaces>[ \t]*)
            (?P<comment>\#.*)?
            $
        '''.format(conditions_rx),
        flags=re.MULTILINE | re.UNICODE | re.VERBOSE,
    )

    def repl(match):
        tab, name, title_spaces, cond, cond_spaces, value, value_spaces, comment = match.groups()
        #locals().update(match.groupdict())
        w = len(name) + len(title_spaces)
        cond_name = 'condition'
        cond_text_name = 'condition_text'
        value = value[:1].upper() + value[1:]
        if comment:
            comment = ' ' * (len(cond) + len(cond_spaces) + len(value_spaces)) + comment
        cond_old = cond
        cond = unicode(condition2idx[cond])
        res = (
            u'{tab}{name}{title_spaces}: {value}{comment}'.format(**locals()) +
            (
                (u'\n{tab}{cond_name:<{w}}: {cond}  # {cond_old}').format(**locals()) if name == 'title' else ''
            )
        )
        return res

    #title           : Свеж.
    for ff in FIWalker(r'D:\work\rd\sublayers_world\registry\items\slot_item\armorer_item\weapons'):
        with open(ff.full_file_path) as f:
            s = f.read().decode('utf-8')

        s2, n2 = r.subn(repl, s)
        if n2:
            print n2, s2
            with open(ff.full_file_path, 'w') as f:
                f.write(s2.encode('utf-8'))


if __name__ == '__main__':

    arg = sys.argv[1:]

    #if not arg: arg = [r'a.yaml']

    fix_condition()

    # if arg:
    #     for fname in arg:
    #         print '======', fname
    #         fix_loca(fname)
    # else:
    #     print 'No input files'
