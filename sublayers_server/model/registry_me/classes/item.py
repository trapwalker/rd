# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import (
    Node, Subdoc,
    IntField, FloatField, StringField, ListField, EmbeddedDocumentField,
    RegistryLinkField, EmbeddedNodeField,
)


class Item(Node):
    icon = StringField(caption=u'Пиктограмма предмета')
    # todo: обсудить диапазон
    amount = IntField(caption=u'Количество', doc=u'Реальное кличество предметов в стеке', tags={'client'})
    stack_size = IntField(caption=u'Максимальный размер стека этих предметов в инвентаре', tags={'client'})
    position = IntField(caption=u'Позиция в инвентаре')
    base_price = FloatField(caption=u'Базовая цена за 1 стек', tags={'client'})

    description = StringField(caption=u'Расширенное описание предмета')
    inv_icon_big = StringField(caption=u'URL глифа (большой разиер) для блоков инвентарей', tags={'client'})
    inv_icon_mid = StringField(caption=u'URL глифа (средний размер) для блоков инвентарей', tags={'client'})
    inv_icon_small = StringField(caption=u'URL глифа (малый размер) для блоков инвентарей', tags={'client'})
    inv_icon_supersmall = StringField(caption=u'URL глифа (супер малый размер) для блоков инвентарей', tags={'client'})
    inv_icon_xsmall = StringField(caption=u'URL глифа (самый малый размер) для блоков инвентарей', tags={'client'})
        
    # todo: move title attr to the root
    activate_type = StringField(caption=u'Способ активации: none, self ...', tags={'client'})
    activate_time = FloatField(caption=u'Время активации итема')
    activate_disable_comment = StringField(caption=u'Опсиание условий активации', tags={'client'})

    def ids(self):
        return dict(uid=self.uid, node_hash=self.node_hash())

    def __init__(self, *av, **kw):
        super(Item, self).__init__(*av, **kw)
        self._parent_list = []

    # todo!!! Review! Убедиться, что это работает нормально! Больше тестов!
    def get_ancestor_level(self, parent_candidate):
        if not self._parent_list:
            obj = self
            ll = []
            while obj:
                obj_node_hash = obj.node_hash()
                ll.append(obj_node_hash)
                obj = obj.parent
            self._parent_list = ll

        h = parent_candidate.node_hash()
        l = self._parent_list
        return l.index(h) if h in l else -1

    def html_description(self):
        return self.description

    def as_client_dict(self):
        d = super(Item, self).as_client_dict()
        d.update(
            ids=self.ids(),
            description=self.html_description(),
        )

        return d

    def as_assortment_dict(self):
        d = dict(
            title=self.title,
            description=self.html_description(),
            inv_icon_mid=self.inv_icon_mid,
            stack_size=self.stack_size,
            node_hash=self.node_hash(),
            uid=self.uid,
            tags=list(self.tag_set),
            amount=self.amount,
        )
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

    def validate(self, *av, **kw):
        super(Item, self).validate(*av, **kw)

        if self.amount is not None and self.stack_size is None:
            log.warning('Item stacksize is None: {item}'.format(item=self))

        if self.amount > self.stack_size:
            log.warning('Stack of items is owerflow: {item.amount!r}>{item.stack_size!r} in {item}'.format(item=self))


class ItemUsable(Item):
    post_activate_items = ListField(
        field=RegistryLinkField(
            document_type='sublayers_server.model.registry_me.classes.item.Item',
            caption=u"Итем который упадет в инвентарь",
            # todo: спрашивать о райзе у объекта?
        ),
        caption=u'Список итемов которые упадут в инвентарь после активации',
    )
    activate_success_audio = StringField(caption=u'Имя звука, сигнализизирующего об успешной активации итема', tags={'client'})


class Tank(ItemUsable):
    value_fuel = FloatField(caption=u'Объем канистры', tags={'client'})


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
    full_tank = EmbeddedNodeField(
        document_type=Item,
        caption=u'Ссылка на полную канистру, получаемую заправкой этой пустой канистры',
    )


class BuildSet(ItemUsable):
    build_points = FloatField(caption=u'Объем восстановления здоровья в единицах')

    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateRebuildSet
        return TransactionActivateRebuildSet

    def can_activate(self, time, agent_model=None):
        return (agent_model is not None) and \
               (agent_model.car is not None)


class AmmoBullets(ItemUsable):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateAmmoBullets
        return TransactionActivateAmmoBullets

    def can_activate(self, time, agent_model=None):
        return True


class SlotItem(Item):
    pass


class SlotLock(SlotItem):
    pass


