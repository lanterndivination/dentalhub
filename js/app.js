// Application Logic

document.addEventListener("DOMContentLoaded", () => {
    const { patients, soapRecords, relations } = window.DentalData;
    
    // --- Navigation System ---
    const navLinks = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active classes
            navLinks.forEach(l => l.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            // Set active class
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Trigger view-specific logic
            if(targetId === 'graph-view') {
                initGraphView();
            }
        });
    });

    // --- Formatters ---
    const getStatusLabel = (status) => {
        switch(status) {
            case 'new': return '<span class="status-badge status-new">新患</span>';
            case 'recall': return '<span class="status-badge status-recall">定期検診</span>';
            case 'drop': return '<span class="status-badge status-drop">中断</span>';
            default: return '';
        }
    };

    // --- CRM View Logic ---
    const patientList = document.getElementById('patient-list');
    const searchInput = document.getElementById('patient-search');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    let currentFilter = 'all';
    let currentSearch = '';

    const renderPatients = () => {
        patientList.innerHTML = '';
        
        let filtered = patients.filter(p => {
            const matchesFilter = currentFilter === 'all' || p.status === currentFilter;
            const searchTerm = currentSearch.toLowerCase();
            const matchesSearch = p.name.includes(searchTerm) || p.kana.includes(searchTerm) || p.phone.includes(searchTerm);
            return matchesFilter && matchesSearch;
        });

        filtered.forEach(p => {
            const tagsHtml = p.tags.map(t => `<span class="tag">${t}</span>`).join('');
            
            const card = document.createElement('div');
            card.className = 'patient-card';
            card.innerHTML = `
                <div class="patient-header">
                    <div class="patient-name-wrapper">
                        <h3>${p.name}</h3>
                        <span>${p.kana}</span>
                    </div>
                    ${getStatusLabel(p.status)}
                </div>
                <div class="patient-details">
                    <p><i class="ri-phone-line"></i> ${p.phone}</p>
                    <p><i class="ri-calendar-event-line"></i> 最終来院: ${p.lastVisit}</p>
                </div>
                <div class="patient-tags">
                    ${tagsHtml}
                </div>
            `;
            
            card.addEventListener('click', () => {
                // Navigate to SOAP view with this patient selected
                const soapLink = document.querySelector('[data-target="soap-view"]');
                soapLink.click();
                document.getElementById('soap-patient-select').value = p.id;
                renderSoapHistory(p.id);
            });

            patientList.appendChild(card);
        });
    };

    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderPatients();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.getAttribute('data-filter');
            renderPatients();
        });
    });

    // --- SOAP View Logic ---
    const soapSelect = document.getElementById('soap-patient-select');
    const soapTimeline = document.getElementById('soap-timeline');

    // Populate Select
    patients.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.id} - ${p.name}`;
        soapSelect.appendChild(option);
    });

    const renderSoapHistory = (patientId) => {
        soapTimeline.innerHTML = '';
        if(!patientId) return;

        const records = soapRecords.filter(s => s.patientId === patientId).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        if (records.length === 0) {
            soapTimeline.innerHTML = '<p class="text-muted">過去のカルテはありません。</p>';
            return;
        }

        records.forEach(r => {
            const recDiv = document.createElement('div');
            recDiv.className = 'soap-record';
            recDiv.innerHTML = `
                <div class="record-date">${r.date} - 部位: ${r.teeth}</div>
                <div class="soap-grid">
                    <div class="soap-label">S</div><div class="soap-content">${r.s}</div>
                    <div class="soap-label">O</div><div class="soap-content">${r.o}</div>
                    <div class="soap-label">A</div><div class="soap-content">${r.a}</div>
                    <div class="soap-label">P</div><div class="soap-content">${r.p}</div>
                </div>
            `;
            soapTimeline.appendChild(recDiv);
        });
    };

    soapSelect.addEventListener('change', (e) => renderSoapHistory(e.target.value));

    // --- Graph View Logic ---
    const graphTimeFilter = document.getElementById('graph-time-filter');
    
    let graphInitialized = false;
    const initGraphView = () => {
        const filterVal = graphTimeFilter.value;
        window.DentalGraph.render(patients, relations, 'd3-graph', filterVal);
        graphInitialized = true;
    };

    graphTimeFilter.addEventListener('change', () => {
        if (graphInitialized) {
            initGraphView();
        }
    });

    // --- Dental Chart Logic ---
    const initDentalChart = () => {
        const chartContainer = document.getElementById('interactive-dental-chart');
        const teethInput = document.getElementById('soap-teeth');
        if (!chartContainer || !teethInput) return;

        const arches = [
            {
                type: 'upper',
                quadrants: [
                    [18, 17, 16, 15, 14, 13, 12, 11], // Top Right (Patient's right, screen left)
                    [21, 22, 23, 24, 25, 26, 27, 28]  // Top Left (Patient's left, screen right)
                ]
            },
            {
                type: 'lower',
                quadrants: [
                    [48, 47, 46, 45, 44, 43, 42, 41], // Bottom Right
                    [31, 32, 33, 34, 35, 36, 37, 38]  // Bottom Left
                ]
            }
        ];

        let selectedTeeth = new Set();

        const updateInput = () => {
            // Sort normally or by quadrant if needed, regular sort sorts 11, 12... which is fine for now
            const sortedTeeth = Array.from(selectedTeeth).sort();
            teethInput.value = sortedTeeth.join(', ');
        };

        const getToothType = (num) => {
            const digit = num % 10;
            if (digit === 1 || digit === 2) return 'incisor';
            if (digit === 3) return 'canine';
            if (digit === 4 || digit === 5) return 'premolar';
            return 'molar';
        };

        arches.forEach(arch => {
            const archDiv = document.createElement('div');
            archDiv.className = `dental-arch ${arch.type}`;

            arch.quadrants.forEach((quad, index) => {
                const quadDiv = document.createElement('div');
                quadDiv.className = 'dental-quadrant';

                quad.forEach(toothNum => {
                    const toothDiv = document.createElement('div');
                    toothDiv.className = `tooth ${arch.type}`;
                    toothDiv.textContent = toothNum;
                    toothDiv.setAttribute('data-tooth-type', getToothType(toothNum));
                    
                    toothDiv.addEventListener('click', () => {
                        if (selectedTeeth.has(toothNum)) {
                            selectedTeeth.delete(toothNum);
                            toothDiv.classList.remove('selected');
                        } else {
                            selectedTeeth.add(toothNum);
                            toothDiv.classList.add('selected');
                        }
                        updateInput();
                    });

                    quadDiv.appendChild(toothDiv);
                });

                archDiv.appendChild(quadDiv);
            });

            chartContainer.appendChild(archDiv);
        });
    };

    initDentalChart();

    // Initial render
    renderPatients();
    
    // Default route logic: Start on CRM
    document.querySelector('[data-target="crm-view"]').click();
});
