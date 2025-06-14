function initVehicleSelector(config = {}) {
    // Configuration with defaults
    const {
        formId = "vehicle-selector-form",
        dropdownId = "vehicle-selector-dropdown", 
        summaryId = "vehicle-selector-complete-summary",
        intermediarySummaryId = "vehicle-selector-intermediary-summary",
        fieldNames = ["year", "make", "model", "submodel", "chassis", "engine", "transmission"],
        onComplete = null, // Callback function when vehicle configuration is complete
        onReset = null, // Callback function when vehicle selector is reset
        vehicleData = window.carData || {}
    } = config;

    // Cache all DOM elements once at initialization - Performance optimization
    const elements = {
        form: document.getElementById(formId),
        dropdown: document.getElementById(dropdownId),
        dropdownBox: null, // Will be set after dropdown check
        summaryElement: document.getElementById(summaryId),
        intermediarySummaryElement: document.getElementById(intermediarySummaryId),
        steps: document.querySelectorAll(".vehicle-selector-step"), // Updated selector
        navArrows: document.querySelectorAll(".vehicle-selector-nav-arrow"),
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
    let currentQuestionSet = 0;
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
        positionDropdown(elements.inputs[index]);

        // Add smooth fade-in effect
        elements.dropdown.style.display = "block";
        elements.dropdown.style.opacity = "0";
        elements.dropdown.style.transform = "translateY(-10px)";

        // Trigger animation
        requestAnimationFrame(() => {
            elements.dropdown.style.transition = "opacity 0.2s ease, transform 0.2s ease";
            elements.dropdown.style.opacity = "1";
            elements.dropdown.style.transform = "translateY(0)";
        });
    }

    // Get available options for field based on previous selections
    function getOptionsForField(index) {
        const fieldName = fieldNames[index];

        try {
            switch (fieldName) {
                case "year":
                    return Object.keys(vehicleData).sort((a, b) => b - a);

                case "make":
                    const year = selectedValues.year;
                    return year && vehicleData[year]
                        ? Object.keys(vehicleData[year]).sort()
                        : [];

                case "model":
                    const yearData = vehicleData[selectedValues.year];
                    const makeData = yearData?.[selectedValues.make];
                    return makeData ? Object.keys(makeData).sort() : [];

                case "submodel":
                    const modelData =
                        vehicleData[selectedValues.year]?.[selectedValues.make]?.[
                        selectedValues.model
                        ];
                    return modelData ? Object.keys(modelData).sort() : [];

                case "chassis":
                    const submodelData =
                        vehicleData[selectedValues.year]?.[selectedValues.make]?.[
                        selectedValues.model
                        ]?.[selectedValues.submodel];
                    return submodelData ? Object.keys(submodelData).sort() : [];

                case "engine":
                    const chassisData =
                        vehicleData[selectedValues.year]?.[selectedValues.make]?.[
                        selectedValues.model
                        ]?.[selectedValues.submodel]?.[selectedValues.chassis];
                    return chassisData ? Object.keys(chassisData).sort() : [];

                case "transmission":
                    const engineData =
                        vehicleData[selectedValues.year]?.[selectedValues.make]?.[
                        selectedValues.model
                        ]?.[selectedValues.submodel]?.[selectedValues.chassis]?.[
                        selectedValues.engine
                        ];
                    return Array.isArray(engineData) ? engineData.sort() : [];

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
            if (index === 0) link.classList.add("selected");
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
        const dropdownWidth = 260; // From CSS: width: 260px

        // Center the dropdown under the input field
        const inputCenter = rect.left + (rect.width / 2);
        const dropdownLeft = inputCenter - (dropdownWidth / 2);

        // Adjust relative to form position
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

        // Progress to next field or question set - immediate progression for smooth flow
        progressToNextField(fieldIndex);
        updateNavigationArrows();
    }

    // Progress to the next field or question set
    function progressToNextField(currentIndex) {
        // Check if we need to auto-advance to next question set
        if (currentIndex === 3) {
            // After submodel (4th field) - auto-advance to Step 2
            switchToQuestionSet(1);
        } else if (currentIndex === 6) {
            // After transmission (7th field) - auto-advance to Step 3
            switchToQuestionSet(2);
            generateSummary();
        } else if (currentIndex < elements.inputs.length - 1) {
            // Enable next field within current question set
            const nextIndex = currentIndex + 1;
            const currentSetFields = getCurrentQuestionSetFields();
            if (currentSetFields.includes(nextIndex)) {
                enableField(nextIndex);
            }
        }

        // Update navigation arrows after each field completion
        updateNavigationArrows();
    }

    // Get field indices for current question set
    function getCurrentQuestionSetFields() {
        const fieldRanges = [
            [0, 1, 2, 3], // Step 1: Year, Make, Model, Submodel
            [4, 5, 6], // Step 2: Chassis, Engine, Transmission
            [] // Step 3: Summary only
        ];
        return fieldRanges[currentQuestionSet] || [];
    }

    // Switch between question sets
    function switchToQuestionSet(setIndex) {
        currentQuestionSet = setIndex;

        // Hide dropdown when navigating between question sets
        hideDropdown();

        // Remove focus from any currently focused input to ensure dropdown stays closed
        const currentlyFocused = document.activeElement;
        if (currentlyFocused && elements.inputs.includes(currentlyFocused)) {
            currentlyFocused.blur();
        }

        // Hide puck in all question sets
        hidePuck();

        // Hide all steps
        elements.steps.forEach((step) => step.classList.add("hidden"));

        // Show target step
        if (elements.steps[setIndex]) {
            elements.steps[setIndex].classList.remove("hidden");
        }

        // Update intermediary summary when showing step 2
        if (setIndex === 1) {
            updateIntermediarySummary();
        }

        // Enable appropriate field for the new set
        const setFieldRanges = [
            [0, 1, 2, 3], // Step 1 fields
            [4, 5, 6], // Step 2 fields
            [] // Step 3 (summary only)
        ];

        const fieldsForSet = setFieldRanges[setIndex] || [];
        if (fieldsForSet.length > 0) {
            // For automatic progression, enable first field of new set
            // For manual navigation, find first incomplete field
            let fieldToEnable;

            if (setIndex === 1 && fieldsForSet.includes(4)) {
                // Auto-progressing to Step 2 - always start with chassis (index 4)
                fieldToEnable = 4;
            } else {
                // Manual navigation - find first incomplete field
                fieldToEnable = fieldsForSet.find(
                    (index) => !selectedValues[fieldNames[index]]
                );
            }

            if (fieldToEnable !== undefined) {
                enableField(fieldToEnable);
            }
        } else {
            // No fields in this question set (like the summary page) - ensure no field has focus
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
            if (currentQuestionSet !== 0) {
                switchToQuestionSet(0);
            }
        } else if (fieldIndex < 7) {
            // If clearing any field in Step 2, go back to Step 2
            if (currentQuestionSet !== 1) {
                switchToQuestionSet(1);
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
        
        // Reset to first question set
        currentQuestionSet = 0;
        currentFieldIndex = 0;
        
        elements.steps.forEach((step, index) => {
            if (index === 0) {
                step.classList.remove("hidden");
            } else {
                step.classList.add("hidden");
            }
        });
        
        // Focus on the first field
        if (elements.inputs[0]) {
            elements.inputs[0].focus();
            showDropdownForField(0);
            updatePuck(0);
        }
        
        // Update navigation arrows
        updateNavigationArrows();
        
        // Trigger onReset callback if configured and not skipped
        if (typeof onReset === 'function' && !skipCallback && wasPreviouslyComplete) {
            try {
                onReset({
                    previousValues: previousValues,
                    previousSummary: fieldNames.map(fieldName => previousValues[fieldName]).filter(Boolean).join(", "),
                    resetBy: 'button', // Indicates this was triggered by the reset button
                    getState: () => ({ ...selectedValues })
                });
            } catch (error) {
                console.error('Error in vehicle selector reset callback:', error);
            }
        }
        
        console.log('Vehicle selector reset to initial state');
    }

    // Navigate to next question set
    function navigateForward() {
        if (currentQuestionSet === 0 && isQuestionSetComplete(0)) {
            // Step 1 → Step 2
            switchToQuestionSet(1);
        } else if (currentQuestionSet === 1 && isQuestionSetComplete(1)) {
            // Step 2 → Step 3
            switchToQuestionSet(2);
            generateSummary();
        }
        // Step 3 has no forward navigation
    }

    // Navigate to previous question set
    function navigateBackward() {
        if (currentQuestionSet === 1) {
            // Step 2 → Step 1
            switchToQuestionSet(0);
        } else if (currentQuestionSet === 2) {
            // Step 3 → Step 2
            switchToQuestionSet(1);
        }
        // Step 1 has no backward navigation
    }

    // Check if a question set is complete - fix: correct field ranges
    function isQuestionSetComplete(setIndex) {
        const fieldRanges = [
            [0, 1, 2, 3], // Step 1: indices 0,1,2,3 (year, make, model, submodel)
            [4, 5, 6], // Step 2: indices 4,5,6 (chassis, engine, transmission)
            [] // Step 3: no required fields (summary only)
        ];

        const fieldsForSet = fieldRanges[setIndex] || [];

        // Check if all fields in this set have values
        for (const fieldIndex of fieldsForSet) {
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
            const setIndex = Array.from(elements.steps).indexOf(step);

            if (setIndex === currentQuestionSet) {
                if (isQuestionSetComplete(currentQuestionSet)) {
                    arrow.classList.remove("disabled");
                } else {
                    arrow.classList.add("disabled");
                }
            }
        });

        // Update backward arrows - always enabled except for first set
        backwardArrows.forEach((arrow) => {
            const step = arrow.closest(".vehicle-selector-step");
            const setIndex = Array.from(elements.steps).indexOf(step);

            if (setIndex === currentQuestionSet) {
                if (currentQuestionSet === 0) {
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

        const parts = fieldNames.map(fieldName => selectedValues[fieldName]).filter(Boolean);
        elements.summaryElement.textContent = parts.join(", ");
        
        // Check if all required fields are completed and onComplete should be triggered
        const isComplete = fieldNames.every(fieldName => selectedValues[fieldName]);
        
        if (isComplete && typeof onComplete === 'function' && !skipOnComplete) {
            // Call the completion callback with the selected values
            try {
                onComplete({
                    values: { ...selectedValues },
                    summary: parts.join(", "),
                    reset: () => handleResetSelection({ preventDefault: () => {} }), // Provide reset function
                    getState: () => ({ ...selectedValues })
                });
            } catch (error) {
                console.error('Error in vehicle selector completion callback:', error);
            }
        }
    }

    // Update intermediary summary (first 4 fields) in step 2
    function updateIntermediarySummary() {
        if (!elements.intermediarySummaryElement) return;
        
        // Get first 4 field values (Year, Make, Model, Submodel)
        const intermediaryFields = fieldNames.slice(0, 4);
        const parts = intermediaryFields.map(fieldName => selectedValues[fieldName]).filter(Boolean);
        
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
        // Find the current step
        const currentStep = elements.steps[currentQuestionSet];
        if (!currentStep) return;

        // Find the puck in the current step
        const puck = currentStep.querySelector('.vehicle-selector-puck');
        if (!puck) return;

        // Get the active input and its group
        const activeInput = elements.inputs[activeInputIndex];
        if (!activeInput) return;

        const activeGroup = activeInput.closest('.vehicle-selector-input-group');
        if (!activeGroup) return;

        // Get the position and dimensions of the active input group
        const groupRect = activeGroup.getBoundingClientRect();
        const setRect = currentStep.getBoundingClientRect();

        // Calculate relative position within the step
        const leftOffset = groupRect.left - setRect.left;
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
                return false;
            }
            
            // Reset to initial state first
            handleResetSelection({ preventDefault: () => {} }, true); // Skip callback during reset
            
            // Set values in the correct order
            let lastSetFieldIndex = -1;
            
            fieldNames.forEach((fieldName, index) => {
                if (vehicleConfig[fieldName]) {
                    const input = elements.inputs[index];
                    if (input) {
                        // Set the value
                        input.value = vehicleConfig[fieldName];
                        selectedValues[fieldName] = vehicleConfig[fieldName];
                        
                        // Mark field as completed
                        const group = input.closest(".vehicle-selector-input-group");
                        if (group) {
                            group.classList.add("completed");
                            group.classList.remove("active", "disabled");
                        }
                        
                        lastSetFieldIndex = index;
                    }
                }
            });
            
            // Update intermediary summary if we have first 4 fields
            updateIntermediarySummary();
            
            // Switch to appropriate question set
            if (lastSetFieldIndex >= 0) {
                const isComplete = fieldNames.every(fieldName => vehicleConfig[fieldName]);
                
                if (isComplete) {
                    // All fields complete - go to summary
                    switchToQuestionSet(2);
                    generateSummary(!triggerCallbacks); // Skip onComplete if requested
                } else {
                    // Go to the question set of the next field to be filled
                    const nextFieldIndex = lastSetFieldIndex + 1;
                    if (nextFieldIndex < 4) {
                        switchToQuestionSet(0);
                    } else if (nextFieldIndex < 7) {
                        switchToQuestionSet(1);
                    } else {
                        switchToQuestionSet(2);
                    }
                    
                    // Enable and focus the next field
                    if (nextFieldIndex < elements.inputs.length && focusOnComplete) {
                        enableField(nextFieldIndex);
                    }
                }
            }
            
            // Update navigation arrows
            updateNavigationArrows();
            
            console.log('Vehicle configuration set successfully:', vehicleConfig);
            return true;
            
        } catch (error) {
            console.error('Error setting vehicle configuration:', error);
            return false;
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
        reset: (skipCallback = false) => handleResetSelection({ preventDefault: () => {} }, skipCallback),
        setupInitialState: setupInitialState,
        getState: () => ({ ...selectedValues }),
        getConfig: () => ({ formId, dropdownId, summaryId, intermediarySummaryId, fieldNames }),
        updateData: (newData) => {
            Object.assign(vehicleData, newData);
        },
        setConfiguration: setVehicleConfiguration
    };
}