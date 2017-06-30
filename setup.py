#!/usr/bin/env python
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

setup(
    name='sublayers',
    version='0.1',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'Click',
        'ipython==4.2.0',
        'tornado',
        'debug',
        'jsonpickle',
        'cachetools',
        'PyYAML',
        'cmd2',
        'defaultencodinghack',

        'git+https://github.com/py-bson/bson',
        #'git+https://github.com/sergyp/motorengine',
        #'git+https://github.com/mongodb/motor/',
        #'pymongo==2.8',
        'mongoengine',
    ],
    entry_points='''
        [console_scripts]
        regtool=regtool:cli
    ''',
)