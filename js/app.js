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

    // --- Interactive Dental Chart (State Tagging) ---
    let toothStates = new Map();

    // HTMLのクリアボタンから呼び出せるようにグローバルに登録
    window.clearDentalChart = () => {
        toothStates.clear();
        document.querySelectorAll('.tooth').forEach(el => {
            // 付与されている状態クラスをリセット
            el.className = `tooth ${el.classList.contains('upper') ? 'upper' : 'lower'}`;
        });
        updateToothInput();
    };

    const updateToothInput = () => {
        const teethInput = document.getElementById('soap-teeth');
        if (!teethInput) return;

        const stateLabels = {
            'selected': '選択',
            'decay': '虫歯',
            'treated': '治療済',
            'missing': '欠損'
        };

        const groups = {};
        toothStates.forEach((state, num) => {
            if(!groups[state]) groups[state] = [];
            groups[state].push(num);
        });

        const summaryParts = [];
        for (const [state, nums] of Object.entries(groups)) {
            nums.sort((a,b) => a - b);
            summaryParts.push(`${stateLabels[state]}: ${nums.join(', ')}`);
        }
        
        teethInput.value = summaryParts.join(' / ');
    };

    const initDentalChart = () => {
        const chartContainer = document.getElementById('interactive-dental-chart');
        if (!chartContainer) return;

        const arches = [
            {
                type: 'upper',
                quadrants: [
                    [18, 17, 16, 15, 14, 13, 12, 11],
                    [21, 22, 23, 24, 25, 26, 27, 28]
                ]
            },
            {
                type: 'lower',
                quadrants: [
                    [48, 47, 46, 45, 44, 43, 42, 41],
                    [31, 32, 33, 34, 35, 36, 37, 38]
                ]
            }
        ];

        const toothPaths = {
            upper: {
                incisor: 'M 4,25 Q 4,38 12,38 Q 20,38 20,25 Q 20,15 16,5 Q 14,2 12,2 Q 10,2 8,5 Q 4,15 4,25 Z',
                canine: 'M 5,22 Q 5,32 12,38 Q 19,32 19,22 Q 19,12 16,4 Q 14,1 12,1 Q 10,1 8,4 Q 5,12 5,22 Z',
                premolar: 'M 4,20 Q 4,35 12,35 Q 20,35 20,20 Q 20,12 17,4 Q 15,2 12,4 Q 9,2 7,4 Q 4,12 4,20 Z',
                molar: 'M 2,18 Q 2,34 12,34 Q 22,34 22,18 C 22,12 20,4 17,4 Q 15,4 15,10 Q 12,4 12,4 Q 12,4 9,10 Q 9,4 7,4 C 4,4 2,12 2,18 Z'
            },
            lower: {
                incisor: 'M 4,15 Q 4,2 12,2 Q 20,2 20,15 Q 20,25 16,35 Q 14,38 12,38 Q 10,38 8,35 Q 4,25 4,15 Z',
                canine: 'M 5,18 Q 5,8 12,2 Q 19,8 19,18 Q 19,28 16,36 Q 14,39 12,39 Q 10,39 8,36 Q 5,28 5,18 Z',
                premolar: 'M 4,20 Q 4,5 12,5 Q 20,5 20,20 Q 20,28 17,36 Q 15,38 12,36 Q 9,38 7,36 Q 4,28 4,20 Z',
                molar: 'M 2,22 Q 2,6 12,6 Q 22,6 22,22 C 22,28 20,36 17,36 Q 15,36 15,30 Q 12,36 12,36 Q 12,36 9,30 Q 9,36 7,36 C 4,36 2,28 2,22 Z'
            }
        };

        const getToothType = (num) => {
            const digit = num % 10;
            if (digit === 1 || digit === 2) return 'incisor';
            if (digit === 3) return 'canine';
            if (digit === 4 || digit === 5) return 'premolar';
            return 'molar';
        };

        const getSelectedTool = () => {
            const checkedRadio = document.querySelector('input[name="dental-tool"]:checked');
            return checkedRadio ? checkedRadio.value : 'selected';
        };

        arches.forEach(arch => {
            const archDiv = document.createElement('div');
            archDiv.className = `dental-arch ${arch.type}`;

            arch.quadrants.forEach((quad) => {
                const quadDiv = document.createElement('div');
                quadDiv.className = 'dental-quadrant';

                quad.forEach(toothNum => {
                    const type = getToothType(toothNum);
                    const pathData = toothPaths[arch.type][type];
                    
                    const toothDiv = document.createElement('div');
                    toothDiv.className = `tooth ${arch.type}`;
                    toothDiv.setAttribute('data-tooth-type', type);
                    
                    toothDiv.innerHTML = `
                        <svg viewBox="0 0 24 40" class="tooth-svg" preserveAspectRatio="none">
                            <path d="${pathData}" class="tooth-path"></path>
                        </svg>
                        <span class="tooth-num">${toothNum}</span>
                    `;
                    
                    toothDiv.addEventListener('click', () => {
                        const currentTool = getSelectedTool();
                        
                        if (toothStates.get(toothNum) === currentTool) {
                            toothStates.delete(toothNum);
                            toothDiv.className = `tooth ${arch.type}`;
                        } else {
                            toothStates.set(toothNum, currentTool);
                            toothDiv.className = `tooth ${arch.type} state-${currentTool}`;
                        }
                        updateToothInput();
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
    
    // --- New Patient Registration Logic ---
    const crmNewPatientBtn = document.querySelector('#crm-view .header-bar .btn-primary');
    const modal = document.getElementById('new-patient-modal');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const newPatientForm = document.getElementById('new-patient-form');

    const openModal = () => {
        if(modal) modal.classList.add('active');
    };

    const closeModal = () => {
        if(modal) {
            modal.classList.remove('active');
            if(newPatientForm) newPatientForm.reset();
        }
    };

    if (crmNewPatientBtn) crmNewPatientBtn.addEventListener('click', openModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);

    if (newPatientForm) {
        newPatientForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newId = `P${String(patients.length + 1).padStart(3, '0')}`;
            const newPatient = {
                id: newId,
                name: document.getElementById('np-name').value,
                kana: document.getElementById('np-kana').value,
                phone: document.getElementById('np-phone').value,
                status: document.getElementById('np-status').value,
                dob: "2000-01-01", // Default mock value
                lastVisit: "今日",
                tags: ["新患登録"],
                introducedBy: null
            };

            patients.push(newPatient); // Add to data array
            
            // Also append to the SOAP patient selector
            const soapSelectEl = document.getElementById('soap-patient-select');
            if(soapSelectEl) {
                const option = document.createElement('option');
                option.value = newPatient.id;
                option.textContent = `${newPatient.id} - ${newPatient.name}`;
                soapSelectEl.appendChild(option);
            }

            closeModal();
            renderPatients(); // Re-render the grid
            
            // Re-render graph if necessary
            if (graphInitialized) initGraphView();
        });
    }

    // --- SOAP Form Submission Logic ---
    const soapForm = document.getElementById('soap-form');
    if (soapForm) {
        soapForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const selectedPatientId = soapSelect.value;
            if (!selectedPatientId) {
                alert('患者が選択されていません。上部のセレクトボックスから患者を選んでください。');
                return;
            }

            const teethVal = document.getElementById('soap-teeth').value;
            const sVal = document.getElementById('soap-s').value;
            const oVal = document.getElementById('soap-o').value;
            const aVal = document.getElementById('soap-a').value;
            const pVal = document.getElementById('soap-p').value;
            
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            const newRecordId = `S${String(soapRecords.length + 1001).padStart(4, '0')}`;
            
            const newRecord = {
                id: newRecordId,
                patientId: selectedPatientId,
                date: dateStr,
                teeth: teethVal || "-",
                s: sVal || "-",
                o: oVal || "-",
                a: aVal || "-",
                p: pVal || "-"
            };
            
            // save to array
            soapRecords.push(newRecord);
            
            // form reset
            soapForm.reset();
            if (window.clearDentalChart) window.clearDentalChart();
            
            // re-render the timeline
            renderSoapHistory(selectedPatientId);
        });
    }

    // Default route logic: Start on CRM
    document.querySelector('[data-target="crm-view"]').click();
});
