from django.urls import path
from . import views

urlpatterns = [
    path("geocode/", views.GeoCodeView.as_view(), name="geocode"),
    path("routes/", views.RoutesView.as_view(), name="routes"),
    path("heatmap/", views.HeatmapView.as_view(), name="heatmap"),
]

