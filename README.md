# Vehicle Selector

A JavaScript component that creates an interactive, step-by-step vehicle configuration wizard. Users can select their vehicle details through an intuitive interface with autocomplete dropdowns, smooth transitions, and smart action buttons.

## Features

- 🚗 **Multi-step wizard** with 7 vehicle fields (Year, Make, Model, Submodel, Chassis, Engine, Transmission)
- 🎯 **Smart autocomplete** with filtered dropdown options
- ⌨️ **Keyboard navigation** (arrows, enter, escape)
- 🎨 **Smooth animations** with visual puck indicator
- 🔄 **Programmatic control** (reset, set configuration)
- 🎛️ **Smart action buttons** with vehicle compatibility detection
- 📊 **Match detection** (perfect, partial, none) for page compatibility
- 🔗 **Auto-generated URLs** with proper encoding and parameters
- 📱 **Responsive design** ready
- ⚡ **Performance optimized** with event delegation

## Quick Start

### 1. Include the HTML Structure

```html
<section class="vehicle-selector">
  <div class="container">
    <form id="vehicle-selector-form" class="vehicle-selector-form">
        <!-- Step 1: Basic Info -->
        <div class="vehicle-selector-step">
            <div class="vehicle-selector-step-content">
                <div class="vehicle-selector-puck"></div>

                <div class="vehicle-selector-input-group">
                    <input name="year" type="text" class="vehicle-selector-input-control">
                    <label class="vehicle-selector-input-label">Select Year</label>
                    <a href="#" class="vs-clear-selection">×</a>
                </div>

                <div class="vehicle-selector-input-group">
                    <input name="make" type="text" class="vehicle-selector-input-control">
                    <label class="vehicle-selector-input-label">Select Make</label>
                    <a href="#" class="vs-clear-selection">×</a>
                </div>

                <!-- Add Model and Submodel fields similarly -->

                <a href="#" class="vehicle-selector-nav-arrow nav-forward">Next →</a>
            </div>
        </div>

        <!-- Step 2: Details -->
        <div class="vehicle-selector-step hidden">
            <div class="vehicle-selector-step-content">
                <div class="vehicle-selector-puck"></div>
                <a href="#" class="vehicle-selector-nav-arrow nav-backwards">
                    <div id="vehicle-selector-intermediary-summary">Year, Make, Model and Submodel</div>
                </a>

                <!-- Add Chassis, Engine, Transmission fields -->

                <a href="#" class="vehicle-selector-nav-arrow nav-forward">Next →</a>
            </div>
        </div>

        <!-- Step 3: Summary -->
        <div class="vehicle-selector-step hidden">
            <div class="vehicle-selector-step-content">
                <a href="#" class="vehicle-selector-nav-arrow nav-backwards">← Back</a>

                <div class="vehicle-selector-summary">
                    <div id="vehicle-selector-complete-summary">Your complete selection will appear here</div>
                </div>

                <button class="vehicle-selector-reset-selection">Start Over</button>
            </div>
            <a href="#" class="vehicle-selector-button">Browse Parts</a>
        </div>

        <!-- Dropdown (shared) -->
        <div id="vehicle-selector-dropdown" class="vehicle-selector-dropdown">
            <div class="dropdown-list">
                <div class="dropdown-box-2"></div>
            </div>
        </div>
    </form>
  </div>
</section>
```

### 2. Prepare Your Vehicle Data

```javascript
const carData = {
  2018: {
    Audi: {
      "A5": {
        redirectUrls: {
          default: "/carmakers/audi/a5",
          parts: "/parts/audi/a5",
          accessories: "/accessories/audi/a5"
        },
        "Premium Plus": {
          "2dr Coupe": {
            "2.0L TFSI Turbo 4-cyl 252hp": ["7-speed S tronic", "6-speed Manual"],
            "3.0L TFSI V6 354hp": ["8-speed Tiptronic"]
          },
          "4dr Sportback": {
            "2.0L TFSI Turbo 4-cyl 252hp": ["7-speed S tronic"],
            "3.0L TFSI V6 354hp": ["8-speed Tiptronic"]
          }
        }
      }
    },
    BMW: {
      "3 Series": {
        redirectUrls: {
          default: "/carmakers/bmw/3-series",
          parts: "/parts/bmw/3-series"
        },
        "330i": {
          "4dr Sedan": {
            "2.0L Twin Turbo 4-cyl 248hp": ["8-speed Automatic"]
          }
        }
      }
    }
  }
};
```

### 3. Initialize the Selector

