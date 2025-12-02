// Mapbox Directions Integration Module
// Handles route fetching and drawing on Mapbox overlay

(function() {
    'use strict';

    // Mapbox configuration
    // IMPORTANT: Replace with your own Mapbox access token
    // Get your token from: https://account.mapbox.com/access-tokens/
    // Token needs Directions API scope enabled
    // For production, store this securely (environment variable, config file, etc.)
    const MAPBOX_TOKEN = 'pk.eyJ1IjoicmF5c21hcnRpZnkiLCJhIjoiY21pb2M5eHl5MDA5ZTNmcXgwZ3dhMmN0aSJ9.0d_ZNmt_4sWOL9g83Oq2ag';
    
    // State
    let mapboxMap = null;
    let currentRoute = null;
    let currentRouteGeometry = null;
    let currentRouteDistance = null;
    let currentRouteDuration = null;
    let isInitialized = false;
    let gpsBounds = null;
    let syncTransformInterval = null;

    /**
     * Sync Mapbox map view with static map transform
     * @param {Object} mapTransform - Transform object from InteractiveMap.getMapTransform()
     */
    function syncMapboxTransform(mapTransform) {
        if (!mapboxMap || !isInitialized || !gpsBounds || !mapTransform) return;
        
        try {
            // Calculate the visible bounds of the static map based on transform
            const containerRect = document.getElementById('mapContainer')?.getBoundingClientRect();
            if (!containerRect) return;
            
            // Get the center point of the visible viewport in container coordinates
            const viewportCenterX = containerRect.width / 2;
            const viewportCenterY = containerRect.height / 2;
            
            // Convert viewport center to map image pixel coordinates
            // The map image is centered at (centerX, centerY) with scale applied
            const mapImageCenterX = mapTransform.imageWidth / 2;
            const mapImageCenterY = mapTransform.imageHeight / 2;
            
            // Calculate offset from map image center to viewport center (in screen pixels)
            const screenOffsetX = viewportCenterX - mapTransform.centerX;
            const screenOffsetY = viewportCenterY - mapTransform.centerY;
            
            // Convert screen offset to map image pixel offset (accounting for scale)
            const mapOffsetX = screenOffsetX / mapTransform.scale;
            const mapOffsetY = screenOffsetY / mapTransform.scale;
            
            // The pixel coordinates of the point at viewport center
            const viewportCenterMapX = mapImageCenterX + mapOffsetX;
            const viewportCenterMapY = mapImageCenterY + mapOffsetY;
            
            // Convert map pixel coordinates to normalized coordinates (0-1)
            const normalizedX = viewportCenterMapX / mapTransform.imageWidth;
            const normalizedY = viewportCenterMapY / mapTransform.imageHeight;
            
            const centerLng = gpsBounds.west + (normalizedX * (gpsBounds.east - gpsBounds.west));
            const centerLat = gpsBounds.north - (normalizedY * (gpsBounds.north - gpsBounds.south));
            
            // Calculate zoom level based on scale
            // The static map scale goes from 0.4 to 1.0 (new zoom levels)
            // We have two calibration points:
            // - Scale 1.0 (max zoom) = Mapbox zoom 18 (known working)
            // - Scale 0.64 (default/level 4) = needs to match static map
            // - Scale 0.4 (min zoom) = baseZoom
            const minScale = 0.1; // New minimum scale (matches InteractiveMap)
            const maxScale = 1.0;
            const defaultScale = 0.5; // Default zoom level (level 4)
            
            // Use linear interpolation calibrated to work at both max zoom and default zoom
            // Since we know max zoom (1.0) = 18 works, we'll calibrate the curve
            // to ensure default zoom (0.64) also aligns properly
            
            // Normalize scale to 0-1 range
            const normalizedScale = (mapTransform.scale - minScale) / (maxScale - minScale); // 0 to 1
            
            // Use a calibrated power curve that works at both calibration points
            // Power of 0.6 makes zoom change more gradually to match static map behavior
            const power = 0.6;
            const adjustedNormalized = Math.pow(normalizedScale, power);
            
            // Calibrate baseZoom so that default scale (0.64) produces correct zoom
            // At normalizedScale = (0.64 - 0.4) / (1.0 - 0.4) = 0.24 / 0.6 = 0.4
            // We want this to map to a zoom that matches the static map at that scale
            // Using trial: if baseZoom = 16.2, then at scale 0.64: zoom ≈ 16.2 + (0.4^0.6) * 1.8 ≈ 17.1
            // But we need to calibrate so default zoom matches - let's use a more direct approach
            
            const maxZoom = 18; // Known working point at maxScale (1.0)
            
            // Calculate what zoom should be at default scale (0.64) to match
            // We'll use a linear interpolation with a slight curve adjustment
            const defaultNormalized = (defaultScale - minScale) / (maxScale - minScale); // 0.4
            const defaultZoomTarget = 17.0; // Target zoom at default scale (calibrated to match)
            
            // Calculate baseZoom from the two known points
            // At default: defaultZoomTarget = baseZoom + (defaultNormalized^power) * (maxZoom - baseZoom)
            // Solving: baseZoom = (defaultZoomTarget - maxZoom * defaultNormalized^power) / (1 - defaultNormalized^power)
            const defaultPower = Math.pow(defaultNormalized, power);
            const baseZoom = (defaultZoomTarget - maxZoom * defaultPower) / (1 - defaultPower);
            
            // Calculate zoom with calibrated curve
            const zoom = baseZoom + (adjustedNormalized * (maxZoom - baseZoom));
            
            // Update Mapbox map to match static map view
            mapboxMap.jumpTo({
                center: [centerLng, centerLat],
                zoom: zoom
            });
            
        } catch (e) {
            console.warn('[Mapbox] Failed to sync transform:', e);
        }
    }

    /**
     * Initialize Mapbox map overlay
     * @param {Object} bounds - GPS bounds from MapConfig
     */
    function initMapbox(bounds) {
        gpsBounds = bounds;
        if (isInitialized || !window.mapboxgl) {
            // Wait for Mapbox to load
            if (!window.mapboxgl) {
                setTimeout(() => initMapbox(gpsBounds), 100);
                return;
            }
        }

        const overlayEl = document.getElementById('mapboxOverlay');
        if (!overlayEl) {
            console.warn('[Mapbox] Overlay container not found');
            return;
        }

        // Set access token
        if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('YOUR_MAPBOX_TOKEN_HERE')) {
            console.warn('[Mapbox] Missing or placeholder token. Please set your Mapbox access token in mapbox-directions.js');
            return;
        }
        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Calculate center and bounds for the map
        const centerLng = (bounds.west + bounds.east) / 2;
        const centerLat = (bounds.south + bounds.north) / 2;
        const mapBounds = [
            [bounds.west, bounds.south], // Southwest
            [bounds.east, bounds.north]  // Northeast
        ];

        try {
            // Create a minimal transparent style - no background, no layers
            const transparentStyle = {
                version: 8,
                sources: {},
                layers: [],
                glyphs: 'mapbox://fonts/{fontstack}/{range}.pbf',
                sprite: 'mapbox://sprites/mapbox/streets-v12'
            };
            
            // Initialize Mapbox map with transparent style
            // Start with bounds to match the static map, then sync with transform
            mapboxMap = new mapboxgl.Map({
                container: 'mapboxOverlay',
                style: transparentStyle,
                center: [centerLng, centerLat],
                zoom: 15, // Initial zoom, will be synced with static map
                bounds: mapBounds,
                fitBoundsOptions: {
                    padding: 0
                },
                interactive: false, // Disable all interactions
                attributionControl: false, // Hide attribution
                logoPosition: 'bottom-right'
            });

            // Map is loaded with transparent style - no layers to hide
            mapboxMap.on('load', () => {
                // Aggressively set all elements to transparent
                const setTransparent = () => {
                    const canvas = mapboxMap.getCanvasContainer();
                    if (canvas) {
                        canvas.style.backgroundColor = 'transparent';
                        canvas.style.background = 'transparent';
                    }
                    
                    const mapContainer = mapboxMap.getContainer();
                    if (mapContainer) {
                        mapContainer.style.backgroundColor = 'transparent';
                        mapContainer.style.background = 'transparent';
                    }
                    
                    const canvasEl = mapboxMap.getCanvas();
                    if (canvasEl) {
                        canvasEl.style.backgroundColor = 'transparent';
                        canvasEl.style.background = 'transparent';
                        // Clear the canvas if it has white pixels
                        const ctx = canvasEl.getContext('2d');
                        if (ctx) {
                            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                        }
                    }
                    
                    // Also target the overlay container directly
                    const overlayEl = document.getElementById('mapboxOverlay');
                    if (overlayEl) {
                        overlayEl.style.backgroundColor = 'transparent';
                        overlayEl.style.background = 'transparent';
                    }
                };
                
                // Set immediately
                setTransparent();
                
                // Also set after a short delay to catch any late-rendered elements
                setTimeout(setTransparent, 100);
                setTimeout(setTransparent, 500);
                
                isInitialized = true;
                
                // Start syncing with static map transform
                startTransformSync();
                
                // Resize map when window resizes to match container
                window.addEventListener('resize', () => {
                    if (mapboxMap) {
                        mapboxMap.resize();
                        setTransparent(); // Re-apply transparency after resize
                        // Re-sync transform after resize
                        syncMapboxTransformFromStaticMap();
                    }
                });
            });

            // Handle style changes (ensure transparency maintained)
            mapboxMap.on('styledata', () => {
                // Re-apply transparent background to all containers
                const canvas = mapboxMap.getCanvasContainer();
                if (canvas) {
                    canvas.style.backgroundColor = 'transparent';
                    canvas.style.background = 'transparent';
                }
                const mapContainer = mapboxMap.getContainer();
                if (mapContainer) {
                    mapContainer.style.backgroundColor = 'transparent';
                    mapContainer.style.background = 'transparent';
                }
                const canvasEl = mapboxMap.getCanvas();
                if (canvasEl) {
                    canvasEl.style.backgroundColor = 'transparent';
                    canvasEl.style.background = 'transparent';
                }
            });

        } catch (e) {
            console.error('[Mapbox] Failed to initialize map:', e);
        }
    }

    /**
     * Fetch walking route from Mapbox Directions API
     * @param {Array} origin - [lng, lat] coordinates
     * @param {Array} destination - [lng, lat] coordinates
     * @returns {Promise<Object>} Route data with geometry, distance, duration
     */
    async function fetchWalkingRoute(origin, destination) {
        if (!mapboxgl || !mapboxgl.accessToken) {
            throw new Error('Mapbox not initialized');
        }

        // Set walking speed to 1.5 m/s (5.4 km/h) - typical comfortable walking speed
        // This is slightly faster than Mapbox default (1.42 m/s) for more realistic estimates
        const walkingSpeed = 1.5; // meters per second
        
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?alternatives=false&geometries=geojson&overview=full&steps=false&walking_speed=${walkingSpeed}&access_token=${encodeURIComponent(mapboxgl.accessToken)}`;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            try { controller.abort(); } catch {}
        }, 8000);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            
            if (!response.ok) {
                throw new Error(`Directions API error: ${response.status}`);
            }

            const data = await response.json();
            const route = data?.routes?.[0];
            
            if (!route) {
                throw new Error('No route found');
            }

            return {
                geometry: route.geometry,
                distance: route.distance, // meters
                duration: route.duration  // seconds
            };
        } catch (error) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error('Route request timed out');
            }
            throw error;
        }
    }

    /**
     * Draw route line on Mapbox map
     * @param {Object} routeGeometry - GeoJSON LineString geometry
     */
    function drawRouteLine(routeGeometry) {
        if (!mapboxMap || !isInitialized) {
            console.warn('[Mapbox] Map not initialized, cannot draw route');
            return;
        }

        // Remove existing route layers and source
        removeRouteLayers();

        try {
            // Add route source
            mapboxMap.addSource('route-line-src', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: routeGeometry
                }
            });

            // Add route casing (white outline)
            mapboxMap.addLayer({
                id: 'route-casing',
                type: 'line',
                source: 'route-line-src',
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 8,
                    'line-opacity': 0.9
                }
            });

            // Add route core (blue line)
            mapboxMap.addLayer({
                id: 'route-core',
                type: 'line',
                source: 'route-line-src',
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                paint: {
                    'line-color': '#2563eb',
                    'line-width': 6,
                    'line-opacity': 0.95
                }
            });

        } catch (e) {
            console.error('[Mapbox] Failed to draw route:', e);
        }
    }

    /**
     * Remove route layers and source from map
     */
    function removeRouteLayers() {
        if (!mapboxMap) return;

        try {
            // Remove layers
            if (mapboxMap.getLayer('route-core')) {
                mapboxMap.removeLayer('route-core');
            }
            if (mapboxMap.getLayer('route-casing')) {
                mapboxMap.removeLayer('route-casing');
            }
            // Remove source
            if (mapboxMap.getSource('route-line-src')) {
                mapboxMap.removeSource('route-line-src');
            }
        } catch (e) {
            // Ignore errors (layers may not exist)
        }
    }

    /**
     * Get transform from static map and sync Mapbox
     */
    function syncMapboxTransformFromStaticMap() {
        // Access the global mapInstance from wayfinding.js
        if (window.mapInstance && typeof window.mapInstance.getMapTransform === 'function') {
            const transform = window.mapInstance.getMapTransform();
            syncMapboxTransform(transform);
        }
    }

    /**
     * Start syncing Mapbox transform with static map
     */
    function startTransformSync() {
        // Clear any existing sync interval
        if (syncTransformInterval) {
            clearInterval(syncTransformInterval);
        }
        
        // Sync transform continuously for real-time updates during zoom/pan
        // Using requestAnimationFrame for smooth, frame-synced updates
        function syncLoop() {
            syncMapboxTransformFromStaticMap();
            requestAnimationFrame(syncLoop);
        }
        
        syncLoop();
        
        // Also sync immediately
        syncMapboxTransformFromStaticMap();
    }

    /**
     * Stop syncing Mapbox transform
     */
    function stopTransformSync() {
        if (syncTransformInterval) {
            clearInterval(syncTransformInterval);
            syncTransformInterval = null;
        }
    }

    /**
     * Clear current route
     */
    function clearRoute() {
        removeRouteLayers();
        currentRoute = null;
        currentRouteGeometry = null;
        currentRouteDistance = null;
        currentRouteDuration = null;
    }

    /**
     * Format distance for display
     * @param {number} meters - Distance in meters
     * @returns {string} Formatted distance string
     */
    function formatDistance(meters) {
        if (meters < 950) {
            return `${Math.round(meters)} m`;
        }
        return `${(meters / 1000).toFixed(1)} km`;
    }

    /**
     * Format duration for display
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration string
     */
    function formatDuration(seconds) {
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} h ${mins} min`;
    }

    // Public API
    window.MapboxDirections = {
        /**
         * Initialize Mapbox with GPS bounds
         * @param {Object} gpsBounds - GPS bounds object
         */
        init: function(gpsBounds) {
            initMapbox(gpsBounds);
        },

        /**
         * Get route from origin to destination
         * @param {Array} origin - [lng, lat]
         * @param {Array} destination - [lng, lat]
         * @returns {Promise<Object>} Route data
         */
        getRoute: async function(origin, destination) {
            try {
                const route = await fetchWalkingRoute(origin, destination);
                currentRoute = route;
                currentRouteGeometry = route.geometry;
                currentRouteDistance = route.distance;
                currentRouteDuration = route.duration;
                drawRouteLine(route.geometry);
                return route;
            } catch (error) {
                console.error('[Mapbox] Route fetch error:', error);
                throw error;
            }
        },

        /**
         * Clear the current route
         */
        clearRoute: clearRoute,

        /**
         * Check if Mapbox is initialized
         * @returns {boolean}
         */
        isInitialized: function() {
            return isInitialized && mapboxMap !== null;
        },

        /**
         * Format distance helper
         */
        formatDistance: formatDistance,

        /**
         * Format duration helper
         */
        formatDuration: formatDuration,

        /**
         * Get current route data
         * @returns {Object|null}
         */
        getCurrentRoute: function() {
            return currentRoute ? {
                geometry: currentRouteGeometry,
                distance: currentRouteDistance,
                duration: currentRouteDuration
            } : null;
        }
    };

})();

