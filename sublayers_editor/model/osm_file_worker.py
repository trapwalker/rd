from osmread import parse_file, Way, Relation, Node

from pymongo import Connection

class OsmWorker:
    def __init__(self, file_name=None):
        self.objects = []

        self.db_connection = Connection()
        self.db = self.db_connection.maindb

        self.roads = []

        self.nodes = {}
        self.ways = {}
        self.rel = {}

        for entity in parse_file(file_name):
            if isinstance(entity, Node):
                self.nodes[entity.id] = entity
            if isinstance(entity, Way):
                self.ways[entity.id] = entity
            if isinstance(entity, Relation):
                self.rel[entity.id] = entity

        self.get_roads()
        self.save_roads_to_db()

    def get_roads(self):
        for way_index in self.ways:
            way = self._get_road(self.ways[way_index])
            if way != None:
                self.roads.append(way)


    def _get_road(self, way):
        t = way.tags
        if 'highway' in t:
            value = t['highway']
            if value =='motorway' or value == 'trunk' or value == 'primary':
                points = []
                for node_index in way.nodes:
                    node = self.nodes[node_index]
                    points.append(dict(
                        id = node.id,
                        lng = node.lon,
                        lat = node.lat,
                    ))
                return dict(
                    id = way.id,
                    tag_road = value,
                    points = points,
                )
        return None


    def save_roads_to_db(self):
        count = 0
        for e in self.roads:
            self.db.sroads.insert(e)
            count += 1
        print count


if __name__ == "__main__":

    a = OsmWorker('c:/minsk.osm')
    #a = Connection()
    #db = a.maindb

    print '========================='
    print len(a.roads)

