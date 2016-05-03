

import logging
if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)-7s %(message)s')
log = logging.getLogger(__name__)

import re
import os
import shutil
import urllib
import zipfile
from glob import glob
try:
    from cStringIO import StringIO
except ImportError:
    from StringIO import StringIO


RE_DIST_URL = re.compile(r'\/download\/nginx-([\d\.]+?)\.zip(?=")')
SITE_ROOT = 'http://nginx.org'
INDEX_URL = '{SITE_ROOT}/ru/download.html'.format(**locals())

APP_ROOT = '..'
CONF_FOLDER = os.path.join(APP_ROOT, 'nginx_conf')
PROJECT_ROOT_CONF_FN = os.path.join(CONF_FOLDER, 'rd_project_path.conf')
INSTALLATION_FOLDER = os.path.join(APP_ROOT, 'nginx')
INSTALLATION_CONFIG_FOLDER = os.path.join(INSTALLATION_FOLDER, 'conf')


def varsion_to_str(v):
    return '.'.join(map(str, v))


def version_from_str(s):
    return tuple(map(int, s.strip().split('.')))


def get_versions():
    respond = urllib.urlopen(INDEX_URL)
    html = respond.read()
    versions = []
    for url in RE_DIST_URL.finditer(html):
        v = version_from_str(url.groups()[0])
        uri = SITE_ROOT + url.group()
        versions.append((v, uri))

    return versions


def get_last_version():
    return get_versions()[0]


def link(src, dest, replace=False):
    if not os.path.basename(dest):
        dest = os.path.join(dest, os.path.basename(src))
        log.debug('Destination is a folder. Replce to %r', dest)

    if os.path.isdir(src):
        src_type = 'folder'
        link_key = '/J'
    else:
        src_type = 'file'
        link_key = '/H'
    
    if os.path.exists(dest):
        dest_is_folder = os.path.isdir(dest)
        dest_type = 'folder' if dest_is_folder else 'file'
        if not replace:
            raise IOError("Linking impossible: {} {!r} already exists.".format(dest_type, dest))
        log.debug('Try to delete existing %s %r', dest_type, dest)
        if dest_is_folder:
            cmd = 'rd /Q /S "{}"'.format(dest)
        else:
            cmd = 'del "{}"'.format(dest)
            
        if os.system(cmd):
            raise IOError("Can't delete existing {} {!r}".format(dest_type, dest))
        else:
            log.info('Existed %s %r deleted sucessfully', dest_type, dest)

    cmd = 'mklink {} "{}" "{}"'.format(link_key, dest, src)
    log.debug('Try to linking by command: %r', cmd)
    if os.system(cmd):
        raise IOError("Can't link {} {!r} to {!r}".format(src_type, src, dest))
    log.debug("Link %s %r to %r DONE", src_type, src, dest)


def setup():
    log.debug('Try to get last version...')
    v, url = get_last_version()
    log.debug('Last version %s: %s', v, url)

    log.debug('Loading dist...')
    dist_stream = StringIO(urllib.urlopen(url).read())
    log.info('Dist loaded: %s bytes', len(dist_stream.getvalue()))
    #dist_stream = open(r'..\temp\nginx-1.9.14.zip', 'rb')

    log.debug('Loading zip file...')
    dist = zipfile.ZipFile(dist_stream)

    log.debug('Try to clean nginx foldser: %r...', INSTALLATION_FOLDER)
    if os.system('rd /S /Q "{}"'.format(INSTALLATION_FOLDER)):
        log.error("Can't remove old nginx folder %r", INSTALLATION_FOLDER)
        
    log.debug('Extracting zip file...')
    arch_root_name = os.path.commonprefix(dist.namelist())
    
    for member in dist.infolist():
        fn = member.filename[len(arch_root_name):]        
        if fn:
            log.debug('Extracting: %r to %r', member.filename, fn)
            member.filename = fn
            dist.extract(member, path=INSTALLATION_FOLDER)

    # Linking available to enabled
    for fn in glob(os.path.join(CONF_FOLDER, 'sites-available', '*.conf')):
        link(fn, os.path.join(CONF_FOLDER, 'sites-enabled', ''), replace=True)

    app_root_abs_path = os.path.abspath(APP_ROOT)
    log.debug('Making application root path inclusion: %r', app_root_abs_path)
    with open(PROJECT_ROOT_CONF_FN, 'w') as f:
        f.write('set $rd_main_folder {};\n'.format(app_root_abs_path))

    log.debug('Linking configurations...')
    for fn in os.listdir(CONF_FOLDER):
        try:
            link(
                os.path.join(CONF_FOLDER, fn),
                os.path.join(INSTALLATION_CONFIG_FOLDER, ''),
                replace=True,
            )
        except IOError as e:
            log.error(e)

    globals().update(locals())
    

if __name__ == '__main__':
    pass
    setup()
