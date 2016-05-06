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
                description=role_class.description,
                console_description=role_class.console_description,
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
            # d['perks'] = []
            # for perk in self.application.reg['/rpg_settings/perks'].deep_iter():
            #     if perk.can_apply(agent_ex):
            #         d['perks'].append(
            #             dict(
            #                 perk=perk.as_client_dict(),
            #                 active=perk in agent_ex.perks,
            #             ))

            # d['role_class_target_0'] = # todo: Для подсветки ролевого класса и навыка
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
        # del_list = []
        # for perk_node in agent_ex.perks:
        #     perk = self.application.reg[perk_node]
        #     if not perk.can_apply(agent_ex):
        #         del_list.append(perk_node)
        # for perk_node in agent_ex.perks:
        #     agent_ex.perks.remove(perk_node)

    def _set_perk(self, agent_ex):
        perk_node = self.get_argument('perk_node', None)
        if not perk_node:
            return
        perk = self.application.reg[perk_node]
        # todo: Проверить работу включения и отключения перков
        if perk in agent_ex.perks:
            # Значит просто выключить
            # print 'delete perk !!!', perk
            agent_ex.perks.remove(perk)
        else:
            # print 'Try to append perk', perk
            if (agent_ex.role_class.start_free_point_perks - len(agent_ex.perks) > 0) and perk.can_apply(agent_ex):
                # print 'Add perk', perk
                agent_ex.perks.append(perk_node)

    @tornado.web.authenticated
    def post(self):
        action = self.get_argument('action', None)
        user = self.current_user
        agent_ex = self.application.reg_agents.get([str(user._id)])
        if agent_ex is None:
            self.finish({'status': 'Agent not found'})
            return         

        if action == 'inc_skill':
            self._inc_skill(agent_ex)
        if action == 'dec_skill':
            self._dec_skill(agent_ex)
        elif action == 'set_perk':
            pass
            # self._set_perk(agent_ex)
        else:
            pass

        self.application.reg_agents.save_node(agent_ex)
        self.finish(self.get_full_site_rpg_settings(agent_ex))