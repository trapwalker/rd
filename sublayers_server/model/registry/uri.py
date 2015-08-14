# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import re
from collections import OrderedDict
from operator import itemgetter
from urllib import splitvalue


class URIFormatError(Exception):
    pass


def splitparams(params_str):
    params = params_str.split('&') if params_str else []
    return [splitvalue(s) for s in params]


class URI(tuple):
    """URI(scheme, storage, path, params, anchor)"""
    __slots__ = ()
    _fields = ('scheme', 'storage', 'path', 'params', 'anchor')

    _RE_URI = re.compile(r'''
        ^
        (?:(?P<scheme>\w+)://)?
        (?P<storage>[^/]+)?
        (?P<path>(?:/[^\?#]+)*)
        (?P<tail_slash>/)?
        (?:\?(?P<params>[^#]*))?
        (?:\#(?P<anchor>.*))?
        $
    ''', re.X)

    @classmethod
    def parse_uri(cls, uri):
        """Parse uri like 'scheme://path/to/the/some/object'
        and return tuple like: ('scheme', ['path', 'to', 'the', 'some', 'object'])
        """
        # todo: url decoding
        m = cls._RE_URI.match(uri)
        if m is None:
            raise URIFormatError('Wrong link format: "{}"'.format(uri))

        d = m.groupdict()
        scheme = d.get('scheme')
        storage = d.get('storage')
        path = d.get('path', '')
        path = path.split('/')  # todo: add tailslash
        assert path[0] == ''
        path = path[1:]
        params = d.get('params', '') or ''
        params = splitparams(params)
        anchor = d.get('anchor', None)
        return scheme, storage, path, params, anchor

    def __new__(cls, scheme=None, storage=None, path=None, params=None, anchor=None):
        """Create new instance of URI(scheme, storage, path, params, anchor)"""
        if scheme is not None and storage is None and path is None and isinstance(scheme, basestring):
            # полагаем что в scheme передан весь uri в виде строки
            _scheme, _storage, _path, _params, _anchor = cls.parse_uri(scheme)  # парсим его
            if anchor:  # если отдельным аргументом передан якорь, то заменяем им тот, что, возможно, был в uri
                _anchor = anchor
            if params:  # добавляем переданные отдельным аргументом параметры к тем, что были в uri
                if isinstance(params, basestring):
                    params = splitparams(params)
                _params += params
        elif path is None:
            raise URIFormatError('Link path is not specified')
        else:
            _scheme, _storage, _path, _params, _anchor = scheme, storage, path, params, anchor

        return tuple.__new__(cls, (_scheme, _storage, _path, _params, _anchor))

    def __str__(self):
        # todo: url encoding
        scheme, storage, path, params, anchor = self
        return '{scheme}{storage}{path}{params}{anchor}'.format(
            scheme='{}://'.format(scheme) if scheme else '',
            storage=storage or '',
            path=('/' + '/'.join(path)) if path else '',
            params=('?' + '&'.join(('{}{}'.format(k, ('=' + v) if v else '') for k, v in params))) if params else '',
            anchor='#{}'.format(anchor) if anchor is not None else '',
        )

    @classmethod
    def _make(cls, iterable, new=tuple.__new__, len=len):
        """Make a new URI object from a sequence or iterable"""
        result = new(cls, iterable)
        if len(result) != 5:
            raise TypeError('Expected 5 arguments, got %d' % len(result))
        return result

    def __repr__(self):
        """Return a nicely formatted representation string"""
        return 'URI({})'.format(repr(str(self)))  # todo: unicode?

    def asdict(self):
        """Return a new OrderedDict which maps field names to their values"""
        return OrderedDict(zip(self._fields, self))

    def replace(self, **kwds):
        """Return a new URI object replacing specified fields with new values"""
        result = self._make(map(kwds.pop, ('scheme', 'storage', 'path', 'params', 'anchor'), self))
        if kwds:
            raise ValueError('Got unexpected field names: %r' % kwds.keys())
        return result

    def __getnewargs__(self):
        """Return self as a plain tuple.  Used by copy and pickle."""
        return str(self),

    __dict__ = property(asdict)

    def __getstate__(self):
        """Exclude the OrderedDict from pickling"""
        pass

    scheme = property(itemgetter(0), doc='Scheme of URI')
    storage = property(itemgetter(1), doc='Storage of the resource')
    path = property(itemgetter(2), doc='Path to the resource in storage')
    params = property(itemgetter(3), doc='Params of the link')
    anchor = property(itemgetter(4), doc='Anchor of the link')


if __name__ == '__main__':
    from pprint import pprint as pp
    try:
        uri = URI('scheme://path/to/the/some/object?x=3&y=4&x=#my anchor')
    except URIFormatError as e:
        print 'fail', e
    else:
        print 'ok', repr(uri)
        pp(uri.asdict().items())

    print repr(URI(scheme='myscheme', path=['1', '2', '3']))
    # todo: unit tests
