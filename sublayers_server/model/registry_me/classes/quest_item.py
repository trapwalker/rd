# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.item import Item
from sublayers_server.model.messages import ArcadeTextMessage
from tornado.template import Template
from sublayers_server.model.registry_me.tree import (
    Subdoc, 
    StringField, ListField, IntField, FloatField, EmbeddedDocumentField, DateTimeField,
    EmbeddedNodeField,
    LocalizedStringField,
)


class QuestInventory(Subdoc):
    items = ListField(
        reinst=True,
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.quest_item.QuestItem'),
    )

    def add_item(self, agent, item, event, need_change=True):
        if item.add_to_inventory(inventory=self, event=event) and need_change:
            agent.profile.change_quest_inventory(event)
            ArcadeTextMessage(agent=agent.profile._agent_model, time=event.time, arcade_message_type='quest_item').post()

    def del_item(self, agent, item, event, need_change=True):
        if item.del_from_inventory(inventory=self, event=event) and need_change:
            agent.profile.change_quest_inventory(event)

    def del_all_items_by_group(self, group, event):
        items_delete = [item for item in self.items if item.group_id == group]
        for item in items_delete:
            self.del_item(agent=None, item=item, event=event, need_change=False)

    def refresh(self, agent, event):
        temp_items = self.items[:]
        need_change = False
        for item in temp_items:
            if not item.is_actual(inventory=self, event=event):
                need_change = True
                self.del_item(agent=agent, item=item, event=event, need_change=False)
        if need_change:
            agent.profile.change_quest_inventory(event)

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
    def __init__(self, document_type=QuestInventory, reinst=True, **kw):
        super(QuestInventoryField, self).__init__(document_type=document_type, reinst=reinst,  **kw)


class QuestItem(Item):
    group_id = StringField(caption=u'Тип квестового айтема')
    starttime = FloatField(tags={'client'}, caption=u'Время добавления итема в инвентарь', doc=u'Время старта квеста')
    deadline = IntField(tags={'client'}, caption=u'Время жизни итема в инвентаре', doc=u'')

    effect_title = LocalizedStringField(caption=u'Наименование эффекта квестового итема для окна персонажа')
    effect_description = LocalizedStringField(caption=u'Описание эффекта квестового итема для окна персонажа')

    # аддитивные модификаторы скилов
    driving     = FloatField(caption=u"Модификатор навыка вождения", tags={'client', 'aggregate'})
    shooting    = FloatField(caption=u"Модификатор навыка стрельбы", tags={'client', 'aggregate'})
    masking     = FloatField(caption=u"Модификатор навыка маскировки", tags={'client', 'aggregate'})
    leading     = FloatField(caption=u"Модификатор навыка лидерства", tags={'client', 'aggregate'})
    trading     = FloatField(caption=u"Модификатор навыка торговли", tags={'client', 'aggregate'})
    engineering = FloatField(caption=u"Модификатор навыка инженеринга", tags={'client', 'aggregate'})

    # другие модификаторы (как в перках)
    p_visibility_min   = FloatField(caption=u"Коэффициент минимальной заметности", tags={"aggregate"})
    p_visibility_max   = FloatField(caption=u"Коэффициент максимальной заметности", tags={"aggregate"})
    p_observing_range  = FloatField(caption=u"Радиус обзора", tags={"aggregate"})
    max_hp             = FloatField(caption=u"Максимальное значение HP", tags={"aggregate"})
    r_min              = FloatField(caption=u"Минимальный радиус разворота", tags={"aggregate"})
    mobility           = FloatField(caption=u"Манёвренность при поворотах", tags={"aggregate"})  # former ac_max
    max_control_speed  = FloatField(caption=u"Абсолютная максимальная скорость движения", tags={"aggregate"})
    v_forward          = FloatField(caption=u"Максимальная скорость движения вперед", tags={"aggregate"})
    v_backward         = FloatField(caption=u"Максимальная скорость движения назад", tags={"aggregate"})
    a_forward          = FloatField(caption=u"Ускорение разгона вперед", tags={"aggregate"})
    a_backward         = FloatField(caption=u"Ускорение разгона назад", tags={"aggregate"})
    a_braking          = FloatField(caption=u"Ускорение торможения", tags={"aggregate"})
    max_fuel           = FloatField(caption=u"Максимальное количество топлива", tags={"aggregate"})
    p_fuel_rate        = FloatField(caption=u"Расход топлива (л/с)", tags={"aggregate"})

    dps_rate           = FloatField(caption=u"Множитель модификации урона автоматического оружия", tags={"aggregate"})
    damage_rate        = FloatField(caption=u"Множитель модификации урона залпового оружия", tags={"aggregate"})
    time_recharge_rate = FloatField(caption=u"Множитель модификации времени перезарядки залпового оружия", tags={"aggregate"})
    radius_rate        = FloatField(caption=u"Множитель модификации дальности стрельбы", tags={"aggregate"})

    repair_rate         = FloatField(caption=u"Процент ХП восстанавливающийся каждую секунду", tags={"aggregate"})
    repair_rate_on_stay = FloatField(caption=u"Процент ХП восстанавливающийся каждую секунду в стоячем положении", tags={"aggregate"})

    crit_rate           = FloatField(caption=u"Шанс крита [0 .. сколько угодно, но больше 1 нет смысла]", tags={"aggregate"})
    crit_power          = FloatField(caption=u"Сила крита [0 .. сколько угодно]", tags={"aggregate"})

    HTML_DESCRIPTION_TEMPLATE = Template(u"""            
        {% set text_description = _(this.description) %}
        {% if text_description %}
            <div class="description-line">{{ text_description }}</div>
        {% end %}
    """, whitespace='oneline')

    def add_to_inventory(self, inventory, event):
        if self.group_id:
            inventory.del_all_items_by_group(group=self.group_id, event=event)
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

    def get_agent_effect_dict(self):
        if self.effect_title and self.effect_description:
            return dict(
                source=self.title,
                title=self.effect_title,
                description=self.effect_description,
                deadline=0 if self.deadline == 0 else self.deadline + self.starttime
            )
        return None
