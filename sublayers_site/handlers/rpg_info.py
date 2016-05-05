# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler

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
            node_hash=reg_obj.node_hash(),
            perks_req=[self.application.reg[link].node_hash() for link in reg_obj.perks_req]
        )

    def post(self):
        class_list = []
        for role_class in self.application.reg['/rpg_settings/role_class'].deep_iter():
            class_list.append(dict(
                title=role_class.title,
                fp_skills=role_class.start_free_point_skills,
                fp_perks=role_class.start_free_point_perks,
                icon=role_class.icon,
                node_hash=role_class.node_hash(),
                start_perks=[self.get_perk_rec(self.application.reg[perk]) for perk in role_class.start_perks]
            ))
        self.finish({
            'class_list': class_list,
            'avatar_list': self.application.reg['/world_settings'].values.get('avatar_list')
        })


class GetUserRPGInfoHandler(BaseSiteHandler):
    def get_full_site_rpg_settings(self, agent_ex):
        d = dict()
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

    @tornado.web.authenticated
    def post(self):
        action = self.get_argument('action', None)
        user = self.current_user
        agent_ex = self.application.reg_agents.get([str(user._id)])
        if agent_ex is None:
            self.send_error(status_code=404)
            return         

        if action == 'inc_skill':
            self._inc_skill(agent_ex)
        if action == 'dec_skill':
            self._dec_skill(agent_ex)
        elif action == 'set_perk':
            # todo: установить перки, если возможно
            pass
        else:
            pass

        self.application.reg_agents.save_node(agent_ex)
        self.finish(self.get_full_site_rpg_settings(agent_ex))