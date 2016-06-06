    # -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)


from tornado.concurrent import return_future
from motorengine import Document
from motorengine.fields import StringField
from motorengine.metaclasses import DocumentMetaClass, classproperty
from motorengine.queryset import QuerySet


class CachebleQuerySet(QuerySet):
    @return_future
    def get(self, id=None, callback=None, alias=None, **kwargs):
        def handler(doc, **kw):
            cache[id] = doc
            return callback(doc, **kw)

        cache = self.__klass__._objects_cache
        obj = id and cache.get(id)
        if obj is None:
            super(CachebleQuerySet, self).get(id=id, callback=handler, alias=alias, **kwargs)
        else:
            callback(obj)

    def save(self, document, callback, alias=None, upsert=False):
        def handler(doc, **kw):
            cache[doc._id] = doc
            return callback(doc, **kw)

        cache = self.__klass__._objects_cache
        super(CachebleQuerySet, self).save(document=document, callback=handler, alias=alias, upsert=upsert)


class NodeMeta(DocumentMetaClass):
    _classes = {}
    _objects_cache = {}
    def __new__(cls, name, bases, attrs):
        new_class = super(NodeMeta, cls).__new__(cls, name, bases, attrs)
        cls._classes[name] = new_class
        setattr(new_class, 'objects', classproperty(lambda *args, **kw: CachebleQuerySet(new_class)))

        setattr(new_class, '__lazy__', False)
        setattr(new_class, '__collection__', 'registry')

        return new_class

    def get_class(cls, name):
        return cls._classes.get(name)


class AbstractDocument(Document):
    __metaclass__ = NodeMeta
    __classes__ = {}
    __cls__ = StringField()

    @classmethod
    def get_global_class_name(cls):
        return cls.__name__  # todo: add module importing path

    def __init__(self, **kw):
        kw.setdefault('__cls__', self.get_global_class_name())
        super(AbstractDocument, self).__init__(**kw)

    @classmethod
    def from_son(cls, dic, _is_partly_loaded=False, _reference_loaded_fields=None):
        klass_name = dic.get('__cls__')
        klass = cls.get_class(klass_name) if klass_name else cls  # tpdp: add warning if class not found

        if cls is klass:
            return super(AbstractDocument, cls).from_son(dic, _is_partly_loaded=False, _reference_loaded_fields=None)
        else:
            return klass.from_son(dic, _is_partly_loaded=False, _reference_loaded_fields=None)

    def __repr__(self):
        return '{self.__class__.__name__}(\n{params})'.format(
            self=self,
            params=''.join(['\t{}={!r},\n'.format(k, v) for k, v in sorted(self.to_son().items() + [('_id', self._id)])]),
        )
