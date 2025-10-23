# Badge Collection System Implementation

## Overview

Create a reusable badge collection flow that appears after game completion, consisting of:

1. Congratulations splash with radial gradient background + texture image (4s auto-dismiss)
2. Badge detail screen with animated badge icon and fade-in text elements

## Implementation Steps

### 1. Update Game Complete Popup Button

**File:** `games/sunflower-planter/index.html`

Change the "Home" button to "Continue" button that triggers the badge flow:

- Line ~613: Change button text from "Home" to "Continue"
- Change `onclick="goHome()"` to `onclick="showBadgeCollection()"`

### 2. Create Badge Collection HTML Structure

**File:** `games/sunflower-planter/index.html`

Add two new overlay divs after the existing congratulations popup (around line 617):

```html
<!-- Badge Congratulations Splash (4s auto-dismiss) -->
<div id="badgeSplash" class="badge-splash hidden">
  <div class="splash-content">
    <img src="assets/feeding-badge.png" class="splash-badge-icon">
    <h1 class="splash-title">Congratulations</h1>
    <p class="splash-subtitle">You earned a badge!</p>
  </div>
</div>

<!-- Badge Collection Detail Screen -->
<div id="badgeCollection" class="badge-collection hidden">
  <div class="badge-detail-content">
    <img src="assets/feeding-badge.png" class="badge-detail-icon">
    <h2 class="badge-name">Garden Grower</h2>
    <p class="badge-description">A true garden grower! You've planted, watered, and nurtured a beautiful home for the bees.</p>
    <button class="primaryButton" onclick="goHome()">Continue</button>
  </div>
</div>
```

### 3. Add CSS Styling

**File:** `games/sunflower-planter/style.css`

Add styles for both badge screens with proper typography, background layering, and animations:

```css
/* Badge Splash Screen (Congratulations) */
.badge-splash {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #FCF6EF 0%, #D64D1B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.badge-splash::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('assets/Background.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -1;
}

.splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.splash-badge-icon {
  width: 150px;
  height: 150px;
  margin-bottom: 2rem;
  object-fit: contain;
  animation: badgePop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.splash-title {
  color: var(--Texts-textWhite, #FCEFE1);
  text-align: center;
  -webkit-text-stroke-width: 0.2px;
  -webkit-text-stroke-color: var(--Texts-textWhite, #FCEFE1);
  font-family: "Amatic SC";
  font-size: 48px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 48px */
  margin: 0 0 0.5rem 0;
}

.splash-subtitle {
  color: var(--Texts-textWhite, #FCEFE1);
  text-align: center;
  font-family: 'BentonSans Comp Black', sans-serif;
  font-size: 24px;
  font-style: normal;
  font-weight: 400;
  line-height: 90%; /* 21.6px */
  margin: 0;
}

@keyframes badgePop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

/* Badge Collection Detail Screen */
.badge-collection {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #FCF6EF;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.badge-collection::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('assets/Background.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -1;
}

.badge-detail-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  max-width: 500px;
}

.badge-detail-icon {
  width: 180px;
  height: 180px;
  margin-bottom: 2rem;
  object-fit: contain;
  animation: badgeGrow 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes badgeGrow {
  0% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  100% {
    transform: scale(1.1) translateY(-20px);
    opacity: 1;
  }
}

.badge-name {
  color: var(--Texts-textMain, #3A2E27);
  text-align: center;
  font-family: "Amatic SC";
  font-size: 48px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 48px */
  margin: 0 0 1rem 0;
  opacity: 0;
  transform: translateY(-10px);
  animation: fadeInText 0.6s ease-out 0.8s forwards;
}

.badge-description {
  color: var(--Texts-textMain, #3A2E27);
  text-align: center;
  font-family: 'BentonSans Regular', sans-serif;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 140%; /* 22.4px */
  margin: 0 0 2rem 0;
  opacity: 0;
  transform: translateY(-10px);
  animation: fadeInText 0.6s ease-out 0.9s forwards;
}

@keyframes fadeInText {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(-10px);
  }
}

.badge-collection .primaryButton {
  min-width: 200px !important;
  color: var(--Texts-textWhite, #FCEFE1) !important;
  text-align: center !important;
  font-family: 'BentonSans Comp Black', sans-serif !important;
  font-size: 24px !important;
  font-style: normal !important;
  font-weight: 400 !important;
  line-height: 120% !important; /* 28.8px */
  background-color: #C14400 !important;
  border: 2px solid #962F00 !important;
  border-radius: 0.5rem !important;
  filter: drop-shadow(0px 3px 0px #962F00) !important;
  min-height: 2.5rem !important;
  cursor: pointer !important;
}
```

