# Animals Everywhere App - User Guide & Technical Documentation

## Overview

Animals Everywhere is a location-based AR mobile web application for the Horniman Museum & Gardens. Users explore the museum grounds, find animals using GPS wayfinding, collect badges, play AR mini-games, and compete on leaderboards.

## App Flow & File Structure

### 1. Loading Page (`index.html`)

**Location:** Root directory

**Purpose:** Initial app entry point with loading animation

**Features:**

- Animated loading screen with floating owl character
- "Loading..." text with wave animation
- Cloud animations drifting across screen
- 5-second delay before showing onboarding (configurable)
- Orientation detection (portrait mode required)

**User Interaction:**

- Automatic progression after loading completes
- Shows onboarding overlay with animated background

**Animations:**

- Owl: Floating animation with wing flapping, head tilting, blinking eyes, dangling feet
- Loading text: Wave animation with staggered character delays
- Clouds: Continuous horizontal drift animation

---

### 2. Onboarding/Welcome Screen (`index.html` - overlay)

**Location:** `index.html` (DOM overlay)

**Features:**

- Animated background (Adobe Animate/CreateJS) - 60 frames at 30fps
- Butterfly GIF animation (fluttering path in top portion of screen)
- Bee GIF animation (erratic movement pattern)
- HMG logo with grow-in animation
- Welcome title "Animals Everywhere!" with grow-in animation
- Welcome message for returning users (if nickname exists)
- Start/Continue button with grow-in animation

**User Interaction:**

- **New Users:** Click "Start" → Navigate to nickname creation
- **Returning Users:** Click "Continue" → Navigate to menu
- Button click triggers:
  - Haptic feedback
  - Fade-out animation for onboarding elements
  - Reverse background animation
  - Navigation to next page

**Data Check:**

- Checks `localStorage.userData` for existing user
- If user exists, shows welcome message with nickname
- Syncs returning user to Customer.io (when snippet added)

---

### 3. Nickname Creation (`pages/nickname.html`)

**Location:** `pages/nickname.html`

**Purpose:** Create or update user nickname

**Features:**

- Two dropdown selectors:
  - First name: Flora, Garden, Honey, Jellyfish, Megalodon, Nectar, Ocean, Plant, Sea, Walrus
  - Second name: Fox, Explorer, Hero, Team, Savior, Ninja, Boss, Champion
- Live nickname preview (e.g., "FloraFox42")
- Random 2-digit number (10-99) appended automatically
- Slide-in animation from right
- Slide-out animation before navigation

**User Interaction:**

1. Select first name from dropdown
2. Select second name from dropdown
3. Preview updates automatically
4. Click "Confirm" button
5. Data saved to localStorage
6. Navigate to menu page

**Data Saved:**

```javascript
{
  nickname: "FloraFox42",
  userId: "generated_unique_id",
  created: "ISO_timestamp",
  progress: {
    gamesCompleted: [],
    badges: [],
    badgeDates: {},
    highScores: {}
  }
}
```

**Storage:**

- `localStorage.userData` - Full user data object
- `localStorage.collectedBadges` - Array of badge IDs (legacy, synced with userData)

**Customer.io Sync:**

- Calls `syncUserToCustomerIO(userData)` after save
- Will work when Customer.io snippet is added

**Testing:**

- If user already exists, automatically redirects to menu
- Can update nickname by returning to this page

---

### 4. Menu Page (`pages/menu.html`)

**Location:** `pages/menu.html`

**Purpose:** Main navigation hub

**Features:**

- Fixed title at top: "ANIMALS EVERYWHERE!"
- Personalized greeting: "HEY [NICKNAME]! THE ANIMALS HAVE GOTTEN LOOSE AT THE HORNIMAN!"
- Description text
- Navigation buttons:
  - **Find the animals** → Wayfinding page
  - **Map** → Interactive map page
  - **Badges** → Badges collection page
  - **Animals** → Animals collection page
  - **Leaderboards** → Leaderboard page
- Settings button (top right)
- Back button (top left) → Returns to index.html
- Footer with HMG logo

**User Interaction:**

- All buttons trigger haptic feedback
- Navigation buttons have 100ms delay to allow audio to play
- Settings button opens settings overlay

**Settings Overlay:**

- Shows user nickname
- Toggle buttons for:
  - **Haptics** - Vibration feedback on/off
  - **Audio** - Sound effects on/off
  - **Music** - Background music on/off