class MapWeaponItem(ItemUsable):
    generate_obj = EmbeddedNodeField(
        # document_type = # todo: Указать тип реестрового объекта
        caption=u'Ссылка на объект генерации',
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
    starter_obj_list = ListField(
        field=RegistryLinkField(),
        caption=u'Список подходящих пусковых установок',
    )

    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateRocket
        return TransactionActivateRocket

    def can_activate(self, time, agent_model=None):
        if agent_model is None or agent_model.car is None:
            return False
        if len(self.starter_obj_list) > 0:
            node_hash_list = [v.node_hash() for v in self.starter_obj_list]
            # Сделать проход по всем armorer слотам машинки и проверить, есть ли рокет-лаунчер
            for k, v in agent_model.car.example.iter_slots(tags={'armorer'}):
                if v and v.node_hash() in node_hash_list:
                    return True
            return False
        else:
            return True


class MapWeaponTurretItem(MapWeaponItem):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateTurret
        return TransactionActivateTurret

    def can_activate(self, time, agent_model=None):
        return (agent_model is not None) and \
               (agent_model.car is not None) and \
               (agent_model.car.v(time=time) == 0) and (agent_model.car.a() == 0)


class MapRadarItem(MapWeaponItem):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivateMapRadar
        return TransactionActivateMapRadar

    def can_activate(self, time, agent_model=None):
        return (agent_model is not None) and \
               (agent_model.car is not None) and \
               (agent_model.car.v(time=time) == 0) and (agent_model.car.a() == 0)


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
    r_cc_dirt = FloatField(caption=u"Резист к модификатору CC на бездорожье")
    r_cc_wood = FloatField(caption=u"Резист к модификатору CC в лесу")
    r_cc_slope = FloatField(caption=u"Резист к модификатору CC в горах")
    r_cc_water = FloatField(caption=u"Резист к модификатору CC в воде")

    def html_description(self):
        result = '<br>'
        attr_name_list = dict(
            p_visibility_min=dict(name=u'Мин. заметность', mul=1.0),
            p_visibility_max=dict(name=u'Макс. заметность', mul=1.0),
            p_observing_range=dict(name=u'Радиус обзора', mul=1.0),
            max_hp=dict(name=u'HP', mul=1.0),
            r_min=dict(name=u'Маневренность', mul=-1.0),
            ac_max=dict(name=u'Контроль', mul=1.0),
            v_forward=dict(name=u'Макс. скорость', mul=1.0),
            v_backward=dict(name=u'Макс. скорость назад', mul=-1.0),
            a_forward=dict(name=u'Динамика разгона', mul=1.0),
            a_backward=dict(name=u'Динамика задн. хода', mul=-1.0),
            a_braking=dict(name=u'Торможение', mul=-1.0),
            max_fuel=dict(name=u'Бак', mul=1.0),
            p_fuel_rate=dict(name=u'Расход топлива', mul=1.0),
            r_cc_dirt=dict(name=u'Проходимость', mul=1.0),            
        )
        for attr_name in attr_name_list.keys():
            attr_value = getattr(self, attr_name, None)
            if attr_value:
                attr_str = attr_name_list[attr_name]["name"]
                attr_value *= 100
                result += u'<div class="mechanic-description-line left-align">{}:</div><div class="mechanic-description-line right-align">{:.1f}%</div>'.format(attr_str, attr_value * attr_name_list[attr_name]["mul"])

        return result


class TunerItem(SlotItem):
    class TunerImage(Subdoc):
        class TunerImageView(Subdoc):
            link = StringField(caption=u"Ссылка на картинку", tags={'client'})
            z_index = IntField(default=0, caption=u"Уровень отображения слоя", tags={'client'})

        car = RegistryLinkField(
            caption=u"Автомобиль, для которого указаны данные параметры",
            document_type='sublayers_server.model.registry_me.classes.mobiles.Car'
        )
        top = EmbeddedDocumentField(document_type=TunerImageView, tags={'client'})
        side = EmbeddedDocumentField(document_type=TunerImageView, tags={'client'})

        def as_client_dict(self):
            d = super(TunerItem.TunerImage, self).as_client_dict()
            d['car'] = self.car and self.car.node_hash()
            return d

    pont_points = FloatField(caption=u"Очки крутости для итемов тюнера", tags={'client'})
    images = ListField(
        caption=u'Изображения у тюнера', tags={'client'},
        field=EmbeddedDocumentField(document_type=TunerImage),
    )

    # todo: is_ascentor
    def get_view(self, car_node_hash):
        for tuner_image in self.images:
            if tuner_image.car.node_hash() == car_node_hash:
                return tuner_image
        # log.warning('{} not found in item: {}'.format(car_node_hash, self))
        return None

    def html_description(self):
        car_str = ', '.join([car_rec.car.title for car_rec in self.images])
        return (u'<div class="mechanic-description-line left-align">Очки крутости: {}</div>'.format(int(self.pont_points)) +
                u'<div class="mechanic-description-line left-align">Совместимость: {}</div>'.format(car_str))


class ArmorerItem(SlotItem):
    class ArmorerImages(Subdoc):
        class ArmorerImagesSize(Subdoc):
            armorer_side_F = StringField(tags={'client'})
            armorer_side_B = StringField(tags={'client'})
            armorer_side_R = StringField(tags={'client'})
            armorer_side_L = StringField(tags={'client'})
            armorer_top_F = StringField(tags={'client'})
            armorer_top_B = StringField(tags={'client'})
            armorer_top_R = StringField(tags={'client'})
            armorer_top_L = StringField(tags={'client'})

        small = EmbeddedDocumentField(document_type=ArmorerImagesSize, tags={'client'})
        middle = EmbeddedDocumentField(document_type=ArmorerImagesSize, tags={'client'})
        big = EmbeddedDocumentField(document_type=ArmorerImagesSize, tags={'client'})

    weight_class = IntField(caption=u"Класс тяжести итема у оружейника", tags={'client'})
    direction = StringField(caption=u'Направление (FBRL)', tags={'client'})
    armorer_images = EmbeddedDocumentField(
        document_type=ArmorerImages,
        caption=u'Картинки оружейника',
        doc=u'Ссылки на картинки у оружейника по масштабам.',
        tags={'client'},
    )
