# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import metrics


class StatLogger(dict):
    s_agents_all = metrics.IncMetric(name='s_agents_all', doc=u"Кол-во созданных агентов на сервере")
    s_agents_on = metrics.IncMetric(name='s_agents_on', doc=u"Кол-во агентов онлайн на сервере")
    s_observers_all = metrics.IncMetric(name='s_observers_all', doc=u"Кол-во объектов-обсёрверов (на карте), созданных на сервере")
    s_observers_on = metrics.IncMetric(name='s_observers_on', doc=u"Кол-во активных (живых) обсёрверов на сервере")
    s_events_all = metrics.IncMetric(name='s_events_all', doc=u"Кол-во созданных событий")
    s_events_on = metrics.IncMetric(name='s_events_on', doc=u"Кол-во событий в очереди")
    s_events_lag_max = metrics.MaxValueByTimeMetric(name='s_events_lag_max', dtime=20, doc=u"Максимальное отставание событий")
    s_events_lag_mid = metrics.MovingAverageMetric(name='s_events_lag_mid', doc=u"Среднее отставание событий")
    s_message_send_max = metrics.MaxValueByTimeMetric(name='s_message_send_max', dtime=10, doc=u"Максимальное время рассылки сообщений")

    s_events_stat_log = metrics.ServerIntervalEventsMetric(name='s_events_stat_log', doc=u"Метрика расчёта max, average и count эвентов")
    s_messages_stat_log_count = metrics.IncMetric(name='s_messages_stat_log_count', doc=u"Метрика расчёта количества сообщений")
    s_messages_stat_log_dur = metrics.IncMetric(name='s_messages_stat_log_dur', doc=u"Метрика расчёта времени отправки сообщений")


    def get_metric(self, metric):
        return getattr(self, metric).value()

    def get_metric_obj(self, metric):
        m = getattr(self, metric)
        return None if m is None else m.metric


if __name__ == '__main__':
    pass
