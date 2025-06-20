function initVehicleSelector(config = {}) {
    // Configuration with defaults
    const {
        formId = "vehicle-selector-form",
        fieldNames = ["year", "make", "model", "submodel", "chassis", "engine", "transmission"],
        onComplete = null,
        onReset = null,
        onError = null,
        vehicleData = window.carData || {},
        customActions = {}
    } = config;

    // Extract customActions with defaults
    const {
        buttonText = "Browse Parts",
        compatibleVehicles = [],
        buttonVisibility = "always", // always | never | conditionally
        buttonUrlRef = "",
        buttonUrlCategory = "",
        urlContext = "default"
    } = customActions;

    // Cache all DOM elements once at initialization - Performance optimization
    const elements = {
        form: document.getElementById(formId),
        dropdown: document.getElementById("vehicle-selector-dropdown"),
        dropdownBox: null, // Will be set after dropdown check
        summaryElement: document.getElementById("vehicle-selector-complete-summary"),
        intermediarySummaryElement: document.getElementById("vehicle-selector-intermediary-summary"),
        steps: document.querySelectorAll(".vehicle-selector-step"),
        navArrows: document.querySelectorAll(".vehicle-selector-nav-arrow"),
        actionButton: document.querySelector(".vehicle-selector-button"),
        inputs: fieldNames.map((name) =>
            document.querySelector(`[name="${name}"]`)
        )
    };

    // Early return with better error handling
    if (!elements.form || !elements.dropdown) {
        console.error("Vehicle selector: Essential DOM elements not found");
        return { destroy: () => { } }; // Return cleanup function for future use
    }

    elements.dropdownBox = elements.dropdown.querySelector(".dropdown-box-2");
    if (!elements.dropdownBox) {
        console.error("Vehicle selector: Dropdown box not found");
        return { destroy: () => { } };
    }

    // Current state
    let currentFieldIndex = 0;
    let selectedValues = {};
    let currentStep = 0;
    let debounceTimer = null;
    let focusTimer = null;

    // Initialize the selector
    function initialize() {
        try {
            hideDropdown();
            setupInitialState();
            attachEventListeners();
            console.log("Vehicle selector initialized successfully");
        } catch (error) {
            console.error("Vehicle selector initialization error:", error);
        }
    }

    // Set up initial state - only first field enabled
    function setupInitialState() {
        elements.inputs.forEach((input, index) => {
            if (!input) return;

            const group = input.closest(".vehicle-selector-input-group");
            if (!group) return;

            if (index === 0) {
                // First field is active
                group.classList.add("active");
                input.disabled = false;
            } else {
                // All other fields disabled
                group.classList.add("disabled");
                input.disabled = true;
                input.value = "";
            }
        });

        // Show first step, hide others
        elements.steps.forEach((step, index) => {
            if (index === 0) {
                step.classList.remove("hidden");
            } else {
                step.classList.add("hidden");
            }
        });

        // Initialize button state
        if (elements.actionButton) {
            elements.actionButton.textContent = buttonText;

            // Set initial visibility based on configuration
            if (buttonVisibility === "never") {
                elements.actionButton.classList.add("hidden");
            } else if (buttonVisibility === "always") {
                elements.actionButton.classList.remove("hidden");
            } else {
                // For "compatibility", start hidden until vehicle is configured
                elements.actionButton.classList.add("hidden");
            }
        }
    }

    // Attach all event listeners using event delegation
    function attachEventListeners() {
        // Single delegated listener for all form events
        elements.form.addEventListener("focusin", handleFormFocusIn);
        elements.form.addEventListener("focusout", handleFormFocusOut);
        elements.form.addEventListener("input", handleFormInput);
        elements.form.addEventListener("keydown", handleFormKeydown);
        elements.form.addEventListener("click", handleFormClick);

        // Initialize navigation arrow states
        updateNavigationArrows();

        // Single listener for dropdown with blur prevention
        elements.dropdownBox.addEventListener("click", handleDropdownClick);
        elements.dropdownBox.addEventListener("mousedown", preventDropdownBlur);

        // Single outside click listener with passive option for better performance
        document.addEventListener("click", handleOutsideClick, { passive: true });
    }

    // Handle all focus events through delegation
    function handleFormFocusIn(event) {
        const input = event.target.closest(".vehicle-selector-input-control");
        if (input) {
            const index = elements.inputs.indexOf(input);
            if (index !== -1 && !input.disabled) {
                handleInputFocus(index);
            }
        }
    }

    // Handle all blur events through delegation
    function handleFormFocusOut(event) {
        const input = event.target.closest(".vehicle-selector-input-control");
        if (input) {
            const index = elements.inputs.indexOf(input);
            if (index !== -1) {
                handleInputBlur(index);

                // Hide puck when focus leaves input field (with minimal delay)
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    const isAnyInputFocused = elements.inputs.some(inp => inp === activeElement);
                    if (!isAnyInputFocused) {
                        hidePuck();
                    }
                }, 10);
            }
        }
    }

    // Handle all input events through delegation with debouncing
    function handleFormInput(event) {
        const input = event.target.closest(".vehicle-selector-input-control");
        if (input) {
            const index = elements.inputs.indexOf(input);
            if (index !== -1) {
                handleInputChangeDebounced(index);
            }
        }
    }

    // Handle all keydown events through delegation
    function handleFormKeydown(event) {
        const input = event.target.closest(".vehicle-selector-input-control");
        if (input) {
            const index = elements.inputs.indexOf(input);
            if (index !== -1) {
                handleKeydown(event, index);
            }
        }
    }

    // Handle all click events through delegation
    function handleFormClick(event) {
        // Handle navigation arrows
        const navArrow = event.target.closest(".vehicle-selector-nav-arrow");
        if (navArrow) {
            event.preventDefault();

            // Check if arrow is disabled
            if (navArrow.classList.contains("disabled")) {
                return;
            }

            const isForward = navArrow.classList.contains("nav-forward");
            const isBackward = navArrow.classList.contains("nav-backwards");

            if (isForward) {
                navigateForward();
            } else if (isBackward) {
                navigateBackward();
            }
            return;
        }

        // Handle reset button
        const resetButton = event.target.closest(".vehicle-selector-reset-selection");
        if (resetButton) {
            handleResetSelection(event);
            return;
        }

        // Handle clear buttons
        const clearButton = event.target.closest(".vs-clear-selection");
        if (clearButton) {
            handleClearSelection(event);
            return;
        }
    }

    // Debounced input change handler
    function handleInputChangeDebounced(index) {
        const input = elements.inputs[index];
        if (!input) return;

        const value = input.value.trim();

        // Clear immediate effects (non-debounced)
        if (selectedValues[fieldNames[index]] !== value) {
            clearSubsequentFields(index);
        }

        // Debounce expensive dropdown filtering
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filterDropdownOptions(value, index);
        }, 150);
    }

    // Handle input field focus
    function handleInputFocus(index) {
        if (!elements.inputs[index] || elements.inputs[index].disabled) return;

        currentFieldIndex = index;
        showDropdownForField(index);

        // Update puck position for the focused field
        updatePuck(index);
    }

    // Handle input blur
    function handleInputBlur(index) {
        // Use minimal delay to check focus state
        setTimeout(() => {
            const activeElement = document.activeElement;
            const isInputFocused = elements.inputs.some(
                (input) => input === activeElement
            );
            const isDropdownInteraction =
                elements.dropdown && elements.dropdown.contains(activeElement);

            // Only hide if focus moved away from all inputs and dropdown
            if (
                !isInputFocused &&
                !isDropdownInteraction &&
                !isDropdownHovered()
            ) {
                hideDropdown();
            }
        }, 10);
    }

    // Handle keyboard navigation
    function handleKeydown(event, index) {
        if (!elements.dropdown || elements.dropdown.style.display === "none")
            return;

        const options = elements.dropdownBox.querySelectorAll(
            ".dropdown-link-2:not(.no-data)"
        );
        const selectedOption = elements.dropdownBox.querySelector(
            ".dropdown-link-2.selected"
        );

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                navigateDropdown(options, selectedOption, 1);
                break;
            case "ArrowUp":
                event.preventDefault();
                navigateDropdown(options, selectedOption, -1);
                break;
            case "Enter":
                event.preventDefault();
                if (
                    selectedOption &&
                    !selectedOption.classList.contains("no-data")
                ) {
                    selectOption(selectedOption.textContent, index);
                }
                break;
            case "Escape":
                hideDropdown();
                break;
        }
    }

    // Navigate dropdown with keyboard
    function navigateDropdown(options, currentSelected, direction) {
        if (options.length === 0) return;

        let currentIndex = currentSelected
            ? Array.from(options).indexOf(currentSelected)
            : -1;
        let newIndex = currentIndex + direction;

        // Wrap around
        if (newIndex >= options.length) newIndex = 0;
        if (newIndex < 0) newIndex = options.length - 1;

        // Update selection
        options.forEach((option) => option.classList.remove("selected"));
        options[newIndex].classList.add("selected");
    }

    // Show dropdown for specific field
    function showDropdownForField(index) {
        const options = getOptionsForField(index);
        populateDropdown(options);

        // Make dropdown visible but transparent
        elements.dropdown.style.display = "block";
        elements.dropdown.style.opacity = "0";
        elements.dropdown.style.transform = "translateY(-10px)";

        // Force a reflow to ensure dimensions are calculated
        elements.dropdown.offsetHeight; // Reading offsetHeight forces layout

        // Now position with correct dimensions
        positionDropdown(elements.inputs[index]);

        // Then animate in
        requestAnimationFrame(() => {
            elements.dropdown.style.transition = "opacity 0.2s ease, transform 0.2s ease";
            elements.dropdown.style.opacity = "1";
            elements.dropdown.style.transform = "translateY(0)";
        });
    }

    // Get available options for field based on previous selections
    function getOptionsForField(index) {
        const fieldName = fieldNames[index];

        // Helper function to filter out non-vehicle keys
        function filterVehicleKeys(obj) {
            if (!obj || typeof obj !== 'object') return [];
            return Object.keys(obj).filter(key => key !== 'redirectUrls').sort();
        }

        // Helper function to collect all unique options when "I don't know" is selected
        function collectAllOptions(data, targetLevel, currentLevel = 0) {
            if (!data || typeof data !== 'object') return [];

            const options = new Set();

            if (currentLevel === targetLevel) {
                // We've reached target level, collect keys
                filterVehicleKeys(data).forEach(key => options.add(key));
            } else {
                // Go deeper into each branch
                Object.keys(data).forEach(key => {
                    if (key !== 'redirectUrls' && typeof data[key] === 'object') {
                        const deepOptions = collectAllOptions(data[key], targetLevel, currentLevel + 1);
                        deepOptions.forEach(option => options.add(option));
                    }
                });
            }

            return Array.from(options).sort();
        }

        try {
            switch (fieldName) {
                case "year":
                    return Object.keys(vehicleData).sort((a, b) => b - a);

                case "make":
                    const year = selectedValues.year;
                    return year && vehicleData[year]
                        ? filterVehicleKeys(vehicleData[year])
                        : [];

                case "model":
                    const yearData = vehicleData[selectedValues.year];
                    const makeData = yearData?.[selectedValues.make];
                    return makeData ? filterVehicleKeys(makeData) : [];

                case "submodel":
                    const modelData =
                        vehicleData[selectedValues.year]?.[selectedValues.make]?.[
                        selectedValues.model
                        ];
                    const submodels = modelData ? filterVehicleKeys(modelData) : [];
                    return ["I don't know", ...submodels];

                case "chassis":
                    const submodel = selectedValues.submodel;

                    if (submodel === "I don't know") {
                        // Collect chassis from all submodels
                        const modelData = vehicleData[selectedValues.year]?.[selectedValues.make]?.[selectedValues.model];
                        const allChassis = collectAllOptions(modelData, 1); // 1 level deep from submodel
                        return ["I don't know", ...allChassis];
                    } else {
                        const submodelData =
                            vehicleData[selectedValues.year]?.[selectedValues.make]?.[
                            selectedValues.model
                            ]?.[submodel];
                        const chassis = submodelData ? filterVehicleKeys(submodelData) : [];
                        return ["I don't know", ...chassis];
                    }

                case "engine":
                    const chassis = selectedValues.chassis;
                    const submodelForEngine = selectedValues.submodel;

                    if (submodelForEngine === "I don't know" || chassis === "I don't know") {
                        // Collect engines from all possible paths
                        const modelData = vehicleData[selectedValues.year]?.[selectedValues.make]?.[selectedValues.model];
                        let targetLevel = 2; // 2 levels deep from submodel (submodel -> chassis -> engine)

                        if (submodelForEngine !== "I don't know" && chassis === "I don't know") {
                            // We know submodel but not chassis, collect from specific submodel
                            const submodelData = modelData?.[submodelForEngine];
                            targetLevel = 1; // 1 level deep from chassis
                            const allEngines = collectAllOptions(submodelData, targetLevel);
                            return ["I don't know", ...allEngines];
                        } else {
                            // We don't know submodel, collect from entire model
                            const allEngines = collectAllOptions(modelData, targetLevel);
                            return ["I don't know", ...allEngines];
                        }
                    } else {
                        const chassisData =
                            vehicleData[selectedValues.year]?.[selectedValues.make]?.[
                            selectedValues.model
                            ]?.[submodelForEngine]?.[chassis];
                        const engines = chassisData ? filterVehicleKeys(chassisData) : [];
                        return ["I don't know", ...engines];
                    }

                case "transmission":
                    const engineForTrans = selectedValues.engine;
                    const chassisForTrans = selectedValues.chassis;
                    const submodelForTrans = selectedValues.submodel;

                    if (submodelForTrans === "I don't know" || chassisForTrans === "I don't know" || engineForTrans === "I don't know") {
                        // Collect transmissions from all possible paths
                        const modelData = vehicleData[selectedValues.year]?.[selectedValues.make]?.[selectedValues.model];
                        const allTransmissions = new Set();

                        // Recursively collect all transmission arrays
                        function collectTransmissions(data) {
                            if (Array.isArray(data)) {
                                data.forEach(trans => allTransmissions.add(trans));
                            } else if (data && typeof data === 'object') {
                                Object.keys(data).forEach(key => {
                                    if (key !== 'redirectUrls') {
                                        collectTransmissions(data[key]);
                                    }
                                });
                            }
                        }

                        collectTransmissions(modelData);
                        return ["I don't know", ...Array.from(allTransmissions).sort()];
                    } else {
                        const engineData =
                            vehicleData[selectedValues.year]?.[selectedValues.make]?.[
                            selectedValues.model
                            ]?.[submodelForTrans]?.[chassisForTrans]?.[engineForTrans];
                        const transmissions = Array.isArray(engineData) ? engineData : [];
                        return ["I don't know", ...transmissions.sort()];
                    }

                default:
                    return [];
            }
        } catch (error) {
            console.error(`Error getting options for ${fieldName}:`, error);
            return [];
        }
    }

    // Populate dropdown with options
    function populateDropdown(options) {
        if (!elements.dropdownBox) return;

        elements.dropdownBox.innerHTML = "";

        if (options.length === 0) {
            const noDataLink = document.createElement("div");
            noDataLink.className = "dropdown-link-2 no-data";
            noDataLink.textContent = "No data found";
            elements.dropdownBox.appendChild(noDataLink);
            return;
        }

        options.forEach((option, index) => {
            const link = document.createElement("a");
            link.href = "#";
            link.className = "dropdown-link-2";

            // Select second option by default if first option is "I don't know"
            const shouldSelect = (options[0] === "I don't know" && index === 1) ||
                (options[0] !== "I don't know" && index === 0);

            if (shouldSelect) {
                link.classList.add("selected");
            }

            link.textContent = option;
            elements.dropdownBox.appendChild(link);
        });
    }

    // Filter dropdown options based on input text
    function filterDropdownOptions(inputValue, fieldIndex) {
        const allOptions = getOptionsForField(fieldIndex);
        const filteredOptions = allOptions.filter((option) =>
            option.toLowerCase().includes(inputValue.toLowerCase())
        );

        populateDropdown(filteredOptions);
    }

    // Position dropdown relative to input
    function positionDropdown(input) {
        if (!input || !elements.dropdown) return;

        const rect = input.getBoundingClientRect();
        const formRect = elements.form.getBoundingClientRect();
        const dropdownWidth = elements.dropdown.offsetWidth;

        // Center the dropdown under the input field
        const inputCenter = rect.left + (rect.width / 2);
        const dropdownLeft = inputCenter - (dropdownWidth / 2);

        // Calculate position relative to form
        const leftPosition = dropdownLeft - formRect.left;

        elements.dropdown.style.left = `${leftPosition}px`;
        elements.dropdown.style.top = `${rect.bottom - formRect.top}px`;
    }

    // Handle dropdown option selection
    function handleDropdownClick(event) {
        event.preventDefault();
        event.stopPropagation(); // Prevent event bubbling

        const target = event.target.closest(".dropdown-link-2");
        if (!target || target.classList.contains("no-data")) return;

        // Prevent blur by maintaining focus on current input during selection
        const currentInput = elements.inputs[currentFieldIndex];
        if (currentInput) {
            // Keep focus on current input to prevent blur events
            currentInput.focus();
        }

        // Small delay to ensure focus is maintained, then select
        setTimeout(() => {
            selectOption(target.textContent, currentFieldIndex);
        }, 1);
    }

    // Prevent dropdown interactions from causing input blur
    function preventDropdownBlur(event) {
        // Prevent mousedown on dropdown from stealing focus
        event.preventDefault();
    }

    // Select an option and progress to next field
    function selectOption(value, fieldIndex) {
        const input = elements.inputs[fieldIndex];
        const fieldName = fieldNames[fieldIndex];

        if (!input) return;

        // Set value and update state
        input.value = value;
        selectedValues[fieldName] = value;

        // Mark field as completed
        const group = input.closest(".vehicle-selector-input-group");
        if (group) {
            group.classList.add("completed");
            group.classList.remove("active");
        }

        hideDropdown();

        // Update intermediary summary if we're in the first 4 fields
        if (fieldIndex < 4) {
            updateIntermediarySummary();
        }

        // Progress to next field or question step - immediate progression for smooth flow
        progressToNextField(fieldIndex);
        updateNavigationArrows();
    }

    // Progress to the next field or question step
    function progressToNextField(currentIndex) {
        // Check if we need to auto-advance to next step
        if (currentIndex === 3) {
            // After submodel (4th field) - auto-advance to Step 2
            switchToStep(1);
        } else if (currentIndex === 6) {
            // After transmission (7th field) - auto-advance to Step 3
            switchToStep(2);
            generateSummary();
        } else if (currentIndex < elements.inputs.length - 1) {
            // Enable next field within current step
            const nextIndex = currentIndex + 1;
            const currentStepFields = getCurrentStepFields();
            if (currentStepFields.includes(nextIndex)) {
                enableField(nextIndex);
            }
        }

        // Update navigation arrows after each field completion
        updateNavigationArrows();
    }

    // Get field indices for current step
    function getCurrentStepFields() {
        const fieldRanges = [
            [0, 1, 2, 3], // Step 1: Year, Make, Model, Submodel
            [4, 5, 6], // Step 2: Chassis, Engine, Transmission
            [] // Step 3: Summary only
        ];
        return fieldRanges[currentStep] || [];
    }

    // Switch between question steps
    function switchToStep(stepIndex) {
        currentStep = stepIndex;

        // Hide dropdown when navigating between question steps
        hideDropdown();

        // Remove focus from any currently focused input to ensure dropdown stays closed
        const currentlyFocused = document.activeElement;
        if (currentlyFocused && elements.inputs.includes(currentlyFocused)) {
            currentlyFocused.blur();
        }

        // Hide puck in all question steps
        hidePuck();

        // Hide all steps
        elements.steps.forEach((step) => step.classList.add("hidden"));

        // Show target step
        if (elements.steps[stepIndex]) {
            elements.steps[stepIndex].classList.remove("hidden");
        }

        // Update intermediary summary when showing step 2
        if (stepIndex === 1) {
            updateIntermediarySummary();
        }

        // Enable appropriate field for the new set
        const setFieldRanges = [
            [0, 1, 2, 3], // Step 1 fields
            [4, 5, 6], // Step 2 fields
            [] // Step 3 (summary only)
        ];

        const fieldsForStep = setFieldRanges[stepIndex] || [];
        if (fieldsForStep.length > 0) {
            // For automatic progression, enable first field of new set
            // For manual navigation, find first incomplete field
            let fieldToEnable;

            if (stepIndex === 1 && fieldsForStep.includes(4)) {
                // Auto-progressing to Step 2 - always start with chassis (index 4)
                fieldToEnable = 4;
            } else {
                // Manual navigation - find first incomplete field
                fieldToEnable = fieldsForStep.find(
                    (index) => !selectedValues[fieldNames[index]]
                );
            }

            if (fieldToEnable !== undefined) {
                enableField(fieldToEnable);
            }
        } else {
            // No fields in this question step (like the summary page) - ensure no field has focus
            currentFieldIndex = -1;
        }

        // Update navigation arrow states
        updateNavigationArrows();
    }

    // Enable a specific field
    function enableField(index) {
        const input = elements.inputs[index];
        if (!input) return;

        const group = input.closest(".vehicle-selector-input-group");
        if (!group) return;

        // Enable the field immediately
        group.classList.remove("disabled");
        group.classList.add("active");
        input.disabled = false;
        currentFieldIndex = index;

        // Immediate execution - no blur conflicts anymore
        input.focus();
        showDropdownForField(index);
        updatePuck(index);
    }

    // Handle clear input selection clicks
    function handleClearSelection(event) {
        event.preventDefault();

        // Get the clear button element (works with event delegation)
        const clearButton = event.target.closest(".vs-clear-selection");
        if (!clearButton) {
            return;
        }

        const inputGroup = clearButton.closest(".vehicle-selector-input-group");

        if (!inputGroup) return;

        // Find the input field within this group
        const input = inputGroup.querySelector(".vehicle-selector-input-control");
        if (!input) return;

        // Find the index of this input in our inputs array
        const inputIndex = elements.inputs.indexOf(input);
        if (inputIndex === -1) return;

        // Clear this field and all subsequent fields
        clearFieldAndSubsequent(inputIndex);

        // Hide dropdown if it's open
        hideDropdown();

        // Focus back on the cleared field and enable it
        if (input) {
            const group = input.closest(".vehicle-selector-input-group");
            if (group) {
                group.classList.remove("disabled", "completed");
                group.classList.add("active");
                input.disabled = false;
                input.focus();
                currentFieldIndex = inputIndex;
            }
        }

        // Update navigation arrows
        updateNavigationArrows();
    }

    // Clear a specific field and all fields after it
    function clearFieldAndSubsequent(fieldIndex) {
        for (let i = fieldIndex; i < elements.inputs.length; i++) {
            const input = elements.inputs[i];
            const fieldName = fieldNames[i];

            if (input) {
                input.value = "";

                const group = input.closest(".vehicle-selector-input-group");
                if (group) {
                    group.classList.remove("completed", "active");
                    if (i > fieldIndex) {
                        // Disable subsequent fields
                        group.classList.add("disabled");
                        input.disabled = true;
                    }
                }
            }

            // Remove from selected values
            delete selectedValues[fieldName];
        }

        // Reset to appropriate question set based on cleared field
        if (fieldIndex < 4) {
            // If clearing any field in Step 1, go back to Step 1
            if (currentStep !== 0) {
                switchToStep(0);
            }
        } else if (fieldIndex < 7) {
            // If clearing any field in Step 2, go back to Step 2
            if (currentStep !== 1) {
                switchToStep(1);
            }
        }
    }

    // Clear all fields after the specified index
    function clearSubsequentFields(fromIndex) {
        clearFieldAndSubsequent(fromIndex + 1);
    }

    // Handle reset selection clicks - reset entire selector and trigger onReset callback
    function handleResetSelection(event, skipCallback = false) {
        event.preventDefault();

        // Store previous values before clearing (for callback)
        const previousValues = { ...selectedValues };
        const wasPreviouslyComplete = fieldNames.every(fieldName => selectedValues[fieldName]);

        // Clear all selected values
        selectedValues = {};

        // Clear summary
        if (elements.summaryElement) {
            elements.summaryElement.textContent = "Your complete vehicle configuration";
        }

        // Clear intermediary summary
        if (elements.intermediarySummaryElement) {
            elements.intermediarySummaryElement.textContent = "Year, Make, Model and Submodel";
        }

        // Reset all input fields
        elements.inputs.forEach((input, index) => {
            if (!input) return;

            input.value = "";
            const group = input.closest(".vehicle-selector-input-group");
            if (group) {
                group.classList.remove("completed", "active");
                if (index === 0) {
                    // First field should be active
                    group.classList.remove("disabled");
                    group.classList.add("active");
                    input.disabled = false;
                } else {
                    // All other fields should be disabled
                    group.classList.add("disabled");
                    input.disabled = true;
                }
            }
        });

        // Hide dropdown and puck
        hideDropdown();
        hidePuck();

        // Reset to first step
        currentStep = 0;
        currentFieldIndex = 0;

        elements.steps.forEach((step, index) => {
            if (index === 0) {
                step.classList.remove("hidden");
            } else {
                step.classList.add("hidden");
            }
        });

        // Focus on the first field with proper timing for dropdown
        if (elements.inputs[0]) {
            elements.inputs[0].focus();

            // Force DOM update and then show dropdown
            requestAnimationFrame(() => {
                currentFieldIndex = 0;
                showDropdownForField(0);
                updatePuck(0);
            });
        }

        // Update navigation arrows
        updateNavigationArrows();

        // Trigger onReset callback if configured and not skipped
        if (typeof onReset === 'function' && !skipCallback && wasPreviouslyComplete) {
            try {
                onReset({
                    previousValues: previousValues,
                    previousSummary: fieldNames
                        .map(fieldName => previousValues[fieldName])
                        .filter(value => value && value !== "I don't know") // Filter out "I don't know"
                        .join(", "),
                    resetBy: 'button',
                    getState: () => ({ ...selectedValues })
                });
            } catch (error) {
                console.error('Error in vehicle selector reset callback:', error);
            }
        }

        console.log('Vehicle selector reset to initial state');
    }

    // Navigate to next step
    function navigateForward() {
        if (currentStep === 0 && isStepComplete(0)) {
            // Step 1 → Step 2
            switchToStep(1);
        } else if (currentStep === 1 && isStepComplete(1)) {
            // Step 2 → Step 3
            switchToStep(2);
            generateSummary();
        }
        // Step 3 has no forward navigation
    }

    // Navigate to previous step
    function navigateBackward() {
        if (currentStep === 1) {
            // Step 2 → Step 1
            switchToStep(0);
        } else if (currentStep === 2) {
            // Step 3 → Step 2
            switchToStep(1);
        }
        // Step 1 has no backward navigation
    }

    // Check if a step is complete
    function isStepComplete(stepIndex) {
        const fieldRanges = [
            [0, 1, 2, 3], // Step 1: indices 0,1,2,3 (year, make, model, submodel)
            [4, 5, 6], // Step 2: indices 4,5,6 (chassis, engine, transmission)
            [] // Step 3: no required fields (summary only)
        ];

        const fieldsForStep = fieldRanges[stepIndex] || [];

        // Check if all fields in this step have values
        for (const fieldIndex of fieldsForStep) {
            if (!selectedValues[fieldNames[fieldIndex]]) {
                return false;
            }
        }
        return true;
    }

    // Update navigation arrow states based on current progress
    function updateNavigationArrows() {
        const forwardArrows = document.querySelectorAll(
            ".vehicle-selector-nav-arrow.nav-forward"
        );
        const backwardArrows = document.querySelectorAll(
            ".vehicle-selector-nav-arrow.nav-backwards"
        );

        // Update forward arrows
        forwardArrows.forEach((arrow) => {
            const step = arrow.closest(".vehicle-selector-step");
            const stepIndex = Array.from(elements.steps).indexOf(step);

            if (stepIndex === currentStep) {
                if (isStepComplete(currentStep)) {
                    arrow.classList.remove("disabled");
                } else {
                    arrow.classList.add("disabled");
                }
            }
        });

        // Update backward arrows - always enabled except for first set
        backwardArrows.forEach((arrow) => {
            const step = arrow.closest(".vehicle-selector-step");
            const stepIndex = Array.from(elements.steps).indexOf(step);

            if (stepIndex === currentStep) {
                if (currentStep === 0) {
                    arrow.classList.add("disabled");
                } else {
                    arrow.classList.remove("disabled");
                }
            }
        });
    }

    // Generate summary of all selections and handle completion
    function generateSummary(skipOnComplete = false) {
        if (!elements.summaryElement) return;

        // Filter out "I don't know" values and undefined/null values
        const parts = fieldNames
            .map(fieldName => selectedValues[fieldName])
            .filter(value => value && value !== "I don't know");

        elements.summaryElement.textContent = parts.join(", ");

        // Check if all required fields are completed (including "I don't know" as valid)
        const isComplete = fieldNames.every(fieldName => selectedValues[fieldName]);

        if (isComplete) {
            // Generate redirect URL and match type
            const redirectURL = generateRedirectURL(selectedValues);
            const matchType = getVehicleMatchType(selectedValues);

            // Update button visibility and properties
            if (redirectURL) {
                updateButtonVisibility(matchType);
                updateButtonProperties(redirectURL);
            } else {
                // Hide button if URL generation failed
                if (elements.actionButton) {
                    elements.actionButton.classList.add("hidden");
                }
            }

            // Trigger onComplete callback
            if (typeof onComplete === 'function' && !skipOnComplete) {
                try {
                    onComplete({
                        values: { ...selectedValues },
                        summary: parts.join(", "), // Summary without "I don't know"
                        redirectURL: redirectURL,
                        matchType: matchType,
                        reset: () => handleResetSelection({ preventDefault: () => { } }),
                        getState: () => ({ ...selectedValues })
                    });
                } catch (error) {
                    console.error('Error in vehicle selector completion callback:', error);
                }
            }
        }
    }

    // Update intermediary summary (first 4 fields) in step 2
    function updateIntermediarySummary() {
        if (!elements.intermediarySummaryElement) return;

        // Get first 4 field values (Year, Make, Model, Submodel) and filter out "I don't know"
        const intermediaryFields = fieldNames.slice(0, 4);
        const parts = intermediaryFields
            .map(fieldName => selectedValues[fieldName])
            .filter(value => value && value !== "I don't know");

        if (parts.length > 0) {
            elements.intermediarySummaryElement.textContent = parts.join(' ');
        } else {
            elements.intermediarySummaryElement.textContent = "Year, Make, Model and Submodel";
        }
    }

    // Handle clicks outside dropdown
    function handleOutsideClick(event) {
        if (
            !elements.dropdown.contains(event.target) &&
            !elements.form.contains(event.target)
        ) {
            hideDropdown();
        }
    }

    // Check if dropdown is being hovered
    function isDropdownHovered() {
        return elements.dropdown.matches(":hover");
    }

    // Hide dropdown
    function hideDropdown() {
        if (elements.dropdown) {
            elements.dropdown.style.display = "none";
        }
    }

    // Update puck position and visibility
    function updatePuck(activeInputIndex) {
        // Find the current step element
        const currentStepElement = elements.steps[currentStep];
        if (!currentStepElement) return;

        // Find the puck in the current step
        const puck = currentStepElement.querySelector('.vehicle-selector-puck');
        if (!puck) return;

        // Get the active input and its group
        const activeInput = elements.inputs[activeInputIndex];
        if (!activeInput) return;

        const activeGroup = activeInput.closest('.vehicle-selector-input-group');
        if (!activeGroup) return;

        // Get the position and dimensions of the active input group
        const groupRect = activeGroup.getBoundingClientRect();
        const stepRect = currentStepElement.getBoundingClientRect();

        // Calculate relative position within the step
        const leftOffset = groupRect.left - stepRect.left;
        const width = groupRect.width;

        // Apply the position and make visible immediately
        puck.style.left = `${leftOffset + 1}px`; // +1px to account for border
        puck.style.width = `${width - 2}px`; // -2px to account for left/right borders
        puck.style.display = 'block';
    }

    // Hide puck when no field is active
    function hidePuck() {
        elements.steps.forEach(step => {
            const puck = step.querySelector('.vehicle-selector-puck');
            if (puck) {
                puck.style.display = 'none';
            }
        });
    }

    // Set vehicle configuration programmatically
    function setVehicleConfiguration(vehicleConfig, options = {}) {
        const {
            triggerCallbacks = false,
            focusOnComplete = true,
            validateData = true
        } = options;

        try {
            // Validate configuration if requested
            if (validateData && !isValidVehicleConfiguration(vehicleConfig)) {
                console.error('Invalid vehicle configuration provided:', vehicleConfig);
                return {
                    success: false,
                    error: 'Invalid vehicle configuration',
                    values: {},
                    isComplete: false,
                    matchType: null,
                    redirectURL: null
                };
            }

            // Reset to initial state first
            handleResetSelection({ preventDefault: () => { } }, true);

            // Set values in the correct order
            let lastSetFieldIndex = -1;

            fieldNames.forEach((fieldName, index) => {
                if (vehicleConfig[fieldName]) {
                    const input = elements.inputs[index];
                    if (input) {
                        input.value = vehicleConfig[fieldName];
                        selectedValues[fieldName] = vehicleConfig[fieldName];

                        const group = input.closest(".vehicle-selector-input-group");
                        if (group) {
                            group.classList.add("completed");
                            group.classList.remove("active", "disabled");
                        }

                        lastSetFieldIndex = index;
                    }
                }
            });

            // Update intermediary summary
            updateIntermediarySummary();

            // Switch to appropriate step and handle completion
            if (lastSetFieldIndex >= 0) {
                const isComplete = fieldNames.every(fieldName => vehicleConfig[fieldName]);

                if (isComplete) {
                    switchToStep(2);
                    generateSummary(!triggerCallbacks);
                } else {
                    const nextFieldIndex = lastSetFieldIndex + 1;
                    if (nextFieldIndex < 4) {
                        switchToStep(0);
                    } else if (nextFieldIndex < 7) {
                        switchToStep(1);
                    } else {
                        switchToStep(2);
                    }

                    if (nextFieldIndex < elements.inputs.length && focusOnComplete) {
                        enableField(nextFieldIndex);
                    }
                }
            }

            updateNavigationArrows();
            // Return detailed information including match type
            const finalState = { ...selectedValues };
            const isComplete = fieldNames.every(fieldName => finalState[fieldName]);
            let matchType = null;
            let redirectURL = null;

            if (isComplete) {
                matchType = getVehicleMatchType(finalState);
                redirectURL = generateRedirectURL(finalState);
            }

            console.log('Vehicle configuration set successfully:', vehicleConfig);
            return {
                success: true,
                values: finalState,
                isComplete: isComplete,
                matchType: matchType,
                redirectURL: redirectURL
            };

        } catch (error) {
            console.error('Error setting vehicle configuration:', error);
            return {
                success: false,
                error: error.message,
                values: {},
                isComplete: false,
                matchType: null,
                redirectURL: null
            };
        }
    }

    // Validate vehicle configuration object
    function isValidVehicleConfiguration(config) {
        if (!config || typeof config !== 'object') return false;

        // Check if at least one field is provided
        const hasValidFields = fieldNames.some(fieldName =>
            config[fieldName] && typeof config[fieldName] === 'string'
        );

        if (!hasValidFields) return false;

        // Validate sequential dependency (can't have model without make, etc.)
        const providedFields = fieldNames.filter(fieldName => config[fieldName]);
        for (let i = 0; i < providedFields.length - 1; i++) {
            const currentFieldIndex = fieldNames.indexOf(providedFields[i]);
            const nextFieldIndex = fieldNames.indexOf(providedFields[i + 1]);

            if (nextFieldIndex !== currentFieldIndex + 1) {
                console.warn('Vehicle configuration has gaps in field sequence');
                return false;
            }
        }

        return true;
    }

    function generateRedirectURL(vehicleConfig) {
        const { year, make, model, submodel, chassis, engine, transmission } = vehicleConfig;

        // Validate minimum requirements
        if (!year || !make || !model) {
            const error = 'Cannot generate redirect URL: Year, Make, and Model are required';
            console.error(error);
            if (typeof onError === 'function') {
                onError({ type: 'url_generation', message: error, config: vehicleConfig });
            }
            return null;
        }

        try {
            // Find the vehicle in our data to get the redirect URL
            const yearData = vehicleData[year];
            if (!yearData) throw new Error(`Year ${year} not found in vehicle data`);

            const makeData = yearData[make];
            if (!makeData) throw new Error(`Make ${make} not found for year ${year}`);

            const modelData = makeData[model];
            if (!modelData) throw new Error(`Model ${model} not found for ${year} ${make}`);

            // Look for redirectUrls - first check at submodel level, then model level
            let redirectUrls = modelData.redirectUrls;

            if (submodel && modelData[submodel] && modelData[submodel].redirectUrls) {
                // Use more specific submodel URLs if available
                redirectUrls = { ...redirectUrls, ...modelData[submodel].redirectUrls };
            }

            if (!redirectUrls) {
                throw new Error(`No redirect URLs found for ${year} ${make} ${model}`);
            }

            // Get the appropriate URL based on context
            const urlContext = customActions.urlContext || 'default';
            let baseUrl = redirectUrls[urlContext] || redirectUrls.default;

            if (!baseUrl) {
                throw new Error(`No URL found for context '${urlContext}' in ${year} ${make} ${model}`);
            }

            // Ensure baseUrl ends with /
            if (!baseUrl.endsWith('/')) {
                baseUrl += '/';
            }

            // Build query parameters
            const params = new URLSearchParams();

            // Add vehicle params (skip "I don't know" values)
            if (year && year !== "I don't know") params.append('year', year);
            if (submodel && submodel !== "I don't know") params.append('submodel', submodel);
            if (chassis && chassis !== "I don't know") params.append('chassis', chassis);
            if (engine && engine !== "I don't know") params.append('engine', engine);
            if (transmission && transmission !== "I don't know") params.append('transmission', transmission);

            // Add custom parameters
            if (buttonUrlRef) {
                // Handle both simple strings and URL-encoded parameters
                if (buttonUrlRef.includes('=')) {
                    // Parse existing parameters and add them
                    const refParams = new URLSearchParams(buttonUrlRef);
                    refParams.forEach((value, key) => {
                        params.append(key, value);
                    });
                } else {
                    // Simple ref parameter
                    params.append('ref', buttonUrlRef);
                }
            }

            // Combine URL and parameters
            const queryString = params.toString();
            return queryString ? `${baseUrl}?${queryString}` : baseUrl;

        } catch (error) {
            const errorMessage = `URL generation failed: ${error.message}`;
            console.error(errorMessage);
            if (typeof onError === 'function') {
                onError({
                    type: 'url_generation',
                    message: errorMessage,
                    config: vehicleConfig,
                    originalError: error
                });
            }
            return null;
        }
    }

    function getVehicleMatchType(vehicleConfig) {
        if (!compatibleVehicles || compatibleVehicles.length === 0) {
            return "none"; // No compatible vehicles defined
        }

        const { year, make, model, submodel, chassis, engine, transmission } = vehicleConfig;

        for (const compatible of compatibleVehicles) {
            // Check if year, make, model match
            const basicMatch =
                compatible.year === year &&
                compatible.make === make &&
                compatible.model === model;

            if (!basicMatch) continue;

            // If basic match found, check for perfect match
            const perfectMatch =
                basicMatch &&
                compatible.submodel === submodel &&
                compatible.chassis === chassis &&
                compatible.engine === engine &&
                compatible.transmission === transmission;

            if (perfectMatch) return "perfect";

            // If we have basic match but not perfect, it's partial
            return "partial";
        }

        return "none"; // No matches found
    }

    function updateButtonVisibility(matchType) {
        if (!elements.actionButton) return;

        let shouldShow = false;

        switch (buttonVisibility) {
            case "always":
                shouldShow = true;
                break;
            case "never":
                shouldShow = false;
                break;
            case "compatibility":
                shouldShow = matchType === "none" || matchType === "partial";
                break;
        }

        if (shouldShow) {
            elements.actionButton.classList.remove("hidden");
        } else {
            elements.actionButton.classList.add("hidden");
        }
    }

    function updateButtonProperties(redirectURL) {
        if (!elements.actionButton) return;

        // Update button text
        if (buttonText) {
            elements.actionButton.textContent = buttonText;
        }

        // Update href if button is an anchor tag
        if (redirectURL && elements.actionButton.tagName.toLowerCase() === 'a') {
            elements.actionButton.href = redirectURL;
        }

        // Store URL as data attribute for other use cases
        if (redirectURL) {
            elements.actionButton.setAttribute('data-redirect-url', redirectURL);
        }
    }

    // Initialize the selector
    const cleanup = {
        removeListeners: () => {
            elements.form.removeEventListener("focusin", handleFormFocusIn);
            elements.form.removeEventListener("focusout", handleFormFocusOut);
            elements.form.removeEventListener("input", handleFormInput);
            elements.form.removeEventListener("keydown", handleFormKeydown);
            elements.form.removeEventListener("click", handleFormClick);
            elements.dropdownBox.removeEventListener("click", handleDropdownClick);
            document.removeEventListener("click", handleOutsideClick);
        },
        clearTimers: () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (focusTimer) clearTimeout(focusTimer);
        }
    };

    // Initialize the selector
    try {
        initialize();
    } catch (error) {
        console.error("Vehicle selector failed to initialize:", error);
        return { destroy: () => { }, reset: () => { }, getState: () => ({}) };
    }

    // Return public API with cleanup capability
    return {
        destroy: () => {
            cleanup.removeListeners();
            cleanup.clearTimers();
            selectedValues = {};
        },
        reset: (skipCallback = false) => handleResetSelection({ preventDefault: () => { } }, skipCallback),
        setupInitialState: setupInitialState,
        getState: () => ({ ...selectedValues }),
        getConfig: () => ({ formId, fieldNames, customActions }),
        updateData: (newData) => {
            Object.assign(vehicleData, newData);
        },
        setConfiguration: setVehicleConfiguration,
        updateButtonConfig: (newConfig) => {
            // Update the customActions object
            Object.assign(customActions, newConfig);

            // Update extracted variables
            if (newConfig.buttonText !== undefined) buttonText = newConfig.buttonText;
            if (newConfig.compatibleVehicles !== undefined) compatibleVehicles = newConfig.compatibleVehicles;
            if (newConfig.buttonVisibility !== undefined) buttonVisibility = newConfig.buttonVisibility;
            if (newConfig.buttonUrlRef !== undefined) buttonUrlRef = newConfig.buttonUrlRef;
            if (newConfig.buttonUrlCategory !== undefined) buttonUrlCategory = newConfig.buttonUrlCategory;
            if (newConfig.urlContext !== undefined) urlContext = newConfig.urlContext;

            // Re-evaluate button state with new config
            const isComplete = fieldNames.every(fieldName => selectedValues[fieldName]);
            if (isComplete) {
                const redirectURL = generateRedirectURL(selectedValues);
                const matchType = getVehicleMatchType(selectedValues);
                if (redirectURL) {
                    updateButtonVisibility(matchType);
                    updateButtonProperties(redirectURL);
                }
            }
        }
    };
}

