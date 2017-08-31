# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_server.model.registry_me.classes.perks import Perk
from sublayers_server.model.utils import serialize
from sublayers_common.site_locale import locale


class GetRPGInfoHandler(BaseSiteHandler):
    def get_perk_rec(self, reg_obj):
        return dict(
            title=locale(self.user_lang, reg_obj.title),
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
        for role_class in self.application.reg.get('/registry/world_settings').role_class_order:
            class_list.append(dict(
                description=locale(self.user_lang, role_class.description),
                console_description=locale(self.user_lang, role_class.console_description),
                title=locale(self.user_lang, role_class.title),
                fp_skills=role_class.start_free_point_skills,
                fp_perks=role_class.start_free_point_perks,
                icon=role_class.icon,
                node_hash=role_class.uri,  # todo: rename node_hash -> uri
                start_perks=[self.get_perk_rec(perk) for perk in role_class.start_perks]
            ))
        self.finish({
            'class_list': class_list,
            'avatar_list': self.application.reg.get('/registry/world_settings').avatar_list
        })


class GetUserRPGInfoHandler(BaseSiteHandler):
    def get_full_site_rpg_settings(self, agent_ex):
        d = dict()
        if agent_ex.profile.role_class:
            d['status'] = 'success'
            d['role_class_title'] = agent_ex.profile.role_class.title
            # Отправить скилы для отображения
            d['show_skills'] = dict(
                driving=agent_ex.profile.driving.calc_value(),
                shooting=agent_ex.profile.shooting.calc_value(),
                masking=agent_ex.profile.masking.calc_value(),
                leading=agent_ex.profile.leading.calc_value(),
                trading=agent_ex.profile.trading.calc_value(),
                engineering=agent_ex.profile.engineering.calc_value(),
            )

            skill_pnt_summ = (
                agent_ex.profile.driving.value +
                agent_ex.profile.shooting.value +
                agent_ex.profile.masking.value +
                agent_ex.profile.leading.value +
                agent_ex.profile.trading.value +
                agent_ex.profile.engineering.value
            )
            d['free_point_skills'] = agent_ex.profile.role_class.start_free_point_skills - skill_pnt_summ

            # todo: Отправить доступные на данный момент перки
            d['free_point_perks'] = agent_ex.profile.role_class.start_free_point_perks - len(agent_ex.profile.perks)
            # print len(agent_ex.profile.perks), agent_ex.profile.perks
            d['perks'] = []
            for perk in agent_ex.profile.role_class.start_perks:
                if perk.can_apply(agent_ex):
                    d['perks'].append(dict(perk=perk.as_client_dict(), active=perk in agent_ex.profile.perks))
            d['role_class_target_0'] = agent_ex.profile.role_class.class_skills[0].target  # todo: Для подсветки ролевого класса и навыка
        else:
            d['status'] = 'Agent Role class not found'
        return d

    def _inc_skill(self, agent_ex):
        skill_name = self.get_argument('skill_name', None)
        if skill_name in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
            skill_pnt_summ = (
                agent_ex.profile.driving.value +
                agent_ex.profile.shooting.value +
                agent_ex.profile.masking.value +
                agent_ex.profile.leading.value +
                agent_ex.profile.trading.value +
                agent_ex.profile.engineering.value
            )
            role_class_points_available = agent_ex.profile.role_class.start_free_point_skills
            if role_class_points_available >= skill_pnt_summ + 1:
                getattr(agent_ex.profile, skill_name).value += 1

    def _dec_skill(self, agent_ex):
        skill_name = self.get_argument('skill_name', None)
        if skill_name in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
            if getattr(agent_ex.profile, skill_name).value >= 1:
                getattr(agent_ex.profile, skill_name).value -= 1

        # Пройти по перкам агента и те, которые больше не подходят, выключить
        # todo: если перки будут зависеть друг от друга то переписать это
        del_list = []
        for perk in agent_ex.profile.perks:
            if not perk.can_apply(agent_ex):
                del_list.append(perk)
        for perk in del_list:
            agent_ex.profile.perks.remove(perk)

    def _set_perk(self, agent_ex):
        perk_uri = self.get_argument('perk_node', None)
        if not perk_uri:
            return
        perk = self.application.reg.get(perk_uri)
        assert isinstance(perk, Perk)

        if perk in agent_ex.profile.perks:
            # Значит просто выключить
            agent_ex.profile.perks.remove(perk)
        else:
            if (  # TODO: ##REVIEW menkent, abbir
                (agent_ex.profile.role_class.start_free_point_perks - len(agent_ex.profile.perks) > 0) and
                perk.can_apply(agent_ex)
            ):
                agent_ex.profile.perks.append(perk)

    def post(self):
        action = self.get_argument('action', None)
        user = self.current_user
        if user is None:
            self.finish({'status': 'User not auth'})
            return

        agent_ex = Agent.objects.filter(user_id=str(user.pk)).first()

        if agent_ex is None:
            self.finish({'status': 'Agent not found'})
            return         

        if action == 'inc_skill':
            self._inc_skill(agent_ex)
        if action == 'dec_skill':
            self._dec_skill(agent_ex)
        elif action == 'set_perk':
            self._set_perk(agent_ex)
        else:
            pass

        agent_ex.save()
        self.finish(serialize(self.get_full_site_rpg_settings(agent_ex)))
