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

    // Initial render
    renderPatients();
    
    // Default route logic: Start on CRM
    document.querySelector('[data-target="crm-view"]').click();
});
