# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import sys, os
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    project_root = os.path.dirname(sys.argv[0])
    log = logging.getLogger()
    sys.path.append(project_root)
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from sublayers_server.test_iolop import io_loop, start
from sublayers_server.model.registry import classes  # Не удалять этот импорт! Авторегистрация классов.
from sublayers_server.model.registry.tree import Root

import tornado.gen
import click
from pprint import pprint as pp


@click.command()
@click.option('--clean', '-c', is_flag=True, default=False, help='Full registry clean')
@click.option('--fixtures', '-x', is_flag=True, default=False, help='Fixtures reload')
@click.option('--reset', '-r', is_flag=True, default=False, help='Reset game data')
def cli(clean, fixtures, reset):
    if clean:
        io_loop.add_callback(full_clean)

    if fixtures:
        io_loop.add_callback(reload_fixtures)

    if reset:
        io_loop.add_callback(reset_data)

    if not (clean or fixtures or reset):
        click.echo('Nothing to do')
        return

    start()


@tornado.gen.coroutine
def do(clean, fixtures, reset):
    if clean:
        io_loop.add_callback(full_clean)

    if fixtures:
        io_loop.add_callback(reload_fixtures)

    if reset:
        io_loop.add_callback(reset_data)

    if not (clean or fixtures or reset):
        click.echo('Nothing to do')
        return


@tornado.gen.coroutine
def full_clean():
    click.echo('Full registry cleaning...')
    count = yield Root.objects.delete()
    click.echo('Clean registry: %s' % count)


@tornado.gen.coroutine
def reload_fixtures():
    click.echo('Cleaning of fixtures...')
    count = yield Root.objects.filter({'fixtured': True}).delete()
    click.echo('Deleted fixture objects: %s' % count)

    click.echo('Loading registry fixtures to DB...')
    reg = yield Root.load(path=os.path.join(project_root, u'sublayers_world', u'registry'))
    click.echo('Loading registry fixtures DONE')  # todo: show timing and counts
    globals().update(**locals())


@tornado.gen.coroutine
def reset_data():
    click.echo('Saved registry objects cleaning...')
    count = yield Root.objects.filter({'fixtured': False}).delete()
    click.echo('Deleted objects: %s' % count)



# @tornado.gen.coroutine
# def test_registry():
#     click.echo('Delete all fixtures: %s', (yield Root.objects.filter({'fixtured': True}).delete()))
#     # click.echo('Delete all saved objects: %s', (yield Root.objects.filter({'fixtured': False}).delete()))
#
#     click.echo('Loading registry fixtures to DB...')
#     reg = yield Root.load(path=os.path.join(project_root, u'sublayers_world', u'registry'))
#     click.echo('Loading registry fixtures DONE')  # todo: show timing and counts
#
#     globals().update(**locals())
#     click.echo('THE END')
#     tornado.ioloop.IOLoop.instance().add_callback(lambda: io_loop.stop())


if __name__ == '__main__':
    cli(sys.argv[1:])
