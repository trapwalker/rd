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
        # Отправить скилы для расчётов
        d['pure_skills'] = dict(
            driving=agent_ex.driving.value,
            shooting=agent_ex.shooting.value,
            masking=agent_ex.masking.value,
            leading=agent_ex.leading.value,
            trading=agent_ex.trading.value,
            engineering=agent_ex.engineering.value,
        )

        # Отправить скилы для отображения
        d['show_skills'] = dict(
            driving=agent_ex.driving.calc_value(),
            shooting=agent_ex.shooting.calc_value(),
            masking=agent_ex.masking.calc_value(),
            leading=agent_ex.leading.calc_value(),
            trading=agent_ex.trading.calc_value(),
            engineering=agent_ex.engineering.calc_value(),
        )

        # Отправить доступные на данный момент навыки
        # todo: разобраться со свободными очками, как они вычисляются или где храняться
        return d
    
    @tornado.web.authenticated
    def post(self):
        action = self.get_argument('action', None)
        user = self.current_user
        agent_ex = self.application.reg_agents.get([str(user._id)])
        if agent_ex is None:
            self.send_error(status_code=404)
            return         

        if action == 'set_skills':
            driving = self.get_argument('driving', None)
            shooting = self.get_argument('shooting', None)
            masking = self.get_argument('masking', None)
            leading = self.get_argument('leading', None)
            trading = self.get_argument('trading', None)
            engineering = self.get_argument('engineering', None)
            # todo: Проверить их на None

            rqst_skill_pnt = driving + shooting + masking + leading + trading + engineering
            role_class_points_available = 10  # todo: забрать из агента

            if (rqst_skill_pnt <= role_class_points_available and driving >= 0 and shooting >= 0 and
                        masking >= 0 and leading >= 0 and trading >= 0 and engineering >= 0):
                agent_ex.driving.value = driving
                agent_ex.shooting.value = shooting
                agent_ex.masking.value = masking
                agent_ex.leading.value = leading
                agent_ex.trading.value = trading
                agent_ex.engineering.value = engineering

        elif action == 'set_perk':
            # todo: установить перки, если возможно
            pass
        else:
            pass

        self.application.reg_agents.save_node(agent_ex)
        self.finish(self.get_full_site_rpg_settings(agent_ex))