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
  const courseInputGridWrapper = document.getElementById(
    "course-input-grid-wrapper"
  );
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
  let isSelectingAutocomplete = false; // Flag for autocomplete selection

  // --- Helper Functions ---
  function formatTimePart(timeStr) {
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

  // --- Global Course List Management ---
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
    const name = globalCourseNameInput.value.trim();
    const color = globalCourseColorInput.value;
    if (!name) {
      alert("Please enter a course name.");
      return;
    }
    const nameKey = getCourseNameKey(name);
    if (globalCourseList.some((c) => getCourseNameKey(c.name) === nameKey)) {
      alert("This course name already exists.");
      return;
    }
    globalCourseList.push({ id: generateUUID(), name: name, color: color });
    saveGlobalCourseList();
    renderGlobalCourseList();
    globalCourseNameInput.value = "";
  }
  function removeGlobalCourse(courseId) {
    if (confirm("Remove this course from the global list?")) {
      globalCourseList = globalCourseList.filter(
        (course) => course.id !== courseId
      );
      saveGlobalCourseList();
      renderGlobalCourseList();
    }
  }

  // --- Local Storage for Active Schedule Color Map ---
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

function updateAutocompleteSuggestions(textInput) {
  if (document.activeElement !== textInput) {
    return;
  }
  const query = textInput.value.trim().toUpperCase();
  let suggestions;

  if (query === "" && document.activeElement === textInput) {
    suggestions = [...globalCourseList];
  } else if (query.length > 0) {
    suggestions = globalCourseList.filter((course) =>
      course.name.toUpperCase().includes(query)
    );
  } else {
    hideAutocompleteSuggestions();
    return;
  }

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
      isSelectingAutocomplete = true;
      selectAutocompleteSuggestion(course);
    });
    item.addEventListener("mouseup", () => {
      isSelectingAutocomplete = false;
    });
    autocompleteSuggestionsContainer.appendChild(item);
  });

  const inputRect = textInput.getBoundingClientRect();
  const gridWrapperRect = courseInputGridWrapper.getBoundingClientRect();
  autocompleteSuggestionsContainer.style.display = "block";
  autocompleteSuggestionsContainer.style.top = `${
    inputRect.bottom - gridWrapperRect.top + 2
  }px`;
  autocompleteSuggestionsContainer.style.left = `${
    inputRect.left - gridWrapperRect.left
  }px`;
  autocompleteSuggestionsContainer.style.width = `${inputRect.width}px`;
}

  function hideAutocompleteSuggestions() {
    if (autocompleteSuggestionsContainer) {
      autocompleteSuggestionsContainer.style.display = "none";
    }
    // Do not nullify activeAutocompleteInput here as blur might still need it briefly
  }

  function selectAutocompleteSuggestion(course) {
    if (activeAutocompleteInput) {
      activeAutocompleteInput.value = course.name;
      // Programmatically trigger events to ensure all associated logic runs
      activeAutocompleteInput.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true })
      );
      // handleCourseNameChange will be called by blur, which should be triggered by focus change
      activeAutocompleteInput.focus(); // This will also trigger blur on the previous state if any
      // And focus on this element again, which is fine.
      // The main goal is to ensure handleCourseNameChange is called.
      // Directly call handleCourseNameChange for immediate color update in map
      handleCourseNameChange(activeAutocompleteInput);
      saveScheduleToLocalStorage(collectScheduleData()); // Save after potential changes
    }
    // Intentionally not hiding here - let the blur/focus flow manage it
  }

  // --- Input Form Creation & Event Handling ---
  function createInputForm(savedSchedule = []) {
    courseInputGrid.innerHTML = "";
    defaultColorCycleIndex = 0;
    courseInputGrid.style.gridTemplateColumns = `auto repeat(${timeSlots.length}, 1fr)`;

    const headerFragment = document.createDocumentFragment();
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
        cellContentWrapper.className = "grid-cell-content";
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
        }

        textInput.addEventListener("input", () => {
          clearTimeout(autocompleteDebounceTimer);
          autocompleteDebounceTimer = setTimeout(() => {
            updateAutocompleteSuggestions(textInput);
          }, 200);
        });
        textInput.addEventListener("focus", () => {
          activeAutocompleteInput = textInput; // Set active on focus
          updateAutocompleteSuggestions(textInput);
        });
       textInput.addEventListener("blur", (e) => {
  // Only hide suggestions if not selecting and not focusing another input
  setTimeout(() => {
    if (
      !isSelectingAutocomplete &&
      !autocompleteSuggestionsContainer.contains(document.activeElement) &&
      // Check if the relatedTarget is another input (i.e., switching fields)
      !(e.relatedTarget && e.relatedTarget.type === "text")
    ) {
      hideAutocompleteSuggestions();
      activeAutocompleteInput = null; // Clear active input after hiding
    }
  }, 300);
  handleCourseNameChange(e.target);
  saveScheduleToLocalStorage(collectScheduleData());
});
        textInput.addEventListener("keydown", (e) => {
          const items = autocompleteSuggestionsContainer.querySelectorAll(
            ".autocomplete-suggestion-item"
          );
          if (
            autocompleteSuggestionsContainer.style.display === "none" ||
            !items.length
          )
            return;
          let activeItem = autocompleteSuggestionsContainer.querySelector(
            ".autocomplete-suggestion-item.active"
          );
          let currentIndex = activeItem
            ? Array.from(items).indexOf(activeItem)
            : -1;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (activeItem) activeItem.classList.remove("active");
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add("active");
            items[currentIndex].scrollIntoView({ block: "nearest" });
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (activeItem) activeItem.classList.remove("active");
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            items[currentIndex].classList.add("active");
            items[currentIndex].scrollIntoView({ block: "nearest" });
          } else if (e.key === "Enter") {
            if (activeItem) {
              e.preventDefault();
              // Find the course object that matches the activeItem's text content
              const selectedCourseName = activeItem.textContent.trim(); // Or extract from a data attribute if you store full object there
              const courseObject = globalCourseList.find(
                (gc) => gc.name === selectedCourseName
              );
              if (courseObject) {
                selectAutocompleteSuggestion(courseObject);
              }
              hideAutocompleteSuggestions(); // Hide after selection by Enter
            }
          } else if (e.key === "Escape") {
            hideAutocompleteSuggestions();
          }
        });
        cellContentWrapper.appendChild(textInput);
        inputCell.appendChild(cellContentWrapper);
        rowFragment.appendChild(inputCell);
      });
      courseInputGrid.appendChild(rowFragment);
    });
    syncAllInitialGridColors();
  }

  function handleCourseNameChange(textInputElement) {
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
        colorToSet =
          defaultCourseColors[
            defaultColorCycleIndex % defaultCourseColors.length
          ];
        defaultColorCycleIndex++;
      }
      courseColorMap[courseKey] = colorToSet;
      saveColorMapToLocalStorage();
    }
  }

  function syncAllInitialGridColors() {
    const allTextInputs =
      courseInputGrid.querySelectorAll('input[type="text"]');
    allTextInputs.forEach((textInput) => {
      if (textInput.value.trim() !== "") {
        handleCourseNameChange(textInput);
      }
    });
  }

  // --- Data Collection & Rendering ---
  function collectScheduleData() {
    const entries = [];
    const textInputs = courseInputGrid.querySelectorAll('input[type="text"]');
    textInputs.forEach((textInput) => {
      const courseName = textInput.value.trim();
      if (courseName !== "") {
        const courseKey = getCourseNameKey(courseName);
        if (!courseColorMap[courseKey]) {
          const globalCourse = globalCourseList.find(
            (gc) => getCourseNameKey(gc.name) === courseKey
          );
          courseColorMap[courseKey] = globalCourse
            ? globalCourse.color
            : defaultCourseColors[
                defaultColorCycleIndex++ % defaultCourseColors.length
              ];
          saveColorMapToLocalStorage(); // Save if a new color was assigned here
        }
        entries.push({
          dayAbbr: textInput.dataset.day,
          timeSlotDisplay: textInput.dataset.timeSlotDisplay,
          courseName: courseName,
          courseColor: courseColorMap[courseKey],
        });
      }
    });
    return entries;
  }
