# -*- coding: utf-8 -*-

def bin(value):
    result = ''
    while value > 0:
        result = str(value & 1) + result
        value >>= 1
    return '0b' + result

        
