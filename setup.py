#!/usr/bin/env python
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

import os

cli_tool_name = os.path.basename(os.path.dirname(__file__))

setup(
    name='roaddogs',
    version='0.1',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        #'virtualenv',
        'ctx_timer',
        'tornado',
        'cachetools',
        'PyYAML',
        'click',
        'mongoengine',
        'psutil',
        'coloredlogs',
        'hgapi',
        'pillow',
        'humanfriendly',
        'colorama',
        'requests',
    ],
    dependency_links=[
        "https://github.com/sergyp/ctx_timer/tarball/master#egg=ctx_timer-0.0.1",
    ],
    entry_points='''
        [console_scripts]
        {cli_tool_name}=cli.main:main
    '''.format(cli_tool_name=cli_tool_name),
)