```javascript
const vehicleSelector = initVehicleSelector({
  vehicleData: carData,
  customActions: {
    buttonText: "Browse Parts",
    buttonVisibility: "always",
    urlContext: "parts"
  },
  onComplete: (result) => {
    console.log('Vehicle selected:', result.summary);
    console.log('Redirect URL:', result.redirectURL);
    console.log('Match type:', result.matchType);
  }
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `formId` | string | `"vehicle-selector-form"` | ID of the form element |
| `fieldNames` | array | `["year", "make", "model", ...]` | Names of the input fields |
| `vehicleData` | object | `window.carData \|\| {}` | Vehicle data object |
| `onComplete` | function | `null` | Callback when all fields are filled |
| `onReset` | function | `null` | Callback when selector is reset |
| `onError` | function | `null` | Callback when errors occur |
| `customActions` | object | `{}` | Action button configuration |

### Custom Actions Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `buttonText` | string | `"Browse Parts"` | Text displayed on the action button |
| `compatibleVehicles` | array | `[]` | Array of vehicles compatible with current page |
| `buttonVisibility` | string | `"always"` | Button visibility: `"always"`, `"never"`, `"compatibility"` |
| `buttonUrlRef` | string | `""` | Query parameter for tracking (e.g., `"utm_source=selector"`) |
| `buttonUrlCategory` | string | `""` | Page category to append to URL (e.g., `"braking-system"`) |
| `urlContext` | string | `"default"` | Which URL context to use from vehicle data (`"default"`, `"parts"`, `"accessories"`) |

## Examples

### Homepage Setup (Always Show Button)

```javascript
const selector = initVehicleSelector({
  vehicleData: carData,
  customActions: {
    buttonText: "Browse Parts",
    buttonVisibility: "always",
    urlContext: "parts"
  },
  onComplete: (result) => {
    // result.redirectURL comes from vehicle data: "/parts/audi/a5/?year=2018&submodel=premium-plus"
    window.location.href = result.redirectURL;
  }
});
```

### Product Page Setup (Show When No Match)

```javascript
// Define vehicles this page serves
const pageVehicles = [
  { year: "2018", make: "Audi", model: "A5", submodel: "Premium Plus", chassis: "4dr Sportback", engine: "2.0L TFSI Turbo 4-cyl 252hp", transmission: "7-speed S tronic" },
  { year: "2018", make: "Audi", model: "A5", submodel: "Premium Plus", chassis: "2dr Coupe", engine: "2.0L TFSI Turbo 4-cyl 252hp", transmission: "7-speed S tronic" }
];

const selector = initVehicleSelector({
  vehicleData: carData,
  customActions: {
    buttonText: "View Matching Parts",
    compatibleVehicles: pageVehicles,
    buttonVisibility: "compatibility", // Only show when vehicle doesn't match page
    urlContext: "parts",
    buttonUrlRef: "utm_source=product_page"
  },
  onComplete: (result) => {
    if (result.matchType === "perfect") {
      console.log("User's vehicle matches this page perfectly!");
      // Button will be hidden automatically
    } else {
      console.log(`${result.matchType} match - redirecting to: ${result.redirectURL}`);
      // Button will be visible with redirect URL from vehicle data
    }
  }
});
```

### Advanced Configuration with Error Handling

```javascript
const selector = initVehicleSelector({
  vehicleData: carData,
  customActions: {
    buttonText: "Find Parts",
    buttonVisibility: "compatibility",
    urlContext: "parts",
    buttonUrlRef: "source=configurator&campaign=spring2024"
  },
  onComplete: (result) => {
    // result.values: { year: "2018", make: "Audi", ... }
    // result.summary: "2018 Audi A5 Premium Plus 4dr Sportback..."
    // result.redirectURL: "/parts/audi/a5/?year=2018&submodel=premium-plus&source=configurator&campaign=spring2024"
    // result.matchType: "none" | "partial" | "perfect"
    
    analytics.track('vehicle_configured', {
      vehicle: result.values,
      matchType: result.matchType
    });
  },
  onError: (error) => {
    console.error('Vehicle selector error:', error);
    // Handle errors gracefully
  }
});
```

### URL Generation Examples

The selector automatically gets URLs from vehicle data and appends parameters:

```javascript
// Vehicle data contains: redirectUrls: { parts: "/parts/audi/a5" }
// User selection: { year: "2018", make: "Audi", model: "A5", submodel: "Premium Plus" }
// Output: "/parts/audi/a5/?year=2018&submodel=premium-plus"

// With tracking parameters:
// Output: "/parts/audi/a5/?year=2018&submodel=premium-plus&utm_source=selector"

// "I don't know" selections are excluded:
// User selection: { year: "2018", make: "Audi", model: "A5", submodel: "I don't know" }
// Output: "/parts/audi/a5/?year=2018"
```

## Methods

### `reset(skipCallback)`
Reset the selector to initial state.

```javascript
selector.reset();        // Reset and trigger onReset callback
selector.reset(true);    // Reset without triggering callback
```

### `setConfiguration(config, options)`
Programmatically set vehicle configuration.

```javascript
// Partial configuration
selector.setConfiguration({
  year: "2020",
  make: "BMW",
  model: "M3"
});

