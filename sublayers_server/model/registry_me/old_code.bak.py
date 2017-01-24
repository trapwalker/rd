
class InstantReferenceField(ReferenceField):
    def to_python(self, value):
        """Convert a MongoDB-compatible type to a Python type.
        """
        if (
            not self.dbref and
            not isinstance(value, (DBRef, Document, EmbeddedDocument))
        ):
            if isinstance(value, basestring):
                # TODO: support hash overrided URI objects descriptions
                collection = self.document_type._get_collection_name()
                value = DBRef(collection, self.document_type.id.to_python(value))
            elif isinstance(value, dict):
                assert issubclass(self.document_type_obj, Node), 'InstantReferenceField is not Node: %r' % self.document_type_obj
                # parent = value.get('parent', None)  # TODO: make support overiding by parent without _cls
                value = self.document_type_obj._from_son(value, created=True)
                value.is_instant = True
                value.save()
            else:
                raise AssertionError("InstantReferenceField has unsupported type: %r" % value)
        return value
