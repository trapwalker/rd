# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Root, Subdoc
from sublayers_server.model.registry.odm.fields import (
    IntField, StringField, FloatField, UniReferenceField, EmbeddedDocumentField, ListField,
)


# from sublayers_server.model.transaction_events import (
#     TransactionActivateTank, TransactionActivateAmmoBullets,
#     TransactionActivateMine, TransactionActivateRebuildSet, TransactionActivateRocket,
# )


class Item(Root):
    icon = StringField(caption=u'Пиктограмма предмета')
    # todo: обсудить диапазон
    amount = IntField(caption=u'Количество', doc=u'Реальное кличество предметов в стеке', tags='client')
    stack_size = IntField(caption=u'Максимальный размер стека этих предметов в инвентаре', tags='client')
    position = IntField(caption=u'Позиция в инвентаре')
    base_price = FloatField(caption=u'Базовая цена за 1 стек', tags='client')

    description = StringField(caption=u'Расширенное описание предмета', tags='client')
    inv_icon_big = StringField(caption=u'URL глифа (большой разиер) для блоков инвентарей', tags='client')
    inv_icon_mid = StringField(caption=u'URL глифа (средний размер) для блоков инвентарей', tags='client')
    inv_icon_small = StringField(caption=u'URL глифа (малый размер) для блоков инвентарей', tags='client')
    inv_icon_supersmall = StringField(caption=u'URL глифа (самый малый размер) для блоков инвентарей', tags='client')
    # todo: move title attr to the root
    activate_type = StringField(caption=u'Способ активации: none, self ...', tags='client')
    activate_time = FloatField(caption=u'Время активации итема')
    activate_disable_comment = StringField(caption=u'Опсиание условий активации', tags='client')

    def ids(self):
        return dict(uid=self.uid, node_hash=self.node_hash())

    def as_client_dict(self):
        d = super(Item, self).as_client_dict()
        d.update(ids=self.ids())
        return d

    @classmethod
    def activate(cls):
        pass

    def get_activate_time(self, agent_model=None):
        return self.activate_time

    def can_activate(self, time, agent_model=None):
        return False

    # def split(self, count):
    #     # count - Сколько отнять от текущего и сколько будет в новом
    #     temp_amount = self.amount - count
    #     assert temp_amount >= 0, 'Item dont split. new amount on splited item = {}'.format(self.amount)
    #     assert not self.uri, 'Item has URI {!r} and cannot splited'.format(self.uri)
    #     return self.instantiate(amount=count)

    def instantiate(self, **kw):
        inst = super(Item, self).instantiate(**kw)
        if inst.amount > inst.stack_size:
            log.warning(
                'Item stack owerflow truncated: {item.amount!r}>{item.stack_size!r} in {item}'.format(item=inst))
            inst.amount = inst.stack_size
        return inst

        # def __str__(self):
        #     return '{}<{}/{}>'.format(self.__class__.__name__, self.activate_type, self.amount)


class ItemUsable(Item):
    post_activate_item = UniReferenceField(caption=u'Итем, который будет положен в инвентарь после активации',
                                           reference_document_type="sublayers_server.model.registry.classes.item.Item")


class Tank(ItemUsable):
    value_fuel = FloatField(caption=u'Объем канистры', tags='client')


class TankFull(Tank):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateTank
        return TransactionActivateTank

    def can_activate(self, time, agent_model=None):
        return (agent_model is not None) and \
               (agent_model.car is not None) and \
               (agent_model.car.v(time=time) == 0) and (agent_model.car.a() == 0)


class TankEmpty(Tank):
    full_tank = UniReferenceField(caption=u'Ссылка на полную канистру, получаемую заправкой этой пустой канистры',
                                  reference_document_type="sublayers_server.model.registry.classes.item.TankFull")


class BuildSet(ItemUsable):
    build_points = FloatField(caption=u'Объем восстановления здоровья в единицах')

    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateRebuildSet
        return TransactionActivateRebuildSet

    def can_activate(self, time, agent_model=None):
        return (agent_model is not None) and \
               (agent_model.car is not None) and \
               (agent_model.car.v(time=time) == 0) and (agent_model.car.a() == 0)


class AmmoBullets(ItemUsable):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateAmmoBullets
        return TransactionActivateAmmoBullets


