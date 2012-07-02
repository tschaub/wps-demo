/**
 * @require OpenLayers/Control/Navigation.js
 * @require OpenLayers/Control/Zoom.js
 * @require OpenLayers/Layer/OSM.js
 * @require OpenLayers/Layer/Vector.js
 * @require OpenLayers/Renderer/SVG.js
 * @require OpenLayers/Renderer/VML.js
 * @require OpenLayers/Control/DrawFeature.js
 * @require OpenLayers/Control/DragFeature.js
 * @require OpenLayers/Handler/Polygon.js
 * @require OpenLayers/Format/WPSExecute.js
 * @require OpenLayers/Format/WKT.js
 * @require OpenLayers/Request/XMLHttpRequest.js
 */

var map = new OpenLayers.Map({
    div: "map",
    projection: "EPSG:900913",
    layers: [
        new OpenLayers.Layer.XYZ(
            "Imagery",
            "http://oatile1.mqcdn.com/naip/${z}/${x}/${y}.png",
            {attribution: "Tiles Courtesy of <a href='http://open.mapquest.co.uk/' target='_blank'>MapQuest</a> <img src='http://developer.mapquest.com/content/osm/mq_logo.png' border='0'>"}
        ),
        new OpenLayers.Layer.Vector(null, {
            eventListeners: {
                // whenever a sketch is complete, consider splitting polys
                sketchcomplete: function(event) {
                    var proceed = true;
                    if (event.feature.geometry instanceof OpenLayers.Geometry.LineString) {
                        handleSplitDraw(event);
                        proceed = false;
                    }
                    return proceed;
                }
            }
        })
    ],
    center: [0, 0],
    zoom: 1
});

/**
 * Add drawing controls for sketching polygons and the splitter line.
 * The drag control is added to demonstrate the results of the splits.
 */
var drawPoly = new OpenLayers.Control.DrawFeature(
    map.layers[1], OpenLayers.Handler.Polygon,
    {handlerOptions: {holeModifier: "altKey"}}
);

var drawLine = new OpenLayers.Control.DrawFeature(
    map.layers[1], OpenLayers.Handler.Path
);

var dragPoly = new OpenLayers.Control.DragFeature(map.layers[1]);

map.addControls([drawPoly, drawLine, dragPoly]);

/**
 * Upon completion of the splitter sketch, look for target polygons to split.
 */
function handleSplitDraw(event) {
    var splitter = event.feature;
    var features = map.layers[1].features;
    var candidates = OpenLayers.Array.filter(map.layers[1].features, function(feature) {
        var hit = false;
        if (feature.geometry.intersects(splitter.geometry)) {
            hit = true;
        }
        return hit;
    });
    var candidate;
    for (var i=0, ii=candidates.length; i<ii; ++i) {
        candidate = candidates[i];
        if (candidate.geometry.intersects(splitter.geometry)) {
            map.layers[1].removeFeatures([candidate]);
            executeSplit(candidate, splitter);
        }
    }
    return false;
}

/**
 * Construct and issue the WPS execute request.
 */
var wktFormat = new OpenLayers.Format.WKT();
var wpsFormat = new OpenLayers.Format.WPSExecute();
function executeSplit(poly, line) {

    /**
     * This data structure can be derived from the DescribeProcess request.
     */ 
    var doc = this.wpsFormat.write({
        identifier: "gs:SplitPolygon",
        dataInputs: [{
            identifier: "polygon",
            data: {
                complexData: {
                    mimeType: "application/wkt",
                    value: wktFormat.write(poly)
                }
            }
        }, {
            identifier: "line",
            data: {
                complexData: {
                    mimeType: "application/wkt",
                    value: wktFormat.write(line)
                }
            }
        }],
        responseForm: {
            rawDataOutput: {
                mimeType: "application/wkt",
                identifier: "result"
            }
        }
    });

    /**
     * Post the request and expect success.  Failure case could be handled.
     */
    OpenLayers.Request.POST({
        url: "/geoserver/wps",
        data: doc,
        success: function(response) {
            handleSuccess(response, poly);
        }
    });

}

/**
 * When response comes in, parse it as WKT and replace the split features with
 * results.  If the response doesn't contain WKT (no split), add back the 
 * original feature that was removed above.
 */
function handleSuccess(response, poly) {
    var features = wktFormat.read(response.responseText);
    if (features && features.length > 0) {
        map.layers[1].addFeatures(features);
    } else {
        map.layers[1].addFeatures([poly]);
    }
}

/**
 * Set up listeners on radio elements to activate controls.
 */
var drawToggle = document.getElementById("draw");
var toggleDraw = drawToggle.onclick = function() {
    if (drawToggle.checked) {
        drawLine.deactivate();
        dragPoly.deactivate();
        drawPoly.activate();
    } else {
        drawPoly.deactivate();
    }
};
toggleDraw();
var splitToggle = document.getElementById("split");
var toggleSplit = splitToggle.onclick = function() {
    if (splitToggle.checked) {
        drawPoly.deactivate();
        dragPoly.deactivate();
        drawLine.activate();
    } else {
        drawLine.deactivate();
    }
};
var dragToggle = document.getElementById("drag");
var toggleDrag = dragToggle.onclick = function() {
    if (dragToggle.checked) {
        drawPoly.deactivate();
        drawLine.deactivate();
        dragPoly.activate();
    } else {
        dragPoly.deactivate();
    }
};
