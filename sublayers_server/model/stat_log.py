# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sublayers_server.model.metrics as metrics


class StatLogger(dict):
    s_agents_all = metrics.IncMetric(name='s_agents_all', doc="Кол-во созданных агентов на сервере")
    s_agents_on = metrics.IncMetric(name='s_agents_on', doc="Кол-во агентов онлайн на сервере")
    s_observers_all = metrics.IncMetric(name='s_observers_all', doc="Кол-во объектов-обсёрверов (на карте), созданных на сервере")
    s_observers_on = metrics.IncMetric(name='s_observers_on', doc="Кол-во активных (живых) обсёрверов на сервере")
    s_events_all = metrics.IncMetric(name='s_events_all', doc="Кол-во созданных событий")
    s_events_on = metrics.IncMetric(name='s_events_on', doc="Кол-во событий в очереди")
    s_events_lag_max = metrics.MaxValueByTimeMetric(name='s_events_lag_max', dtime=20, doc="Максимальное отставание событий")
    s_events_lag_mid = metrics.MovingAverageMetric(name='s_events_lag_mid', doc="Среднее отставание событий")
    s_message_send_max = metrics.MaxValueByTimeMetric(name='s_message_send_max', dtime=10, doc="Максимальное время рассылки сообщений")

    s_events_stat_log = metrics.ServerIntervalEventsMetric(name='s_events_stat_log', doc="Метрика расчёта max, average и count эвентов")
    s_messages_stat_log_count = metrics.IncMetric(name='s_messages_stat_log_count', doc="Метрика расчёта количества сообщений")
    s_messages_stat_log_dur = metrics.IncMetric(name='s_messages_stat_log_dur', doc="Метрика расчёта времени отправки сообщений")


    def get_metric(self, metric):
        return getattr(self, metric).value()

    def get_metric_obj(self, metric):
        m = getattr(self, metric)
        return None if m is None else m.metric


if __name__ == '__main__':
    pass
