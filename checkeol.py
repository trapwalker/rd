# Check files for incorrect newlines

import fnmatch, os

def check_file(fname):
    for n, line in enumerate(open(fname, "rb")):
        if "\r" in line:
            print("%s@%d: CR found" % (fname, n))
            return

def check_files(root, patterns=("*.py",), skip_dirs=()):
    skip_dirs = set(skip_dirs + ('.svn', '.hg'))
    for root, dirs, files in os.walk(root):
        for f in files:
            fname = os.path.join(root, f)
            for p in patterns:
                if fnmatch.fnmatch(fname, p):
                    check_file(fname)
                    break

        for folder in skip_dirs:
            if folder in dirs:
                dirs.remove(folder)


check_files(".", skip_dirs=('env',))
