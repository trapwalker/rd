
import logging
log = logging.getLogger(__name__)

from motorengine.queryset import QuerySet


def save(self, document, callback, alias=None, upsert=None):
    if self.validate_document(document):
        self.ensure_index(
            callback=self.indexes_saved_before_save(document, callback, alias=alias, upsert=upsert),
            alias=alias
        )


def indexes_saved_before_save(self, document, callback, alias=None, upsert=None):
    def handle(*args, **kw):
        self.update_field_on_save_values(document, document._id is not None)
        doc = document.to_son()

        if document._id is not None:
            kw = {} if upsert is None else dict(upsert=upsert)
            self.coll(alias).update({'_id': document._id}, doc, callback=self.handle_update(document, callback), **kw)
        else:
            self.coll(alias).insert(doc, callback=self.handle_save(document, callback))

    return handle


QuerySet.indexes_saved_before_save = indexes_saved_before_save
QuerySet.save = save
