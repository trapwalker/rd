# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from bson.objectid import ObjectId
import hashlib
import datetime
import random
import re
import tornado.gen
from motorengine import Document, StringField, EmbeddedDocumentField, EmailField, BooleanField, IntField, DateTimeField


class User(Document):
    """
    :type name: unicode
    :type auth: AuthData
    """

    class AuthData(Document):

        class AuthStandard(Document):
            email = StringField()
            password = StringField()

            def __init__(self, raw_password=None, **kw):
                Document.__init__(self, **kw)
                if raw_password:
                    self.set_password(raw_password)

            def __nonzero__(self):
                return bool(self.email)

            def set_password(self, new_password):
                self.password = hash_pass(new_password)

        standard = EmbeddedDocumentField(AuthStandard, default=AuthStandard)
        # todo: add social auth attributes

    __collection__ = 'profiles'
    name = StringField(max_length=64)
    registration_status = StringField(max_length=64)
    auth = EmbeddedDocumentField(AuthData, default=AuthData)

    quick = BooleanField(default=False)
    car_index = IntField(default=None)
    time_quick_game = IntField(default=0)
    car_die = BooleanField(default=None)
    ordinal_number = IntField(default=None)
    date_created = DateTimeField(default=datetime.datetime.now, auto_now_on_insert=True)

    def __init__(self, raw_password=None, email=None, **kw):
        super(User, self).__init__(**kw)
        if raw_password:
            self.auth.standard.set_password(raw_password)

        if email:
            self.auth.standard.email = email

    @property
    def is_quick_user(self):
        # todo: ##refactoring Убрать это свойство
        return self.quick

    @property
    def id(self):
        return self._id

    def check_password(self, password):
        if not self.auth:
            return

        pass_data = self.auth.standard.password
        return test_pass(password, pass_data)

    @property
    def email(self):
        if self.auth and self.auth.standard:
            return self.auth.standard.email

    @classmethod
    @tornado.gen.coroutine
    def get_by_name(cls, name):
        users = yield cls.objects.filter({'name': name}).find_all()
        raise tornado.gen.Return(users and users[0] or None)

    @classmethod
    @tornado.gen.coroutine
    def get_by_email(cls, email):
        users = yield cls.objects.filter({'auth.standard.email': email}).find_all()
        raise tornado.gen.Return(users and users[0] or None)

    def as_document(self):
        d = self.__dict__.copy()
        d.pop('db', None)  # todo: remove obsolete code
        return d

    def __repr__(self):
        args = self.to_son()
        args['_id'] = self._id
        return '{self.__class__.__name__}({args})'.format(
            self=self,
            args=', '.join(('{}={!r}'.format(k, v) for k, v in args.items())),
        )

    def __str__(self):
        return '<{self.__class__.__name__}({self.name})>'.format(self=self)

    @tornado.gen.coroutine
    def assign_ordinal_number(self):
        if self.ordinal_number is None:
            # Получить всех пользователей, отсортировать по self.ordinal_number и получить максимальное число
            users = yield User.objects.filter(
                {'ordinal_number': {'$exists': True, '$ne': None},}
            ).order_by('ordinal_number', -1).limit(3).find_all()

            if len(users):
                self.ordinal_number = users[0].ordinal_number + 1
            else:
                self.ordinal_number = 1
            yield self.save()
            raise tornado.gen.Return(self.ordinal_number)
        raise tornado.gen.Return(self.ordinal_number)


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
    import tornado.ioloop
    import tornado.gen
    from motorengine import connect
    import sys

    log.addHandler(logging.StreamHandler(sys.stderr))
    log.setLevel(logging.DEBUG)

    io_loop = tornado.ioloop.IOLoop.instance()
    connect("rd", host="localhost", port=27017, io_loop=io_loop)

    @tornado.gen.coroutine
    def get_user(id):
        user = yield User.objects.get(id)
        raise tornado.gen.Return(user)
    
    
    @tornado.gen.coroutine
    def test():
        log.debug('user profile test start')
        users = yield User.objects.find_all()
        for user in users:
            print repr(user)
            print

        oid = ObjectId('56fd3f497ee5fe16d83121df')
        u = yield get_user(oid)

        globals().update(locals())

    test()

    tornado.ioloop.PeriodicCallback(lambda: io_loop._timeouts or io_loop.stop(), 500).start()
    io_loop.start()
