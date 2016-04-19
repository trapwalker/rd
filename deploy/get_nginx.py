

import logging
if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)-7s %(message)s')
log = logging.getLogger(__name__)

import re
import os
import shutil
import urllib
import zipfile
try:
    from cStringIO import StringIO
except ImportError:
    from StringIO import StringIO


RE_DIST_URL = re.compile(r'\/download\/nginx-([\d\.]+?)\.zip(?=")')
SITE_ROOT = 'http://nginx.org'
INDEX_URL = '{SITE_ROOT}/ru/download.html'.format(**locals())

APP_ROOT = '..'
CONF_FOLDER = os.path.join(APP_ROOT, 'nginx_conf')
VERSION_FILE_PATH = os.path.join(CONF_FOLDER, '__version__')
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


def get_current_version():
    try:
        with open(VERSION_FILE_PATH, 'r') as f:
            return version_from_str(f.read())
    except:
        return None


def set_current_version(v):
    with open(VERSION_FILE_PATH, 'w') as f:
        f.write(varsion_to_str(v))


def get_last_version():
    return get_versions()[0]


def setup():
    log.debug('Try to get last version...')
    v, url = get_last_version()
    log.debug('Last version {}: {}'.format(v, url))

    log.debug('Loading dist...')
    dist_stream = StringIO(urllib.urlopen(url).read())
    log.info('Dist loaded: {} bytes'.format(len(dist_stream.getvalue())))
    #dist_stream = open(r'..\temp\nginx-1.9.14.zip', 'rb')

    log.debug('Loading zip file...')
    dist = zipfile.ZipFile(dist_stream)

    log.debug('Try to clean nginx folser: "{}"...'.format(INSTALLATION_FOLDER))
    if os.system('rd /S /Q "{}"'.format(INSTALLATION_FOLDER)):
        log.error("Can't remove old nginx folder {}".format(INSTALLATION_FOLDER))
        
    log.debug('Extracting zip file...')
    arch_root_name = os.path.commonprefix(dist.namelist())
    
    for member in dist.infolist():
        fn = member.filename[len(arch_root_name):]        
        if fn:
            log.debug('Extracting: {} to {}'.format(member.filename, fn))
            member.filename = fn
            dist.extract(member, path=INSTALLATION_FOLDER)

    log.debug('Linking configurations...')
    for fn in os.listdir(CONF_FOLDER):
        fp = os.path.join(CONF_FOLDER, fn)
        link_key = '/J' if os.path.isdir(fp) else '/H'        
        ftype = 'folder' if os.path.isdir(fp) else 'file'
        dest_link_name = os.path.join(INSTALLATION_CONFIG_FOLDER, fn)
        cmd = 'mklink {} "{}" "{}"'.format(link_key, dest_link_name, fp)
        print cmd
        if os.path.isfile(dest_link_name):
            log.debug('Try to delete existing file {}'.format(dest_link_name))
            if os.system('del {}'.format(dest_link_name)):
                log.error('can\'t delete existing file {}'.format(dest_link_name))
            else:
                log.info('Existed file {} deleted sucessfully'.format(dest_link_name))
            
        if os.system(cmd):
            log.error("Can't link {} {} to {}".format(ftype, fp, INSTALLATION_CONFIG_FOLDER))

    globals().update(locals())
    

if __name__ == '__main__':
    setup()
