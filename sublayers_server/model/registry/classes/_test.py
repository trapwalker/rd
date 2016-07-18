import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.odm.fields import (
    IntField, StringField, FloatField, UniReferenceField, EmbeddedDocumentField, ListField,
)


class A(Root):
    pass


class B(A):
    pass
    

class C(B):
    pass
 
