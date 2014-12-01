# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sleekxmpp


'''
Для удержания коннекта с джаббер-сервером
'''
class BotXMPPManager(sleekxmpp.ClientXMPP):
    def __init__(self, jid, password):
        sleekxmpp.ClientXMPP.__init__(self, jid, password)
        self.add_event_handler("session_start", self.start)

    def start(self, event):
        print 'start BotXMPPManager'
        self.send_presence()


'''
Для регистрации нового пользователя
'''
class RegisterBot(sleekxmpp.ClientXMPP):
    def __init__(self, jid, password):
        sleekxmpp.ClientXMPP.__init__(self, jid, password)
        self.add_event_handler("session_start", self.start, threaded=True)
        self.add_event_handler("register", self.register, threaded=True)

    def start(self, event):
        self.send_presence()
        self.disconnect()

    def register(self, iq):
        resp = self.Iq()
        resp['type'] = 'set'
        resp['register']['username'] = self.boundjid.user
        resp['register']['password'] = self.password
        try:
            resp.send(now=True)
            print "Account created for %s!" % self.boundjid
        except:
            print 'Errrorrrrrrrrrrr!'


class XMPPManager(object):

    def __init__(self, jid, password, server=('localhost', 5222)):
        super(XMPPManager, self).__init__()
        # сохранение входных параметров
        self.server = server

        self.bot = BotXMPPManager(jid, password)
        # регистрация плагинов для XMPP
        self.bot.register_plugin('xep_0030') # Service Discovery
        self.bot.register_plugin('xep_0004') # Data forms
        self.bot.register_plugin('xep_0030') # Service Discovery
        self.bot.register_plugin('xep_0045') # Multi-User Chat
        self.bot.register_plugin('xep_0066') # Out-of-band Data
        self.bot.register_plugin('xep_0077') # In-band Registration
        self.bot.register_plugin('xep_0199') # XMPP Ping

        if self.bot.connect(self.server):
            print 'manager connected'
            self.bot.process(block=False)


    def register_new_jid(self, jid, password):
        print 'register_new_jid'
        rbot = RegisterBot(jid, password)
        print 'rbot ready'
        rbot.register_plugin('xep_0030') # Service Discovery
        rbot.register_plugin('xep_0004') # Data forms
        rbot.register_plugin('xep_0066') # Out-of-band Data
        rbot.register_plugin('xep_0077') # In-band Registration
        print 'all_plugin ready'
        rbot['xep_0077'].force_registration = True
        print 'pred_if  server = ' + self.server[0]
        if rbot.connect(self.server):
            print 'rbot connected'
            rbot.process(block=True)
            return True
        else:
            return False


    def create_room(self, roomJID):
        self.bot.plugin['xep_0045'].joinMUC(roomJID,
                                        self.bot.jid,
                                        # If a room password is needed, use:
                                        # password=the_room_password,
                                        wait=True)

    def send_message(self, jid, msg):
        self.bot.send_message(mto=jid,
                          mbody=msg,
                          mtype='chat')

    def send_group_message(self, roomJID, msg):
        self.bot.send_message(mto=roomJID,
                          mbody=msg,
                          mtype='groupchat')

    def invite_to_room(self, roomJID, jid):
        if not (roomJID in self.bot.plugin['xep_0045'].rooms):
            self.create_room(roomJID)
        self.bot.plugin['xep_0045'].invite(roomJID, jid)


    def kick_from_room(self, roomJID, nick=None, jid=None):
        # todo: просто setRole None
        tnick = nick or jid.split('@')[0]
        if tnick:
            if not (roomJID in self.bot.plugin['xep_0045'].rooms):
                self.create_room(roomJID)
            self.bot.plugin['xep_0045'].setRole(roomJID, nick, 'none')


    def change_password(self, jid, old_pass, new_pass):
        pass


if __name__ == '__main__':
    print 'start'
    manager = XMPPManager(jid='test1@andrey-pc', password='1', server=('localhost', 5222))
    print 'manager is ready'
    # todo настроить сервер, чтобы не запрещал частую регистрацию пользователей
    '''if manager.register_new_jid(u'test9@andrey-pc', u'9'):
        print 'register_on'
    else:
        print 'off'
    '''

    room = 'room15@conference.andrey-pc'
    #manager.create_room(room)
    #manager.kick_from_room(room, 'dima1')
    
    # todo: test send_message




