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
        # print 'start BotXMPPManager'
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
            log.info("Account created for %s!", self.boundjid)
        except:
            log.info("Account not created for %s!", self.boundjid)


class XMPPManager(object):

    def __init__(self, jid, password, server=('localhost', 5222), host_name='example.com'):
        super(XMPPManager, self).__init__()
        # сохранение входных параметров
        self.server = server
        self.host_name = host_name

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
            log.info('XMPPManager connected to {}'.format(server))
            self.bot.process(block=False)


    def register_new_jid(self, jid, password):
        rbot = RegisterBot(jid, password)
        rbot.register_plugin('xep_0030') # Service Discovery
        rbot.register_plugin('xep_0004') # Data forms
        rbot.register_plugin('xep_0066') # Out-of-band Data
        rbot.register_plugin('xep_0077') # In-band Registration
        rbot['xep_0077'].force_registration = True
        if rbot.connect(self.server):
            rbot.process(block=True)
            return True
        else:
            return False


    def create_room(self, room):
        room_jid = room + '@conference.' + self.host_name
        self.bot.plugin['xep_0045'].joinMUC(room_jid,
                                        self.bot.jid,
                                        # If a room password is needed, use:
                                        # password=the_room_password,
                                        wait=True)
        return room_jid

    def send_message(self, jid, msg):
        self.bot.send_message(mto=jid,
                          mbody=msg,
                          mtype='chat')

    def send_group_message(self, roomJID, msg):
        self.bot.send_message(mto=roomJID,
                          mbody=msg,
                          mtype='groupchat')

    def invite_to_room(self, room_jid, jid):
        if not (room_jid in self.bot.plugin['xep_0045'].rooms):
            self.create_room(room_jid)
        nick = jid.split('@')[0]
        # log.debug('=================!!!!!!!!!!!!!!!!!!!!!!!!!!!%s', self.bot.plugin['xep_0045'].rooms[room_jid])
        if nick in self.bot.plugin['xep_0045'].rooms[room_jid]:
            log.debug('=================!!!!!!!!!!!!!!!!!!!!!!!!!!!Im still here')
        else:
            self.bot.plugin['xep_0045'].invite(room_jid, jid)


    def kick_from_room(self, room_jid, jid):
        # проверка - находится ли jid в комнате
        nick = jid.split('@')[0]

        if nick:
            if not (room_jid in self.bot.plugin['xep_0045'].rooms):
                self.create_room(room_jid)
            if nick in self.bot.plugin['xep_0045'].rooms[room_jid]:
                self.bot.plugin['xep_0045'].setRole(room_jid, nick, 'none')
            log.debug(nick in self.bot.plugin['xep_0045'].rooms[room_jid])

    def change_password(self, jid, new_pass):
        self.bot.plugin['xep_0077'].change_password(jid='srv@example.com', password=new_pass)


if __name__ == '__main__':
    '''
    print 'start'
    manager = XMPPManager(jid='srv@example.com', password='44', server=('localhost', 5222))
    print 'manager is ready'
    '''

    '''
    if manager.register_new_jid(u'user2@example.com', u'2'):
        print '1 register_on'
    else:
        print '1 off'
    if manager.register_new_jid(u'user2@example.com', u'22'):
        print '2 register_on'
    else:
        print '2 off'
    '''


    #room = 'room15@conference.andrey-pc'
    #manager.create_room(room)
    #manager.kick_from_room(room, 'dima1')

    # первое создание первого аккаунта
    print 'register_new_jid'
    rbot = RegisterBot('srv@example.com', '1')
    print 'rbot ready'
    rbot.register_plugin('xep_0030') # Service Discovery
    rbot.register_plugin('xep_0004') # Data forms
    rbot.register_plugin('xep_0066') # Out-of-band Data
    rbot.register_plugin('xep_0077') # In-band Registration
    print 'all_plugin ready'
    server=('localhost', 5222)
    rbot['xep_0077'].force_registration = True
    print 'pred_if  server = ' + server[0]
    if rbot.connect(server):
        print 'rbot connected'
        rbot.process(block=True)
        print True
    else:
        print False



    # todo: test send_message