class SlotItem(Item):
    pass


class SlotLock(SlotItem):
    pass


class MapWeaponItem(Item):
    generate_obj = UniReferenceField(
        caption=u'Ссылка на объект генерации',
        reference_document_type="sublayers_server.model.registry.classes.mobiles.Mobile",
    )


class MapWeaponMineItem(MapWeaponItem):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateMine
        return TransactionActivateMine

    def can_activate(self, time, agent_model=None):
        return (agent_model is not None) and \
               (agent_model.car is not None) and \
               (agent_model.car.v(time=time) == 0) and (agent_model.car.a() == 0)


class MapWeaponRocketItem(MapWeaponItem):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateRocket
        return TransactionActivateRocket


class MechanicItem(SlotItem):
    p_visibility_min = FloatField(caption=u"Коэффициент минимальной заметности")
    p_visibility_max = FloatField(caption=u"Коэффициент максимальной заметности")
    p_observing_range = FloatField(caption=u"Радиус обзора")
    max_hp = FloatField(caption=u"Максимальное значение HP")
    r_min = FloatField(caption=u"Минимальный радиус разворота")
    ac_max = FloatField(caption=u"Максимальная перегрузка при развороте")
    max_control_speed = FloatField(caption=u"Абсолютная максимальная скорость движения")
    v_forward = FloatField(caption=u"Максимальная скорость движения вперед")
    v_backward = FloatField(caption=u"Максимальная скорость движения назад")
    a_forward = FloatField(caption=u"Ускорение разгона вперед")
    a_backward = FloatField(caption=u"Ускорение разгона назад")
    a_braking = FloatField(caption=u"Ускорение торможения")
    max_fuel = FloatField(caption=u"Максимальное количество топлива")
    p_fuel_rate = FloatField(caption=u"Расход топлива (л/с)")


class TunerItem(SlotItem):
    class TunerImage(Subdoc):
        class TunerImageView(Subdoc):
            link = StringField(caption=u"Ссылка на картинку", tags='client')
            z_index = IntField(default=0, caption=u"Уровень отображения слоя", tags='client')

        car = UniReferenceField(
            caption=u"Автомобиль, для которого указаны данные параметры",
            reference_document_type='sublayers_server.model.registry.classes.mobiles.Car'
        )
        top = EmbeddedDocumentField(embedded_document_type=TunerImageView, tags='client')
        side = EmbeddedDocumentField(embedded_document_type=TunerImageView, tags='client')

        def as_client_dict(self):
            d = super(TunerItem.TunerImage, self).as_client_dict()
            d['car'] = self.car and self.car.node_hash()
            return d

    pont_points = FloatField(caption=u"Очки крутости для итемов тюнера", tags='client')
    images = ListField(
        caption=u'Изображения у тюнера', tags='client',
        base_field=EmbeddedDocumentField(embedded_document_type=TunerImage),
    )

    def get_view(self, car_node_hash):
        for tuner_image in self.images:
            if tuner_image.car.node_hash() == car_node_hash:
                return tuner_image
        log.warning('{} not found in item: {}'.format(car_node_hash, self))
        return None


class ArmorerItem(SlotItem):
    class ArmorerImages(Subdoc):
        class ArmorerImagesSize(Subdoc):
            armorer_side_F = StringField(tags='client')
            armorer_side_B = StringField(tags='client')
            armorer_side_R = StringField(tags='client')
            armorer_side_L = StringField(tags='client')
            armorer_top_F = StringField(tags='client')
            armorer_top_B = StringField(tags='client')
            armorer_top_R = StringField(tags='client')
            armorer_top_L = StringField(tags='client')

        small = EmbeddedDocumentField(embedded_document_type=ArmorerImagesSize, tags='client')
        middle = EmbeddedDocumentField(embedded_document_type=ArmorerImagesSize, tags='client')
        big = EmbeddedDocumentField(embedded_document_type=ArmorerImagesSize, tags='client')

    weight_class = IntField(caption=u"Класс тяжести итема у оружейника", tags='client')
    armorer_images = EmbeddedDocumentField(
        embedded_document_type=ArmorerImages,
        caption=u'Картинки оружейника',
        doc=u'Ссылки на картинки у оружейника по масштабам.',
        tags='client',
    )
