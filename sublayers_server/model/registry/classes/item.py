# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.odm.doc import AbstractDocument
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
    amount = FloatField(default=1, caption=u'Количество', doc=u'Реальное кличество предметов в стеке')
    stack_size = FloatField(default=1, caption=u'Максимальный размер стека этих предметов в инвентаре')
    position = IntField(caption=u'Позиция в инвентаре')
    base_price = FloatField(default=0, caption=u'Базовая цена за 1', tags='client')

    description = StringField(caption=u'Расширенное описание предмета', tags='client')
    inv_icon_big = StringField(caption=u'URL глифа (большой разиер) для блоков инвентарей', tags='client')
    inv_icon_mid = StringField(caption=u'URL глифа (средний размер) для блоков инвентарей', tags='client')
    inv_icon_small = StringField(caption=u'URL глифа (малый размер) для блоков инвентарей', tags='client')
    inv_icon_supersmall = StringField(caption=u'URL глифа (самый малый размер) для блоков инвентарей', tags='client')
    # todo: move title attr to the root
    title = StringField(caption=u'Название предмета для отображения в инвентаре', tags='client')
    activate_type = StringField(default='none', caption=u'Способ активации: none, self ...', tags='client')

    @classmethod
    def activate(cls):
        pass

    def __str__(self):
        return '{}<{}/{}>'.format(self.__class__.__name__, self.activate_type, self.amount)


class Tank(Item):
    value_fuel = FloatField(caption=u'Объем канистры', tags='client')


class TankFull(Tank):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateTank
        return TransactionActivateTank


class BuildSet(Item):
    build_points = FloatField(caption=u'Объем восстановления здоровья в единицах')

    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateRebuildSet
        return TransactionActivateRebuildSet


class AmmoBullets(Item):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateAmmoBullets
        return TransactionActivateAmmoBullets


class TankEmpty(Tank):
    pass


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


class MapWeaponRocketItem(MapWeaponItem):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateRocket
        return TransactionActivateRocket


class MechanicItem(SlotItem):
    p_visibility_min = FloatField(default=0, caption=u"Коэффициент минимальной заметности")
    p_visibility_max = FloatField(default=0, caption=u"Коэффициент максимальной заметности")
    p_observing_range = FloatField(default=0, caption=u"Радиус обзора")
    max_hp = FloatField(default=0, caption=u"Максимальное значение HP")
    r_min = FloatField(default=0, caption=u"Минимальный радиус разворота")
    ac_max = FloatField(default=0, caption=u"Максимальная перегрузка при развороте")
    max_control_speed = FloatField(default=0, caption=u"Абсолютная максимальная скорость движения")
    v_forward = FloatField(default=0, caption=u"Максимальная скорость движения вперед")
    v_backward = FloatField(default=0, caption=u"Максимальная скорость движения назад")
    a_forward = FloatField(default=0, caption=u"Ускорение разгона вперед")
    a_backward = FloatField(default=0, caption=u"Ускорение разгона назад")
    a_braking = FloatField(default=0, caption=u"Ускорение торможения")
    max_fuel = FloatField(default=0, caption=u"Максимальное количество топлива")
    p_fuel_rate = FloatField(default=0, caption=u"Расход топлива (л/с)")


class TunerImageView(AbstractDocument):
    link = StringField(caption=u"Ссылка на картинку")
    z_index = IntField(default=0, caption=u"Уровень отображения слоя")


class TunerImage(AbstractDocument):
    car = UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.mobiles.Car')
    top = EmbeddedDocumentField(embedded_document_type=TunerImageView)
    side = EmbeddedDocumentField(embedded_document_type=TunerImageView)


class TunerItem(SlotItem):
    pont_points = FloatField(default=0, caption=u"Очки крутости для итемов тюнера", tags='client')
    images = ListField(
        caption=u'Изображения у тюнера', tags='client',
        base_field=EmbeddedDocumentField(embedded_document_type=TunerImage),
    )


class ArmorerItem(SlotItem):
    class ArmorerImages(AbstractDocument):
        class ArmorerImagesSize(AbstractDocument):
            armorer_side_F = StringField()
            armorer_side_B = StringField()
            armorer_side_R = StringField()
            armorer_side_L = StringField()
            armorer_top_F = StringField()
            armorer_top_B = StringField()
            armorer_top_R = StringField()
            armorer_top_L = StringField()


        small = EmbeddedDocumentField(embedded_document_type=ArmorerImagesSize)
        middle = EmbeddedDocumentField(embedded_document_type=ArmorerImagesSize)
        big = EmbeddedDocumentField(embedded_document_type=ArmorerImagesSize)


    weight_class = IntField(default=0, caption=u"Класс тяжести итема у оружейника", tags='client')
    armorer_images = EmbeddedDocumentField(
        embedded_document_type=ArmorerImages,
        caption=u'Картинки оружейника',
        doc=u'Ссылки на картинки у оружейника по масштабам.',
        tags='client',
    )
