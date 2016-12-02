# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import os
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))


from sublayers_server.model.registry_me.uri import URI
from sublayers_common.ctx_timer import Timer

import yaml
import time
from fnmatch import fnmatch
from weakref import WeakSet
from copy import copy
from pprint import pprint as pp
from uuid import uuid1 as get_uuid
from collections import deque, Callable
from mongoengine import connect, Document, QuerySet
from mongoengine.fields import (
    IntField, StringField, UUIDField, ReferenceField, BooleanField,
    ListField, EmbeddedDocumentField,
)


class RegistryError(Exception):
    pass


class RegistryNodeFormatError(RegistryError):
    pass


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

    @property
    def tag_set(self):
        tags = set(self.tags or [])
        if self.parent:
            tags.update(self.parent.tag_set)
        return tags

    def make_uri(self):
        owner = self.owner

        if owner and owner.uri:
            base_uri = URI(owner.uri)
        else:
            base_uri = URI(scheme='reg', storage='', path=())

        uri = base_uri.replace(path=base_uri.path + (self.name or str(self.uid),))
        return str(uri)

    def __init__(self, **kw):
        noninheritable = [name for name, field in self._fields.iteritems() if not getattr(field, 'not_inherited', False)]
        only_fields = set(kw.pop('__only_fields', [])) | set(noninheritable)
        super(Node, self).__init__(__only_fields=only_fields, **kw)
        self._subnodes = set()  #WeakSet()  # TODO: Сделать кэширование и заменить set -> WeakSet иначе дети в мусор
        if self.name is None:
            self.name = str(self.uid)

        if 'uri' not in kw:
            self.uri = self.make_uri()

        if self.owner:
            self.owner._subnodes.add(self)

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

    def instantiate(self, name=None, storage=None, **kw):
        # todo: Сделать поиск ссылок в параметрах URI
        params = {}
        parent = self
        if not self.uri:  # todo: "Если инстанцируется embedded документ" - откорректировать условие
            parent = self.parent
            params.update(self._data)

        params.update(kw)

        inst = self.__class__(**params)

        for name, field in self._fields.items():
            inst._instantiaite_field(inst, field, name)
        # todo: Разобраться с abstract при реинстанцированиях
        # todo: Сделать поиск ссылок в параметрах URI
        return inst

    def iter_attrs(self, tags=None, classes=None):
        if isinstance(tags, basestring):
            tags = set(tags.split())
        elif tags is not None:
            tags = set(tags)

        for name, attr in self._fields.items():
            field_tags = getattr(attr, 'tags', None)
            if (
                (tags is None or field_tags is not None and field_tags & tags) and
                (classes is None or isinstance(attr, classes))
            ):
                getter = lambda: getattr(self, name)
                yield name, attr, getter

    def as_client_dict(self):  # todo: rename to 'to_son_client'
        d = {}
        for name, attr, getter in self.iter_attrs(tags='client'):
            value = getter()
            if isinstance(value, Node):
                value = value.as_client_dict()
            d[name] = value

        d.update(
            id=self.id,  # todo: Возможно в качестве идентификатора передавать UID?
            node_hash=self.node_hash(),
            html_hash=self.node_html(),
            tags=list(self.tag_set),
        )
        return d

    # TODO: Найти и убрать вызовы метода deep_iter (заменить на iter_childs)
    def iter_childs(self, reject_abstract=False, deep=False, self_include=False):
        queue = []
        if self_include:
            queue.append(self)
        if not deep or not self_include:
            queue.extend(list(self._subnodes))

        while queue:
            item = queue.pop()
            if deep:
                queue.extend(list(item._subnodes))
            if not item.abstract or not reject_abstract:
                yield item

    def get_child(self, idx):
        path = None
        # todo: test to URI
        if isinstance(idx, basestring):
            idx = idx.replace('\\', '/')
            path = idx.split('/')
        else:
            path = idx

        if path:
            child_name = path[0]
            # TODO: ##OPTIMIZE атрибут _subnodes должен быть словарем слабых ссылок, а не множеством
            for node in self._subnodes:
                if node.name == child_name:
                    return node.get_child(path[1:])
        else:
            return self

    def node_hash(self):  # todo: (!) rename to proto_uri
        u'''uri первого попавшегося абстрактного узла в цепочке наследования включющей данный узел'''
        # todo: Пороверять абстрактность без uri
        if self.uri:
            return self.uri
        elif self.parent:
            return self.parent.node_hash()

        raise Exception('try to get node hash in wrong node: {!r}'.format(self))  # todo: exception specify

    def node_html(self):  # todo: rename
        return self.node_hash().replace('://', '-').replace('/', '-')

    # todo: rename to calls: _load_node -> _load_node_from_fs
    @classmethod
    def _load_node_from_fs(cls, path, owner=None):
        assert isinstance(path, unicode), '{}._load_node: path is not unicode, but: {!r}'.format(cls, path)
        attrs = {}
        for f in sorted(os.listdir(path)):
            assert isinstance(f, unicode), '{}._load_node: listdir returns non unicode value'.format(cls)
            # f = f.decode(sys.getfilesystemencoding())
            p = os.path.join(path, f)
            # todo: need to centralization of filtering
            if not f.startswith('_') and not f.startswith('#') and os.path.isfile(p) and fnmatch(p, '*.yaml'):
                with open(p) as attr_file:
                    try:
                        d = yaml.load(attr_file) or {}
                    except yaml.scanner.ScannerError as e:
                        raise RegistryNodeFormatError(e)
                    assert isinstance(d, dict), 'Yaml content is not object, but: {!r}'.format(d)
                    attrs.update(d.items())

        attrs.update(owner=owner)
        attrs.setdefault('name', os.path.basename(path.strip('\/')))
        attrs.setdefault('parent', owner)
        attrs.setdefault('abstract', True)  # todo: Вынести это умолчание на видное место
        attrs.setdefault('fixtured', True)

        node = cls._from_son(attrs)
        return node

    @classmethod
    def load(cls, path, mongo_store=True):
        all_nodes = []
        root = None
        stack = deque([(path, None)])
        with Timer(name='registryFS loader', logger=log) as timer:
            while stack:
                pth, owner = stack.pop()
                node = cls._load_node_from_fs(pth, owner)

                if node:
                    all_nodes.append(node)
                    #node.to_cache()  # TODO: cache objects
                    if owner is None:
                        root = node  # todo: optimize
                    for f in os.listdir(pth):
                        next_path = os.path.join(pth, f)
                        if os.path.isdir(next_path) and not f.startswith('#') and not f.startswith('_'):
                            stack.append((next_path, node))

        log.info('Registry loading DONE: {} nodes ({:.0f}s).'.format(len(all_nodes), timer.duration))
        return root


