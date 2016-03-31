# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from bson.objectid import ObjectId
import hashlib
import random
import re


class User(object):
    collection_name = 'profiles'
    def __init__(self, name=None, auth=None, _id=None, db=None, auth_standard=None, **kw):
        """
        User docu,emt structure
        {
          "_id" : ObjectId("56e019f47ee5fe0a54b36d6b"),
          "name" : "username",
          "auth" : {
            "standard" : { "password" : "md5$0123456789abcdef$salt", "email" : "user@example.com" }
          }
        }
        """
        self._id = _id or ObjectId()
        self.name = name
        self.auth = auth or {}
        self.db = db
        self.__dict__.update(kw)
        if auth_standard:
            self.set_auth_data('standard', auth_standard)

    def set_auth_data(self, kind, data):
        if kind == 'standard':
            data['password'] = hash_pass(data['password'])
        self.auth[kind] = data

    def check_password(self, password):
        if not self.auth:
            return

        std = self.auth.get('standard')
        pass_data = std.get('password')
        return test_pass(password, pass_data)

    @property
    def email(self):
        if not self.auth:
            return

        std = self.auth.get('standard')
        return std.get('email')

    @classmethod
    def find(cls, db, filter=None, **kw):
        for doc in db[cls.collection_name].find(filter, **kw):
            yield User(db=db, **doc)

    @classmethod
    def find_one(cls, db, filter, **kw):
        doc = db[cls.collection_name].find_one(filter=filter, **kw)
        return doc and User(db=db, **doc)

    @classmethod
    def get_by_id(cls, db, id):
        if isinstance(id, basestring):
            id = ObjectId(id)
        return cls.find_one(db=db, filter={'_id': id})

    @classmethod
    def get_by_name(cls, db, name):
        return cls.find_one(db=db, filter={'name': name})

    @classmethod
    def get_by_email(cls, db, email):
        return cls.find_one(db=db, filter={'auth.standard.email': email})

    def as_document(self):
        d = self.__dict__.copy()
        d.pop('db', None)
        return d

    def save(self, db=None):
        """
            returns: pymongo.results.UpdateResult
        """
        db = self.db or db
        assert db
        doc = self.as_document()
        collection = db[self.collection_name]
        result = collection.replace_one({'_id': self._id}, doc, upsert=True)
        self.db = db
        return result

    def __repr__(self):
        return '{self.__class__.__name__}({args})'.format(
            self=self,
            args=', '.join(('{}={!r}'.format(k, v) for k, v in self.as_document().items())),
        )

    def __str__(self):
        return '<{self.__class__.__name__}({self.name})>'.format(self=self)


def hash_pass(password, salt=None, hash_name='sha256', splitter='$', salt_size=7, encoding='utf-8'):
    def random_salt(size):
        alphabet = '0123456789abcdef'
        return ''.join([random.choice(alphabet) for _ in xrange(size)])

    if isinstance(password, unicode):
        password = password.encode(encoding)
    salt = salt or random_salt(size=salt_size)
    hash_func = hashlib.new(hash_name)
    hash_func.update(password)
    hash_func.update(salt)
    password_hash = hash_func.hexdigest()
    return '{hash_name}{splitter}{password_hash}{splitter}{salt}'.format(**locals())


def test_pass(password, verification_data, encoding='utf-8'):
    if isinstance(password, unicode):
        password = password.encode(encoding)
    match = re.match('(\w+)(\W)(.*)', verification_data)
    if match is None:
        raise ValueError('Wrong hash format, "<hash_func_name><splitter_char><hash><splitter_char><salt>" required')
    hash_name, splitter, hash_and_salt = match.groups()
    hash_digest, salt = hash_and_salt.split(splitter)
    hash_func = hashlib.new(hash_name)
    hash_func.update(password)
    hash_func.update(salt)
    return hash_digest == hash_func.hexdigest()


if __name__ == '__main__':
    import pymongo
    import bson
    from pprint import pprint as pp
    
    db = pymongo.MongoClient('mongodb://localhost/rd').rd
    c = db.rofiles
    for u in User.find(db):
        print repr(u)
    

