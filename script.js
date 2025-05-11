document.addEventListener('DOMContentLoaded', () => {


    const rawTimeSlotData = [ // Keep this updated as per previous step
        "8-930",
        "940-1110",
        "1120-1250",
        "1-230",
        "240-410",
        "420-550"
    ];

    const days = [ // Keep this updated
        { abbr: 'S', name: 'Sunday' },
        { abbr: 'M', name: 'Monday' },
        { abbr: 'T', name: 'Tuesday' },
        { abbr: 'W', name: 'Wednesday' },
        { abbr: 'R', name: 'Thursday' },
        { abbr: 'A', name: 'Saturday' }
    ];

    const courseInputGrid = document.getElementById('course-input-grid');
    const generateButton = document.getElementById('generate-button');
    const outputSection = document.getElementById('output-section');
    const classScheduleTable = document.getElementById('class-schedule-table');
    const classScheduleTableBody = classScheduleTable.querySelector('tbody') || classScheduleTable.createTBody();
    
    const templateSelect = document.getElementById('template-select');
    const saveImageButton = document.getElementById('save-image-button');


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
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }


    const timeSlots = rawTimeSlotData.map((slotStr, index) => {
        const cleanSlotStr = slotStr.trim();
        const [startStr, endStr] = cleanSlotStr.split('-');
        const display = `${formatTimePart(startStr)} - ${formatTimePart(endStr)}`;
        
        return {
            id: `slot-${index}`,
            raw: cleanSlotStr,
            display: display,
        };
    });

    function createInputForm() {
        courseInputGrid.style.gridTemplateColumns = `auto repeat(${timeSlots.length}, 1fr)`;

        const headerFragment = document.createDocumentFragment();
        const emptyHeaderCell = document.createElement('div');
        emptyHeaderCell.className = 'grid-cell'; // Top-left cell does not need day-label or time-header class
        headerFragment.appendChild(emptyHeaderCell);

        timeSlots.forEach(slot => {
            const timeHeader = document.createElement('div');
            timeHeader.className = 'grid-cell time-header';
            timeHeader.innerHTML = slot.display;
            headerFragment.appendChild(timeHeader);
        });
        courseInputGrid.appendChild(headerFragment);

        days.forEach(day => {
            const rowFragment = document.createDocumentFragment();
            const dayLabel = document.createElement('div');
            dayLabel.className = 'grid-cell day-label';
            dayLabel.textContent = day.name;
            rowFragment.appendChild(dayLabel);

            timeSlots.forEach(slot => {
                const inputCell = document.createElement('div');
                inputCell.className = 'grid-cell'; // Generic grid cell
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = `Course`;
                input.dataset.day = day.abbr;
                input.dataset.timeSlotDisplay = slot.display;
                inputCell.appendChild(input);
                rowFragment.appendChild(inputCell);
            });
            courseInputGrid.appendChild(rowFragment);
        });
    }

    function collectScheduleData() {
        const entries = [];
        const inputs = courseInputGrid.querySelectorAll('input[type="text"]');
        inputs.forEach(input => {
            if (input.value.trim() !== '') {
                entries.push({
                    dayAbbr: input.dataset.day,
                    timeSlotDisplay: input.dataset.timeSlotDisplay,
                    courseName: input.value.trim(),
                });
            }
        });
        return entries;
    }

    function renderScheduleTable(dataForTable) {
        classScheduleTableBody.innerHTML = '';
        
        let thead = classScheduleTable.querySelector('thead');
        if (!thead) {
            thead = classScheduleTable.createTHead();
            const headerRow = thead.insertRow();
            const thDay = document.createElement('th');
            thDay.textContent = 'Day';
            headerRow.appendChild(thDay);
            timeSlots.forEach(slot => {
                const thTime = document.createElement('th');
                thTime.innerHTML = slot.display;
                headerRow.appendChild(thTime);
            });
        }

        let rowsAdded = 0;
        days.forEach(day => {
            const row = classScheduleTableBody.insertRow();
            rowsAdded++;
            const dayCell = row.insertCell();
            dayCell.className = 'day-col';
            dayCell.textContent = day.name;

            timeSlots.forEach(slot => {
                const cell = row.insertCell();
                const entry = dataForTable.find(e => 
                    e.dayAbbr === day.abbr && 
                    e.timeSlotDisplay === slot.display
                );
                cell.textContent = entry ? entry.courseName : '';
            });
        });

        if (rowsAdded === 0 && dataForTable.length === 0) { // Ensure this condition accurately reflects no data
            const row = classScheduleTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = timeSlots.length + 1;
            cell.textContent = 'No classes entered. Fill the form above and click "Generate Schedule".';
            cell.style.textAlign = 'center';
            cell.style.padding = '20px'; // Make "no data" message more prominent
            outputSection.style.display = 'block'; // Show output section even for "no data" message
        } else if (rowsAdded > 0) {
            outputSection.style.display = 'block';
        } else {
            outputSection.style.display = 'none';
        }
    }

    generateButton.addEventListener('click', () => {
        const scheduleData = collectScheduleData();
        renderScheduleTable(scheduleData);
        applyTheme(templateSelect.value); 
    });

    function applyTheme(themeClass) {
        // Clear only theme classes, not all classes, to preserve base 'schedule-table'
        const themePrefix = "theme-";
        classScheduleTable.classList.forEach(className => {
            if (className.startsWith(themePrefix)) {
                classScheduleTable.classList.remove(className);
            }
        });
        if (themeClass) { // Add the new theme class
            classScheduleTable.classList.add(themeClass);
        }
    }

    templateSelect.addEventListener('change', (event) => {
        applyTheme(event.target.value);
    });

saveImageButton.addEventListener('click', () => {
    const tableContainer = document.getElementById('class-schedule-container');
    const tableResponsiveDiv = tableContainer.querySelector('.table-responsive'); // The div that actually scrolls
    const scheduleTable = document.getElementById('class-schedule-table');

    // --- PREPARE FOR CAPTURE ---
    // Store original styles
    const originalTableContainerStyles = {
        width: tableContainer.style.width,
        height: tableContainer.style.height,
        overflow: tableContainer.style.overflow
    };
    const originalResponsiveDivStyles = {
        width: tableResponsiveDiv.style.width,
        height: tableResponsiveDiv.style.height,
        overflowX: tableResponsiveDiv.style.overflowX,
        maxWidth: tableResponsiveDiv.style.maxWidth
    };
     const originalBodyOverflow = document.body.style.overflow;

    // Temporarily make the body and container allow full content expansion
    document.body.style.overflow = 'hidden'; // Prevent body scrollbars during measurement

    // Expand the .table-responsive div to its scroll width/height
    // This is crucial for html2canvas to "see" the full content
    tableResponsiveDiv.style.width = `${scheduleTable.scrollWidth}px`;
    tableResponsiveDiv.style.height = `${scheduleTable.scrollHeight}px`;
    tableResponsiveDiv.style.overflowX = 'visible'; // Remove internal scroll
    tableResponsiveDiv.style.maxWidth = 'none'; // Remove any max-width constraint

    // Ensure the card container also expands if needed
    tableContainer.style.width = 'auto'; // Or a large enough fixed width
    tableContainer.style.height = 'auto';
    tableContainer.style.overflow = 'visible';


    // Optional: scroll to top-left of the element to capture
    // This can sometimes help html2canvas.
    tableContainer.scrollIntoView(true); // or tableResponsiveDiv.scrollLeft = 0; tableResponsiveDiv.scrollTop = 0;

    // Give the browser a moment to re-render with new styles
    setTimeout(() => {
        html2canvas(scheduleTable, { // Capture the TABLE itself directly
            scale: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2, // Use device pixel ratio or fallback
            useCORS: true,
            logging: false,
            scrollX: -window.scrollX, // Account for page scroll
            scrollY: -window.scrollY,
            windowWidth: document.documentElement.offsetWidth, // Provide full window width
            windowHeight: document.documentElement.offsetHeight, // Provide full window height
            // It's often better to capture the table directly if its container handles scrolling
        }).then(canvas => {
            // --- RESTORE ORIGINAL STYLES ---
            tableResponsiveDiv.style.width = originalResponsiveDivStyles.width;
            tableResponsiveDiv.style.height = originalResponsiveDivStyles.height;
            tableResponsiveDiv.style.overflowX = originalResponsiveDivStyles.overflowX;
            tableResponsiveDiv.style.maxWidth = originalResponsiveDivStyles.maxWidth;

            tableContainer.style.width = originalTableContainerStyles.width;
            tableContainer.style.height = originalTableContainerStyles.height;
            tableContainer.style.overflow = originalTableContainerStyles.overflow;
            
            document.body.style.overflow = originalBodyOverflow;


            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `my-schedule-${templateSelect.value.replace('theme-','')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(err => {
            // --- RESTORE ORIGINAL STYLES ON ERROR ---
            tableResponsiveDiv.style.width = originalResponsiveDivStyles.width;
            tableResponsiveDiv.style.height = originalResponsiveDivStyles.height;
            tableResponsiveDiv.style.overflowX = originalResponsiveDivStyles.overflowX;
            tableResponsiveDiv.style.maxWidth = originalResponsiveDivStyles.maxWidth;

            tableContainer.style.width = originalTableContainerStyles.width;
            tableContainer.style.height = originalTableContainerStyles.height;
            tableContainer.style.overflow = originalTableContainerStyles.overflow;
            
            document.body.style.overflow = originalBodyOverflow;

            console.error("Error saving image:", err);
            alert("Sorry, there was an error saving the image.");
        });
    }, 100); // Small delay for repaint
});

    // Set current year in footer
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Initialize
    createInputForm();
    applyTheme(templateSelect.value); // Apply default theme on load
});