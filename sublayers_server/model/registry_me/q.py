# -*- coding: utf-8 -*-
from __future__ import print_function
from mongoengine import connect, Document, StringField, ReferenceField


class User(Document):
    name = StringField()


class Order(Document):
    user = ReferenceField(User)


db = connect(db='test_me')

user = User(name='User One').save()
order1 = Order(user=user).save()
order2 = Order(user=user).save()

print('One user is one instance:', order1.user is order2.user)  # True

orders = list(Order.objects(user=user))

print('One user is one instance:', orders[0].user is orders[1].user)  # False
print(orders[0].user.pk, '==', orders[1].user.pk, '==>', orders[0].user.pk == orders[1].user.pk)

#order1_ = Order.objects.