function renderScheduleTable(dataForTable) {
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
    row.style.height = "40px"; // Fixed row height
    row.style.maxHeight = "40px"; // Ensure no expansion
    row.style.lineHeight = "1.2"; // Control text vertical alignment
    row.style.overflow = "hidden"; // Prevent row overflow
    const dayCell = row.insertCell();
    dayCell.className = "day-col";
    dayCell.textContent = day.name;
    dayCell.style.verticalAlign = "middle";
    dayCell.style.overflow = "hidden";
    dayCell.style.textOverflow = "ellipsis";
    dayCell.style.whiteSpace = "nowrap";
    dayCell.style.maxHeight = "40px";
    timeSlots.forEach((slot) => {
      const cell = row.insertCell();
      cell.style.verticalAlign = "middle";
      cell.style.overflow = "hidden";
      cell.style.maxHeight = "40px";
      cell.style.lineHeight = "1.2";
      cell.style.textOverflow = "ellipsis";
      cell.style.whiteSpace = "nowrap";
      const entry = dataForTable.find(
        (e) => e.dayAbbr === day.abbr && e.timeSlotDisplay === slot.display
      );
      if (entry) {
        const entryWrapper = document.createElement("div");
        entryWrapper.className = "course-entry";
        entryWrapper.style.maxHeight = "36px"; // Slightly less to account for padding
        entryWrapper.style.overflow = "hidden";
        entryWrapper.style.textOverflow = "ellipsis";
        entryWrapper.style.whiteSpace = "nowrap";
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
        cell.innerHTML = " "; // Non-breaking space for consistent height
      }
    });
  });
  if (rowsAdded === 0 && dataForTable.length === 0) {
    const row = classScheduleTableBody.insertRow();
    row.style.height = "40px";
    row.style.maxHeight = "40px";
    const cell = row.insertCell();
    cell.colSpan = timeSlots.length + 1;
    cell.textContent =
      'No classes entered. Fill the form above and click "Generate Schedule".';
    cell.style.textAlign = "center";
    cell.style.padding = "20px";
    cell.style.verticalAlign = "middle";
    cell.style.overflow = "hidden";
    cell.style.maxHeight = "40px";
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
    courseColorMap = {};
    defaultColorCycleIndex = 0;
    if (
      confirm(
        "Clear current schedule entries and associated colors? \n(Global course list remains)."
      )
    ) {
      localStorage.removeItem(LOCAL_STORAGE_SCHEDULE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COLOR_MAP_KEY);
    }
    renderScheduleTable([]);
    outputSection.style.display = "none";
  }

  // --- Event Listeners ---
  addGlobalCourseButton.addEventListener("click", addGlobalCourse);
  generateButton.addEventListener("click", () => {
    const scheduleData = collectScheduleData();
    renderScheduleTable(scheduleData);
    saveScheduleToLocalStorage(scheduleData);
    saveColorMapToLocalStorage();
    applyTheme(templateSelect.value);
  });
  clearAllButton.addEventListener("click", clearAllInputs);
  templateSelect.addEventListener("change", (event) =>
    applyTheme(event.target.value)
  );

  // --- SAVE IMAGE BUTTON (Offscreen Clone Strategy - Simplified & Focused) ---
  saveImageButton.addEventListener("click", () => {
    const scheduleOutputCard = document.getElementById("class-schedule-container"); // This has .schedule-table-wrapper
    const responsiveContainer = scheduleOutputCard.querySelector(".table-responsive");
    const table = document.getElementById("class-schedule-table");

    // --- Store original styles ---
    const originalStyles = [];
    function storeStyle(element, property) {
        // Only store if the element exists
        if (element) {
            originalStyles.push({ element, property, value: element.style[property] });
        }
    }

    // Schedule Output Card (which is also .schedule-table-wrapper)
    storeStyle(scheduleOutputCard, 'maxHeight');
    storeStyle(scheduleOutputCard, 'overflowY');
    storeStyle(scheduleOutputCard, 'overflowX');

    // Responsive Container
    storeStyle(responsiveContainer, 'maxHeight');
    storeStyle(responsiveContainer, 'overflowX');
    storeStyle(responsiveContainer, 'overflowY');

    // Table
    storeStyle(table, 'tableLayout');
    storeStyle(table, 'width');

    // Table cells, course entries, course names
    const elementsToUnrestrict = table.querySelectorAll("th, td, .course-entry, .course-name");
    elementsToUnrestrict.forEach(el => {
        storeStyle(el, 'height');
        storeStyle(el, 'maxHeight');
        storeStyle(el, 'overflow');
        storeStyle(el, 'whiteSpace');
        storeStyle(el, 'textOverflow');
    });
    
    const originalCardComputedBg = getComputedStyle(scheduleOutputCard).backgroundColor;
    const originalCardInlineBg = scheduleOutputCard.style.backgroundColor;


    // --- Apply temporary styles for capture ---
    // Ensure a background for the card if transparent
    if (originalCardComputedBg === "rgba(0, 0, 0, 0)" || originalCardComputedBg === "transparent") {
        scheduleOutputCard.style.backgroundColor = "var(--color-surface)"; // Or a specific white like #FFFFFF
    }

    scheduleOutputCard.style.maxHeight = "none";
    scheduleOutputCard.style.overflowY = "visible";
    scheduleOutputCard.style.overflowX = "visible"; 

    if (responsiveContainer) {
        responsiveContainer.style.maxHeight = "none";
        responsiveContainer.style.overflowX = "visible";
        responsiveContainer.style.overflowY = "visible";
    }

    if (table) {
        table.style.tableLayout = "auto";
        table.style.width = "auto"; // Let content determine width, or "max-content"
    }
    
    elementsToUnrestrict.forEach(el => {
        el.style.height = "auto";
        el.style.maxHeight = "none";
        el.style.overflow = "visible";
        el.style.whiteSpace = "normal"; // Allow wrapping
        el.style.textOverflow = "clip";
    });

    // Delay for browser reflow
    setTimeout(() => {
        domtoimage.toPng(scheduleOutputCard, {
            width: scheduleOutputCard.scrollWidth,
            height: scheduleOutputCard.scrollHeight
            // No specific 'style' option needed here as we modified the live DOM
        })
        .then((dataUrl) => {
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `my-schedule-${templateSelect.value.replace("theme-", "")}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch((err) => {
            console.error("Error saving image:", err);
            alert("Sorry, there was an error saving the image. Please try again.");
        })
        .finally(() => {
            // Restore original styles
            originalStyles.forEach(s => {
                // Check if element still exists, though it should
                if (s.element) {
                    s.element.style[s.property] = s.value;
                }
            });
            // Restore the original inline background style for the card
            scheduleOutputCard.style.backgroundColor = originalCardInlineBg;
        });
    }, 250); // 250ms delay, adjust if needed for complex tables
  });
  // Global click listener for autocomplete
document.addEventListener("click", (e) => {
  if (
    activeAutocompleteInput &&
    !activeAutocompleteInput.contains(e.target) &&
    !autocompleteSuggestionsContainer.contains(e.target) &&
    !e.target.closest(".autocomplete-suggestion-item") &&
    // Avoid hiding if clicking another input field
    !(e.target.type === "text")
  ) {
    hideAutocompleteSuggestions();
    activeAutocompleteInput = null; // Clear active input
  }
});
  function applyTheme(themeClass) {
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
