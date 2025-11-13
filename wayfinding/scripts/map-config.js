// Map alignment configuration for GPS to pixel coordinate transformation
// This configuration can be calibrated later when the actual map location is known

const MapConfig = {
    // GPS bounds of the map area (placeholder values - to be calibrated)
    // These represent the geographic coordinates that the map image covers
    gpsBounds: {
        north: 55.7494,   // Top latitude
        south: 55.7468,   // Bottom latitude
        east: -4.6419,    // Right longitude
        west: -4.6455      // Left longitude
    },
    
    // Map image dimensions in pixels (placeholder - should match actual image dimensions)
    // These will be updated automatically when the image loads, or can be set manually
    mapImageDimensions: {
        width: 2793,      // Width of the map image in pixels (placeholder)
        height: 1955      // Height of the map image in pixels (placeholder)
    },
    
    /**
     * Update map image dimensions from actual image element
     * @param {HTMLImageElement} img - The map image element
     */
    updateDimensionsFromImage(img) {
        if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
            this.mapImageDimensions.width = img.naturalWidth;
            this.mapImageDimensions.height = img.naturalHeight;
        }
    },
    
    // Flag to lock map position (for future use - set to true to prevent panning/zooming)
    mapLocked: false,
    
    /**
     * Convert GPS coordinates (lat, lng) to map pixel coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Object} {x, y} in pixels relative to map image
     */
    gpsToMapPixels(lat, lng) {
        const bounds = this.gpsBounds;
        const dims = this.mapImageDimensions;
        
        // Calculate normalized coordinates (0-1) within GPS bounds
        const normalizedX = (lng - bounds.west) / (bounds.east - bounds.west);
        const normalizedY = (bounds.north - lat) / (bounds.north - bounds.south); // Inverted because map Y increases downward
        
        // Scale to map image pixel dimensions
        const x = normalizedX * dims.width;
        const y = normalizedY * dims.height;
        
        return { x, y };
    },
    
    /**
     * Convert map pixel coordinates to GPS coordinates
     * @param {number} x - X coordinate in pixels
     * @param {number} y - Y coordinate in pixels
     * @returns {Object} {lat, lng} GPS coordinates
     */
    mapPixelsToGps(x, y) {
        const bounds = this.gpsBounds;
        const dims = this.mapImageDimensions;
        
        // Normalize pixel coordinates (0-1)
        const normalizedX = x / dims.width;
        const normalizedY = y / dims.height;
        
        // Convert to GPS coordinates
        const lng = bounds.west + (normalizedX * (bounds.east - bounds.west));
        const lat = bounds.north - (normalizedY * (bounds.north - bounds.south)); // Inverted
        
        return { lat, lng };
    },
    
    /**
     * Check if GPS coordinates are within the map bounds
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {boolean} True if within bounds
     */
    isWithinBounds(lat, lng) {
        const bounds = this.gpsBounds;
        return lat >= bounds.south && lat <= bounds.north &&
               lng >= bounds.west && lng <= bounds.east;
    }
};

