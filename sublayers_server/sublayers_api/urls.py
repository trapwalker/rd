from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('views',
    # Examples:
    # url(r'^$', 'sublayers_server.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^$', 'base_view'),
    url(r'^echo$', 'echo'),
)
