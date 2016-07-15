# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from tornado.concurrent import return_future
import tornado.ioloop
from motorengine.queryset import QuerySet

from sublayers_server.model.registry.uri import URI


class CachebleQuerySet(QuerySet):
    @return_future
    def get(self, id=None, callback=None, alias=None, **kwargs):
        # handler = callback
        def handler(doc, **kw):
            if doc is not None:
                doc.to_cache()
            return callback(doc, **kw)

        if URI.try_or_default(id):  # В качестве идентификатора может быть подан URI и тогда поиск будет вестись по нему
            # todo: (!) clean uri params
            kwargs['uri'] = id
            id = None

        if id:
            kwargs['id'] = id

        obj = self.__klass__.search_in_cache(**kwargs)
        if obj is None:
            super(CachebleQuerySet, self).get(callback=handler, alias=alias, **kwargs)
        else:
            #obj.load_references(callback=lambda _: None)  # todo: optimize? При взятии из кеша происходит перезагрузка ссылок
            tornado.ioloop.IOLoop.instance().add_callback(callback, obj)

    def save(self, document, callback, alias=None, upsert=False):
        def handler(doc, **kw):
            doc.to_cache()
            return callback(doc, **kw)

        super(CachebleQuerySet, self).save(document=document, callback=handler, alias=alias, upsert=upsert)
