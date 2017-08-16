# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from bson.objectid import ObjectId
from uuid import uuid4
import hashlib
import datetime
import random
import re
from mongoengine import (
    Document, EmbeddedDocument, StringField, EmbeddedDocumentField, EmailField, BooleanField, IntField, DateTimeField,
    UUIDField,
)

from sublayers_server.model.registry_me.odm_position import PositionField


class User(Document):
    """
    :type name: unicode
    :type auth: AuthData
    """

    class AuthData(EmbeddedDocument):

        class AuthStandard(EmbeddedDocument):
            email = StringField()
            password = StringField()
            email_confirmed = BooleanField(default=False)
            email_confirmation_token = UUIDField(default=uuid4)

            def __init__(self, raw_password=None, **kw):
                EmbeddedDocument.__init__(self, **kw)
                if raw_password:
                    self.set_password(raw_password)

            def __nonzero__(self):
                return bool(self.email)

            def set_password(self, new_password):
                self.password = hash_pass(new_password)

        class AuthSocial(EmbeddedDocument):
            social_id = StringField()

        standard = EmbeddedDocumentField(AuthStandard, default=AuthStandard)
        google = EmbeddedDocumentField(AuthSocial, default=AuthSocial)
        vk = EmbeddedDocumentField(AuthSocial, default=AuthSocial)
        twitter = EmbeddedDocumentField(AuthSocial, default=AuthSocial)
        fb = EmbeddedDocumentField(AuthSocial, default=AuthSocial)


    __collection__ = 'profiles'
    name = StringField(max_length=64)
    registration_status = StringField(max_length=64)
    auth = EmbeddedDocumentField(AuthData, default=AuthData)

    quick = BooleanField(default=False)
    is_tester = BooleanField(default=False)
    car_index = IntField(default=None)
    ordinal_number = IntField(default=None)
    date_created = DateTimeField(default=datetime.datetime.now, auto_now_on_insert=True)
    avatar_link = StringField(default='/static/content/avatars/dog_def.png', max_length=255)
    role_class_uri = StringField(default='/registry/rpg_settings/role_class/chosen_one', max_length=255)
    teaching_state = StringField(default="", max_length=30)  # "" - не известно, "cancel" - отменено, "done" - завершено, "map" - карта, "city" - город
    start_position = PositionField(caption=u"Стартовые координаты")



    def __init__(self, raw_password=None, email=None, google_id=None, vk_id=None, twitter_id=None, fb_id=None, **kw):
        super(User, self).__init__(**kw)
        if raw_password:
            self.auth.standard.set_password(raw_password)

        if email:
            self.auth.standard.email = email

        if google_id:
            self.auth.google.social_id = google_id

        if vk_id:
            self.auth.vk.social_id = vk_id

        if twitter_id:
            self.auth.twitter.social_id = twitter_id

        if fb_id:
            self.auth.fb.social_id = fb_id


    def __nonzero__(self):
        return True

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
    def get_by_name(cls, name):
        return cls.objects.filter(name=name).first()

    @classmethod
    def get_by_email(cls, email):
        return cls.objects.filter(auth__standard__email=email).first()

    @classmethod
    def get_by_google_id(cls, uid):
        return cls.objects.filter(auth__google__social_id=uid).first()

    @classmethod
    def get_by_vk_id(cls, uid):
        return cls.objects.filter(auth__vk__social_id=uid).first()

    @classmethod
    def get_by_twitter_id(cls, uid):
        return cls.objects.filter(auth__twitter__social_id=uid).first()

    @classmethod
    def get_by_fb_id(cls, uid):
        return cls.objects.filter(auth__fb__social_id=uid).first()

    def as_document(self):
        d = self.__dict__.copy()
        d.pop('db', None)  # todo: remove obsolete code
        return d

    def __repr__(self):
        args = self.to_son()
        args['_id'] = self.pk
        return '{self.__class__.__name__}({args})'.format(
            self=self,
            args=', '.join(('{}={!r}'.format(k, v) for k, v in args.items())),
        )

    def __str__(self):
        return '<{self.__class__.__name__}({self.name})>'.format(self=self)

    def assign_ordinal_number(self):
        if self.ordinal_number is None:
            # todo: ##DOIT
            # Получить всех пользователей, отсортировать по self.ordinal_number и получить максимальное число
            # users = User.objects.filter(
            #     {'ordinal_number': {'$exists': True, '$ne': None},}
            # ).order_by('ordinal_number', -1).limit(3).all()

            self.ordinal_number = 12345 #(users[0].ordinal_number + 1) if len(users) else 1
            self.save()

        return self.ordinal_number


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