## TESTING CODE ########################################################################################################


class A(Node):
    x = IntField(null=True)
    y = IntField(null=True)
    z = IntField(null=True)


class A2(A):
    w = StringField(null=True, tags='q w e')


class B(Node):
    a = IntField(null=True)
    b = IntField(null=True)


def test1():
    print ('delete:', Node.objects.delete())

    r = Node(name='registry').save()
    a = A(owner=r, name='a', x=3, y=7).save()
    b = B(owner=r, name='b', a=5).save()
    aa = A2(owner=a, name='aa', parent=a).save()
    xx = A2(owner=aa, name='xx', parent=aa).save()
    uri = URI(aa.uri)

    print('=' * 60)
    pp(list(Node.objects.all()))
    aa2 = Node.objects.get(uri='reg:///registry/a/aa')
    aa3 = Node.objects.get(uri='reg:///registry/a/aa')
    b2 = Node.objects.get(uri='reg:///registry/b')
    print('cached:', aa2.parent is aa3.parent)
    qq = URI('reg:///registry/a/aa?z=115&y=225').instantiate(base_class=Node).save()
    pp(list(r.iter_childs()))
    globals().update(locals())


def test2():
    print ('delete:', Node.objects.delete())
    regfs_path = ur'../../temp/test_registry/root'
    root = Node.load(path=regfs_path)

    print()
    print('# Registry:')
    pp(list(root.iter_childs(deep=True)))

    print('Well DONE!')
    globals().update(locals())


if __name__ == '__main__':
    db = connect(db='test_me')

    #test1()
    test2()