- "How to play" button → Instructions overlay
- Close button

**Instructions Overlay:**

- Visual guide with icons
- Explains: exploring, finding animals, earning badges, climbing leaderboard
- "Got it!" button to close

**Data Sync:**

- Syncs badges between `collectedBadges` and `userData.progress.badges` on page load
- Updates nickname display from `userData.nickname`

---

### 5. Wayfinding Page (`pages/wayfinding/wayfinding.html`)

**Location:** `pages/wayfinding/wayfinding.html`

**Purpose:** GPS-based animal discovery with real-time location tracking

**Features:**

- Mapbox GL JS map with custom Horniman map image
- Real-time GPS location tracking
- Animal hotspots marked on map
- Proximity detection (10-meter radius)
- Audio/visual alerts when near animals
- AR scanning interface
- Directions to animals using Mapbox Directions API
- Player location marker
- Animal icons (shadow when not found, colored when found)

**User Interaction:**

1. **Location Permission:** First-time users prompted for GPS permission
2. **Map Navigation:**
   - Pan by dragging
   - Pinch to zoom (mobile)
   - Scroll wheel zoom (desktop)
   - Zoom buttons (+/-)
   - Recenter button
3. **Finding Animals:**
   - Move within 10 meters of animal location
   - Proximity alert appears
   - "Scan" button appears
   - Tap scan to open AR view
4. **AR Scanning:**
   - Camera view opens
   - Animal 3D model appears in AR
   - Tap to collect badge
   - Badge splash screen appears
   - Navigate to game (if available)

**Permissions:**

- **Location:** Required for GPS tracking
- **Camera:** Required for AR scanning
- Stored in localStorage to prevent repeated prompts

**Data:**

- Uses `data/animals.json` (production) or `data/testing.json` (testing)
- Environment toggle stored in `localStorage['wayfinding-environment']`

**Badge Collection:**

- When animal found, badge added to:
  - `localStorage.collectedBadges`
  - `userData.progress.badges`
  - `userData.progress.badgeDates[badgeId] = timestamp`
- Syncs to Customer.io via `updateBadgeInCustomerIO(badgeId)`

**Testing:**

- Can switch between production/testing locations via environment toggle
- Testing locations use different GPS coordinates

---

### 6. Interactive Map Page (`pages/map.html`)

**Location:** `pages/map.html`

**Purpose:** Static interactive map view (no GPS)

**Features:**

- Large zoomable/panable map image
- Zoom controls (+/- buttons)
- Smooth pan and zoom animations
- Touch and mouse support
- Boundary constraints (prevents panning off map)

**User Interaction:**

- Drag to pan
- Pinch/scroll to zoom
- Zoom buttons for precise control
- Settings button available
- Back button returns to menu

**Use Case:**

- Overview of museum layout
- Planning exploration routes
- No GPS required

---

### 7. Animals Collection Page (`pages/animals.html`)

**Location:** `pages/animals.html`

**Purpose:** Browse all animals, view details, access 3D models

**Features:**

- Grid layout of all animals
- Two states per animal:
  - **Not Found:** Shadow icon, grayed out
  - **Found:** Colored icon, interactive
- Animal detail cards with:
  - Name and scientific name
  - Description
  - Badge description (if found)
  - 3D model viewer button
  - Game link (if available)
- Search functionality
- Filter by found/not found

**User Interaction:**

1. **Browse Animals:**
   - Scroll through grid
   - Tap animal card to view details
2. **View Details:**
   - Tap animal card → Detail overlay opens
   - Shows full information
   - "View 3D Model" button (if found)
   - "Play Game" button (if game available)
3. **3D Model Viewer:**
   - Opens full-screen 3D viewer
   - Interactive model (rotate, zoom, pan)
   - AR button (if supported)
   - Close button

**3D Model Viewer:**

- Uses `scripts/model-viewer.js` (SmartifyModelViewer)
- Supports GLB format (WebGL)
- AR modes:
  - **WebXR** - Standard web AR
  - **Scene Viewer** - Android AR
  - **Quick Look** - iOS AR (uses USDZ files)
- Model loading from `assets/wayfinding/model/`
- Scale and rotation configured per animal

**Missing 3D Models:**

The following animals do NOT have 3D models yet:

- **Fox** - Model file missing
- **Puffin** - Model file missing
- **Grass Snake** - Model file missing
- **Ostrich** - Model file missing
- **Butterfly** - Model file missing

