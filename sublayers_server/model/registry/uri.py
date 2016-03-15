# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
import sys

if __name__ == '__main__':
    log.addHandler(logging.StreamHandler(sys.stderr))
    log.level = logging.DEBUG
    
import re
from collections import OrderedDict
from operator import itemgetter
from urllib import splitvalue, quote, unquote
from pprint import pformat


URI_ENCODING = 'utf-8'


class URIFormatError(Exception):
    pass


def splitparams(params_str):
    params = params_str.split('&') if params_str else []
    return tuple([splitvalue(s) for s in params])


class URI(tuple):
    """URI(scheme, storage, path, params, anchor)"""
    __slots__ = ()
    _fields = ('scheme', 'storage', 'path', 'params', 'anchor')

    _RE_URI = re.compile(ur'''
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
        if isinstance(uri, unicode):
            uri = uri.encode(URI_ENCODING)

        # todo: Test to tries to parse URI from non unicode string
            
        m = cls._RE_URI.match(uri)
        if m is None:
            raise URIFormatError('Wrong link format: {!r}'.format(uri))

        d = m.groupdict()
        scheme = d.get('scheme')
        scheme = unquote(scheme).decode(URI_ENCODING) if scheme else scheme

        storage = d.get('storage')
        storage = unquote(storage).decode(URI_ENCODING) if storage else storage

        path = d.get('path', '')
        path = tuple([unquote(s).decode(URI_ENCODING) for s in path.split('/')])  # todo: add tailslash
        assert path[0] == ''
        path = path[1:]
        params = d.get('params', '') or ''
        params = tuple([(unquote(k).decode(URI_ENCODING), unquote(v).decode(URI_ENCODING)) for k, v in splitparams(params)])
        anchor = d.get('anchor', None)
        if anchor:
            anchor = unquote(anchor).decode(URI_ENCODING)
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

    def __unicode__(self):
        return str(self).decode(URI_ENCODING)
        
    def __str__(self):
        scheme, storage, path, params, anchor = self
        try:
            if path:
                path = [quote(s.encode(URI_ENCODING)) for s in path]

            if params:
                params = [
                    '{}{}'.format(
                        quote(k.encode(URI_ENCODING)),
                        '=' + quote(v.encode(URI_ENCODING))
                    ) if v else ''
                    for k, v in params
                ]
                
            return '{scheme}{storage}{path}{params}{anchor}'.format(
                scheme='{}://'.format(scheme.encode(URI_ENCODING)) if scheme else '',
                storage=storage and quote(storage.encode(URI_ENCODING)) or '',
                path=('/' + '/'.join(path)) if path else '',
                params=('?' + '&'.join(params)) if params else '',
                anchor='#{}'.format(quote(anchor.encode(URI_ENCODING))) if anchor is not None else '',
            )
        except UnicodeDecodeError as e:
            e_info = dict(locals())
            del e_info['self']
            log.exception('Uri to string conversion error: %s', pformat(e_info))
            raise e

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

    def match(self, node):
        original = node
        while node and (node.storage is None or node.storage.name != 'registry'):
            node = node.parent
        # log.debug('{} test to {}'.format(node, self))

        if node is None:
            return

        uri = node.uri
        if self[:2] != uri[:2]:
            return False

        p = tuple(self.path)
        if tuple(uri.path[:len(p)]) != p:
            return False

        for k, v in self.params or []:
            if not hasattr(original, k):
                return False

            if k == 'tags':
                v = set(v.split()) if v else set()  # todo: использовать штатный конвертер из строки
                if not v.issubset(set(getattr(original, k))):
                    return False
            else:
                if str(getattr(original, k)) != v:
                    return False

        return True

    scheme = property(itemgetter(0), doc='Scheme of URI')
    storage = property(itemgetter(1), doc='Storage of the resource')
    path = property(itemgetter(2), doc='Path to the resource in storage')
    params = property(itemgetter(3), doc='Params of the link')
    anchor = property(itemgetter(4), doc='Anchor of the link')

    def resolve(self):
        """
        @rtype: Node
        @return: Registry node, resolved by URI
        """
        # todo: declare throwing exceptions: URIFormatError, StorageNotFound
        from sublayers_server.model.registry.tree import Node
        return Node.DISPATCHER[self]  # todo: (!!!!) fix it

    def instantiate(self, storage=None, name=None, **kw):
        # todo: declare exceptions
        params = self.params
        params = params.copy() if params else {}
        params.update(kw)
        proto = self.resolve()
        assert proto.abstract
        return proto.instantiate(storage=storage, name=name, **params)


class Selector(URI):
    @property
    def tags(self):
        splitter = ',' if ',' in self.anchor else None
        return set(self.anchor.split(splitter))

    def match(self, node):
        if not super(Selector, self).match(node):
            return False

        return self.tags.issubset(node.tags)


if __name__ == '__main__':
    from pprint import pprint as pp
    try:
        uri = URI(u'scheme://path/to/the/some/object?x=3&y=4&x=#my anchor')
    except URIFormatError as e:
        print 'fail', e
    else:
        print 'ok', repr(uri)
        pp(uri.asdict().items())

    print repr(URI(scheme='myscheme', path=['1', '2', '3']))
    # todo: unit tests


