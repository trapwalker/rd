# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from pprint import pprint as pp
from uuid import uuid1 as get_uuid
from mongoengine import connect, Document, QuerySet
from mongoengine.fields import StringField, UUIDField, ReferenceField, CachedReferenceField


class CachedQuerySet(QuerySet):
    __objects_cache = {}

    def next(self):
        """Wrap the result in a :class:`~mongoengine.Document` object.
        """
        if self._limit == 0 or self._none:
            raise StopIteration

        raw_doc = self._cursor.next()
        if self._as_pymongo:
            return self._get_as_pymongo(raw_doc)

        id = raw_doc['_id']
        doc = self.__objects_cache.get(id, None)
        if doc is None:
            doc = self._document._from_son(
                raw_doc,
                _auto_dereference=self._auto_dereference,
                only_fields=self.only_fields,
            )

        if self._scalar:
            return self._get_scalar(doc)

        return doc


class Node(Document):
    meta = dict(
        collection='registry',
        allow_inheritance=True,
        queryset_class=CachedQuerySet,
    )
    uri = StringField(unique=True, primary_key=True, null=True)
    uid = UUIDField(default=get_uuid, unique=True, identify=True, tags="client")
    parent = ReferenceField(document_type='self')

    def make_uri(self):
        return 'reg:///_/{}'.format(self.uid)

    def __init__(self, uri=None, **kw):
        super(Node, self).__init__(uri=uri, **kw)
        if self.uri is None:
            self.uri = self.make_uri()

    def __repr__(self):
        return self.to_json()

    __str__ = __repr__
                


if __name__ == '__main__':
    db = connect(db='test_me')

    Node.objects.delete()
    a = Node(uri='reg:///a')
    b = Node(uri='reg:///b')
    aa = Node(uri='reg:///a/a', parent=a)

    a.save()
    b.save()
    aa.save()

    print('=' * 60)
    pp(list(Node.objects.all()))

    aa2 = Node.objects.get(uri='reg:///a/a')
    aa3 = Node.objects.get(uri='reg:///a/a')



