# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler

import tornado


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


