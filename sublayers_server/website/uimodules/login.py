# -*- coding: UTF-8 -*-

from tornado.web import UIModule


class LoginForm(UIModule):
    def css_files(self):
        return "css/website/module-login.css"

    def javascript_files(self):
        return "js/website/module-login.js"

    def render(self):
        return self.render_string("module-login.html")