# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging

log = logging.getLogger(__name__)


from sublayers_server.handlers.adm_api.html_adms_base import AdmEngineHandler

from sublayers_common.user_profile import User
from datetime import datetime, timedelta

from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_common.adm_mongo_logs import AdminLogRecord

from ctx_timer import Timer

import uuid


class AdmUserInfoHandler(AdmEngineHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        username = self.get_argument("username", "")
        server = self.application.srv
        user = self.get_user(username=username)
        if user:
            self.render("adm/user.html", user=user, server=server, ban_seconds_left=user.get_banned_seconds())
        else:
            self.send_error(404)

    def post(self):
        username = self.get_argument("username", "")
        user = self.get_user(username=username)
        if user is None:
            self.send_error(404)  # Ненайдено
            return
        # if self.user_online(username=user.name):
        #     self.send_error(503, reason="Agent Online. You should banned user for sometime.")  # Запрещено менять пользователей, которые онлайн
        #     return
        action = self.get_argument('action', '')

        if action == 'ban':
            if self.current_user.access_level < user.access_level:
                self.send_error(503, reason='You access level < target_user access level')
                return
            minutes = int(self.get_argument('minutes', 0))
            reason = self.get_argument('reason', "")
            if minutes > 0:
                ban_time = datetime.now() + timedelta(minutes=minutes)
                user.ban_time = ban_time
                user.ban_reason = reason
                user.save()
                self.application.srv.disconnect_agent_by_name(user.name)
                self.finish('{} banned before {}.'.format(user.name, ban_time))
                return
            if minutes < 0:
                user.ban_reason = ""
                user.ban_time = datetime.fromtimestamp(0)
                user.save()
                self.finish('{} unbanned'.format(user.name))
                return

        if action == 'access_level':
            cu_access_level = self.current_user.access_level
            if cu_access_level <= user.access_level:
                self.send_error(503, reason='You access level <= target_user access level')
                return
            new_level = max(int(self.get_argument('new_level', 0)), 0)
            if new_level >= cu_access_level:
                self.send_error(503, reason='You access level {}, You will set max level = {}'.format(cu_access_level, cu_access_level - 1))
                return

            # todo: поставить через post запрос к локальному серверу, чтобы всё работало через елиные механизмы
            user.access_level = new_level
            user.save()
            self.finish("Access level for {} changed to: {}".format(user, new_level))
            return

        self.finish('OK')


class AdmAgentInfoHandler(AdmEngineHandler):
    def get_agent(self, user):
        online_agent = self.application.srv.agents_by_name.get(user.name, None)
        return online_agent and online_agent.example or Agent.objects.filter(user_id=str(user.pk), quick_flag=False).first()

    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        username = self.get_argument("username", "")
        server = self.application.srv
        user = self.get_user(username=username)
        agent = user and self.get_agent(user)
        if user and agent:
            self.render("adm/agent.html", user=user, agent=agent.profile, server=server)
        else:
            self.send_error(404)

    def post(self):
        username = self.get_argument("username", "")
        user = self.get_user(username=username)
        if user is None:
            self.send_error(404)  # Ненайдено
            return
        if self.user_online(username=user.name):
            self.send_error(503, reason="Agent Online. You should banned user for sometime.")  # Запрещено менять пользователей, которые онлайн
            return
        agent = user and self.get_agent(user)
        if agent is None:
            self.send_error(404, reason='Agent <{}> not found'.format(user.name))
            return

        action = self.get_argument('action', '')

        self.finish('OK')


class AdmAgentQuestsInfoHandler(AdmAgentInfoHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        username = self.get_argument("username", "")
        server = self.application.srv
        user = self.get_user(username=username)
        agent = user and self.get_agent(user)
        if user and agent:
            self.render("adm/quests.html", user=user, agent=agent.profile, server=server)
        else:
            self.send_error(404)

    def post(self):
        username = self.get_argument("username", "")
        user = self.get_user(username=username)
        if user is None:
            self.send_error(404)  # Ненайдено
            return
        if self.user_online(username=user.name):
            self.send_error(503, reason="Agent Online. You should banned user for sometime.")  # Запрещено менять пользователей, которые онлайн
            return
        agent = user and self.get_agent(user)
        if agent is None:
            self.send_error(404, reason='Agent <{}> not found'.format(user.name))
            return

        action = self.get_argument('action', '')

        if action == 'del':
            quest_uid = self.get_argument('quest_uid', "")
            profile = agent.profile
            quest = quest_uid and profile.get_quest(uuid.UUID(quest_uid))
            if quest is not None:
                # Если найден квест, то удалить его и все его ноты
                if quest in profile.quests_unstarted:
                    profile.quests_unstarted.remove(quest)
                if quest in profile.quests_active:
                    profile.quests_active.remove(quest)
                if quest in profile.quests_ended:
                    profile.quests_ended.remove(quest)
                # Удаление всех нот этого квеста
                notes = [note for note in profile.notes if note.quest_uid == quest.uid]
                for note in notes:
                    profile.notes.remove(note)
                agent.save()
                self.finish('Quest <{}> deleted.'.format(quest.caption and quest.caption.en))
            else:
                self.finish('Quest with uid <{}> not found.'.format(quest_uid))
            return



        self.finish('OK')


class AdmAgentQuestsInventoryHandler(AdmAgentInfoHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        username = self.get_argument("username", "")
        server = self.application.srv
        user = self.get_user(username=username)
        agent = user and self.get_agent(user)
        if user and agent:
            self.render("adm/quests_inventory.html", user=user, agent=agent.profile, server=server)
        else:
            self.send_error(404)

    def post(self):
        username = self.get_argument("username", "")
        user = self.get_user(username=username)
        if user is None:
            self.send_error(404)  # Ненайдено
            return
        if self.user_online(username=user.name):
            self.send_error(503, reason="Agent Online. You should banned user for sometime.")  # Запрещено менять пользователей, которые онлайн
            return
        agent = user and self.get_agent(user)
        if agent is None:
            self.send_error(404, reason='Agent <{}> not found'.format(user.name))
            return

        action = self.get_argument('action', '')

        if action == 'del':
            item_uid = self.get_argument('item_uid', "")
            profile = agent.profile
            item = item_uid and profile.quest_inventory.get_item_by_uid(uuid.UUID(item_uid))
            if item:
                if item is profile.insurance:
                    self.send_error(503, reason="Delete insurance item not access")
                    return
                profile.quest_inventory.items.remove(item)
                agent.save()
                self.finish('QuestItem <{}> deleted.'.format(item.title and item.title.en))
            else:
                self.finish('QuestItem with uid <{}> not found.'.format(item_uid))
            return

        self.finish('OK')


class AdmAgentNPCRelationsHandler(AdmAgentInfoHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        username = self.get_argument("username", "")
        server = self.application.srv
        user = self.get_user(username=username)
        agent = user and self.get_agent(user)
        if user and agent:
            self.render("adm/npc_relations.html", user=user, agent=agent.profile, server=server)
        else:
            self.send_error(404)


class AdmUserHystoryHandler(AdmEngineHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        username = self.get_argument("username", "")
        server = self.application.srv
        user = self.get_user(username=username)
        if user:
            types = filter(lambda x: x, self.get_argument("types", "").split('.'))
            limit = int(self.get_argument("limit", 20))

            with Timer() as tm:
                if types:
                    adm_logs = AdminLogRecord.objects.filter(user_uid=str(user.pk),
                                                             type__in=types).order_by('-created').limit(limit)
                else:
                    adm_logs = AdminLogRecord.objects.filter(user_uid=str(user.pk)).order_by('-created').limit(limit)

            if tm.duration > 0.3:
                log.debug('Warning! AdmUserHystoryHandler works %.4fs', tm.duration)
                # info: если это будет возникать часто, то заменить на обычное обращение к монге через collection.find

            self.render("adm/gamelogs.html", user=user, server=server, adm_logs=adm_logs)
        else:
            self.send_error(404)
