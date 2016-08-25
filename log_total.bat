
start tail -F nginx/logs/access.log nginx/logs/error.log -F sublayers_site\log\server.log -F sublayers_server\log\server.log
