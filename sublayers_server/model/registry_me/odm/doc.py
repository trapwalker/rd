# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.odm.meta import NodeMeta
from sublayers_server.model.registry.odm.fields import StringField, ListField, ReferenceField, EmbeddedDocumentField

from motorengine import Document
from motorengine.errors import InvalidDocumentError
from tornado.concurrent import return_future
from bson import ObjectId
from collections import Counter

if __debug__:
    _call_stat = Counter()


class AbstractDocument(Document):
    __metaclass__ = NodeMeta

    def to_cache(self):
        for key in self.__class__.key_fields | {'_id'}:
            value = self._values.get(key, None)
            if value is not None:
                self.__class__.objects_cache[(key, value)] = self

    def un_cache(self):
        for key in self.__class__.key_fields | {'_id'}:
            value = self._values.get(key, None)
            if value is not None:
                self.__class__.objects_cache.pop((key, value), None)

    @classmethod
    def clean_from_cache(cls, **kw):
        for key_name in set(kw.keys()) & cls.key_fields:
            key = kw[key_name]
            if key:
                cls.objects_cache.pop((key_name, key), None)

    @classmethod
    def search_in_cache(cls, **kw):
        for key_name in set(kw.keys()) & cls.key_fields:
            key = kw[key_name]
            if key:
                obj = cls.objects_cache.get((key_name, key))
                if obj:
                    return obj

    @classmethod
    def from_son(cls, dic, _is_partly_loaded=False, _reference_loaded_fields=None):
        if isinstance(dic, basestring):
            return dic  # todo: may be add async loading task to eventloop?
        doc = cls.search_in_cache(**dic)
        if doc:
            return doc

        klass_name = dic.get('__cls__')
        # if not klass_name:
        #     log.warning('ODM object class is not declared while %s loading of %r', cls, dic)
        klass = cls.get_class(klass_name) if klass_name else cls
        # todo: Падать при инициализации, игнорировать с предупреждениями в процессе
        assert klass, 'Registry class {!r} is not found.'.format(klass_name)
        if cls is klass:
            doc = super(AbstractDocument, cls).from_son(dic, _is_partly_loaded=False, _reference_loaded_fields=None)
            doc.to_cache()
        else:
            doc = klass.from_son(dic, _is_partly_loaded=False, _reference_loaded_fields=None)
        return doc

    def __repr__(self):
        return '{self.__class__.__name__}(\n{params})'.format(
            self=self,
            params=''.join([
                '\t{}={!r},\n'.format(k, v)
                for k, v in sorted(self.to_son().items() + [('_id', self._id)])
            ]),
        )
