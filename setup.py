#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

setup(
    name='roaddogs',
    version='0.2.0',
    packages=find_packages(exclude=['tests', '*.tests', '*.tests.*']),
    include_package_data=True,
    python_requires='>=3.11',
    install_requires=[
        'tornado>=6.4',
        'cachetools>=5.3.0',
        'PyYAML>=6.0',
        'click>=8.1.0',
        'mongoengine>=0.28.0',
        'psutil>=5.9.0',
        'pillow>=10.0.0',
        'requests>=2.31.0',
        'pymongo>=4.6.0',
    ],
    entry_points={
        'console_scripts': [
            'rd=cli.main:main',
        ],
    },
)
