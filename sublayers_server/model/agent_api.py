# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import units
from datetime import datetime
from vectors import Point
from api_tools import API, public_method
from utils import serialize
from messages import ChatMessage


def make_push_package(events):
    if hasattr(events, 'as_dict'):
        events = events.as_dict()
    else:
        events = [event.as_dict() for event in events]

    return dict(
        message_type='push',
        events=events,
    )


class AgentAPI(API):
    def __init__(self, agent, position=None, position_sigma=Point(0, 0)):
        super(AgentAPI, self).__init__()
        self.agent = agent
        if self.agent.cars:
            self.car = self.agent.cars[0]
        else:
            self.car = units.Bot(
                server=agent.server,
                position=Point.random_gauss(position or Point(0, 0), position_sigma),
                observing_range=1000,
            )
            self.agent.append_car(self.car)

    @public_method
    def goto(self, x, y):
        self.car.goto(Point(x, y))

    @public_method
    def stop(self):
        self.car.stop()

    @public_method
    def fire(self):
        pass  # todo: AgentAPI.fire implementation

    @public_method
    def set_speed(self, new_speed):
        pass  # todo: AgentAPI.set_speed implementation

    @public_method
    def chat_message(self, text):
        log.info('Agent %s say: %r', self.agent.login, text)
        app = self.agent.connection.application
        chat = app.chat
        msg_id = len(chat)  # todo: get "client_id" from client message info
        msg = ChatMessage(author=self.agent, text=text, client_id=msg_id)
        chat.append(msg)

        push_package = make_push_package([msg])
        for client_connection in app.clients:
            client_connection.write_message(serialize(push_package))

        log.info('Broadcast send to %d clients DONE: %r', len(app.clients), msg)
