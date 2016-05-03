# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class MainMenuCharacterHandler(BaseHandler):
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = agent.example.experience_table.by_exp(
            exp=agent.stat_log.get_metric('exp'))

        skill_free_point = lvl - agent.example.driving.value - agent.example.shooting.value - \
                           agent.example.masking.value - agent.example.leading.value - \
                           agent.example.trading.value - agent.example.engineering.value
        perk_free_point = lvl - len(agent.example.perks)

        for perk in agent.example.perks:
            log.debug(perk.title)

        self.render("main_menu_character_window.html", agent=agent, skill_free_point=skill_free_point,
                    perk_free_point=perk_free_point)
