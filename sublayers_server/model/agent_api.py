# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import units
from datetime import datetime
from vectors import Point
from api_tools import API, public_method
from utils import serialize
from messages import ChatMessage
import tasks


def make_push_package(events):
    events = [event.as_dict() for event in events]
    return dict(
        message_type='push',
        events=events,
    )


class AgentAPI(API):
    def __init__(self, agent, position=None, position_sigma=Point(100, 100)):
        super(AgentAPI, self).__init__()
        self.agent = agent
        if self.agent.cars:
            self.car = self.agent.cars[0]
        else:
            self.car = units.Bot(
                server=agent.server,
                position=Point.random_gauss(position or Point(10093693, 5646447), position_sigma),
                observing_range=1000,
                owner=agent,
            )
            self.agent.append_car(self.car)

    @public_method
    def goto(self, x, y):
        path = self.car.goto(Point(x, y))
        return dict(path=path)

    @public_method
    def stop(self):
        self.car.stop()

    @public_method
    def fire(self):
        pass  # todo: AgentAPI.fire implementation

    @public_method
    def set_speed(self, new_speed):
        car = self.car
        last_motion = None
        for task in reversed(car.task_list):
            if isinstance(task, tasks.Motion):
                last_motion= task
                break

        last_motion = last_motion or isinstance(car.task, tasks.Motion) and car.task
        if last_motion:
            car.stop()
            car.max_velocity = new_speed  # todo: check value
            path = car.goto(last_motion.target_point)  # todo: target point in abstract Motion is absent
            return dict(path=path)
        else:
            car.max_velocity = new_speed  # todo: check value

    @public_method
    def chat_message(self, text):
        log.info('Agent %s say: %r', self.agent.login, text)
        app = self.agent.connection.application
        chat = app.chat
        msg_id = len(chat)  # todo: get "client_id" from client message info
        msg = ChatMessage(author=self.agent, text=text, client_id=msg_id)
        chat.append(msg)

        push_data = serialize(make_push_package([msg]))

        for client_connection in app.clients:
            client_connection.write_message(push_data)
