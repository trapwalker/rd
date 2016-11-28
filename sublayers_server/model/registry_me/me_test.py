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
from mongoengine.fields import IntField, StringField, UUIDField, ReferenceField, BooleanField


class Node(Document):
    meta = dict(
        collection='registry',
        allow_inheritance=True,
        #queryset_class=CachedQuerySet,
    )
    uri = StringField(unique=True, primary_key=True, null=True, not_inherited=True)
    uid = UUIDField(default=get_uuid, unique=True, not_inherited=True, tags={"client"})
    parent = ReferenceField(document_type='self', not_inherited=True)
    # todo: Убедиться, что fixtured не наследуется.
    fixtured = BooleanField(default=False, not_inherited=True, doc=u"Признак объекта из файлового репозитория реестра")
    title = StringField(caption=u"Название", tags={"client"})
    abstract = BooleanField(default=True, not_inherited=True, doc=u"Абстракция - Признак абстрактности узла")

    def make_uri(self):
        return 'reg:///_/{}'.format(self.uid)

    def __init__(self, uri=None, **kw):
        only_fields = set(kw.pop('__only_fields', [])) | (set(self._fields.keys()) - {'uid'})
        super(Node, self).__init__(uri=uri, __only_fields=only_fields, **kw)
        if self.uri is None:
            self.uri = self.make_uri()

    def __repr__(self):
        return self.to_json()

    __str__ = __repr__

    def __getattribute__(self, name):
        """Implementation of inheritance by registry parent line"""
        if (
            name not in {
                'parent', 'uri', 'uid', 'make_uri',
                '_fields', '_dynamic_fields', '_fields_ordered', '_changed_fields', '_data',
                '_db_field_map', '_reverse_db_field_map', '_BaseDocument__set_field_display',
                '__class__', '_created', '_initialised', '__slots__', '_is_document', '_meta', 'STRICT',
                '_dynamic', '_dynamic_lock', '_class_name',
            }
        ):
            if self._initialised:
                field = self._fields.get(name) or self._dynamic_fields.get(name)
                if field and name not in self._data:
                    if getattr(field, 'not_inherited', False):
                        value = field.default
                        return value() if callable(value) else value

                    parent = self.parent
                    if parent and hasattr(parent, name):
                        return getattr(parent, name)
                    else:
                        value = field.default
                        return value() if callable(value) else value

        return super(Node, self).__getattribute__(name)

    def __delattr__(self, *args, **kwargs):
        """Handle deletions of fields"""
        field_name = args[0]
        field = self._fields.get(field_name) or self._dynamic_fields.get(field_name)
        if field:
            self._data.pop(field_name, None)
        else:
            super(Node, self).__delattr__(*args, **kwargs)


class C(Node):
    x = IntField(null=True)
    y = IntField(null=True)
    z = IntField(null=True)


if __name__ == '__main__':
    db = connect(db='test_me')
    print ('delete:', Node.objects.delete())

    Node.objects.delete()
    a = C(x=3, y=7, uri='reg:///a')
    b = C(x=5, uri='reg:///b')
    aa = C(uri='reg:///a/a', parent=a)
    xx = C(parent=aa)

    a.save()
    b.save()
    aa.save()
    xx.save()

    print('=' * 60)
    pp(list(Node.objects.all()))
    aa2 = Node.objects.get(uri='reg:///a/a')
    aa3 = Node.objects.get(uri='reg:///a/a')
    b2  = Node.objects.get(uri='reg:///b')
    print('cached:', aa2.parent is aa3.parent)

    print(repr(aa.y))
