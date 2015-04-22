# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.tileid2 import Tileid2
from sublayers_server.model.events import Event, ContactInEvent, ContactOutEvent
from sublayers_server.model.base import Observer


class TileContactSearchEvent(Event):
    def __init__(self, vis_mng, tile_id, **kw):
        super(TileContactSearchEvent, self).__init__(server=vis_mng.server, **kw)
        self.vis_mng = vis_mng
        self.tile_id = tile_id

    def on_perform(self):
        super(TileContactSearchEvent, self).on_perform()
        vis_mng = self.vis_mng
        tid = self.tile_id
        if len(vis_mng.tiles[tid][1]) > 0:
            vis_mng.on_search_contacts(tile_id=tid, time=self.time)
            vis_mng.on_move_objects(tile_id=tid, time=self.time)
        if len(vis_mng.tiles[tid][1]) > 0:
            TileContactSearchEvent(vis_mng=vis_mng, tile_id=tid, time=self.time + vis_mng.interval).post()
        else:
            del vis_mng.tiles[tid]


class VisibilityManager(object):
    def __init__(self, server, z=16, max_z=26, interval=2.0):
        self.server = server
        self.tiles = dict()
        self.z = z
        self.max_z = max_z  # todo: должно браться централизованно
        self.interval = interval

    def _obj_in_tile(self, obj, tid):
        return (tid in self.tiles.keys()) and (obj in self.tiles[tid][1])

    def _add_obj_to_tile(self, tile_id, obj, time):
        tid = tile_id.parent_by_lvl(self.z)
        if not (tid in self.tiles.keys()):
            self.tiles.update({tid: (tid.get_around_tiles(), [obj])})
            TileContactSearchEvent(vis_mng=self, tile_id=tid, time=time).post()
        else:
            self.tiles[tid][1].append(obj)

    def _del_obj_from_tile(self, tile_id, obj):
        self.tiles[tile_id][1].remove(obj)

    def _get_tid_by_obj(self, obj, time):
        p = obj.position(time=time)
        tid = Tileid2(long(p.x), long(p.y), self.max_z).parent_by_lvl(self.z)
        if self._obj_in_tile(obj=obj, tid=tid):
            return tid
        if tid in self.tiles.keys():
            for t in self.tiles[tid][0]:
                if self._obj_in_tile(obj=obj, tid=t):
                    return t
        x, y, z = tid.xyz()
        log.info('ERRRRRROR !!!!! MEGA SUPER ERRROR !!!!! %s, %s', x, y)
        for t in self.tiles.keys():
            if self._obj_in_tile(obj=obj, tid=t):
                return t
        assert False

    def _can_see(self, obj, subj, obj_pos, subj_pos):
        return (subj.params.get('p_observing_range').value * obj.params.get('p_visibility').value) >= \
               abs(obj_pos - subj_pos)

    def add_object(self, obj, time):
        p = obj.position(time=time)
        self._add_obj_to_tile(tile_id=Tileid2(long(p.x), long(p.y), self.max_z), obj=obj, time=time)

    def del_object(self, obj, time):
        tid = self._get_tid_by_obj(obj=obj, time=time)
        self._del_obj_from_tile(tile_id=tid, obj=obj)

    def on_search_contacts(self, tile_id, time):
        objs = dict()
        for tid in self.tiles[tile_id][0]:
            if tid in self.tiles.keys():
                for obj in self.tiles[tid][1]:
                    objs.update({obj: obj.position(time=time)})
        for subj in self.tiles[tile_id][1]:
            if isinstance(subj, Observer):
                subj_pos = objs[subj]
                for obj in objs:
                    if obj is not subj:
                        can_see = self._can_see(obj=obj, subj=subj, obj_pos=objs[obj], subj_pos=subj_pos)
                        see = obj in subj.visible_objects
                        if can_see != see:
                            if can_see:
                                subj.on_contact_in(time=time, obj=obj)
                            else:
                                subj.on_contact_out(time=time, obj=obj)

    def on_move_objects(self, tile_id, time):
        for obj in self.tiles[tile_id][1]:
            pos = obj.position(time=time)
            n_tid = Tileid2(long(pos.x), long(pos.y), self.max_z).parent_by_lvl(self.z)
            if n_tid != tile_id:
                self._del_obj_from_tile(obj=obj, tile_id=tile_id)
                self._add_obj_to_tile(obj=obj, tile_id=n_tid, time=time)