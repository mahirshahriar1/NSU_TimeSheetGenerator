document.addEventListener("DOMContentLoaded", () => {
  const rawTimeSlotData = [
    "8-930",
    "940-1110",
    "1120-1250",
    "1-230",
    "240-410",
    "420-550",
  ];
  const days = [
    { abbr: "S", name: "Sunday" },
    { abbr: "M", name: "Monday" },
    { abbr: "T", name: "Tuesday" },
    { abbr: "W", name: "Wednesday" },
    { abbr: "R", name: "Thursday" },
    { abbr: "A", name: "Saturday" },
  ];
  const LOCAL_STORAGE_SCHEDULE_KEY = "weeklySchedulerData";
  const LOCAL_STORAGE_COLOR_MAP_KEY = "weeklySchedulerColorMap";
  const LOCAL_STORAGE_GLOBAL_COURSES_KEY = "weeklySchedulerGlobalCourses";

  const defaultCourseColors = [
    "#E0BBE4",
    "#957DAD",
    "#D291BC",
    "#FEC8D8",
    "#FFDFD3",
    "#A0E7E5",
    "#B4F8C8",
    "#FBE7C6",
    "#FAD2E1",
    "#C9C9FF",
  ];
  let defaultColorCycleIndex = 0;

  // DOM Elements
  const courseInputGrid = document.getElementById("course-input-grid");
  const generateButton = document.getElementById("generate-button");
  const clearAllButton = document.getElementById("clear-all-button");
  const outputSection = document.getElementById("output-section");
  const classScheduleTable = document.getElementById("class-schedule-table");
  const classScheduleTableBody =
    classScheduleTable.querySelector("tbody") ||
    classScheduleTable.createTBody();
  const templateSelect = document.getElementById("template-select");
  const saveImageButton = document.getElementById("save-image-button");

  const globalCourseNameInput = document.getElementById(
    "global-course-name-input"
  );
  const globalCourseColorInput = document.getElementById(
    "global-course-color-input"
  );
  const addGlobalCourseButton = document.getElementById(
    "add-global-course-button"
  );
  const globalCourseListUL = document.getElementById("global-course-list-ul");

  const autocompleteSuggestionsContainer = document.getElementById(
    "autocomplete-suggestions"
  );
  let activeAutocompleteInput = null;
  let autocompleteDebounceTimer;

  let courseColorMap = {};
  let globalCourseList = [];

  // --- Helper Functions ---
  function formatTimePart(timeStr) {
    /* ... (same) ... */
    let hour, minute;
    if (timeStr.length <= 2) {
      hour = parseInt(timeStr, 10);
      minute = 0;
    } else if (timeStr.length === 3) {
      hour = parseInt(timeStr.substring(0, 1), 10);
      minute = parseInt(timeStr.substring(1), 10);
    } else if (timeStr.length === 4) {
      hour = parseInt(timeStr.substring(0, 2), 10);
      minute = parseInt(timeStr.substring(2), 10);
    } else {
      return timeStr;
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}`;
  }
  const timeSlots = rawTimeSlotData.map((slotStr, index) => {
    /* ... (same) ... */
    const cleanSlotStr = slotStr.trim();
    const [startStr, endStr] = cleanSlotStr.split("-");
    const display = `${formatTimePart(startStr)} - ${formatTimePart(endStr)}`;
    return { id: `slot-${index}`, raw: cleanSlotStr, display: display };
  });
  function getCourseNameKey(courseName) {
    return courseName.trim().toUpperCase();
  }
  function generateUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }

  // --- Global Course List Management --- (Same as before)
  function saveGlobalCourseList() {
    localStorage.setItem(
      LOCAL_STORAGE_GLOBAL_COURSES_KEY,
      JSON.stringify(globalCourseList)
    );
  }
  function loadGlobalCourseList() {
    const savedList = localStorage.getItem(LOCAL_STORAGE_GLOBAL_COURSES_KEY);
    globalCourseList = savedList ? JSON.parse(savedList) : [];
    renderGlobalCourseList();
  }
  function renderGlobalCourseList() {
    /* ... (same) ... */
    globalCourseListUL.innerHTML = "";
    if (globalCourseList.length === 0) {
      globalCourseListUL.innerHTML = "<li>No courses saved yet.</li>";
      return;
    }
    globalCourseList.forEach((course) => {
      const li = document.createElement("li");
      li.innerHTML = `<div class="global-course-item-info"><span class="global-course-item-color-swatch" style="background-color: ${course.color};"></span><span>${course.name}</span></div><button class="remove-global-course-button" data-id="${course.id}" title="Remove ${course.name}">×</button>`;
      li.querySelector(".remove-global-course-button").addEventListener(
        "click",
        () => removeGlobalCourse(course.id)
      );
      globalCourseListUL.appendChild(li);
    });
  }
  function addGlobalCourse() {
    /* ... (same) ... */
    const name = globalCourseNameInput.value.trim();
    const color = globalCourseColorInput.value;
    if (!name) {
      alert("Please enter a course name.");
      return;
    }
    const nameKey = getCourseNameKey(name);
    if (globalCourseList.some((c) => getCourseNameKey(c.name) === nameKey)) {
      alert("This course name already exists in the global list.");
      return;
    }
    globalCourseList.push({ id: generateUUID(), name: name, color: color });
    saveGlobalCourseList();
    renderGlobalCourseList();
    globalCourseNameInput.value = "";
  }
  function removeGlobalCourse(courseId) {
    /* ... (same) ... */

    globalCourseList = globalCourseList.filter(
      (course) => course.id !== courseId
    );
    saveGlobalCourseList();
    renderGlobalCourseList();
  }

  // --- Local Storage for Active Schedule Color Map --- (Same as before)
  function saveColorMapToLocalStorage() {
    localStorage.setItem(
      LOCAL_STORAGE_COLOR_MAP_KEY,
      JSON.stringify(courseColorMap)
    );
  }
  function loadColorMapFromLocalStorage() {
    const savedMap = localStorage.getItem(LOCAL_STORAGE_COLOR_MAP_KEY);
    courseColorMap = savedMap ? JSON.parse(savedMap) : {};
  }

  // --- Autocomplete --- (Same as before)
  function showAutocompleteSuggestions(textInput, suggestions) {
    /* ... (same) ... */
    activeAutocompleteInput = textInput;
    autocompleteSuggestionsContainer.innerHTML = "";
    if (suggestions.length === 0) {
      hideAutocompleteSuggestions();
      return;
    }
    suggestions.forEach((course) => {
      const item = document.createElement("div");
      item.className = "autocomplete-suggestion-item";
      item.innerHTML = `<span class="suggestion-color-swatch" style="background-color: ${course.color};"></span><span>${course.name}</span>`;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectAutocompleteSuggestion(course);
      });
      autocompleteSuggestionsContainer.appendChild(item);
    });
    const inputRect = textInput.getBoundingClientRect();
    const gridWrapperRect = courseInputGridWrapper.getBoundingClientRect();
    autocompleteSuggestionsContainer.style.display = "block";
    autocompleteSuggestionsContainer.style.top = `${
      inputRect.bottom - gridWrapperRect.top
    }px`;
    autocompleteSuggestionsContainer.style.left = `${
      inputRect.left - gridWrapperRect.left
    }px`;
    autocompleteSuggestionsContainer.style.width = `${inputRect.width}px`;
  }
  function hideAutocompleteSuggestions() {
    autocompleteSuggestionsContainer.style.display = "none";
    activeAutocompleteInput = null;
  }
  function selectAutocompleteSuggestion(course) {
    // MODIFIED: No direct colorInput manipulation
    if (activeAutocompleteInput) {
      activeAutocompleteInput.value = course.name;
      handleCourseNameChange(activeAutocompleteInput); // This will set the color in courseColorMap
      activeAutocompleteInput.focus();
    }
    hideAutocompleteSuggestions();
  }
  function handleAutocompleteInput(textInput) {
    /* ... (same) ... */
    const query = textInput.value.trim().toUpperCase();
    if (query.length < 1) {
      hideAutocompleteSuggestions();
      return;
    }
    const filteredCourses = globalCourseList.filter((course) =>
      course.name.toUpperCase().includes(query)
    );
    showAutocompleteSuggestions(textInput, filteredCourses);
  }

  // --- Input Form Creation & Event Handling ---
  function createInputForm(savedSchedule = []) {
    courseInputGrid.innerHTML = "";
    defaultColorCycleIndex = 0;
    courseInputGrid.style.gridTemplateColumns = `auto repeat(${timeSlots.length}, 1fr)`;

    const headerFragment =
      document.createDocumentFragment(); /* ... (header same) ... */
    const emptyHeaderCell = document.createElement("div");
    emptyHeaderCell.className = "grid-cell";
    headerFragment.appendChild(emptyHeaderCell);
    timeSlots.forEach((slot) => {
      const timeHeader = document.createElement("div");
      timeHeader.className = "grid-cell time-header";
      timeHeader.innerHTML = slot.display;
      headerFragment.appendChild(timeHeader);
    });
    courseInputGrid.appendChild(headerFragment);

    days.forEach((day) => {
      const rowFragment = document.createDocumentFragment();
      const dayLabel = document.createElement("div");
      dayLabel.className = "grid-cell day-label";
      dayLabel.textContent = day.name;
      rowFragment.appendChild(dayLabel);

      timeSlots.forEach((slot) => {
        const inputCell = document.createElement("div");
        inputCell.className = "grid-cell";
        const cellContentWrapper = document.createElement("div");
        cellContentWrapper.className = "grid-cell-content"; // Will now just hold the text input

        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.placeholder = `Course`;
        textInput.dataset.day = day.abbr;
        textInput.dataset.timeSlotDisplay = slot.display;

        const savedEntry = savedSchedule.find(
          (entry) =>
            entry.dayAbbr === day.abbr && entry.timeSlotDisplay === slot.display
        );

        if (savedEntry && savedEntry.courseName) {
          textInput.value = savedEntry.courseName;
          // Color for this course (if any) will be determined by handleCourseNameChange/map later
        }

        // No color input created here in the grid

        textInput.addEventListener("input", (e) => {
          clearTimeout(autocompleteDebounceTimer);
          autocompleteDebounceTimer = setTimeout(() => {
            handleAutocompleteInput(e.target);
          }, 250);
        });
        textInput.addEventListener("focus", (e) => {
          if (e.target.value.trim().length > 0)
            handleAutocompleteInput(e.target);
        });
        textInput.addEventListener("blur", (e) => {
          setTimeout(() => {
            if (
              !autocompleteSuggestionsContainer.contains(document.activeElement)
            ) {
              hideAutocompleteSuggestions();
            }
          }, 150);
          handleCourseNameChange(e.target); // Process name and set/sync color
          saveScheduleToLocalStorage(collectScheduleData());
        });
        textInput.addEventListener("keydown", (e) => {
          /* ... (same keyboard nav) ... */
          const items = autocompleteSuggestionsContainer.querySelectorAll(
            ".autocomplete-suggestion-item"
          );
          if (
            !items.length ||
            autocompleteSuggestionsContainer.style.display === "none"
          )
            return;
          let activeItem =
            autocompleteSuggestionsContainer.querySelector(".active");
          let activeIndex = Array.from(items).indexOf(activeItem);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (activeItem) activeItem.classList.remove("active");
            activeIndex = (activeIndex + 1) % items.length;
            items[activeIndex].classList.add("active");
            items[activeIndex].scrollIntoView({ block: "nearest" });
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (activeItem) activeItem.classList.remove("active");
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            items[activeIndex].classList.add("active");
            items[activeIndex].scrollIntoView({ block: "nearest" });
          } else if (e.key === "Enter" && activeItem) {
            e.preventDefault();
            activeItem.dispatchEvent(new MouseEvent("mousedown"));
          } else if (e.key === "Escape") {
            hideAutocompleteSuggestions();
          }
        });

        cellContentWrapper.appendChild(textInput); // Only text input now
        inputCell.appendChild(cellContentWrapper);
        rowFragment.appendChild(inputCell);
      });
      courseInputGrid.appendChild(rowFragment);
    });
    // After grid is built, ensure colors for existing text values are set from map/global
    syncAllInitialGridColors();
  }

  function handleCourseNameChange(textInputElement) {
    // No associatedColorInput needed from grid
    const courseName = textInputElement.value;
    const courseKey = getCourseNameKey(courseName);

    if (courseKey) {
      const globalCourse = globalCourseList.find(
        (gc) => getCourseNameKey(gc.name) === courseKey
      );
      let colorToSet;

      if (globalCourse) {
        colorToSet = globalCourse.color;
      } else if (courseColorMap[courseKey]) {
        colorToSet = courseColorMap[courseKey];
      } else {
        // New course name for this session, assign a default cycle color
        colorToSet =
          defaultCourseColors[
            defaultColorCycleIndex % defaultCourseColors.length
          ];
        defaultColorCycleIndex++; // Increment only when a new color is truly assigned
      }

      courseColorMap[courseKey] = colorToSet; // Update/set in active map
      // No direct color picker in grid to update, map is the source of truth for rendering
      saveColorMapToLocalStorage();
    } else {
      // If course name is cleared, we don't necessarily remove from map.
      // If it's re-typed, it will pick up its old color.
    }
  }

  // This function is now obsolete as there's no color picker in the grid
  // function handleColorChange(colorInputElement, associatedTextInput, isLivePreview = false) {}

  // This function syncs colors in the output table, not input grid color pickers
  // It's also not needed as renderScheduleTable will use courseColorMap
  // function syncColorForCourse(targetCourseKey, colorToSet,  excludeInputElement = null) {}

  function syncAllInitialGridColors() {
    const allTextInputs =
      courseInputGrid.querySelectorAll('input[type="text"]');
    allTextInputs.forEach((textInput) => {
      if (textInput.value.trim() !== "") {
        handleCourseNameChange(textInput); // This will ensure its color is in courseColorMap
      }
    });
  }

  // --- Data Collection & Rendering ---
  function collectScheduleData() {
    const entries = [];
    const textInputs = courseInputGrid.querySelectorAll('input[type="text"]'); // Simpler query now
    textInputs.forEach((textInput) => {
      const courseName = textInput.value.trim();
      if (courseName !== "") {
        const courseKey = getCourseNameKey(courseName);
        let color = courseColorMap[courseKey]; // Get color from map

        if (!color) {
          // Should not happen if syncAllInitialGridColors worked, but as a fallback
          const globalCourse = globalCourseList.find(
            (gc) => getCourseNameKey(gc.name) === courseKey
          );
          if (globalCourse) {
            color = globalCourse.color;
          } else {
            color =
              defaultCourseColors[
                defaultColorCycleIndex % defaultCourseColors.length
              ];
            // Don't increment defaultColorCycleIndex here, it's for initial assignment
          }
          courseColorMap[courseKey] = color; // Ensure it's in map
        }

        entries.push({
          dayAbbr: textInput.dataset.day,
          timeSlotDisplay: textInput.dataset.timeSlotDisplay,
          courseName: courseName,
          courseColor: color,
        });
      }
    });
    return entries;
  }
  function renderScheduleTable(dataForTable) {
    /* ... (same rendering logic as before, uses entry.courseColor) ... */
    classScheduleTableBody.innerHTML = "";
    let thead = classScheduleTable.querySelector("thead");
    if (!thead) {
      thead = classScheduleTable.createTHead();
      const headerRow = thead.insertRow();
      const thDay = document.createElement("th");
      thDay.textContent = "Day";
      headerRow.appendChild(thDay);
      timeSlots.forEach((slot) => {
        const thTime = document.createElement("th");
        thTime.innerHTML = slot.display;
        headerRow.appendChild(thTime);
      });
    }
    let rowsAdded = 0;
    days.forEach((day) => {
      const row = classScheduleTableBody.insertRow();
      rowsAdded++;
      const dayCell = row.insertCell();
      dayCell.className = "day-col";
      dayCell.textContent = day.name;
      timeSlots.forEach((slot) => {
        const cell = row.insertCell();
        const entry = dataForTable.find(
          (e) => e.dayAbbr === day.abbr && e.timeSlotDisplay === slot.display
        );
        if (entry) {
          const entryWrapper = document.createElement("div");
          entryWrapper.className = "course-entry";
          const colorIndicator = document.createElement("div");
          colorIndicator.className = "course-color-indicator";
          colorIndicator.style.backgroundColor = entry.courseColor || "#cccccc";
          const courseNameSpan = document.createElement("span");
          courseNameSpan.className = "course-name";
          courseNameSpan.textContent = entry.courseName;
          entryWrapper.appendChild(colorIndicator);
          entryWrapper.appendChild(courseNameSpan);
          cell.appendChild(entryWrapper);
        } else {
          cell.innerHTML = " ";
        }
      });
    });
    if (rowsAdded === 0 && dataForTable.length === 0) {
      const row = classScheduleTableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = timeSlots.length + 1;
      cell.textContent =
        'No classes entered. Fill the form above and click "Generate Schedule".';
      cell.style.textAlign = "center";
      cell.style.padding = "20px";
      outputSection.style.display = "block";
    } else if (rowsAdded > 0) {
      outputSection.style.display = "block";
    } else {
      outputSection.style.display = "none";
    }
  }

  // --- Local Storage for Schedule Data ---
  function saveScheduleToLocalStorage(scheduleData) {
    localStorage.setItem(
      LOCAL_STORAGE_SCHEDULE_KEY,
      JSON.stringify(scheduleData)
    );
  }
  function loadScheduleFromLocalStorage() {
    const savedData = localStorage.getItem(LOCAL_STORAGE_SCHEDULE_KEY);
    return savedData ? JSON.parse(savedData) : [];
  }

  // --- Clear All ---
  function clearAllInputs() {
    const textInputs = courseInputGrid.querySelectorAll('input[type="text"]');
    textInputs.forEach((input) => (input.value = ""));
    // No color pickers in the grid to reset
    courseColorMap = {}; // Clear the active session color map
    defaultColorCycleIndex = 0; // Reset default color cycle

    localStorage.removeItem(LOCAL_STORAGE_SCHEDULE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_COLOR_MAP_KEY);

    renderScheduleTable([]);
    outputSection.style.display = "none";
  }

  // --- Event Listeners ---
  addGlobalCourseButton.addEventListener("click", addGlobalCourse);
  generateButton.addEventListener("click", () => {
    const scheduleData = collectScheduleData(); // Collects data, ensuring colors are from map
    renderScheduleTable(scheduleData);
    saveScheduleToLocalStorage(scheduleData); // Save schedule (which now has map-derived colors)
    saveColorMapToLocalStorage(); // Save the potentially updated map
    applyTheme(templateSelect.value);
  });
  clearAllButton.addEventListener("click", clearAllInputs);
  templateSelect.addEventListener("change", (event) =>
    applyTheme(event.target.value)
  );

  // --- Save Image Button --- CORRECTED ---
  saveImageButton.addEventListener("click", () => {
    const scheduleOutputCard = document.getElementById(
      "class-schedule-container"
    ); // The card itself
    const tableToCapture = document.getElementById("class-schedule-table"); // The table inside

    // Temporarily set a defined background for the card if it's transparent or complex
    // This helps html2canvas render it correctly.
    const originalCardBg = scheduleOutputCard.style.backgroundColor;
    const computedCardBg = getComputedStyle(scheduleOutputCard).backgroundColor;
    if (
      computedCardBg === "rgba(0, 0, 0, 0)" ||
      computedCardBg === "transparent"
    ) {
      scheduleOutputCard.style.backgroundColor = "var(--color-surface)"; // Use a CSS variable or solid color
    }

    // If the table itself has a different background due to theme, html2canvas should pick it up.
    // No need to modify table's direct style unless it's also transparent.

    // Get scroll dimensions of the table *within* its responsive container
    const responsiveContainer =
      scheduleOutputCard.querySelector(".table-responsive");
    const tableScrollWidth = responsiveContainer.scrollWidth;
    const tableScrollHeight = responsiveContainer.scrollHeight;

    html2canvas(scheduleOutputCard, {
      // Capture the entire card
      scale: window.devicePixelRatio > 1 ? window.devicePixelRatio : 1.5, // Adjust scale as needed
      useCORS: true,
      logging: false,
      scrollX: -responsiveContainer.scrollLeft, // Capture from the scrolled position
      scrollY: -responsiveContainer.scrollTop,
      width: tableScrollWidth, // Tell html2canvas the full width of content
      height:
        tableScrollHeight +
        parseFloat(getComputedStyle(scheduleOutputCard).paddingTop) +
        parseFloat(getComputedStyle(scheduleOutputCard).paddingBottom) +
        (scheduleOutputCard.querySelector(".card-title")
          ? scheduleOutputCard.querySelector(".card-title").offsetHeight
          : 0), // Approximate height of card content
      windowWidth: tableScrollWidth, // Canvas rendering window
      windowHeight: tableScrollHeight, // Canvas rendering window
      onclone: (clonedDoc) => {
        // If there are issues with table rendering, ensure its container in clone is not restricting size
        const clonedCard = clonedDoc.getElementById("class-schedule-container");
        if (clonedCard) {
          clonedCard.style.width = `${tableScrollWidth}px`;
          clonedCard.style.height = "auto"; // let content define height
          const clonedResponsive =
            clonedCard.querySelector(".table-responsive");
          if (clonedResponsive) {
            clonedResponsive.style.overflow = "visible";
            clonedResponsive.style.width = `${tableScrollWidth}px`;
            clonedResponsive.style.height = `${tableScrollHeight}px`;
          }
          const clonedTable = clonedCard.querySelector("#class-schedule-table");
          if (clonedTable) {
            clonedTable.style.width = "100%"; // Ensure table uses the expanded width
            clonedTable.style.minWidth = "0"; // Remove min-width if any
          }
        }
      },
    })
      .then((canvas) => {
        scheduleOutputCard.style.backgroundColor = originalCardBg; // Restore original card background

        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `my-schedule-${templateSelect.value.replace(
          "theme-",
          ""
        )}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        scheduleOutputCard.style.backgroundColor = originalCardBg; // Restore on error
        console.error("Error saving image:", err);
        alert(
          "Sorry, there was an error saving the image. Curse the developer."
        );
      });
  });
  // --- End Save Image Button ---

  document.addEventListener("click", (e) => {
    if (
      activeAutocompleteInput &&
      !activeAutocompleteInput.contains(e.target) &&
      !autocompleteSuggestionsContainer.contains(e.target)
    ) {
      hideAutocompleteSuggestions();
    }
  });
  function applyTheme(themeClass) {
    /* ... (same) ... */
    const themePrefix = "theme-";
    classScheduleTable.classList.forEach((className) => {
      if (className.startsWith(themePrefix))
        classScheduleTable.classList.remove(className);
    });
    if (themeClass) classScheduleTable.classList.add(themeClass);
  }
  document.getElementById("current-year").textContent =
    new Date().getFullYear();

  // --- Initialization ---
  loadGlobalCourseList();
  loadColorMapFromLocalStorage();
  const initialSchedule = loadScheduleFromLocalStorage();
  createInputForm(initialSchedule);
  if (initialSchedule.length > 0) {
    renderScheduleTable(initialSchedule);
  }
  applyTheme(templateSelect.value);
});