**Animals WITH Models:**

- Peacock, Walrus, Koala, Bee, Clownfish, Platypus, Cephalopod, Stag Beetle, Snowy Owl, Orangutan, Jellyfish, European Robin, Velociraptor, Tiger Cub, Dodo, Crocodile

**AR Functionality:**

- **Android:** Uses Scene Viewer (ARCore)
- **iOS:** Uses Quick Look (ARKit) with USDZ files
- AR button only shows if device supports AR
- Models must have both `.glb` and `.usdz` files for full AR support

---

### 8. Badges Collection Page (`pages/badges.html`)

**Location:** `pages/badges.html`

**Purpose:** View collected badges and achievements

**Features:**

- Grid layout of all badges
- Two states:
  - **Collected:** Full color, interactive
  - **Not Collected:** Gray placeholder with lock icon
- Badge detail popup:
  - Badge icon
  - Badge name
  - Description
  - Collection date (if collected)
  - Game link (if available)
- Badge count display
- Progress indicator

**User Interaction:**

1. **View Badges:**
   - Scroll through grid
   - Collected badges are interactive
   - Uncollected badges show lock icon
2. **Badge Details:**
   - Tap collected badge → Detail popup
   - Shows collection date
   - "Play Game" button (if game linked)
3. **Testing Mode:**
   - Triple-tap footer logo → Unlock all badges
   - All badges become visible and interactive
   - Original state restored on page refresh
   - Uses `sessionStorage` (not saved to localStorage)

**Testing Instructions:**

To unlock all badges for testing:

1. Navigate to badges page
2. Triple-tap the HMG logo in the footer
3. All badges will become visible
4. Refresh page to restore original state

**Data:**

- Reads from `localStorage.collectedBadges`
- Syncs with `userData.progress.badges`
- Badge dates from `userData.progress.badgeDates`

---

### 9. Games

All games are AR-based, requiring camera access. Games are located in `games/[game-name]/index.html`.

#### 9.1 Sunflower Planter (`games/sunflower-planter/`)

**Animal:** Bee

**Badge:** `bee-ar`

**Gameplay:**

1. Place AR anchor in real world
2. Switch between three tools:
   - **Seed Packet:** Plant sunflower seeds
   - **Watering Can:** Water planted seeds
   - **Shovel:** Dig soil to prepare planting
3. Plant seeds by tapping on ground
4. Water seeds to make them grow
5. Grow multiple sunflowers to complete
6. Physics-based interactions with Ammo.js

**Completion:**

- Badge awarded on completion
- High score tracked (flowers grown)
- Game completion added to `userData.progress.gamesCompleted`

---

#### 9.2 Walrus Feeder (`games/walrus-feeder/`)

**Animal:** Walrus

**Badge:** `walrus-ar`

**Gameplay:**

1. Place walrus AR model in real world
2. Bucket appears with food items
3. Throw food items (clams, cod, shrimp) at walrus
4. Walrus catches food and eats it
5. Different food types unlock progressively
6. Feed walrus multiple times to complete

**Completion:**

- Badge awarded on completion
- High score tracked (food items caught)
- Game completion added to progress

---

#### 9.3 Proud Photographer (`games/proud-photographer/`)

**Animal:** Peacock

**Badge:** `peacock`

**Gameplay:**

1. Place peacock AR model in real world
2. Use camera to take photos
3. Frame peacock in viewfinder
4. Capture photo
5. Photo saved as canvas image
6. Can retry or save photo

**Completion:**

- Badge awarded on photo capture
- Photo can be downloaded
- Game completion added to progress

---

#### 9.4 Anemone Cleaning (`games/anemone-cleaning/`)

**Animal:** Clownfish

**Badge:** `clownfish-ar`

**Gameplay:**

1. Place anemone AR model in real world
2. Tap and drag to clean anemone
3. Remove dirt/particles by scrubbing
4. Clean entire anemone to complete
5. Particle effects on cleaning
6. Audio feedback for cleaning actions

**Completion:**

- Badge awarded on completion
- High score tracked (cleaning efficiency)
- Game completion added to progress

**Game Data Flow:**

- All games call `window.addBadge(badgeId)` on completion
- Games update `userData.progress.highScores[gameId]`
- Games add to `userData.progress.gamesCompleted`
- Syncs to Customer.io via `updateGameCompletedInCustomerIO(gameId)`

---

