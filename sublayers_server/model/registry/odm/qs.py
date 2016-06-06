# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from tornado.concurrent import return_future
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
