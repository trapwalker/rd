# -*- coding: utf-8 -*-

from django.shortcuts import render_to_response
from django.template import RequestContext
from django_websocket import require_websocket

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

def base_view(request):
    return render_to_response('index.html', {}, context_instance=RequestContext(request))


@require_websocket
def echo(request):
    for message in request.websocket:
        request.websocket.send(message)