### 10. Leaderboard Page (`pages/leaderboard.html`)

**Location:** `pages/leaderboard.html`

**Purpose:** Display user rankings and achievements

**Features:**

- Animated starburst background
- User's current rank display
- Top players list
- Ranking based on:
  - Badge count (primary)
  - Games completed
  - High scores
- User's position highlighted
- Scrollable leaderboard

**Data:**

- Currently uses localStorage data (local only)
- **Future:** Will sync with Customer.io backend
- Rankings calculated client-side from all users' data

**Future Integration:**

- Customer.io will aggregate user data
- Server-side ranking calculation
- Real-time leaderboard updates
- Persistent across devices

---

### 11. Settings System

**Location:** `scripts/settings.js` (shared module)

**Features:**

- Centralized settings management
- Available on all pages via settings button
- Three toggle settings:

#### Haptics

- **Storage:** `localStorage['haptic_hapticsEnabled']`
- **Default:** Enabled (true)
- **Function:** Vibration feedback on button clicks and interactions
- **Implementation:** Uses Web Vibration API

#### Audio (SFX)

- **Storage:** `localStorage['haptic_audioEnabled']`
- **Default:** Enabled (true)
- **Function:** Sound effects (clicks, game sounds, etc.)
- **Implementation:** Global audio manager system

#### Music

- **Storage:** `localStorage['haptic_musicEnabled']`
- **Default:** Enabled (true)
- **Function:** Background music in games and menus
- **Implementation:** Global music manager system

**Settings Persistence:**

- All settings saved to localStorage
- Persists across sessions
- Synced across pages
- Will sync to Customer.io in future

---

## Data Storage & Cookies

### localStorage Data Structure

#### `userData` (Primary User Object)

```javascript
{
  nickname: "FloraFox42",
  userId: "k1j2h3g4f5e6", // Generated unique ID
  created: "2024-01-15T10:30:00.000Z",
  progress: {
    gamesCompleted: ["bee-ar", "walrus-ar"], // Game badge IDs
    badges: ["peacock", "bee-ar", "koala"], // All collected badge IDs
    badgeDates: {
      "peacock": "2024-01-15T10:35:00.000Z",
      "bee-ar": "2024-01-15T11:20:00.000Z"
    },
    highScores: {
      "bee-ar": 5, // Flowers grown
      "walrus-ar": 3 // Food items caught
    }
  }
}
```

#### `collectedBadges` (Legacy Array)

```javascript
["peacock", "bee-ar", "koala", "walrus-ar"]
```

- Maintained for backward compatibility
- Automatically synced with `userData.progress.badges`

#### Settings

- `haptic_hapticsEnabled`: "true" | "false"
- `haptic_audioEnabled`: "true" | "false"
- `haptic_musicEnabled`: "true" | "false"
- `permission-camera-granted`: "granted"
- `permission-location-granted`: "granted"
- `permission-motion-granted`: "granted"

#### Other

- `wayfinding-environment`: "production" | "testing"

**Note:** No traditional cookies are used. All data stored in localStorage (browser storage).

---

## Customer.io Integration

### Current Status

- Helper script ready: `scripts/customer-io-helper.js`
- Customer.io snippet not yet added to pages
- Functions will work automatically when snippet is added

### Integration Functions

#### `syncUserToCustomerIO(userData)`

Called when:

- User creates/updates nickname
- User returns to app (existing user check)
- Badge is collected
- Game is completed

**Data Synced:**

```javascript
{
  nickname: userData.nickname,
  created: userData.created,
  badges_count: userData.progress.badges.length,
  badges: userData.progress.badges,
  badge_dates: userData.progress.badgeDates,
  games_completed_count: userData.progress.gamesCompleted.length,
  games_completed: userData.progress.gamesCompleted,
  high_scores: userData.progress.highScores,
  last_seen: new Date().toISOString()
}
```

#### `updateBadgeInCustomerIO(badgeId)`

Called when:

- Badge collected via wayfinding
- Badge collected via game completion

#### `updateGameCompletedInCustomerIO(gameId)`

Called when:

- Game completed successfully

### Future Integration Plan

**Phase 1: User Identification**

- Identify users by `userId` when Customer.io snippet added
- Sync existing user data on app load

**Phase 2: Real-time Updates**

- Badge collections sync immediately
- Game completions sync immediately
- High scores sync immediately

**Phase 3: Leaderboard Backend**

