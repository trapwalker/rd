# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from tornado.concurrent import return_future
from motorengine.errors import LoadReferencesRequiredError
from uuid import uuid1 as get_uuid
from weakref import WeakSet
from fnmatch import fnmatch
from collections import deque, Callable
from pprint import pformat
from functools import partial
from copy import copy
import time
import yaml
import yaml.scanner
import os

from mongoengine import Document
from mongoengine.fields import StringField, BooleanField, UUIDField, ListField, ReferenceField, EmbeddedDocumentField

from sublayers_server.model.registry_me.uri import URI
# from sublayers_server.model.registry_me.odm.fields import (
#     StringField, BooleanField, UUIDField, UniReferenceField, EmbeddedDocumentField, ListField,
# )

# class Subdoc(Doc):
#     def instantiate(self, **kw):
#         # values = self._values.copy()
#         values = self._values  # todo: ВОзможно нужно копировать параметры по-другому (_instantiate_field override)
#         values.update(kw)
#         return super(Subdoc, self).instantiate(**values)


# class Subclassdoc(Subdoc):
#     __metaclass__ = SubclassMeta


class Root(Node):
    pass