// Complete configuration
selector.setConfiguration({
  year: "2020",
  make: "BMW", 
  model: "M3",
  submodel: "Competition",
  chassis: "4-door Sedan",
  engine: "Petrol 3.0L Twin-Turbo",
  transmission: "8-speed Auto"
}, {
  triggerCallbacks: true  // Trigger onComplete if complete
});
```

### `getState()`
Get current selection values.

```javascript
const currentSelection = selector.getState();
console.log(currentSelection); // { year: "2018", make: "Audi", ... }
```

### `updateData(newData)`
Update vehicle data dynamically.

```javascript
selector.updateData({
  2024: {
    Tesla: {
      "Model 3": { /* ... */ }
    }
  }
});
```

### `updateButtonConfig(newConfig)`
Update button configuration dynamically.

```javascript
selector.updateButtonConfig({
  buttonText: "New Button Text",
  buttonVisibility: "never",
  compatibleVehicles: [/* new vehicles */]
});
```

### `destroy()`
Clean up event listeners and timers.

```javascript
selector.destroy();
```

## Vehicle Matching Logic

The selector determines three types of matches:

### Perfect Match
All 7 fields exactly match a vehicle in `compatibleVehicles`:
```javascript
// User selected: 2018 Audi A5 Premium Plus 4dr Sportback 2.0L TFSI 7-speed S tronic
// Page vehicle: 2018 Audi A5 Premium Plus 4dr Sportback 2.0L TFSI 7-speed S tronic
// Result: matchType = "perfect" (button hidden in compatibility mode)
```

### Partial Match
Year, Make, Model match, but other fields differ or contain "I don't know":
```javascript
// User selected: 2018 Audi A5 Premium Plus 4dr Sportback "I don't know" "I don't know"
// Page vehicle: 2018 Audi A5 Premium Plus 4dr Sportback 2.0L TFSI 7-speed S tronic
// Result: matchType = "partial" (button shown in compatibility mode)
```

### No Match
Year, Make, or Model don't match any `compatibleVehicles`:
```javascript
// User selected: 2018 BMW 3 Series ...
// Page vehicles: Only Audi A5 variants
// Result: matchType = "none" (button shown in compatibility mode)
```

## Quick Select Integration

```javascript
// Preset configurations
const presets = {
  'audi-a5': {
    year: "2018", make: "Audi", model: "A5", 
    submodel: "Premium Plus", chassis: "4dr Sportback",
    engine: "2.0L TFSI Turbo 4-cyl 252hp", transmission: "7-speed S tronic"
  }
};

document.getElementById('vehicle-presets').addEventListener('change', (e) => {
  const preset = presets[e.target.value];
  if (preset) {
    selector.setConfiguration(preset);
  } else {
    selector.reset();
  }
});
```

## CSS Classes Reference

| Class | Purpose |
|-------|---------|
| `.vehicle-selector-step` | Step container |
| `.vehicle-selector-input-group` | Input field container |
| `.vehicle-selector-input-control` | Input field |
| `.vehicle-selector-nav-arrow` | Navigation buttons |
| `.nav-forward` / `.nav-backwards` | Arrow direction |
| `.vs-clear-selection` | Clear field button |
| `.vehicle-selector-reset-selection` | Reset all button |
| `.vehicle-selector-button` | Action button |
| `.vehicle-selector-puck` | Visual indicator |
| `.disabled` / `.active` / `.completed` | Field states |
| `.hidden` | Hide elements |

## Error Handling

The selector includes comprehensive error handling:

```javascript
// URL generation errors
onError: (error) => {
  if (error.type === 'url_generation') {
    console.log('Cannot generate URL:', error.message);
    // Button will be hidden automatically
  }
}

// Validation errors
// Thrown when Year, Make, or Model are missing for URL generation
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for modern JS features)

## Tips

- **Performance**: The selector uses event delegation for optimal performance
- **Validation**: Fields must be filled sequentially (can't select model without make)
- **Keyboard**: Full keyboard navigation support (arrows, enter, escape)
- **Mobile**: Touch-friendly with responsive design
- **Accessibility**: Proper focus management and ARIA attributes
- **URLs**: URLs come from vehicle data and are automatically formatted with parameters
- **"I don't know"**: Selecting "I don't know" for any field excludes it from URL parameters and summaries
- **Button Logic**: Use `"compatibility"` visibility for product pages, `"always"` for homepage
- **Field Names**: Must match the structure of your vehicle data (year, make, model, submodel, chassis, engine, transmission)
- **Default Selection**: Dropdowns automatically select the first real option (skipping "I don't know")