- Aggregate user data from Customer.io
- Calculate rankings server-side
- Real-time leaderboard updates
- Cross-device persistence

**Phase 4: Analytics**

- Track user journeys
- Game completion rates
- Badge collection patterns
- Location visit frequency

---

## Animations

### Loading Screen

- **Owl Animation:** 6-second loop
  - Floating up/down motion
  - Wing flapping (left/right asymmetric)
  - Head tilting left/right
  - Eye blinking (every 6 seconds)
  - Pupil movement (left/center/right)
  - Foot dangling (alternating)
  - Shadow scaling with float
- **Loading Text:** Wave animation, 1.5s loop, staggered delays
- **Clouds:** Horizontal drift, 40-60s duration

### Onboarding

- **Background:** Adobe Animate animation, 60 frames @ 30fps (2 seconds)
- **Logo/Title/Button:** Grow-in animation with overshoot (0.6s cubic-bezier)
- **Butterfly:** 25s flutter path, organic movement in top portion
- **Bee:** 18s erratic path, faster movement with hover moments
- **Fade-out:** 0.5s fade before navigation

### Page Transitions

- **Nickname Page:** Slide-in from right (0.5s), slide-out to right (0.5s)
- **Menu Navigation:** Instant (with haptic feedback)

### Badge Collection

- **Badge Splash:** Scale-up animation with celebration
- **Tada Sound:** Plays on badge collection

### Settings

- **Overlay:** Slide-in from bottom (0.3s), slide-out (0.3s)
- **Toggle Buttons:** Visual state change (disabled class)

---

## Testing Instructions

### Unlock All Badges

1. Navigate to `pages/badges.html`
2. Triple-tap the HMG logo in the footer
3. All badges become visible and interactive
4. Refresh page to restore original state

### Unlock All Animals

1. Navigate to `pages/animals.html`
2. Triple-tap the HMG logo in the footer
3. All animals become found and interactive
4. Refresh page to restore original state

### Switch Wayfinding Environment

1. Open browser console
2. Run: `localStorage.setItem('wayfinding-environment', 'testing')`
3. Refresh wayfinding page
4. Uses `data/testing.json` with different GPS coordinates

### Reset User Data

1. Open browser console
2. Run: `localStorage.removeItem('userData')`
3. Run: `localStorage.removeItem('collectedBadges')`
4. Refresh app
5. User will be treated as new user

---

## File Structure Summary

```
horn_demo/
├── index.html                    # Loading & onboarding page
├── pages/
│   ├── nickname.html             # Nickname creation
│   ├── menu.html                 # Main navigation
│   ├── wayfinding/
│   │   ├── wayfinding.html       # GPS wayfinding map
│   │   ├── animalsAR.html        # AR animal scanning
│   │   └── proximity.html        # Proximity detection
│   ├── map.html                  # Interactive static map
│   ├── animals.html              # Animals collection
│   ├── badges.html               # Badges collection
│   └── leaderboard.html          # Leaderboard
├── games/
│   ├── sunflower-planter/       # Bee game
│   ├── walrus-feeder/            # Walrus game
│   ├── proud-photographer/       # Peacock game
│   └── anemone-cleaning/         # Clownfish game
├── scripts/
│   ├── customer-io-helper.js    # Customer.io integration
│   ├── settings.js              # Settings management
│   ├── audio-manager-main.js    # Audio system
│   ├── model-viewer.js          # 3D model viewer
│   └── wayfinding/               # Wayfinding scripts
├── data/
│   ├── animals.json              # Production animal data
│   └── testing.json              # Testing animal data
└── assets/
    ├── wayfinding/model/         # 3D models (GLB/USDZ)
    ├── animals/                  # Animal icons
    └── badges/                   # Badge icons
```

---

## Technical Notes

### Browser Compatibility

- **iOS Safari:** Full support (AR via Quick Look)
- **Android Chrome:** Full support (AR via Scene Viewer)
- **Desktop:** Limited (no AR, wayfinding GPS not available)

### Required Permissions

- **Location:** For GPS wayfinding
- **Camera:** For AR games and scanning
- **Motion:** For device orientation (iOS 13+)

### Performance

- Models optimized for mobile (GLB format)
- Lazy loading for animal/badge pages
- Audio context initialized on user interaction (iOS requirement)

### Future Enhancements

- Customer.io backend integration
- Server-side leaderboard
- Cross-device sync
- Push notifications
- Social sharing
- Achievement system expansion

