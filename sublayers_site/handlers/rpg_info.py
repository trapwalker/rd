# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_server.model.registry.classes.agents import Agent
from sublayers_server.model.registry.classes.perks import Perk
from sublayers_server.model.utils import serialize

import tornado.web


class GetRPGInfoHandler(BaseSiteHandler):
    def get_perk_rec(self, reg_obj):
        return dict(
            title=reg_obj.title,
            driving_req=reg_obj.driving_req,
            shooting_req=reg_obj.shooting_req,
            masking_req=reg_obj.masking_req,
            leading_req=reg_obj.leading_req,
            trading_req=reg_obj.trading_req,
            engineering_req=reg_obj.engineering_req,
            node_hash=reg_obj.uri,
            perks_req=[perk.uri for perk in reg_obj.perks_req]
        )

    def post(self):
        class_list = []
        for role_class in self.application.reg['world_settings'].role_class_order:
            class_list.append(dict(
                description=role_class.description,
                description__en=role_class.description__en,
                description__ru=role_class.description__ru,
                console_description=role_class.console_description,
                console_description__en=role_class.console_description__en,
                console_description__ru=role_class.console_description__ru,
                title=role_class.title,
                fp_skills=role_class.start_free_point_skills,
                fp_perks=role_class.start_free_point_perks,
                icon=role_class.icon,
                node_hash=role_class.uri,  # todo: rename node_hash -> uri
                start_perks=[self.get_perk_rec(perk) for perk in role_class.start_perks]
            ))
        self.finish({
            'class_list': class_list,
            'avatar_list': self.application.reg['world_settings'].avatar_list
        })


class GetUserRPGInfoHandler(BaseSiteHandler):
    def get_full_site_rpg_settings(self, agent_ex):
        d = dict()
        if agent_ex.role_class:
            d['status'] = 'success'
            d['role_class_title'] = agent_ex.role_class.title
            # Отправить скилы для отображения
            d['show_skills'] = dict(
                driving=agent_ex.driving.calc_value(),
                shooting=agent_ex.shooting.calc_value(),
                masking=agent_ex.masking.calc_value(),
                leading=agent_ex.leading.calc_value(),
                trading=agent_ex.trading.calc_value(),
                engineering=agent_ex.engineering.calc_value(),
            )

            skill_pnt_summ = agent_ex.driving.value + agent_ex.shooting.value + agent_ex.masking.value + \
                                 agent_ex.leading.value + agent_ex.trading.value + agent_ex.engineering.value
            d['free_point_skills'] = agent_ex.role_class.start_free_point_skills - skill_pnt_summ

            # todo: Отправить доступные на данный момент перки
            d['free_point_perks'] = agent_ex.role_class.start_free_point_perks - len(agent_ex.perks)
            # print len(agent_ex.perks), agent_ex.perks
            d['perks'] = []
            for perk in agent_ex.role_class.start_perks:
                if perk.can_apply(agent_ex):
                    d['perks'].append(dict(perk=perk.as_client_dict(), active=perk in agent_ex.perks))
            d['role_class_target_0'] = agent_ex.role_class.class_skills[0].target  # todo: Для подсветки ролевого класса и навыка
        else:
            d['status'] = 'Agent Role class not found'
        return d

    def _inc_skill(self, agent_ex):
        skill_name = self.get_argument('skill_name', None)
        if skill_name in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
            skill_pnt_summ = agent_ex.driving.value + agent_ex.shooting.value + agent_ex.masking.value + \
                             agent_ex.leading.value + agent_ex.trading.value + agent_ex.engineering.value
            role_class_points_available = agent_ex.role_class.start_free_point_skills
            if role_class_points_available >= skill_pnt_summ + 1:
                getattr(agent_ex, skill_name).value += 1

    def _dec_skill(self, agent_ex):
        skill_name = self.get_argument('skill_name', None)
        if skill_name in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
            if getattr(agent_ex, skill_name).value >= 1:
                getattr(agent_ex, skill_name).value -= 1

        # Пройти по перкам агента и те, которые больше не подходят, выключить
        # todo: если перки будут зависеть друг от друга то переписать это
        del_list = []
        for perk in agent_ex.perks:
            if not perk.can_apply(agent_ex):
                del_list.append(perk)
        for perk in del_list:
            agent_ex.perks.remove(perk)

    @tornado.gen.coroutine
    def _set_perk(self, agent_ex):
        perk_uri = self.get_argument('perk_node', None)
        if not perk_uri:
            return
        perk = yield Perk.objects.get(uri=perk_uri)

        if perk in agent_ex.perks:
            # Значит просто выключить
            agent_ex.perks.remove(perk)
        else:
            if (agent_ex.role_class.start_free_point_perks - len(agent_ex.perks) > 0) and perk.can_apply(agent_ex):
                agent_ex.perks.append(perk)

    @tornado.gen.coroutine
    def post(self):
        action = self.get_argument('action', None)
        user = self.current_user
        if user is None:
            self.finish({'status': 'User not auth'})
            return
        # todo: убрать un_cache, когда заработает reload
        agent_ex = yield Agent.objects.get(profile_id=str(user._id), reload=True)
        if agent_ex:
            agent_ex.un_cache()
            agent_ex = yield Agent.objects.get(profile_id=str(user._id), reload=True)
        if agent_ex is None:
            self.finish({'status': 'Agent not found'})
            return         

        if action == 'inc_skill':
            self._inc_skill(agent_ex)
        if action == 'dec_skill':
            self._dec_skill(agent_ex)
        elif action == 'set_perk':
            yield self._set_perk(agent_ex)
        else:
            pass

        yield agent_ex.save()
        self.finish(serialize(self.get_full_site_rpg_settings(agent_ex)))
