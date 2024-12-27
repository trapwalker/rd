#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os

def kill(pid):
    if not pid.isdigit():
        with open(pid) as f:
            pid_value = f.read().strip()
    else:
        pid_value = pid

    if not pid_value:
        raise ValueError('Wrong PID: {!r}'.format(pid))

    pid_value = int(pid_value)

    os.kill(pid_value, 9)
        

if __name__ == '__main__':    
    my_name = os.path.basename(sys.argv[0])
    params = sys.argv[1:]
    if not params:
        print('Usage: {my_name} 1234 my_process_pid_file.pid 4567 other_pid_file.pid'.format(my_name=my_name))

    for pid in params:
        try:
            kill(pid)
        except Exception as e:
            print(e, file= sys.stderr)
