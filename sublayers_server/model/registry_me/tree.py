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


from sublayers_server.model.registry_me.uri import URI

from copy import copy
from pprint import pprint as pp
from uuid import uuid1 as get_uuid
from mongoengine import connect, Document, QuerySet
from mongoengine.fields import (
    IntField, StringField, UUIDField, ReferenceField, BooleanField,
    ListField, EmbeddedDocumentField,
)


class Node(Document):
    u"""
    Правила работы с узлами реестра:
    - # todo: вложенные объекты (Embedded, list, dict), полученные по наследству или по умолчанию модифицировать нельзя

    """
    meta = dict(
        collection='registry',
        allow_inheritance=True,
        #queryset_class=CachedQuerySet,
    )
    uri = StringField(unique=True, primary_key=True, null=True, not_inherited=True)
    uid = UUIDField(default=get_uuid, unique=True, not_inherited=True, tags={"client"})
    parent = ReferenceField(document_type='self', not_inherited=True)
    # todo: ВНИМАНИЕ! Необходимо реинстанцирование вложенных документов, списков и словарей
    # todo: Убедиться, что fixtured не наследуется.
    fixtured = BooleanField(default=False, not_inherited=True, doc=u"Признак объекта из файлового репозитория реестра")
    title = StringField(caption=u"Название", tags={"client"})
    abstract = BooleanField(default=True, not_inherited=True, doc=u"Абстракция - Признак абстрактности узла")

    owner = ReferenceField(document_type='self', not_inherited=True)
    can_instantiate = BooleanField(default=True, doc=u"Инстанцируемый - Признак возможности инстанцирования")
    name = StringField(caption=u"Техническое имя в пространстве имён узла-контейнера (owner)")
    doc = StringField(caption=u"Описание узла реестра")
    tags = ListField(field=StringField(), not_inherited=True, caption=u"Теги", doc=u"Набор тегов объекта")

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

    def __eq__(self, other):
        return self.pk == other.pk

    # def ___hasvalue___(self, name):
    #     field = self._fields.get(name) or self._dynamic_fields.get(name)
    #     if field:
    #         if name in self._data:
    #             return True
    #
    #         parent = self.parent
    #         if parent:
    #             return parent.___hasvalue___(name)

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
                        value = value() if callable(value) else value
                        return value

                    parent = self.parent
                    if parent and hasattr(parent, name):
                        return getattr(parent, name)
                    else:
                        value = field.default
                        value = value() if callable(value) else value
                        return value

        return super(Node, self).__getattribute__(name)

    def __delattr__(self, *args, **kwargs):
        """Handle deletions of fields"""
        field_name = args[0]
        field = self._fields.get(field_name) or self._dynamic_fields.get(field_name)
        if field:
            self._data.pop(field_name, None)
        else:
            super(Node, self).__delattr__(*args, **kwargs)

    def _reinst_list(self, field, lst):
        lst = copy(lst)
        subfield = field.field
        for i, item in enumerate(lst):
            if item is not None:
                if isinstance(subfield, ListField):
                    lst[i] = self._reinst_list(subfield, copy(item))
                elif isinstance(subfield, EmbeddedDocumentField) and isinstance(item, Node):
                    lst[i] = item.instantiate()
                # todo: make support of dict fields
                else:
                    lst[i] = copy(item)
        return lst

    def _instantiaite_field(self, new_instance, field, name):
        if getattr(field, 'reinst', None):
            value = getattr(self, name)
            if value is not None:
                if isinstance(field, EmbeddedDocumentField):
                    assert not isinstance(value, basestring), (
                        'Embeded fields, described by string ({value!r}) is not supported yet'.format(value=value)
                    )
                    if isinstance(value, basestring):
                        value = URI(value)  # todo: handle exceptions

                    setattr(new_instance, name, value.instantiate())
                elif isinstance(field, ListField):
                    setattr(new_instance, name, self._reinst_list(field, value))

    def instantiate(self, storage=None, **kw):
        # todo: Сделать поиск ссылок в параметрах URI
        inst = self.__class__(**kw)

        for name, field in self._fields.items():
            self._instantiaite_field(inst, field, name)

        return inst


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
    uri = URI(aa.uri)

    xx.tags = ['t1', 't2']

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

    qq = URI('reg:///a/a?z=115&y=225').instantiate()
