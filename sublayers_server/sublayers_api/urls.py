from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'sublayers_server.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^$', 'sublayers_api.views.index', name='index'),
)
