#!/usr/bin/env python

import logging.config
logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import signal
import os
from tornado.options import define, options

from static import StaticFileHandlerPub
from main import MainHandler, AuthLoginHandler, AuthGoogleHandler, AuthLogoutHandler
import uimodules

define("cookie_secret", help="cookie secret key", type=str)
define("static_path", default=os.path.join(os.path.dirname(__file__), "static"), help="path to static files", type=str)
define("pidfile", default=None, help="filename for pid store", type=str)
define("port", default=80, help="run on the given port", type=int)
# todo: logging config file path define as tornado option


class Application(tornado.web.Application):
    def __init__(self):
        log.info('\n' + '=-' * 70 + '\nWEBSITE SERVICE STARTED\n' + '--' * 70)

        handlers = [
            (r"/", MainHandler),
            (r"/edit", tornado.web.RedirectHandler, {"url": "/static/editor.html"}),
            #(r"/", tornado.web.RedirectHandler, {"url": "/static/view.html"}),
            (r"/static/(.*)", StaticFileHandlerPub),

            (r"/auth/login", AuthLoginHandler),
            (r"/auth/login/google", AuthGoogleHandler),
            (r"/auth/logout", AuthLogoutHandler),
        ]
        settings = dict(
            cookie_secret=options.cookie_secret,
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=options.static_path,
            xsrf_cookies=True,
            ui_modules=uimodules,
            login_url="/auth/login",
            debug=True,
        )
        tornado.web.Application.__init__(self, handlers, **settings)

    def stop(self):
        log.debug('====== ioloop before stop')
        tornado.ioloop.IOLoop.instance().stop()
        log.debug('====== ioloop after stop')

    def on_stop(self):
        pass

        
def main():
    import socket

    def on_exit(sig, func=None):
        print '====== terminate', sig, func
        log.debug('====== exit handler triggered')
        app.stop()

    signal.signal(signal.SIGTERM, on_exit)

    tornado.options.parse_config_file('server.conf', final=False)
    try:
        tornado.options.parse_config_file('server.local.conf', final=False)
    except IOError as e:
        log.warning('Local configuration file load FAIL: %s', e)
    else:
        log.info('Local configuration file load OK')
    tornado.options.parse_command_line(final=True)

    pid = os.getpid()
    log.info('Service started with PID=%s', pid)
    if options.pidfile:
        try:
            with open(options.pidfile, 'w') as f_pid:
                f_pid.write(str(pid))
        except Exception as e:
            log.error("[FAIL] Can't store PID into the file '%s': %s", options.pidfile, e)
        else:
            log.info("[DONE] PID stored into the file '%s'", options.pidfile)

    app = Application()
    try:
        app.listen(options.port)
    except socket.error as e:
        log.critical(e)
        print e
    except Exception as e:
        log.critical(e)
        print e
    else:
        log.debug('====== ioloop before start')
        tornado.ioloop.IOLoop.instance().start()
        log.debug('====== ioloop after start')
    finally:
        log.debug('====== finally before stop')
        app.stop()
        log.debug('====== finally after stop')


if __name__ == "__main__":
    main()
