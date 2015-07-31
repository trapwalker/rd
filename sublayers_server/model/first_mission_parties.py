# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.vectors import Point
from sublayers_server.model.units import Bot
from math import pi, radians


  # dict(fi=0, is_auto=False, radius=200, width=radians(40), dmg=10, time_recharge=5),
  # dict(fi=0, is_auto=False, radius=50, width=radians(60), dmg=2, time_recharge=10),
  # dict(fi=pi / 2, is_auto=True, radius=200, width=radians(30), dps=0.8),
  # dict(fi=-pi / 2, is_auto=True, radius=200, width=radians(30), dps=0.8),
  #