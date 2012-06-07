# WPS Demos

A collection of simple demonstrations of OpenLayers using GeoServer's WPS.

These examples assume that GeoServer is running on the same port (at /geoserver).  To proxy GeoServer on port 80 with Apache, include the following in your Apache config:

    ProxyRequests Off
    ProxyPreserveHost Off

    <Proxy *>
        Order deny,allow
        Allow from all
    </Proxy>

    ProxyPass /geoserver http://localhost:8080/geoserver
    ProxyPassReverse /geoserver http://localhost:8080/geoserver
    