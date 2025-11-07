// customer-io-helper.js
// Customer.io integration helper - works even if Customer.io snippet isn't loaded yet

/**
 * Safely identify a user in Customer.io
 * @param {string} userId - The user's unique ID
 * @param {object} attributes - User attributes to set
 */
function identifyCustomerIO(userId, attributes) {
    try {
        // Check if Customer.io is loaded
        if (typeof cio !== 'undefined' && cio.identify) {
            cio.identify(userId, attributes);
            console.log('Customer.io: User identified', userId, attributes);
        } else {
            // Customer.io not loaded yet - silently fail (will work when snippet is added)
            console.debug('Customer.io: Not loaded yet, skipping identify');
        }
    } catch (error) {
        console.warn('Customer.io: Error identifying user', error);
    }
}

/**
 * Sync user data to Customer.io
 * @param {object} userData - The user data object from localStorage
 */
function syncUserToCustomerIO(userData) {
    if (!userData || !userData.userId) {
        return;
    }
    
    const attributes = {
        nickname: userData.nickname || '',
        created: userData.created || new Date().toISOString(),
        badges_count: userData.progress?.badges?.length || 0,
        badges: userData.progress?.badges || [],
        games_completed_count: userData.progress?.gamesCompleted?.length || 0,
        games_completed: userData.progress?.gamesCompleted || [],
        last_seen: new Date().toISOString()
    };
    
    // Add high scores if available
    if (userData.progress?.highScores) {
        attributes.high_scores = userData.progress.highScores;
    }
    
    identifyCustomerIO(userData.userId, attributes);
}

/**
 * Update Customer.io when a badge is collected
 * @param {string} badgeId - The badge ID that was collected
 */
function updateBadgeInCustomerIO(badgeId) {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || 'null');
        if (userData && userData.userId) {
            syncUserToCustomerIO(userData);
        }
    } catch (error) {
        console.warn('Customer.io: Error updating badge', error);
    }
}

/**
 * Update Customer.io when a game is completed
 * @param {string} gameId - The game ID that was completed
 */
function updateGameCompletedInCustomerIO(gameId) {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || 'null');
        if (userData && userData.userId) {
            syncUserToCustomerIO(userData);
        }
    } catch (error) {
        console.warn('Customer.io: Error updating game completion', error);
    }
}

