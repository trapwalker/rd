import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.odm.fields import (
    IntField, StringField, FloatField, UniReferenceField, EmbeddedDocumentField, ListField,
)


class A(Root):
    r = UniReferenceField(reference_document_type=Root)
    ll = ListField(base_field=ListField(base_field=UniReferenceField(reference_document_type=Root)))
    x = IntField()


class B(A):
    e = EmbeddedDocumentField(embedded_document_type=A)
    pass


class C(B):
    pass
 
