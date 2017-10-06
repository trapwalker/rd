# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
import tornado.web

from tornado.options import options
from sublayers_common.user_profile import User


class SiteMainHandler(BaseSiteHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!

        # Редирект для переезда
        log.debug('### engine/play:: host={self.request.host}; uri={self.request.uri}; path={self.request.path}; query={self.request.query}'.format(**locals()))
        if self.request.host == 'roaddogs.ru':
            if self.get_argument('mode', None) == 'electron':
                self.redirect('{self.request.protocol}://eu.roaddogs.online/static/connection_trouble.html'.format(**locals()))
            else:
                self.redirect('{self.request.protocol}://eu.roaddogs.online'.format(**locals()))
        ############################################

        # Если есть язык в параметрах, то убрать этот параметр и редиректнуть на сайт без этого параметра
        param_lang = self.get_argument("lang", "")
        if param_lang and param_lang in ["en", "ru"]:
            self.set_cookie('lang', param_lang, path="/", expires_days=356)
            self.user_lang = param_lang
            # info: Если будет глючить, то просто оставить первую часть (установка в куку lang - param_lang)
            len_of_arguments = len(self.request.arguments.keys())
            replace_str = '?lang={}'.format(param_lang) if len_of_arguments == 1 else 'lang={}'.format(param_lang)
            replace_str2 = "{}{}".format("&", replace_str)
            new_uri = self.request.uri.replace(replace_str2, "")
            new_uri = new_uri.replace(replace_str, "")
            self.redirect(new_uri)
            return

        # Подготовка списка новостей
        news_list = self.application.news_manager.news_by_locale(locale=self.user_lang)
        # Узнать количество пользователей (онлайн пока не делаем, так как не хотим делать запрос к серверу)
        users_count = User.objects.count()  # todo: ##OPTIMIZE

        # Загружаем информацию о быстрой игре
        quick_game_info = self._get_quick_game()

        # if self.current_user:
        #     self.set_cookie("forum_user", get_forum_cookie_str(self.current_user.name))

        mode = self.get_argument("mode", "")

        if mode == "":
            self.render(
                'site_main.html',
                news_list=news_list,
                quick_game_cars=quick_game_info.get('quick_cars', []),
                all_users_registered=users_count,
                user_lang=self.user_lang,
                community_link_en=options.community_link_en,
                community_link_ru=options.community_link_ru,
            )
        elif mode == "electron":
            self.set_cookie("server_host", "true", expires_days=180)
            self.render('electron_site.html', user=self.current_user, user_lang=self.user_lang,)
        else:
            self.finish("OK")


class SitePingHandler(tornado.web.RequestHandler):
    def get(self):
        self.finish("OK")


class SiteCheckAuthId(tornado.web.RequestHandler):
    def get(self):
        social = self.get_argument("social", "")
        uid = self.get_argument("uid", "")
        if social and uid:
            if social == "steam":
                user = User.get_by_steam_id(uid=uid)
            elif social == "vk":
                user = User.get_by_vk_id(uid=uid)
            elif social == "fb":
                user = User.get_by_fb_id(uid=uid)
            elif social == "twitter":
                user = User.get_by_twitter_id(uid=uid)
            else:
                self.send_error(415, reason="Social type not supported")
                return
            if user:
                self.finish(dict(uid=str(user.pk), login=user.name))
            else:
                self.finish(dict(uid=""))
        else:
            self.send_error(415, reason="Bad arguments")

