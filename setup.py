#!/usr/bin/env python
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

setup(
    name='roaddogs',
    version='0.1',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'virtualenv',
        'tornado',
        'cachetools',
        'PyYAML',
        'click',
        'mongoengine',
        'psutil',
    ],
    entry_points='''
        [console_scripts]
        sl=cli.main:main
    ''',
)
