from __future__ import print_function
import os
import sys
import logging

if __name__ == '__main__':
    log = logging.getLogger()
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))
else:
    log = logging.getLogger(__name__)


# pip install psutil
try:
    import psutil
except ImportError:
    psutil = None


def Process(pid=None):
    return psutil and psutil.Process(pid or os.getpid())
    

if __name__ == '__main__':
    pid = sys.argv[1:]
    pid = pid and pid[0] or None
    process = Process(pid)

    if process:
        print(process.memory_info())
    else:
        print('Process info is unreacable. May be OS is not supported...')
   
    
