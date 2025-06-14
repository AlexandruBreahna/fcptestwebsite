# Vehicle Selector

A JavaScript component that creates an interactive, step-by-step vehicle configuration wizard. Users can select their vehicle details through an intuitive interface with autocomplete dropdowns and smooth transitions.

## Features

- 🚗 **Multi-step wizard** with 7 vehicle fields (Year, Make, Model, Submodel, Chassis, Engine, Transmission)
- 🎯 **Smart autocomplete** with filtered dropdown options
- ⌨️ **Keyboard navigation** (arrows, enter, escape)
- 🎨 **Smooth animations** with visual puck indicator
- 🔄 **Programmatic control** (reset, set configuration)
- 📱 **Responsive design** ready
- ⚡ **Performance optimized** with event delegation

## Quick Start

### 1. Include the HTML Structure

```html
<section class="vehicle-selector">
  <div class="container">
    <form id="vehicle-selector-form" class="vehicle-selector-form">
      <!-- Step 1: Basic Info -->
      <div class="vehicle-selector-questions-set">
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
      
      <!-- Step 2: Details -->
      <div class="vehicle-selector-questions-set hidden">
        <div class="vehicle-selector-puck"></div>
        <a href="#" class="vehicle-selector-nav-arrow nav-backwards">← Back</a>
        
        <!-- Add Chassis, Engine, Transmission fields -->
        
        <a href="#" class="vehicle-selector-nav-arrow nav-forward">Next →</a>
      </div>
      
      <!-- Step 3: Summary -->
      <div class="vehicle-selector-questions-set hidden">
        <a href="#" class="vehicle-selector-nav-arrow nav-backwards">← Back</a>
        
        <div class="vehicle-selector-summary">
          <div id="vehicle-selector-summary">Your selection will appear here</div>
        </div>
        
        <button class="vehicle-selector-reset-selection">Start Over</button>
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
  2020: {
    BMW: {
      "M3": {
        "Competition": {
          "4-door Sedan": {
            "Petrol 3.0L Twin-Turbo": ["8-speed Auto", "Manual"]
          }
        }
      }
    },
    Audi: {
      "A4": {
        "Premium": {
          "4-door Sedan": {
            "Petrol 2.0L TFSI": ["7-speed S tronic"]
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
  onComplete: (result) => {
    console.log('Vehicle selected:', result.summary);
    // Redirect to parts page or save selection
  }
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `formId` | string | `"vehicle-selector-form"` | ID of the form element |
| `dropdownId` | string | `"vehicle-selector-dropdown"` | ID of the dropdown element |
| `summaryId` | string | `"vehicle-selector-summary"` | ID of the summary element |
| `fieldNames` | array | `["year", "make", "model", ...]` | Names of the input fields |
| `vehicleData` | object | `window.carData \|\| {}` | Vehicle data object |
| `onComplete` | function | `null` | Callback when all fields are filled |
| `onReset` | function | `null` | Callback when selector is reset |

## Examples

### Basic Setup

```javascript
const selector = initVehicleSelector({
  vehicleData: carData,
  onComplete: (result) => {
    alert(`Selected: ${result.summary}`);
  }
});
```

### Custom Field Names

```javascript
const selector = initVehicleSelector({
  formId: "vehicle-selector-form",
  fieldNames: ["year", "brand", "model", "trim", "body", "engine", "transmission"],
  vehicleData: myData
});
```

### Save to localStorage

```javascript
const selector = initVehicleSelector({
  vehicleData: carData,
  onComplete: (result) => {
    localStorage.setItem('selectedVehicle', JSON.stringify(result.values));
    window.location.href = '/parts';
  },
  onReset: (result) => {
    localStorage.removeItem('selectedVehicle');
    console.log(`Reset from: ${result.previousSummary}`);
  }
});
```

### API Integration

```javascript
const selector = initVehicleSelector({
  vehicleData: carData,
  onComplete: async (result) => {
    try {
      await fetch('/api/save-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.values)
      });
      console.log('Vehicle saved!');
    } catch (error) {
      console.error('Save failed:', error);
    }
  }
});
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
console.log(currentSelection); // { year: "2020", make: "BMW", ... }
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

### `destroy()`
Clean up event listeners and timers.

```javascript
selector.destroy();
```

## Quick Select Dropdown Example

Create a dropdown with predefined vehicles:

```html
<select id="vehicle-presets">
  <option value="">Choose a preset...</option>
  <option value="bmw-m3">2020 BMW M3 Competition</option>
  <option value="audi-a4">2020 Audi A4 Premium</option>
</select>
```

```javascript
const presets = {
  'bmw-m3': {
    year: "2020", make: "BMW", model: "M3", 
    submodel: "Competition", chassis: "4-door Sedan",
    engine: "Petrol 3.0L Twin-Turbo", transmission: "8-speed Auto"
  },
  'audi-a4': {
    year: "2020", make: "Audi", model: "A4",
    submodel: "Premium", chassis: "4-door Sedan", 
    engine: "Petrol 2.0L TFSI", transmission: "7-speed S tronic"
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
| `.vehicle-selector-input-group` | Input field container |
| `.vehicle-selector-input-control` | Input field |
| `.vehicle-selector-nav-arrow` | Navigation buttons |
| `.nav-forward` / `.nav-backwards` | Arrow direction |
| `.vs-clear-selection` | Clear field button |
| `.vehicle-selector-reset-selection` | Reset all button |
| `.vehicle-selector-puck` | Visual indicator |
| `.disabled` / `.active` / `.completed` | Field states |

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for modern JS features)

## Tips

- **Performance**: The selector uses event delegation for optimal performance
- **Validation**: Fields must be filled sequentially (can't select model without make)
- **Keyboard**: Full keyboard navigation support (arrows, enter, escape)
- **Mobile**: Touch-friendly with responsive design
- **Accessibility**: Proper focus management and ARIA attributes