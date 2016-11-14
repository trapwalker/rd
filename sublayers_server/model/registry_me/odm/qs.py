﻿# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from tornado.concurrent import return_future
import tornado.ioloop
from motorengine.queryset import QuerySet

from sublayers_server.model.registry.uri import URI


class CachebleQuerySet(QuerySet):
    def get_cached(self, id=None, default=None, raise_unfounded=True, **kwargs):
        if URI.try_or_default(id):  # В качестве идентификатора может быть подан URI и тогда поиск будет вестись по нему
            # todo: (!) clean uri params
            kwargs['uri'] = id
            id = None

        if id:
            kwargs['id'] = id

        result = self.__klass__.search_in_cache(**kwargs)
        if result is None:
            if raise_unfounded:
                raise KeyError('Object like {} in cache not found.'.format(kwargs))
            return default

        return result

    @return_future
    def get(self, id=None, callback=None, alias=None, reload=False, **kwargs):
        if URI.try_or_default(id):  # В качестве идентификатора может быть подан URI и тогда поиск будет вестись по нему
            # todo: (!) clean uri params
            kwargs['uri'] = id
            id = None

        if id:
            kwargs['id'] = id

        if reload:
            self.__klass__.clean_from_cache(**kwargs)
            obj = None
        else:
            obj = self.__klass__.search_in_cache(**kwargs)
        # log.debug('qs.get({id}, {kwargs}):  # id(obj) from cache = {oid}'.format(oid=None if obj is None else __builtins__['id'](obj), **locals()))
        if obj is None:
            super(CachebleQuerySet, self).get(callback=callback, alias=alias, **kwargs)
        else:
            tornado.ioloop.IOLoop.instance().add_callback(callback, obj)

    def save(self, document, callback, alias=None, upsert=False):
        def handler(doc, **kw):
            doc.to_cache()
            return callback(doc, **kw)

        super(CachebleQuerySet, self).save(document=document, callback=handler, alias=alias, upsert=upsert)

    def indexes_saved_before_save(self, document, callback, alias=None, upsert=False):
        def handle(*args, **kw):
            # выбираем первое попавшеся уникальное поле с непустым значением. Если есть _id, то берем его.
            conditions = []
            for field_name, field in  [('_id', None)] + self.__klass__._fields.items():
                if field is None or getattr(field, 'identify', None):
                    value = getattr(document, field_name)
                    if value is not None:
                        conditions.append({field_name: value})

            self.update_field_on_save_values(document, document._id is not None)
            doc = document.to_son()

            assert not (upsert and not conditions), 'No one ID-field is not specified in: {!r}'.format(document)

            if upsert and conditions or document._id:  #document._id is not None:
                condition = {'$or': conditions} if len(conditions) > 1 else conditions[0]
                self.coll(alias).update(
                    condition,  #{'_id': document._id},
                    doc,
                    callback=self.handle_update(document, callback),
                    upsert=upsert or document._id and True,
                )
            else:
                self.coll(alias).insert(doc, callback=self.handle_save(document, callback))

        return handle

    def handle_update(self, document, callback):
        def handle(*arguments, **kw):
            if len(arguments) > 1 and arguments[1]:
                # if isinstance(arguments[1], (DuplicateKeyError, )):  # todo: сделать проверку на дубликацию ключей
                #     raise UniqueKeyViolationError.from_pymongo(str(arguments[1]), self.__klass__)
                # else:
                raise arguments[1]

            stat = arguments[0]
            if 'upserted' in stat:
                document._id = stat['upserted']

            callback(document)

        return handle
