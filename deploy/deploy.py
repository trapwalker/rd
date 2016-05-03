#!/usr/bin/env python
# -*- coding: UTF-8 -*-

if __name__ == '__main__':
    import os, sys
    import patch_distutils
    ptoject_root = os.path.abspath(os.path.join(os.path.dirname(sys.argv[0]), '..'))
    print >>sys.stderr, 'DEPLOY:', ptoject_root
    
    patch_distutils.patch()

    rel = lambda *args: os.path.join(ptoject_root, *args)

    requirements = rel('requirements.pip')
    
    # Создание виртуального окружения
    from ve_setup import use_virtualenv
    ve = use_virtualenv(
        [rel('env')], 
        #requirements=requirements
    )

    os.system(r'easy_install.bat greenlet')
    os.system(r'easy_install.bat Pillow')

    ve.install_requirements(requirements)

    os.system(r'get_nginx.py 2>&1')