### 4. Add JavaScript Logic

**File:** `games/sunflower-planter/index.html`

Add new function after the existing `goHome()` function (around line 427):

```javascript
function showBadgeCollection() {
  // Hide the game complete popup
  document.getElementById('congrats').classList.add('hidden');
  
  // Show the badge splash with congratulations
  const badgeSplash = document.getElementById('badgeSplash');
  badgeSplash.classList.remove('hidden');
  
  // Auto-dismiss splash after 4 seconds and show detail screen
  setTimeout(() => {
    badgeSplash.classList.add('hidden');
    document.getElementById('badgeCollection').classList.remove('hidden');
  }, 4000);
}
```

### 5. Reusability for Other Games

To implement this for other games (e.g., walrus game), use the same structure but customize:

**Badge-specific data to change:**

- `src="assets/feeding-badge.png"` → Update to game-specific badge image
- Badge name: "Garden Grower" → Change to appropriate badge name
- Badge description text → Update to game-specific achievement description
- Radial gradient colors (optional) → Adjust `#D64D1B` to game theme color

**Implementation approach:**

1. Copy the same HTML structure (badgeSplash + badgeCollection divs)
2. Copy the same CSS (badge-splash + badge-collection styles)
3. Copy the same JavaScript function (showBadgeCollection)
4. Update only the content (badge image, title, description)
5. Ensure the "Continue" button in game complete popup calls `showBadgeCollection()`

This keeps the code modular and consistent across all games while allowing customization of content.

## Key Implementation Details

### Typography Specifications
- **Congratulations title**: Amatic SC 48px, cream white with text stroke
- **"You earned a badge!"**: BentonSans Comp Black 24px, cream white
- **Badge name**: Amatic SC 48px, dark brown
- **Description**: BentonSans Regular 16px, dark brown
- **Continue button**: BentonSans Comp Black 24px, cream white

### Background Layering
- **Layer 1**: Background.png texture image (behind everything)
- **Layer 2**: Colored backgrounds (gradient/solid)
- **Layer 3**: Content (text, badges, buttons)

### Animations
- **Badge splash**: Pop-in animation with overshoot
- **Badge detail**: Scale to 110% and move up 20px
- **Text elements**: Fade in sequentially with slight upward positioning

### Font Corrections
- Use single quotes for font families: `'BentonSans Comp Black', sans-serif`
- Match existing game button typography exactly
- Include proper fallbacks for browser compatibility

## Files Modified

- `games/sunflower-planter/index.html` - Add HTML structure and JavaScript
- `games/sunflower-planter/style.css` - Add badge collection styling

## Assets Required

- `games/sunflower-planter/assets/feeding-badge.png` (game-specific badge image)
- `games/sunflower-planter/assets/Background.png` (texture background)

### To-dos

- [x] Change 'Home' button to 'Continue' and update onclick handler
- [x] Add badgeSplash and badgeCollection HTML overlays
- [x] Add CSS for badge splash and collection screens with animations
- [x] Add showBadgeCollection() function with 4s auto-dismiss logic
- [x] Test complete badge collection flow from game completion
- [x] Fix typography to match design specifications
- [x] Add background texture image layering
- [x] Implement badge detail screen animations
- [x] Correct font family declarations to match games page