function initVehicleGarage(config = {}) {
    // Hoist all variables at the top
    const STORAGE_KEY = 'vehicleGarage';
    const MAX_VEHICLES = 3;
    let garageData = [];

    // Configuration with defaults
    const settings = {
        dropdownId: config.dropdownId || 'vehicle-garage-list',
        jewelId: config.jewelId || 'garage-items',
        onVehicleSelected: config.onVehicleSelected || null,
        onVehicleRemoved: config.onVehicleRemoved || null,
        onAddNewVehicle: config.onAddNewVehicle || null,
        maxVehiclesMessage: config.maxVehiclesMessage || `You can only save up to ${MAX_VEHICLES} vehicles in your garage. Please create an account to save more vehicles.`,
        ...config
    };

    // DOM elements - all scoped to the dropdown ID
    const dropdown = document.getElementById(settings.dropdownId);
    const vehicleGarageUl = dropdown?.querySelector('.vehicle-garage');
    const jewelIndicator = document.getElementById(settings.jewelId);
    const addNewVehicleBtn = dropdown?.querySelector('.dropdown-link');
    const emptyState = dropdown?.querySelector('.vehicle-garage-empty-state');

    // Check required elements
    if (!dropdown) {
        console.error(`Vehicle garage: Dropdown element with ID "${settings.dropdownId}" not found`);
        return null;
    }

    if (!jewelIndicator) {
        console.error(`Vehicle garage: Jewel indicator with ID "${settings.jewelId}" not found`);
        return null;
    }

    // Initialize the garage system
    function init() {
        try {
            // Load garage data from localStorage
            loadGarageData();

            // Set up event listeners
            setupEventListeners();

            // Initial render
            renderGarage();

            // NEW: Auto-sync selected vehicle if configured
            if (typeof settings.syncVehicleSelectorOnInit === 'function') {
                const selectedVehicle = garageData.find(v => v.selected);
                if (selectedVehicle) {
                    try {
                        settings.syncVehicleSelectorOnInit(selectedVehicle);
                        console.log('Vehicle selector synced with garage selection:', selectedVehicle);
                    } catch (error) {
                        console.error('Error syncing vehicle selector on init:', error);
                    }
                }
            }

            console.log('Vehicle garage initialized successfully');
        } catch (error) {
            console.error('Error initializing vehicle garage:', error);
        }
    }

    // Load garage data from localStorage
    function loadGarageData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            garageData = stored ? JSON.parse(stored) : [];

            // Validate data structure
            if (!Array.isArray(garageData)) {
                garageData = [];
            }

            // Ensure each vehicle has required properties
            garageData = garageData.filter(vehicle =>
                vehicle &&
                typeof vehicle === 'object' &&
                vehicle.year &&
                vehicle.make &&
                vehicle.model
            );

        } catch (error) {
            console.error('Error loading garage data:', error);
            garageData = [];
        }
    }

    // Save garage data to localStorage
    function saveGarageData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(garageData));
        } catch (error) {
            console.error('Error saving garage data:', error);
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        if (!vehicleGarageUl) return;

        // Use event delegation for vehicle selection and removal
        vehicleGarageUl.addEventListener('click', handleGarageClick);
        vehicleGarageUl.addEventListener('keydown', handleGarageKeydown);

        // Add new vehicle button
        if (addNewVehicleBtn) {
            addNewVehicleBtn.addEventListener('click', handleAddNewVehicle);
            addNewVehicleBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAddNewVehicle(e);
                }
            });
        }
    }

    // Handle clicks within the garage list
    function handleGarageClick(e) {
        e.preventDefault();

        const target = e.target.closest('a');
        if (!target) return;

        // Handle vehicle selection
        if (target.classList.contains('vehicle-garage-entry-details')) {
            const vehicleEntry = target.closest('.vehicle-garage-entry');
            const vehicleId = vehicleEntry?.dataset.vehicleId;

            if (vehicleId) {
                selectVehicle(vehicleId);
            }
        }

        // Handle vehicle removal
        else if (target.classList.contains('remove-button')) {
            const vehicleEntry = target.closest('.vehicle-garage-entry');
            const vehicleId = vehicleEntry?.dataset.vehicleId;

            if (vehicleId) {
                removeVehicle(vehicleId);
            }
        }
    }

    // Handle keyboard navigation
    function handleGarageKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGarageClick(e);
        }
    }

    // Handle adding new vehicle
    function handleAddNewVehicle(e) {
        e.preventDefault();

        try {
            // Deselect any currently selected vehicle
            deselectAllVehicles();
            renderGarage();

            // Trigger callback if provided
            if (typeof settings.onAddNewVehicle === 'function') {
                settings.onAddNewVehicle();
            }

            console.log('Add new vehicle triggered');
        } catch (error) {
            console.error('Error handling add new vehicle:', error);
        }
    }

    // Add vehicle to garage
    function addVehicleToGarage(vehicleConfig) {
        try {
            // Check if garage is full
            if (garageData.length >= MAX_VEHICLES) {
                showMaxVehiclesMessage();
                return false;
            }

            // Validate required fields
            if (!vehicleConfig || !vehicleConfig.year || !vehicleConfig.make || !vehicleConfig.model) {
                console.warn('Invalid vehicle configuration provided');
                return false;
            }

            // Create vehicle object with unique ID
            const vehicleId = generateVehicleId(vehicleConfig);
            const vehicle = {
                id: vehicleId,
                ...vehicleConfig,
                dateAdded: Date.now(),
                selected: true // New vehicle is automatically selected
            };

            // Remove any existing selection
            garageData.forEach(v => v.selected = false);

            // Check if vehicle already exists
            const existingIndex = garageData.findIndex(v => v.id === vehicleId);

            if (existingIndex >= 0) {
                // Update existing vehicle and move to end
                garageData.splice(existingIndex, 1);
                garageData.push(vehicle);
            } else {
                // Add new vehicle to end
                garageData.push(vehicle);
            }

            // Save and render
            saveGarageData();
            renderGarage();

            console.log('Vehicle added to garage:', vehicle);
            return true;
        } catch (error) {
            console.error('Error adding vehicle to garage:', error);
            return false;
        }
    }

    // Generate unique vehicle ID
    function generateVehicleId(vehicleConfig) {
        const parts = [
            vehicleConfig.year,
            vehicleConfig.make,
            vehicleConfig.model,
            vehicleConfig.submodel || '',
            vehicleConfig.chassis || '',
            vehicleConfig.engine || '',
            vehicleConfig.transmission || ''
        ];

        return parts
            .filter(part => part && part !== 'I don\'t know')
            .join('-')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Select a vehicle (or deselect if already selected)
    function selectVehicle(vehicleId) {
        try {
            // Find the vehicle
            const vehicle = garageData.find(v => v.id === vehicleId);
            if (!vehicle) return false;

            // Check if this vehicle is already selected
            const isAlreadySelected = vehicle.selected;

            if (isAlreadySelected) {
                // FIX: Deselect the vehicle if it's already selected
                garageData.forEach(v => v.selected = false);

                // Save changes
                saveGarageData();

                // Update UI
                renderGarage();

                // Trigger removal callback to reset vehicle selector
                if (typeof settings.onVehicleRemoved === 'function') {
                    settings.onVehicleRemoved(vehicle, true); // Reset vehicle selector
                }

                console.log('Vehicle deselected:', vehicleId);
                return true;
            } else {
                // Select the vehicle (deselect others)
                garageData.forEach(v => {
                    v.selected = v.id === vehicleId;
                });

                // Save changes
                saveGarageData();

                // Update UI
                renderGarage();

                // Trigger callback if provided
                if (typeof settings.onVehicleSelected === 'function') {
                    settings.onVehicleSelected(vehicle);
                }

                console.log('Vehicle selected:', vehicleId);
                return true;
            }
        } catch (error) {
            console.error('Error selecting vehicle:', error);
            return false;
        }
    }

    // Remove a vehicle from garage and clear selection
    function removeVehicle(vehicleId) {
        try {
            const vehicleIndex = garageData.findIndex(v => v.id === vehicleId);

            if (vehicleIndex === -1) return false;

            const wasSelected = garageData[vehicleIndex].selected;
            const removedVehicle = garageData[vehicleIndex];

            // Remove vehicle
            garageData.splice(vehicleIndex, 1);

            // FIX: Don't auto-select another vehicle - clear all selections
            garageData.forEach(v => v.selected = false);

            // Save and render
            saveGarageData();
            renderGarage();

            // Trigger callback if provided (always pass true for wasSelected since we're clearing selection)
            if (typeof settings.onVehicleRemoved === 'function') {
                settings.onVehicleRemoved(removedVehicle, true); // Always reset vehicle selector
            }

            console.log('Vehicle removed and selection cleared:', vehicleId);
            return true;
        } catch (error) {
            console.error('Error removing vehicle:', error);
            return false;
        }
    }

    // Deselect all vehicles
    function deselectAllVehicles() {
        const hadSelection = garageData.some(v => v.selected);
        garageData.forEach(vehicle => vehicle.selected = false);
        saveGarageData();
        return hadSelection;
    }

    // Render the garage UI
    function renderGarage() {
        try {
            if (!vehicleGarageUl) return;

            // Clear existing vehicle entries (keep empty state)
            const existingEntries = vehicleGarageUl.querySelectorAll('.vehicle-garage-entry');
            existingEntries.forEach(entry => entry.remove());

            // Update garage jewel indicator
            updateJewelIndicator();

            if (garageData.length === 0) {
                // Show empty state
                if (emptyState) {
                    emptyState.style.display = 'block';
                }
            } else {
                // Hide empty state
                if (emptyState) {
                    emptyState.style.display = 'none';
                }

                // Render vehicles (in reverse order - newest first)
                const sortedVehicles = [...garageData].reverse();

                sortedVehicles.forEach(vehicle => {
                    const vehicleElement = createVehicleElement(vehicle);

                    // Insert before empty state if it exists
                    if (emptyState) {
                        vehicleGarageUl.insertBefore(vehicleElement, emptyState);
                    } else {
                        vehicleGarageUl.appendChild(vehicleElement);
                    }
                });
            }
        } catch (error) {
            console.error('Error rendering garage:', error);
        }
    }

    // Create vehicle element
    function createVehicleElement(vehicle) {
        const li = document.createElement('li');
        li.className = `vehicle-garage-entry${vehicle.selected ? ' selected' : ''}`;
        li.dataset.vehicleId = vehicle.id;

        // Generate vehicle title and subtitle
        const title = generateVehicleTitle(vehicle);
        const subtitle = generateVehicleSubtitle(vehicle);

        li.innerHTML = `
        <a href="#" class="vehicle-garage-entry-details" tabindex="0">
          <div class="fake-radio-button"></div>
          <div class="flex-block-34">
            <div class="vehicle-entry-title">${escapeHtml(title)}</div>
            <div class="vehicle-entry-subtitle">${escapeHtml(subtitle)}</div>
          </div>
        </a>
        <div class="vehicle-garage-entry-actions">
          <a href="#" class="remove-button" tabindex="0">
            <div>Remove</div>
          </a>
        </div>
      `;

        return li;
    }

    // Generate vehicle title
    function generateVehicleTitle(vehicle) {
        const parts = [vehicle.year, vehicle.make, vehicle.model];
        return parts.filter(Boolean).join(' ');
    }

    // Generate vehicle subtitle
    function generateVehicleSubtitle(vehicle) {
        const parts = [
            vehicle.submodel,
            vehicle.chassis,
            vehicle.engine,
            vehicle.transmission
        ].filter(part => part && part !== 'I don\'t know');

        return parts.join(', ') || 'Standard Configuration';
    }

    // Update jewel indicator with pop animation
    function updateJewelIndicator() {
        if (!jewelIndicator) return;

        const count = garageData.length;
        const wasVisible = jewelIndicator.style.display !== 'none';

        if (count >= 1) { // FIX: Show jewel when 1 or more vehicles (was > 1)
            jewelIndicator.textContent = count.toString();
            jewelIndicator.style.display = 'block';

            // Add pop animation effect when jewel becomes visible or count changes
            if (!wasVisible || parseInt(jewelIndicator.textContent) !== count) {
                animateJewelPop();
            }
        } else {
            jewelIndicator.style.display = 'none';
        }
    }

    // Animate jewel pop effect using JavaScript transitions
    function animateJewelPop() {
        if (!jewelIndicator) return;

        // Store original transform
        const originalTransform = jewelIndicator.style.transform || '';

        // Apply pop effect: scale up then back to normal
        jewelIndicator.style.transition = 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        jewelIndicator.style.transform = 'scale(1.3)';

        // Reset to normal size after animation
        setTimeout(() => {
            if (jewelIndicator) {
                jewelIndicator.style.transform = originalTransform;

                // Clean up transition after animation completes
                setTimeout(() => {
                    if (jewelIndicator) {
                        jewelIndicator.style.transition = '';
                    }
                }, 200);
            }
        }, 150);
    }

    // Show max vehicles message
    function showMaxVehiclesMessage() {
        alert(settings.maxVehiclesMessage);
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    const api = {
        // Add vehicle to garage
        addVehicle: addVehicleToGarage,

        // Remove vehicle from garage
        removeVehicle: removeVehicle,

        // Select vehicle
        selectVehicle: selectVehicle,

        // Deselect all vehicles
        deselectAll: () => {
            const hadSelection = deselectAllVehicles();
            renderGarage();
            return hadSelection;
        },

        // Get garage data
        getGarageData: () => [...garageData],

        // Get selected vehicle
        getSelectedVehicle: () => garageData.find(v => v.selected) || null,

        // Clear garage
        clearGarage: () => {
            garageData = [];
            saveGarageData();
            renderGarage();
        },

        // Refresh garage (reload from storage and re-render)
        refresh: () => {
            loadGarageData();
            renderGarage();
        },

        // Update configuration
        updateConfig: (newConfig) => {
            Object.assign(settings, newConfig);
        },

        // Manual sync method for external use
        syncVehicleSelector: (vehicleSelectorInstance) => {
            const selectedVehicle = garageData.find(v => v.selected);
            if (selectedVehicle && vehicleSelectorInstance && typeof vehicleSelectorInstance.setConfiguration === 'function') {
                try {
                    vehicleSelectorInstance.setConfiguration(selectedVehicle, { triggerCallbacks: false });
                    return true;
                } catch (error) {
                    console.error('Error syncing with vehicle selector:', error);
                    return false;
                }
            }
            return false;
        }
    };

    // Initialize the garage
    init();

    return api;
}

function initCarousel(options = {}) {
    // Configuration with defaults
    const config = {
        carouselId: "recommended-products",
        showPagination: true,
        mobileBreakpoint: 990,
        animationDuration: 300,
        startCentered: false,
        focusOnItem: null,
        ...options
    };

    // State object to hold all dynamic values
    const state = {
        currentPosition: 0,
        maxPosition: 0,
        cardWidth: 0,
        visibleCards: 0,
        totalCards: 0,
        totalPages: 0,
        currentPage: 0,
        isDesktop: true,
        isDragging: false,
        startX: 0,
        startScrollLeft: 0,
        resizeTimeout: null
    };

    // DOM elements (initialized in init)
    const elements = {};

    // Initialize carousel
    function init() {
        try {
            // Get DOM elements
            elements.carousel = document.getElementById(config.carouselId);
            if (!elements.carousel) {
                console.warn(`Carousel with ID "${config.carouselId}" not found`);
                return false;
            }

            elements.wrapper = elements.carousel.querySelector(
                ".carousel-widget-wrapper"
            );
            elements.scroller = elements.carousel.querySelector(
                ".carousel-widget-scroller"
            );
            elements.leftArrow = elements.carousel.querySelector(
                ".carousel-widget-arrow-left"
            );
            elements.rightArrow = elements.carousel.querySelector(
                ".carousel-widget-arrow-right"
            );
            elements.pagination = elements.carousel.querySelector(
                ".carousel-widget-pagination"
            );

            // Get all direct children of scroller instead of specific class
            elements.productCards = elements.scroller.children;

            if (
                !elements.wrapper ||
                !elements.scroller ||
                !elements.productCards.length
            ) {
                console.warn("Required carousel elements not found");
                return false;
            }

            state.totalCards = elements.productCards.length;

            // Initial setup
            calculateDimensions();
            setupEventListeners();
            updateUI();

            // Apply initial positioning after DOM layout is complete
            requestAnimationFrame(() => {
                // Recalculate dimensions to ensure accurate measurements
                calculateDimensions();

                // Determine initial position based on config
                if (
                    config.focusOnItem !== null &&
                    config.focusOnItem >= 0 &&
                    config.focusOnItem < state.totalCards
                ) {
                    // Focus on specific item
                    state.currentPosition = calculateFocusPositionForItem(
                        config.focusOnItem
                    );

                    // Update current page based on focused item
                    if (config.startCentered) {
                        state.currentPage = config.focusOnItem;
                    } else {
                        // For non-centered, calculate which page this item falls into
                        const pageWidth = state.cardWidth * state.visibleCards;
                        state.currentPage =
                            pageWidth > 0
                                ? Math.min(
                                    Math.floor(state.currentPosition / pageWidth),
                                    state.totalPages - 1
                                )
                                : 0;
                    }
                } else if (config.startCentered) {
                    // Default centered positioning (first item)
                    state.currentPosition = calculateCenteredPosition();
                    state.currentPage = 0;
                }
                // For non-centered without focusOnItem, position stays at 0 (default)

                updateScrollPosition(false); // No animation for initial positioning
            });

            return true;
        } catch (error) {
            console.error("Error initializing carousel:", error);
            return false;
        }
    }

    // Calculate carousel dimensions and positions
    function calculateDimensions() {
        // Account for wrapper padding (8px) that affects the effective scroll area
        const wrapperPadding = 8;
        const wrapperWidth = elements.wrapper.offsetWidth - wrapperPadding * 2;
        const scrollerWidth = elements.scroller.scrollWidth;

        // Get computed card width including gap
        if (elements.productCards.length > 0) {
            const cardRect = elements.productCards[0].getBoundingClientRect();
            const cardStyle = getComputedStyle(elements.productCards[0]);
            const marginRight = parseFloat(cardStyle.marginRight) || 0;
            state.cardWidth = cardRect.width + marginRight;
        }

        // Calculate visible cards and pages based on carousel type
        if (config.startCentered) {
            // For centered carousels, each item is a page
            state.visibleCards = 1;
            state.totalPages = state.totalCards;
        } else {
            // Normal carousel behavior
            state.visibleCards = Math.floor(wrapperWidth / state.cardWidth);
            if (state.visibleCards === 0) state.visibleCards = 1;
            state.totalPages = Math.ceil(state.totalCards / state.visibleCards);
            if (state.totalPages === 0) state.totalPages = 1;
        }

        // Calculate maximum scroll position accounting for wrapper padding
        state.maxPosition = Math.max(0, scrollerWidth - wrapperWidth);

        // Check if desktop view
        state.isDesktop = window.innerWidth >= config.mobileBreakpoint;
    }

    // Calculate position to center a specific item in the wrapper
    function calculateCenteredPositionForItem(itemIndex) {
        if (!config.startCentered || !elements.productCards.length) return 0;

        const wrapperPadding = 8;
        const wrapperWidth = elements.wrapper.offsetWidth - wrapperPadding * 2;
        const wrapperCenter = wrapperWidth / 2;

        // Get the item's position and width
        const item = elements.productCards[itemIndex];
        if (!item) return 0;

        // Calculate item position relative to scroller start (without current scroll offset)
        let itemLeft = 0;
        for (let i = 0; i < itemIndex; i++) {
            const prevItem = elements.productCards[i];
            const prevItemStyle = getComputedStyle(prevItem);
            const gap =
                parseFloat(prevItemStyle.marginRight) ||
                parseFloat(getComputedStyle(elements.scroller).columnGap) ||
                parseFloat(getComputedStyle(elements.scroller).gap) ||
                0;
            itemLeft += prevItem.offsetWidth + gap;
        }

        const itemWidth = item.offsetWidth;
        const itemCenter = itemLeft + itemWidth / 2;

        // Calculate scroll position to center this item
        const targetScrollPosition = itemCenter - wrapperCenter;

        // Constrain within bounds
        return Math.max(0, Math.min(state.maxPosition, targetScrollPosition));
    }

    // Calculate initial centered position (centers first item)
    function calculateCenteredPosition() {
        return calculateCenteredPositionForItem(0);
    }

    // Calculate position to focus on a specific item
    function calculateFocusPositionForItem(itemIndex) {
        if (
            !elements.productCards.length ||
            itemIndex < 0 ||
            itemIndex >= elements.productCards.length
        ) {
            return 0;
        }

        const wrapperPadding = 8;
        const wrapperWidth = elements.wrapper.offsetWidth - wrapperPadding * 2;
        const targetItem = elements.productCards[itemIndex];

        if (!targetItem) return 0;

        // Calculate item position relative to scroller start
        let itemLeft = 0;
        for (let i = 0; i < itemIndex; i++) {
            const prevItem = elements.productCards[i];
            const prevItemStyle = getComputedStyle(prevItem);
            const gap =
                parseFloat(prevItemStyle.marginRight) ||
                parseFloat(getComputedStyle(elements.scroller).columnGap) ||
                parseFloat(getComputedStyle(elements.scroller).gap) ||
                0;
            itemLeft += prevItem.offsetWidth + gap;
        }

        let targetScrollPosition;

        if (config.startCentered) {
            // For centered carousels: center the item in the wrapper
            const wrapperCenter = wrapperWidth / 2;
            const itemWidth = targetItem.offsetWidth;
            const itemCenter = itemLeft + itemWidth / 2;
            targetScrollPosition = itemCenter - wrapperCenter;
        } else {
            // For non-centered carousels: align item's left edge with wrapper's left edge
            targetScrollPosition = itemLeft;
        }

        // Constrain within bounds
        return Math.max(0, Math.min(state.maxPosition, targetScrollPosition));
    }

    // Setup event listeners - ensure mobile touch events work properly
    function setupEventListeners() {
        // Arrow navigation (desktop only)
        if (elements.leftArrow) {
            elements.leftArrow.addEventListener("click", handleLeftClick);
        }
        if (elements.rightArrow) {
            elements.rightArrow.addEventListener("click", handleRightClick);
        }

        // Touch/drag events - ensure mobile compatibility
        if (elements.scroller) {
            // Mouse events for desktop dragging
            elements.scroller.addEventListener("mousedown", handleDragStart);
            document.addEventListener("mousemove", handleDragMove); // Listen on document for better mobile support
            document.addEventListener("mouseup", handleDragEnd);

            // Touch events for mobile - with proper event handling
            elements.scroller.addEventListener("touchstart", handleDragStart, {
                passive: false
            });
            document.addEventListener("touchmove", handleDragMove, {
                passive: false
            }); // Listen on document
            document.addEventListener("touchend", handleDragEnd, {
                passive: false
            });

            // Prevent context menu during drag
            elements.scroller.addEventListener("contextmenu", (e) => {
                if (state.isDragging) e.preventDefault();
            });
        }

        // Pagination clicks
        if (elements.pagination && config.showPagination) {
            elements.pagination.addEventListener("click", handlePaginationClick);
        }
        elements.scroller.style.touchAction = "pan-x";

        // Window resize with debounce
        window.addEventListener("resize", debounce(handleResize, 250));
    }

    // Handle left arrow click
    function handleLeftClick(e) {
        e.preventDefault();

        if (config.startCentered) {
            // For centered carousels, navigate by page
            if (state.currentPage > 0) {
                goToPage(state.currentPage - 1);
            }
        } else {
            // For non-centered carousels
            if (!state.isDesktop || state.currentPosition <= 0) return;

            let actualCardWidth = state.cardWidth;
            if (elements.productCards.length > 0) {
                const cardRect = elements.productCards[0].getBoundingClientRect();
                const scrollerStyle = getComputedStyle(elements.scroller);
                const gap =
                    parseFloat(scrollerStyle.columnGap) ||
                    parseFloat(scrollerStyle.gap) ||
                    8;
                actualCardWidth = cardRect.width + gap;
            }

            const moveDistance = Math.min(
                actualCardWidth * state.visibleCards,
                state.currentPosition
            );
            state.currentPosition -= moveDistance;
            updateScrollPosition();
        }
    }

    // Handle right arrow click
    function handleRightClick(e) {
        e.preventDefault();

        if (config.startCentered) {
            // For centered carousels, navigate by page
            if (state.currentPage < state.totalPages - 1) {
                goToPage(state.currentPage + 1);
            }
        } else {
            // For non-centered carousels
            if (!state.isDesktop || state.currentPosition >= state.maxPosition)
                return;

            let actualCardWidth = state.cardWidth;
            if (elements.productCards.length > 0) {
                const cardRect = elements.productCards[0].getBoundingClientRect();
                const scrollerStyle = getComputedStyle(elements.scroller);
                const gap =
                    parseFloat(scrollerStyle.columnGap) ||
                    parseFloat(scrollerStyle.gap) ||
                    8;
                actualCardWidth = cardRect.width + gap;
            }

            const moveDistance = Math.min(
                actualCardWidth * state.visibleCards,
                state.maxPosition - state.currentPosition
            );
            state.currentPosition += moveDistance;
            updateScrollPosition();
        }
    }

    // Handle drag start - works on both desktop and mobile with better mobile optimization
    function handleDragStart(e) {
        state.isDragging = true;
        state.startX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
        state.startScrollLeft = state.currentPosition;

        // Visual feedback for dragging
        elements.scroller.style.cursor = "grabbing";
        elements.scroller.style.userSelect = "none";

        // Prevent default to avoid text selection on desktop
        if (e.type === "mousedown") {
            e.preventDefault();
        }

        // Remove any existing transitions for immediate response
        elements.scroller.style.transition = "none";

        // Don't disable pointer events immediately - only after actual movement
    }

    // Handle drag move - optimized for fluid mobile scrolling
    function handleDragMove(e) {
        if (!state.isDragging) return;

        e.preventDefault();
        const currentX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
        const deltaX = state.startX - currentX;
        const newPosition = state.startScrollLeft + deltaX;

        // Disable pointer events only after we detect actual movement (prevents accidental clicks)
        const movementThreshold = 5; // pixels
        if (Math.abs(deltaX) > movementThreshold) {
            elements.scroller.style.pointerEvents = "none";
        }

        let constrainedPosition;
        let transformValue;

        // Reduced elasticity for more fluid feel on mobile
        const elasticity = state.isDesktop ? 0.3 : 0.5; // Higher elasticity on mobile

        if (newPosition < 0) {
            // Past left boundary - elastic resistance
            const overscroll = Math.abs(newPosition);
            constrainedPosition = -overscroll * elasticity;
            // Move content RIGHT (positive transform) to show elastic space on left
            transformValue = Math.abs(constrainedPosition);
            elements.scroller.style.transform = `translateX(${transformValue}px)`;
        } else if (newPosition > state.maxPosition) {
            // Past right boundary - elastic resistance
            const overscroll = newPosition - state.maxPosition;
            constrainedPosition = state.maxPosition + overscroll * elasticity;
            // Move content LEFT (negative transform) to show elastic space on right
            transformValue = constrainedPosition;
            elements.scroller.style.transform = `translateX(-${transformValue}px)`;
        } else {
            // Within normal bounds - store actual position for pagination
            constrainedPosition = newPosition;
            transformValue = constrainedPosition;
            elements.scroller.style.transform = `translateX(-${transformValue}px)`;
        }

        // Always update state position for proper pagination tracking
        state.currentPosition = constrainedPosition;
    }

    function handleDragEnd() {
        if (!state.isDragging) return;

        state.isDragging = false;
        elements.scroller.style.cursor = "";
        elements.scroller.style.userSelect = "";

        // Re-enable pointer events immediately if no significant movement occurred
        const deltaX = state.currentPosition - state.startScrollLeft;
        const wasSignificantDrag = Math.abs(deltaX) > 5;

        if (wasSignificantDrag) {
            // Small delay to prevent accidental clicks after dragging
            setTimeout(() => {
                elements.scroller.style.pointerEvents = "";
            }, 150);
        } else {
            // No significant drag - re-enable immediately to allow clicks
            elements.scroller.style.pointerEvents = "";
        }

        // Check if we're outside bounds
        const isLeftOfBounds = state.currentPosition < 0;
        const isRightOfBounds = state.currentPosition > state.maxPosition;
        const wasOutOfBounds = isLeftOfBounds || isRightOfBounds;

        let snapPosition;

        if (wasOutOfBounds) {
            // Always bounce back to boundaries
            snapPosition = isLeftOfBounds ? 0 : state.maxPosition;
            // Update currentPage for centered carousels when bouncing back
            if (config.startCentered) {
                state.currentPage = isLeftOfBounds ? 0 : state.totalPages - 1;
            }
        } else if (config.startCentered) {
            // For centered carousels, find which item should be centered based on current position
            const wrapperPadding = 8;
            const wrapperWidth = elements.wrapper.offsetWidth - wrapperPadding * 2;
            const wrapperCenter = wrapperWidth / 2;
            const currentViewCenter = state.currentPosition + wrapperCenter;

            // Find the item that should be centered based on scroll position
            let targetItemIndex = 0;
            let cumulativeWidth = 0;

            for (let i = 0; i < elements.productCards.length; i++) {
                const item = elements.productCards[i];
                const itemWidth = item.offsetWidth;
                const itemStyle = getComputedStyle(item);
                const gap =
                    parseFloat(itemStyle.marginRight) ||
                    parseFloat(getComputedStyle(elements.scroller).columnGap) ||
                    parseFloat(getComputedStyle(elements.scroller).gap) ||
                    0;

                const itemCenter = cumulativeWidth + itemWidth / 2;

                if (Math.abs(itemCenter - currentViewCenter) < itemWidth / 2) {
                    targetItemIndex = i;
                    break;
                }

                cumulativeWidth += itemWidth + gap;

                // If we've gone past all items, select the last one
                if (i === elements.productCards.length - 1) {
                    targetItemIndex = i;
                }
            }

            // Consider drag velocity for more natural snapping
            const dragVelocity = state.currentPosition - state.startScrollLeft;
            const velocityThreshold = 50; // Pixel threshold for velocity

            if (Math.abs(dragVelocity) > velocityThreshold) {
                if (
                    dragVelocity > 0 &&
                    targetItemIndex < elements.productCards.length - 1
                ) {
                    targetItemIndex++; // Next item
                } else if (dragVelocity < 0 && targetItemIndex > 0) {
                    targetItemIndex--; // Previous item
                }
            }

            // Constrain to valid range (no infinite scroll)
            targetItemIndex = Math.max(
                0,
                Math.min(elements.productCards.length - 1, targetItemIndex)
            );

            snapPosition = calculateCenteredPositionForItem(targetItemIndex);
            state.currentPage = targetItemIndex;
        } else {
            // Normal card snapping for regular carousels
            let actualCardWidth = state.cardWidth;
            if (elements.productCards.length > 0) {
                const cardRect = elements.productCards[0].getBoundingClientRect();
                const scrollerStyle = getComputedStyle(elements.scroller);
                const gap =
                    parseFloat(scrollerStyle.columnGap) ||
                    parseFloat(scrollerStyle.gap) ||
                    8;
                actualCardWidth = cardRect.width + gap;
            }

            const cardIndex = Math.round(state.currentPosition / actualCardWidth);
            snapPosition = cardIndex * actualCardWidth;

            const dragVelocity = state.currentPosition - state.startScrollLeft;
            const velocityThreshold = state.isDesktop
                ? actualCardWidth * 0.3
                : actualCardWidth * 0.2;

            if (Math.abs(dragVelocity) > velocityThreshold) {
                if (dragVelocity > 0) {
                    snapPosition =
                        Math.ceil(state.currentPosition / actualCardWidth) *
                        actualCardWidth;
                } else {
                    snapPosition =
                        Math.floor(state.currentPosition / actualCardWidth) *
                        actualCardWidth;
                }
            }

            snapPosition = Math.max(0, Math.min(state.maxPosition, snapPosition));
        }

        // Update position with appropriate animation
        state.currentPosition = snapPosition;

        const easing = wasOutOfBounds
            ? "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "ease-out";
        const baseDuration = state.isDesktop
            ? config.animationDuration
            : config.animationDuration * 0.8;
        const duration = wasOutOfBounds ? baseDuration * 1.3 : baseDuration;

        elements.scroller.style.transition = `transform ${duration}ms ${easing}`;
        elements.scroller.style.transform = `translateX(-${state.currentPosition}px)`;

        // Update pagination for non-centered carousels
        if (!config.startCentered) {
            const constrainedPosition = Math.max(
                0,
                Math.min(state.maxPosition, state.currentPosition)
            );

            if (state.isDesktop) {
                const pageWidth = state.cardWidth * state.visibleCards;
                state.currentPage =
                    pageWidth > 0
                        ? Math.min(
                            Math.floor(constrainedPosition / pageWidth),
                            state.totalPages - 1
                        )
                        : 0;
            } else {
                state.currentPage =
                    state.maxPosition === 0
                        ? 0
                        : Math.round(
                            (constrainedPosition / state.maxPosition) *
                            (state.totalPages - 1)
                        );
            }
        }

        updateUI();
    }

    // Handle pagination click
    function handlePaginationClick(e) {
        e.preventDefault();
        const pageElement = e.target.closest(".carousel-widget-page");
        if (!pageElement) return;

        const pages = elements.pagination.querySelectorAll(
            ".carousel-widget-page"
        );
        const clickedIndex = Array.from(pages).indexOf(pageElement);

        if (clickedIndex !== -1 && clickedIndex !== state.currentPage) {
            goToPage(clickedIndex);
        }
    }

    // Go to specific page
    function goToPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= state.totalPages) return false;

        state.currentPage = pageIndex;

        if (config.startCentered) {
            // For centered carousels, center the specific item
            state.currentPosition = calculateCenteredPositionForItem(pageIndex);
        } else if (state.isDesktop) {
            // For desktop, move by card groups
            const targetPosition = Math.min(
                pageIndex * state.cardWidth * state.visibleCards,
                state.maxPosition
            );
            state.currentPosition = targetPosition;
        } else {
            // For mobile, distribute scroll range across pages
            const scrollPerPage = state.maxPosition / (state.totalPages - 1);
            state.currentPosition =
                pageIndex === state.totalPages - 1
                    ? state.maxPosition
                    : pageIndex * scrollPerPage;
        }

        updateScrollPosition();
        return true;
    }

    // Update scroll position
    function updateScrollPosition(smooth = true) {
        if (!elements.scroller) return;

        // Apply transform
        elements.scroller.style.transition = smooth
            ? `transform ${config.animationDuration}ms ease-out`
            : "none";
        elements.scroller.style.transform = `translateX(-${state.currentPosition}px)`;

        // Update current page based on position - only for non-centered carousels
        if (!config.startCentered) {
            if (state.isDesktop) {
                const pageWidth = state.cardWidth * state.visibleCards;
                state.currentPage =
                    pageWidth > 0
                        ? Math.min(
                            Math.floor(state.currentPosition / pageWidth),
                            state.totalPages - 1
                        )
                        : 0;
            } else {
                state.currentPage =
                    state.maxPosition === 0
                        ? 0
                        : Math.round(
                            (state.currentPosition / state.maxPosition) *
                            (state.totalPages - 1)
                        );
            }
        }

        updateUI();
    }

    // Update all UI elements
    function updateUI() {
        updateArrowStates();
        updatePaginationStates();
    }

    // Update arrow visibility and states
    function updateArrowStates() {
        if (!elements.leftArrow || !elements.rightArrow) return;

        if (state.isDesktop) {
            elements.leftArrow.style.display = "block";
            elements.rightArrow.style.display = "block";

            if (config.startCentered) {
                // For centered carousels, check page-based navigation
                elements.leftArrow.classList.toggle(
                    "disabled",
                    state.currentPage <= 0
                );
                elements.rightArrow.classList.toggle(
                    "disabled",
                    state.currentPage >= state.totalPages - 1
                );
            } else {
                // For non-centered carousels, check scroll position with small tolerance
                const tolerance = 1; // 1px tolerance for floating point precision
                elements.leftArrow.classList.toggle(
                    "disabled",
                    state.currentPosition <= tolerance
                );
                elements.rightArrow.classList.toggle(
                    "disabled",
                    state.currentPosition >= state.maxPosition - tolerance
                );
            }
        } else {
            elements.leftArrow.style.display = "none";
            elements.rightArrow.style.display = "none";
        }
    }

    // Generate pagination dots
    function generatePagination() {
        if (!elements.pagination || !config.showPagination) {
            if (elements.pagination) elements.pagination.style.display = "none";
            return;
        }

        elements.pagination.style.display = "flex";
        elements.pagination.innerHTML = "";

        // Create pagination dots
        for (let i = 0; i < state.totalPages; i++) {
            const dot = document.createElement("a");
            dot.href = "#";
            dot.className = "carousel-widget-page";
            if (i === state.currentPage) {
                dot.classList.add("selected");
            }
            elements.pagination.appendChild(dot);
        }
    }

    // Update pagination states
    function updatePaginationStates() {
        if (!elements.pagination || !config.showPagination) return;

        const pages = elements.pagination.querySelectorAll(
            ".carousel-widget-page"
        );
        pages.forEach((page, index) => {
            page.classList.toggle("selected", index === state.currentPage);
        });
    }

    // Handle window resize
    function handleResize() {
        calculateDimensions();

        // Reset position if it exceeds new max
        if (state.currentPosition > state.maxPosition) {
            state.currentPosition = state.maxPosition;
        }

        // Recenter if startCentered is enabled
        if (config.startCentered) {
            state.currentPosition = calculateCenteredPosition();
        }

        updateScrollPosition();
        generatePagination();
    }

    // Navigate to next slide
    function next() {
        if (state.currentPage < state.totalPages - 1) {
            return goToPage(state.currentPage + 1);
        }
        return false;
    }

    // Navigate to previous slide
    function prev() {
        if (state.currentPage > 0) {
            return goToPage(state.currentPage - 1);
        }
        return false;
    }

    // Refresh carousel (recalculate dimensions)
    function refresh() {
        calculateDimensions();
        updateScrollPosition();
        generatePagination();
    }

    // Debounce utility
    function debounce(func, wait) {
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(state.resizeTimeout);
                func.apply(this, args);
            };
            clearTimeout(state.resizeTimeout);
            state.resizeTimeout = setTimeout(later, wait);
        };
    }

    // Cleanup function - updated to clean up document listeners
    function destroy() {
        try {
            // Remove event listeners
            if (elements.leftArrow)
                elements.leftArrow.removeEventListener("click", handleLeftClick);
            if (elements.rightArrow)
                elements.rightArrow.removeEventListener("click", handleRightClick);
            if (elements.scroller) {
                elements.scroller.removeEventListener("mousedown", handleDragStart);
                elements.scroller.removeEventListener(
                    "touchstart",
                    handleDragStart
                );
                elements.scroller.removeEventListener(
                    "contextmenu",
                    handleDragStart
                );
            }

            // Remove document listeners
            document.removeEventListener("mousemove", handleDragMove);
            document.removeEventListener("mouseup", handleDragEnd);
            document.removeEventListener("touchmove", handleDragMove);
            document.removeEventListener("touchend", handleDragEnd);

            if (elements.pagination)
                elements.pagination.removeEventListener(
                    "click",
                    handlePaginationClick
                );
            window.removeEventListener("resize", handleResize);

            // Clear timeout
            if (state.resizeTimeout) {
                clearTimeout(state.resizeTimeout);
            }

            // Reset styles
            if (elements.scroller) {
                elements.scroller.style.transform = "";
                elements.scroller.style.transition = "";
                elements.scroller.style.cursor = "";
                elements.scroller.style.userSelect = "";
                elements.scroller.style.pointerEvents = "";
            }
        } catch (error) {
            console.error("Error destroying carousel:", error);
        }
    }

    // Initialize carousel
    if (!init()) {
        return null;
    }

    // Generate initial pagination
    generatePagination();

    // Public API
    return {
        // Navigation methods
        next,
        prev,
        goToPage,

        // New method to focus on specific item
        focusOnItem: (itemIndex) => {
            if (itemIndex < 0 || itemIndex >= state.totalCards) return false;

            state.currentPosition = calculateFocusPositionForItem(itemIndex);

            // Update current page
            if (config.startCentered) {
                state.currentPage = itemIndex;
            } else {
                const pageWidth = state.cardWidth * state.visibleCards;
                state.currentPage =
                    pageWidth > 0
                        ? Math.min(
                            Math.floor(state.currentPosition / pageWidth),
                            state.totalPages - 1
                        )
                        : 0;
            }

            updateScrollPosition();
            return true;
        },

        // State getters
        getCurrentPage: () => state.currentPage,
        getTotalPages: () => state.totalPages,
        getConfig: () => ({ ...config }),
        getState: () => ({ ...state }),

        // Utility methods
        refresh,
        destroy,

        // Check if carousel can move
        canGoNext: () => state.currentPage < state.totalPages - 1,
        canGoPrev: () => state.currentPage > 0,

        // Get current position info
        getPosition: () => ({
            current: state.currentPosition,
            max: state.maxPosition,
            percentage:
                state.maxPosition === 0
                    ? 0
                    : (state.currentPosition / state.maxPosition) * 100
        })
    };
}

