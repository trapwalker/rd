# -*- coding: utf-8 -*-

from base import Object
from collections import Counter


class VChannel(Object):
    # todo: docstring

    def __init__(self, agents=None):
        super(ManagerVisibility, self).__init__()
        self._objects = Counter()
        self._agents = set(agents)

    def add_object(self, obj):
        self._objects[obj] += 1
        obj.v_channels.add(self)

    def remove_object(self, obj):
        self._objects[obj] -= 1
        cnt = self._objects[obj]
        assert cnt >= 0
        if cnt == 0:
            obj.v_channels.discard(self)

    def add_agent(self, agent):
        self._agents.add(agent)
        agent.v_channel = self

    def remove_agent(self, agent):
        self._agents.discard(agent)
        agent._watching.discard(self)

    def merge_visibility(self, managerVisibility):
        for agent in managerVisibility._agents:
            self.add_agent(agent)
        for obj in managerVisibility._objects:
            self.add_object(obj)

    def unit_update(self, update):
        #
        pass

    def delete(self):
        for agent in self._agents:
            self.remove_agent(agent)
        for obj in self._objects:
            self.remove_object(obj)