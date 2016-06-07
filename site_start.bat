
call python.bat kill_process.py sublayers_site\sl_site.pid

cd sublayers_site
python.bat site_server.py %*
