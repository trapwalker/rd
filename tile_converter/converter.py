
from PIL import Image
from os.path import join, getsize
import os

def separate(fn_src, fn_dest, treshhold):
    Image.open(fn_src).convert('L').point(lambda x: 255 if x < treshhold else 0, '1').save(fn_dest)
    return True


def monochrome(fn_src, fn_dest, treshhold):
    Image.open(fn_src).convert('L').save(fn_dest)
    return True



def convert_pics(src_path, dest_path, func=None, f_new_fn=lambda old: old, **kw):
    for root, dirs, files in os.walk(src_path):
        for f in files:
            fn_src = os.path.join(root, f)
            f = f_new_fn(f)
            fn_dest = os.path.join(dest_path, root, f)
            dir_dest = os.path.dirname(fn_dest)
            err = ''
            try:
                os.makedirs(dir_dest)
            except Exception as e:
                pass
            
            res = None
            if func:
                try:
                    res = func(fn_src, fn_dest, **kw)
                except Exception as e:
                    err = str(e)
            print(fn_src, '->', fn_dest, res, err)
            
            
    

if __name__ == '__main__':
    new_ext = '.jpg'
    convert_pics(
        src_path='14',
        dest_path='14' + new_ext,
        f_new_fn=lambda old: old.replace('.jpg', new_ext),
        #func=separate,
        func=monochrome,

        treshhold=80,
    )
