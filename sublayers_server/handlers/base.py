# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web


def hash_pass(password, salt=None, hash_name='sha256', splitter='$', salt_size=7, encoding='utf-8'):
    import hashlib, random

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
    import hashlib, re
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


class User(object):
    def __init__(self, name, email=None, auth=None, _id=None, **kw):
        self._id = _id
        self.name = name
        self.email = email
        self.auth = auth



    @classmethod
    def load_by_name(cls, collection, name):
        pass



class BaseHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        return self.get_secure_cookie("user")

    def get_template_namespace(self):
        namespace = super(BaseHandler, self).get_template_namespace()
        namespace.update(
            revision=self.application.revision,
        )
        return namespace