function updateVehicleNotification(state, options = {}) {
    // Configuration object with defaults
    const config = {
        containerId: 'vehicle-selector-compatibility-box',
        titleSelector: '.vehicle-selector-cb-title',
        iconSelector: '.vehicle-selector-cb-icon',
        showIcon: true,
        customMessages: {},
        ...options
    };

    // State definitions with SVG icons
    const states = {
        empty: {
            className: 'is-empty',
            title: 'Enter your vehicle details to see if this product is a fit for your car',
            icon: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_3433_694362)">
<path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z" fill="currentColor"/>
</g>
</svg>`
        },
        perfect: {
            className: 'is-match',
            title: 'This part will fit your vehicle',
            icon: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_3433_694362)">
<path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM11.003 16L18.073 8.929L16.659 7.515L11.003 13.172L8.174 10.343L6.76 11.757L11.003 16Z" fill="currentColor"/>
</g>
</svg>`
        },
        partial: {
            className: 'is-partial-match',
            title: 'This part might fit your vehicle, but we need more data',
            icon: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_3433_694362)">
<path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z" fill="currentColor"/>
</g>
</svg>`
        },
        none: {
            className: 'is-not-a-match',
            title: 'This part will not fit your vehicle',
            icon: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.8659 3.00017L22.3922 19.5002C22.6684 19.9785 22.5045 20.5901 22.0262 20.8662C21.8742 20.954 21.7017 21.0002 21.5262 21.0002H2.47363C1.92135 21.0002 1.47363 20.5525 1.47363 20.0002C1.47363 19.8246 1.51984 19.6522 1.60761 19.5002L11.1339 3.00017C11.41 2.52187 12.0216 2.358 12.4999 2.63414C12.6519 2.72191 12.7782 2.84815 12.8659 3.00017ZM10.9999 16.0002V18.0002H12.9999V16.0002H10.9999ZM10.9999 9.00017V14.0002H12.9999V9.00017H10.9999Z" fill="currentColor"/>
</svg>`
        }
    };

    // Validate state
    if (!states[state]) {
        console.error(`Invalid notification state: ${state}. Valid states: ${Object.keys(states).join(', ')}`);
        return false;
    }

    // Get DOM elements
    const container = document.getElementById(config.containerId);
    if (!container) {
        console.error(`Container element with ID "${config.containerId}" not found`);
        return false;
    }

    const titleElement = container.querySelector(config.titleSelector);
    if (!titleElement) {
        console.error(`Title element with selector "${config.titleSelector}" not found`);
        return false;
    }

    // Get current state configuration
    const currentState = states[state];

    // Use custom message if provided
    const title = config.customMessages[state] || currentState.title;

    // Remove all possible state classes
    const allClasses = Object.values(states).map(s => s.className);
    container.classList.remove(...allClasses);

    // Add current state class
    container.classList.add(currentState.className);

    // Update title
    titleElement.textContent = title;

    // Handle icon if enabled and element exists
    if (config.showIcon) {
        const iconElement = container.querySelector(config.iconSelector);
        if (iconElement) {
            // For SVG content, use innerHTML to properly render the SVG
            iconElement.innerHTML = currentState.icon;
        }
    }

    return true;
}

