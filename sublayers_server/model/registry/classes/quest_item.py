# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import Item
from sublayers_server.model.registry.odm.fields import (
    IntField, FloatField, StringField, DateTimeField, EmbeddedDocumentField, ListField,
)
from sublayers_server.model.registry.tree import Subdoc


class QuestInventory(Subdoc):
    items = ListField(reinst=True, base_field=EmbeddedDocumentField(
        embedded_document_type='sublayers_server.model.registry.classes.quest_item.QuestItem',
    ))

    def add_item(self, agent, item, event, need_change=True):
        if item.add_to_inventory(inventory=self, event=event) and need_change:
            agent.change_quest_inventory(event)

    def del_item(self, agent, item, event, need_change=True):
        if item.del_from_inventory(inventory=self, event=event) and need_change:
            agent.change_quest_inventory(event)

    def refresh(self, agent, event):
        temp_items = self.items[:]
        need_change = False
        for item in temp_items:
            if not item.is_actual(inventory=self, event=event):
                need_change = True
                self.del_item(agent=agent, item=item, event=event, need_change=False)
        if need_change:
            agent.change_quest_inventory(event)

    def get_item_by_uid(self, uid):
        # todo: optimize
        for item in self.items or []:
            if item.uid == uid:
                return item

    def items_by_node_hash(self):
        d = dict()
        for item in self.items:
            d.update({item.node_hash(): item})
        return d


class QuestInventoryField(EmbeddedDocumentField):
    def __init__(self, embedded_document_type=QuestInventory, reinst=True, *av, **kw):
        super(QuestInventoryField, self).__init__(embedded_document_type=QuestInventory, reinst=reinst, *av, **kw)


class QuestItem(Item):
    group_id = StringField(caption=u'Тип квестового айтема')
    starttime = DateTimeField(tags='client', caption=u'Время добавления итема в инвентарь', doc=u'Время старта квеста')
    deadline = IntField(tags='client', caption=u'Время жизни итема в инвентаре', doc=u'')

    effect_title = StringField(caption=u'Наименование эффекта квестового итема для окна персонажа')
    effect_description = StringField(caption=u'Описание эффекта квестового итема для окна персонажа')

    # аддитивные модификаторы скилов
    driving     = FloatField(caption=u"Модификатор навыка вождения", tags='client aggregate')
    shooting    = FloatField(caption=u"Модификатор навыка стрельбы", tags='client aggregate')
    masking     = FloatField(caption=u"Модификатор навыка маскировки", tags='client aggregate')
    leading     = FloatField(caption=u"Модификатор навыка лидерства", tags='client aggregate')
    trading     = FloatField(caption=u"Модификатор навыка торговли", tags='client aggregate')
    engineering = FloatField(caption=u"Модификатор навыка инженеринга", tags='client aggregate')

    # другие модификаторы (как в перках)
    p_visibility_min   = FloatField(caption=u"Коэффициент минимальной заметности", tags="aggregate")
    p_visibility_max   = FloatField(caption=u"Коэффициент максимальной заметности", tags="aggregate")
    p_observing_range  = FloatField(caption=u"Радиус обзора", tags="aggregate")
    max_hp             = FloatField(caption=u"Максимальное значение HP", tags="aggregate")
    r_min              = FloatField(caption=u"Минимальный радиус разворота", tags="aggregate")
    ac_max             = FloatField(caption=u"Максимальная перегрузка при развороте", tags="aggregate")
    max_control_speed  = FloatField(caption=u"Абсолютная максимальная скорость движения", tags="aggregate")
    v_forward          = FloatField(caption=u"Максимальная скорость движения вперед", tags="aggregate")
    v_backward         = FloatField(caption=u"Максимальная скорость движения назад", tags="aggregate")
    a_forward          = FloatField(caption=u"Ускорение разгона вперед", tags="aggregate")
    a_backward         = FloatField(caption=u"Ускорение разгона назад", tags="aggregate")
    a_braking          = FloatField(caption=u"Ускорение торможения", tags="aggregate")
    max_fuel           = FloatField(caption=u"Максимальное количество топлива", tags="aggregate")
    p_fuel_rate        = FloatField(caption=u"Расход топлива (л/с)", tags="aggregate")

    dps_rate           = FloatField(caption=u"Множитель модификации урона автоматического оружия", tags="aggregate")
    damage_rate        = FloatField(caption=u"Множитель модификации урона залпового оружия", tags="aggregate")
    time_recharge_rate = FloatField(caption=u"Множитель модификации времени перезарядки залпового оружия", tags="aggregate")
    radius_rate        = FloatField(caption=u"Множитель модификации дальности стрельбы", tags="aggregate")

    repair_rate = FloatField(caption=u"Скорость отхила в секунду", tags="aggregate")
    repair_rate_on_stay = FloatField(caption=u"Дополнительная скорость отхила в стоячем положении", tags="aggregate")

    crit_rate = FloatField(caption=u"Шанс крита [0 .. сколько угодно, но больше 1 нет смысла]", tags="aggregate")
    crit_power = FloatField(caption=u"Сила крита [0 .. сколько угодно]", tags="aggregate")


    def add_to_inventory(self, inventory, event):
        inventory.items.append(self)
        self.starttime = event.time
        return True

    def del_from_inventory(self, inventory, event):
        if self in inventory.items:
            inventory.items.remove(self)
            return True
        return False

    def is_actual(self, inventory, event):
        return (self.deadline == 0) or (self.starttime + self.deadline > event.time)