function initProductImageGallery() {
    // Variables that will be updated on reinit
    let galleryWrapper, thumbnailsList, imagesList, thumbnails, images;
    let mutationObserver;
    let isReinitializing = false;
    let hasUserInteracted = false;

    // Touch/drag tracking variables
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let threshold = 50; // Minimum distance for swipe detection
    let currentIndex = 0;

    // Helper function to find and cache DOM elements
    const findElements = () => {
        galleryWrapper = document.querySelector('#product-image-gallery') || document.querySelector('.product-gallery-wrapper');
        thumbnailsList = galleryWrapper?.querySelector('.product-gallery-thumbnails-list');
        imagesList = galleryWrapper?.querySelector('.product-gallery-image-list');
        thumbnails = Array.from(thumbnailsList?.querySelectorAll('.product-gallery-thumbnail') || []);
        images = Array.from(imagesList?.querySelectorAll('.product-gallery-image') || []);

        return galleryWrapper && thumbnailsList && imagesList && thumbnails.length > 0 && images.length > 0;
    };

    // Performance optimization - debounce function
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Cleanup function for removing event listeners
    const cleanupEventListeners = () => {
        try {
            if (thumbnails && thumbnails.length > 0) {
                thumbnails.forEach((thumbnail, index) => {
                    const newThumbnail = thumbnail.cloneNode(true);
                    thumbnail.parentNode?.replaceChild(newThumbnail, thumbnail);
                });
            }

            if (imagesList) {
                const newImagesList = imagesList.cloneNode(true);
                imagesList.parentNode?.replaceChild(newImagesList, imagesList);
            }

            window.removeEventListener('resize', handleResize);
        } catch (error) {
            console.error('Product gallery cleanup error:', error);
        }
    };

    // Function to reinitialize the gallery
    const reinitGallery = () => {
        if (isReinitializing) {
            console.log('Reinit already in progress, skipping...');
            return;
        }

        try {
            isReinitializing = true;
            console.log('Reinitializing product gallery...');

            // Temporarily disconnect observer to prevent self-triggering
            if (mutationObserver) {
                mutationObserver.disconnect();
            }

            // Cleanup existing listeners
            cleanupEventListeners();

            // Reset current index
            currentIndex = 0;

            // Find elements again
            if (findElements()) {
                initEventListeners();
                setSelected(0);
                console.log('Product gallery reinitialized successfully');
            } else {
                console.warn('Product gallery: Elements not found during reinit');
            }

        } catch (error) {
            console.error('Product gallery reinit error:', error);
        } finally {
            // Reconnect observer and reset flag after a delay
            setTimeout(() => {
                if (galleryWrapper && mutationObserver) {
                    mutationObserver.observe(galleryWrapper, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['src'],
                        attributeOldValue: false
                    });
                }
                isReinitializing = false;
            }, 300);
        }
    };

    // Debounced reinit to prevent excessive calls
    const debouncedReinit = debounce(reinitGallery, 300);

    // Helper function to clear all selected states
    const clearAllSelected = () => {
        thumbnails.forEach(thumb => thumb.classList.remove('selected'));
        images.forEach(img => {
            img.classList.remove('selected');
            // Reset all transform and opacity styles
            img.style.transform = '';
            img.style.opacity = '';
            img.style.zIndex = '';
        });
    };

    // Helper function to set selected state for specific index
    const setSelected = (index) => {
        if (index < 0 || index >= thumbnails.length || index >= images.length) return;

        clearAllSelected();

        // Always apply the selected class - this is basic functionality
        thumbnails[index].classList.add('selected');
        images[index].classList.add('selected');

        // Only apply our custom styling after user interaction or mutation
        if (hasUserInteracted || isReinitializing) {
            // Set z-index for proper stacking - selected image on top
            images[index].style.zIndex = '10';
            images[index].style.transform = 'scale(1)';
            images[index].style.opacity = '1';

            // Set other images behind with scale and opacity
            images.forEach((img, imgIndex) => {
                if (imgIndex !== index) {
                    img.style.zIndex = '1';
                    img.style.transform = 'scale(0.9)';
                    img.style.opacity = '0';
                    img.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                }
            });
        }

        currentIndex = index;
    };

    // Helper function to update drag effect on current and next images
    const updateDragEffect = (deltaX) => {
        const currentImage = images[currentIndex];
        if (!currentImage) return;

        const dragRatio = Math.abs(deltaX) / threshold;
        const clampedRatio = Math.min(dragRatio, 1);

        // Current image: slides and fades out completely
        currentImage.style.opacity = 1 - clampedRatio; // Fade out completely (1 → 0)
        currentImage.style.transform = `translateX(${deltaX}px)`; // Just slide, no scaling
        currentImage.style.transition = 'none'; // Disable transition during drag

        // Determine next image based on drag direction
        let nextIndex = -1;
        if (deltaX < 0 && currentIndex < images.length - 1) {
            nextIndex = currentIndex + 1; // Dragging left, show next image
        } else if (deltaX > 0 && currentIndex > 0) {
            nextIndex = currentIndex - 1; // Dragging right, show previous image
        }

        // Animate the next image coming in: scale from 0.9 to 1 and fade in
        if (nextIndex >= 0 && images[nextIndex]) {
            const nextImage = images[nextIndex];
            const nextOpacity = clampedRatio; // Fade in (0 → 1)
            const nextScale = 0.9 + clampedRatio * 0.1; // Scale from 0.9 to 1

            nextImage.style.opacity = nextOpacity;
            nextImage.style.transform = `scale(${nextScale})`;
            nextImage.style.zIndex = '5'; // Between background and current
            nextImage.style.transition = 'none'; // Disable transition during drag
        }
    };

    // Helper function to reset drag effects
    const resetDragEffects = () => {
        images.forEach(img => {
            img.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        });
    };

    // Helper function to handle thumbnail click
    const handleThumbnailClick = (index) => {
        hasUserInteracted = true;
        setSelected(index);
    };

    // Helper function to handle keyboard navigation
    const handleThumbnailKeydown = (event, index) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            hasUserInteracted = true;
            setSelected(index);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            event.preventDefault();
            hasUserInteracted = true;
            const prevIndex = index > 0 ? index - 1 : thumbnails.length - 1;
            thumbnails[prevIndex].focus();
            setSelected(prevIndex);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            event.preventDefault();
            hasUserInteracted = true;
            const nextIndex = index < thumbnails.length - 1 ? index + 1 : 0;
            thumbnails[nextIndex].focus();
            setSelected(nextIndex);
        }
    };

    // Helper function to get touch/mouse X coordinate
    const getClientX = (event) => {
        return event.type.includes('touch') ? event.touches[0]?.clientX || event.changedTouches[0]?.clientX : event.clientX;
    };

    // Handle drag/swipe start
    const handleDragStart = (event) => {
        hasUserInteracted = true;
        isDragging = true;
        startX = getClientX(event);
        currentX = startX;

        // Change cursor to grabbing and add grab styles
        if (imagesList) {
            imagesList.style.cursor = 'grabbing';
            imagesList.style.userSelect = 'none';
        }

        // Prevent default drag behavior for images
        event.preventDefault();
    };

    // Handle drag/swipe move
    const handleDragMove = (event) => {
        if (!isDragging) return;

        currentX = getClientX(event);
        const deltaX = currentX - startX;

        // Add resistance at boundaries
        let resistedDelta = deltaX;
        if ((currentIndex === 0 && deltaX > 0) || (currentIndex === images.length - 1 && deltaX < 0)) {
            resistedDelta = deltaX * 0.3; // Reduced movement at boundaries
        }

        updateDragEffect(resistedDelta);

        event.preventDefault();
    };

    // Handle drag/swipe end
    const handleDragEnd = (event) => {
        if (!isDragging) return;

        isDragging = false;
        const deltaX = currentX - startX;

        // Restore cursor and styles
        if (imagesList) {
            imagesList.style.cursor = 'grab';
            imagesList.style.userSelect = '';
        }

        resetDragEffects();

        // Check if swipe meets threshold
        if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0 && currentIndex > 0) {
                // Swipe right - go to previous image
                setSelected(currentIndex - 1);
            } else if (deltaX < 0 && currentIndex < images.length - 1) {
                // Swipe left - go to next image
                setSelected(currentIndex + 1);
            } else {
                // At boundary, reset to current state
                setSelected(currentIndex);
            }
        } else {
            // Swipe didn't meet threshold, reset to current state
            setSelected(currentIndex);
        }

        // Reset tracking variables
        startX = 0;
        currentX = 0;
    };

    // Debounced resize handler for performance
    const handleResize = debounce(() => {
        // Could add responsive logic here if needed
    }, 250);

    // Initialize gallery state
    const initEventListeners = () => {
        try {
            // Add click event listeners to thumbnails
            thumbnails.forEach((thumbnail, index) => {
                // Make thumbnails focusable
                thumbnail.setAttribute('tabindex', '0');
                thumbnail.setAttribute('role', 'button');
                thumbnail.setAttribute('aria-label', `View image ${index + 1} of ${thumbnails.length}`);

                // Add click handler
                thumbnail.addEventListener('click', () => handleThumbnailClick(index));

                // Add keyboard handler
                thumbnail.addEventListener('keydown', (event) => handleThumbnailKeydown(event, index));
            });

            // Add touch/drag event listeners to images container
            if (imagesList) {
                // Set initial cursor style
                imagesList.style.cursor = 'grab';

                // Touch events for mobile
                imagesList.addEventListener('touchstart', handleDragStart, { passive: false });
                imagesList.addEventListener('touchmove', handleDragMove, { passive: false });
                imagesList.addEventListener('touchend', handleDragEnd, { passive: false });

                // Mouse events for desktop
                imagesList.addEventListener('mousedown', handleDragStart);
                imagesList.addEventListener('mousemove', handleDragMove);
                imagesList.addEventListener('mouseup', handleDragEnd);
                imagesList.addEventListener('mouseleave', handleDragEnd); // Handle mouse leaving area

                // Prevent context menu on long press
                imagesList.addEventListener('contextmenu', (e) => e.preventDefault());

                // Prevent image dragging
                const imageElements = imagesList.querySelectorAll('img');
                imageElements.forEach(img => {
                    img.addEventListener('dragstart', (e) => e.preventDefault());
                });
            }

            // Add resize listener for responsive behavior
            window.addEventListener('resize', handleResize);

        } catch (error) {
            console.error('Product gallery initialization error:', error);
        }
    };

    // Initialize gallery
    const init = () => {
        // Find elements
        if (!findElements()) {
            console.warn('Product gallery: Required elements not found or no images available');
            return;
        }

        // Set up mutation observer to watch for DOM changes (variant changes)
        if (galleryWrapper && 'MutationObserver' in window) {
            mutationObserver = new MutationObserver((mutations) => {
                // Don't process mutations if we're currently reinitializing
                if (isReinitializing) return;

                let shouldReinit = false;

                mutations.forEach((mutation) => {
                    // Only check for significant changes, ignore style/class changes that we make
                    if (mutation.type === 'childList') {
                        // Check if actual gallery structure changed (new images added/removed)
                        const relevantAdditions = Array.from(mutation.addedNodes).some(node =>
                            node.nodeType === 1 && (
                                node.matches?.('.product-gallery-thumbnail') ||
                                node.matches?.('.product-gallery-image')
                            )
                        );

                        const relevantRemovals = Array.from(mutation.removedNodes).some(node =>
                            node.nodeType === 1 && (
                                node.matches?.('.product-gallery-thumbnail') ||
                                node.matches?.('.product-gallery-image')
                            )
                        );

                        if (relevantAdditions || relevantRemovals) {
                            console.log('Gallery structure changed - variant switch detected');
                            shouldReinit = true;
                        }
                    }

                    // Only check for src changes on img elements inside gallery
                    if (mutation.type === 'attributes' &&
                        mutation.attributeName === 'src' &&
                        mutation.target.tagName === 'IMG' &&
                        (mutation.target.closest('.product-gallery-thumbnail') ||
                            mutation.target.closest('.product-gallery-image'))) {
                        console.log('Gallery image src changed - variant switch detected');
                        shouldReinit = true;
                    }
                });

                if (shouldReinit) {
                    debouncedReinit();
                }
            });

            // Start observing with more specific options
            mutationObserver.observe(galleryWrapper, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src'], // Only watch src attribute changes
                attributeOldValue: false
            });
        }

        // Initialize event listeners
        initEventListeners();

        // Always set the initial selected state (basic functionality)
        setSelected(0);
    };

    // Cleanup function for removing event listeners
    const destroy = () => {
        try {
            // Disconnect mutation observer
            if (mutationObserver) {
                mutationObserver.disconnect();
                mutationObserver = null;
            }

            cleanupEventListeners();
        } catch (error) {
            console.error('Product gallery cleanup error:', error);
        }
    };

    // Initialize the gallery
    init();

    // Return destroy function for cleanup if needed
    return { destroy };
}