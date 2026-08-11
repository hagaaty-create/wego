/**
 * WEGO Barber Shop System - Master Logic Engine with Firebase Sync & Quota Savers
 */

const INITIAL_DEMO_DATA = {
    staff: [
        { id: 'stf-1', name: 'الأسطى محمود', role: 'craftsman', rate: 50, phone: '01012345678', settledToday: false },
        { id: 'stf-2', name: 'الأسطى سيد', role: 'craftsman', rate: 50, phone: '01122334455', settledToday: false },
        { id: 'stf-3', name: 'الأسطى طارق', role: 'craftsman', rate: 50, phone: '01299887766', settledToday: false },
        { id: 'stf-4', name: 'كريم المساعد', role: 'assistant', rate: 5, phone: '01511223344', settledToday: false },
        { id: 'stf-5', name: 'سامح الكاشير', role: 'cashier', rate: 5, phone: '01000112233', settledToday: false }
    ],
    services: [
        {
            id: 'srv-101',
            time: '12:30 م',
            customer: 'زبون كريم',
            serviceName: 'حلاقة شعر وذقن',
            amount: 150,
            craftsmanId: 'stf-1',
            assistantId: 'stf-4',
            cashierId: 'stf-5',
            craftsmanShare: 75,
            assistantShare: 7.5,
            cashierShare: 7.5,
            shopShare: 60
        },
        {
            id: 'srv-102',
            time: '01:15 م',
            customer: 'عمرو',
            serviceName: 'حلاقة شعر',
            amount: 100,
            craftsmanId: 'stf-2',
            assistantId: '',
            cashierId: 'stf-5',
            craftsmanShare: 50,
            assistantShare: 0,
            cashierShare: 5,
            shopShare: 45
        },
        {
            id: 'srv-103',
            time: '02:40 م',
            customer: 'الأستاذ أحمد',
            serviceName: 'تنظيف بشرة متكامل',
            amount: 250,
            craftsmanId: 'stf-3',
            assistantId: 'stf-4',
            cashierId: 'stf-5',
            craftsmanShare: 125,
            assistantShare: 12.5,
            cashierShare: 12.5,
            shopShare: 100
        }
    ],
    deductions: [
        {
            id: 'ded-1',
            time: '11:00 ص',
            staffId: 'stf-1',
            amount: 20,
            reason: 'خصم تأخير ساعة عن الموعد'
        },
        {
            id: 'ded-2',
            time: '01:30 م',
            staffId: 'stf-4',
            amount: 10,
            reason: 'سلفة نقدية سريعة'
        }
    ],
    expenses: [
        {
            id: 'exp-1',
            time: '10:30 ص',
            category: 'بضاعة ومستلزمات شغيلة',
            title: 'شراء كرتونة كريمات وشفرات ومناشف',
            amount: 120,
            paymentMethod: 'كاش'
        },
        {
            id: 'exp-2',
            time: '03:00 م',
            category: 'مرافق (كهرباء/ماء/إنترنت)',
            title: 'فاتورة إنترنت ومشروبات ضيافة',
            amount: 50,
            paymentMethod: 'كاش'
        }
    ]
};

class WegoBarberApp {
    constructor() {
        this.data = this.loadData();
        this.initDOM();
        this.initEvents();
        this.renderAll();
    }

    loadData() {
        const saved = localStorage.getItem('wego_barber_data');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
    }

    saveData() {
        localStorage.setItem('wego_barber_data', JSON.stringify(this.data));
        this.renderAll();
    }

    resetToDemoData() {
        if (confirm("هل أنت تأكد من استعادة البيانات التجريبية للمحل؟ (سوف يتم مسح التعديلات الحالية)")) {
            this.data = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
            this.saveData();
            alert("تمت استعادة البيانات التجريبية بنجاح!");
        }
    }

    initDOM() {
        const dateDisplay = document.getElementById('current-date-display');
        if (dateDisplay) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateDisplay.innerText = now.toLocaleDateString('ar-EG', options);
        }

        // Fill Firebase modal inputs if config saved
        const fbConfig = window.WegoFirebase?.getConfig();
        if (fbConfig) {
            if (document.getElementById('fb-apiKey')) document.getElementById('fb-apiKey').value = fbConfig.apiKey || '';
            if (document.getElementById('fb-authDomain')) document.getElementById('fb-authDomain').value = fbConfig.authDomain || '';
            if (document.getElementById('fb-projectId')) document.getElementById('fb-projectId').value = fbConfig.projectId || '';
            if (document.getElementById('fb-storageBucket')) document.getElementById('fb-storageBucket').value = fbConfig.storageBucket || '';
            if (document.getElementById('fb-appId')) document.getElementById('fb-appId').value = fbConfig.appId || '';
        }
    }

    initEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = item.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if (activeNav) activeNav.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const activeContent = document.getElementById(`${tabId}-tab`);
        if (activeContent) activeContent.classList.add('active');

        const titleMap = {
            'dashboard': 'لوحة التحكم الرئيسية',
            'new-service': 'تسجيل عملية وخدمة جديدة',
            'staff': 'إدارة الموظفين والصنايعية',
            'deductions': 'إدارة الخصومات والسلفيات',
            'expenses': 'خزينة المصاريف والمشتريات',
            'reports': 'التقارير المالية والصفاية اليومية'
        };
        const subTitleMap = {
            'dashboard': 'ملخص الأداء المالي والحسابات اليومية لمحل wego',
            'new-service': 'تسجيل وإدخال الخدمة وحساب النسب تلقائياً',
            'staff': 'بيانات الصنايعية والمرافقين والكاشير والنسب المخصصة',
            'deductions': 'خصم المبالغ والسلف المباشرة من أجور الشغيلة',
            'expenses': 'سجل الفواتير والمشتريات الخاصة بالمحل',
            'reports': 'صرف المستحقات وتصفية حسابات اليوم'
        };

        if (titleMap[tabId]) {
            document.getElementById('page-title').innerText = titleMap[tabId];
            document.getElementById('page-subtitle').innerText = subTitleMap[tabId];
        }
    }

    // FIREBASE CLOUD SYNC & QUOTA SAVER
    async triggerCloudSync() {
        if (!window.WegoFirebase?.initialized) {
            this.openModal('firebaseModal');
            alert("يرجى إدخال مفاتيح Firebase أولاً لتمثيل الاتصال السحابي.");
            return;
        }
        await window.WegoFirebase.syncAllToCloud(this.data);
    }

    handleSaveFirebaseConfig(e) {
        e.preventDefault();
        const cfg = {
            apiKey: document.getElementById('fb-apiKey').value.trim(),
            authDomain: document.getElementById('fb-authDomain').value.trim(),
            projectId: document.getElementById('fb-projectId').value.trim(),
            storageBucket: document.getElementById('fb-storageBucket').value.trim(),
            appId: document.getElementById('fb-appId').value.trim()
        };
        window.WegoFirebase.saveConfig(cfg);
    }

    // FINANCIAL CALCULATIONS & RENDER
    calculateTotals() {
        let totalRevenue = 0;
        let totalCraftsmenPayout = 0;
        let totalCashierCommission = 0;
        let totalAssistantPayout = 0;
        let totalShopShare = 0;

        this.data.services.forEach(srv => {
            totalRevenue += srv.amount;
            totalCraftsmenPayout += srv.craftsmanShare;
            totalCashierCommission += srv.cashierShare;
            totalAssistantPayout += (srv.assistantShare || 0);
            totalShopShare += srv.shopShare;
        });

        let totalExpenses = 0;
        this.data.expenses.forEach(exp => totalExpenses += exp.amount);

        const netShopProfit = totalShopShare - totalExpenses;

        return {
            totalRevenue,
            totalCraftsmenPayout,
            totalCashierCommission,
            totalAssistantPayout,
            totalShopShare,
            totalExpenses,
            netShopProfit,
            servicesCount: this.data.services.length
        };
    }

    renderAll() {
        this.populateSelectDropdowns();
        this.renderDashboard();
        this.renderServicesList();
        this.renderStaffSection();
        this.renderDeductionsSection();
        this.renderExpensesSection();
        this.renderSettlementSection();
        this.calculateLiveSplit();
    }

    populateSelectDropdowns() {
        const craftsmen = this.data.staff.filter(s => s.role === 'craftsman');
        const assistants = this.data.staff.filter(s => s.role === 'assistant');
        const cashiers = this.data.staff.filter(s => s.role === 'cashier');

        const fillSelect = (selectId, list, defaultLabel = 'اختر...') => {
            const select = document.getElementById(selectId);
            if (!select) return;
            select.innerHTML = '';
            if (defaultLabel) {
                select.innerHTML += `<option value="">${defaultLabel}</option>`;
            }
            list.forEach(item => {
                select.innerHTML += `<option value="${item.id}">${item.name} (${item.rate}%)</option>`;
            });
        };

        fillSelect('service-craftsman-select', craftsmen, null);
        fillSelect('service-assistant-select', assistants, 'بدون مرافق');
        fillSelect('service-cashier-select', cashiers, null);

        fillSelect('modal-service-craftsman', craftsmen, null);
        fillSelect('modal-service-assistant', assistants, 'بدون');
        fillSelect('modal-service-cashier', cashiers, null);

        const allStaffSelect = document.getElementById('deduction-staff-select');
        if (allStaffSelect) {
            allStaffSelect.innerHTML = '';
            this.data.staff.forEach(item => {
                const roleTitle = item.role === 'craftsman' ? 'صنايعي' : item.role === 'assistant' ? 'مرافق' : 'كاشير';
                allStaffSelect.innerHTML += `<option value="${item.id}">${item.name} [${roleTitle}]</option>`;
            });
        }
    }

    calculateLiveSplit() {
        const amountInput = document.getElementById('service-amount');
        if (!amountInput) return;
        const amount = parseFloat(amountInput.value) || 0;

        const craftsmanId = document.getElementById('service-craftsman-select')?.value;
        const assistantId = document.getElementById('service-assistant-select')?.value;
        const cashierId = document.getElementById('service-cashier-select')?.value;

        const craftsman = this.data.staff.find(s => s.id === craftsmanId);
        const assistant = this.data.staff.find(s => s.id === assistantId);
        const cashier = this.data.staff.find(s => s.id === cashierId);

        const craftsmanRate = craftsman ? craftsman.rate : 50;
        const cashierRate = cashier ? cashier.rate : 5;
        const assistantRate = assistant ? assistant.rate : 0;

        const craftsmanShare = (amount * craftsmanRate) / 100;
        const cashierShare = (amount * cashierRate) / 100;
        const assistantShare = assistant ? (amount * assistantRate) / 100 : 0;
        const shopShare = amount - craftsmanShare - cashierShare - assistantShare;

        document.getElementById('live-craftsman-share').innerText = `${craftsmanShare.toFixed(1)} ج.م`;
        document.getElementById('live-cashier-share').innerText = `${cashierShare.toFixed(1)} ج.م`;

        const assistantRow = document.getElementById('live-assistant-row');
        if (assistant) {
            assistantRow.style.display = 'flex';
            document.getElementById('live-assistant-share').innerText = `${assistantShare.toFixed(1)} ج.م`;
        } else {
            assistantRow.style.display = 'none';
        }

        document.getElementById('live-shop-share').innerText = `${shopShare.toFixed(1)} ج.م`;
    }

    handleServicePresetChange(select) {
        const val = select.value;
        const amountInput = document.getElementById('service-amount');
        const presets = {
            'حلاقة شعر': 100,
            'حلاقة شعر وذقن': 150,
            'حلاقة ذقن والتنعيم': 50,
            'سشوار ومكواة': 60,
            'ماسك وحمام كريم': 80,
            'صبغة شعر / ذقن': 200,
            'تنظيف بشرة متكامل': 250
        };
        if (presets[val]) {
            amountInput.value = presets[val];
            this.calculateLiveSplit();
        }
    }

    renderDashboard() {
        const totals = this.calculateTotals();

        document.getElementById('kpi-total-revenue').innerText = `${totals.totalRevenue.toLocaleString()} ج.م`;
        document.getElementById('kpi-services-count').innerText = `${totals.servicesCount} خدمة تم تسجيلها اليوم`;
        document.getElementById('kpi-craftsmen-payout').innerText = `${totals.totalCraftsmenPayout.toLocaleString()} ج.م`;
        document.getElementById('kpi-cashier-commission').innerText = `${totals.totalCashierCommission.toLocaleString()} ج.م`;
        document.getElementById('kpi-total-expenses').innerText = `${totals.totalExpenses.toLocaleString()} ج.م`;
        document.getElementById('kpi-net-shop-profit').innerText = `${totals.netShopProfit.toLocaleString()} ج.م`;

        const recentTbody = document.getElementById('recent-services-tbody');
        if (!recentTbody) return;
        recentTbody.innerHTML = '';

        const reversedServices = [...this.data.services].reverse().slice(0, 5);
        if (reversedServices.length === 0) {
            recentTbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">لا يوجد خدمات مسجلة اليوم بعد.</td></tr>`;
            return;
        }

        reversedServices.forEach(srv => {
            const craftsman = this.data.staff.find(s => s.id === srv.craftsmanId)?.name || 'غير معروف';
            const assistant = this.data.staff.find(s => s.id === srv.assistantId)?.name || '-';
            const cashier = this.data.staff.find(s => s.id === srv.cashierId)?.name || '-';

            recentTbody.innerHTML += `
                <tr>
                    <td><span class="badge badge-gold">${srv.time}</span></td>
                    <td><strong>${srv.serviceName}</strong> <br><small class="text-muted">${srv.customer || 'زبون عام'}</small></td>
                    <td><strong class="text-gold">${srv.amount} ج.م</strong></td>
                    <td>${craftsman} <br><span class="text-blue">(${srv.craftsmanShare} ج)</span></td>
                    <td>${assistant !== '-' ? `${assistant} (${srv.assistantShare} ج)` : '-'}</td>
                    <td>${cashier} <br><span class="text-purple">(${srv.cashierShare} ج)</span></td>
                    <td><span class="badge badge-green">${srv.shopShare} ج.م</span></td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="wegoApp.deleteService('${srv.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        const staffListContainer = document.getElementById('dashboard-staff-list');
        if (staffListContainer) {
            staffListContainer.innerHTML = '';
            this.data.staff.forEach(member => {
                const earned = this.getStaffTotalEarned(member.id);
                const deductions = this.getStaffTotalDeductions(member.id);
                const netPayout = earned - deductions;

                staffListContainer.innerHTML += `
                    <div class="staff-card-mini margin-bottom-md" style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="font-size: 0.95rem;">${member.name}</strong>
                                <span class="badge ${member.role === 'craftsman' ? 'badge-gold' : member.role === 'assistant' ? 'badge-blue' : 'badge-purple'}" style="margin-right: 6px;">
                                    ${member.role === 'craftsman' ? 'صنايعي' : member.role === 'assistant' ? 'مرافق' : 'كاشير'}
                                </span>
                            </div>
                            <strong class="text-green" style="font-size: 1rem;">${netPayout.toFixed(1)} ج.م</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
                            <span>مستحق الخدمات: ${earned.toFixed(1)} ج</span>
                            <span class="text-red">خصومات: ${deductions} ج</span>
                        </div>
                    </div>
                `;
            });
        }
    }

    getStaffTotalEarned(staffId) {
        let total = 0;
        this.data.services.forEach(srv => {
            if (srv.craftsmanId === staffId) total += srv.craftsmanShare;
            if (srv.assistantId === staffId) total += srv.assistantShare;
            if (srv.cashierId === staffId) total += srv.cashierShare;
        });
        return total;
    }

    getStaffTotalDeductions(staffId) {
        let total = 0;
        this.data.deductions.forEach(ded => {
            if (ded.staffId === staffId) total += ded.amount;
        });
        return total;
    }

    renderServicesList() {
        const tbody = document.getElementById('all-services-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        [...this.data.services].reverse().forEach((srv, idx) => {
            const craftsman = this.data.staff.find(s => s.id === srv.craftsmanId)?.name || 'غير معروف';
            tbody.innerHTML += `
                <tr>
                    <td>${srv.id}</td>
                    <td><strong>${srv.serviceName}</strong></td>
                    <td>${craftsman}</td>
                    <td><strong class="text-gold">${srv.amount} ج.م</strong></td>
                    <td><span class="text-blue">${srv.craftsmanShare} ج.م</span></td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="wegoApp.deleteService('${srv.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    renderStaffSection() {
        const container = document.getElementById('staff-cards-container');
        if (!container) return;
        container.innerHTML = '';

        this.data.staff.forEach(member => {
            const earned = this.getStaffTotalEarned(member.id);
            const deductions = this.getStaffTotalDeductions(member.id);
            const net = earned - deductions;
            const roleBadge = member.role === 'craftsman' ? 'badge-gold' : member.role === 'assistant' ? 'badge-blue' : 'badge-purple';
            const roleTitle = member.role === 'craftsman' ? 'صنايعي حلاقة' : member.role === 'assistant' ? 'مرافق / مساعد' : 'كاشير الخزينة';

            container.innerHTML += `
                <div class="staff-card">
                    <div class="staff-card-header">
                        <div class="staff-avatar">
                            <i class="fa-solid ${member.role === 'craftsman' ? 'fa-scissors' : member.role === 'assistant' ? 'fa-user-nurse' : 'fa-cash-register'}"></i>
                        </div>
                        <div class="staff-info">
                            <h4>${member.name}</h4>
                            <span class="badge ${roleBadge}">${roleTitle} (${member.rate}%)</span>
                        </div>
                    </div>
                    <div class="staff-stats-list">
                        <div class="staff-stat-item">
                            <span>إجمالي الأرباح اليومية:</span>
                            <strong class="text-gold">${earned.toFixed(1)} ج.م</strong>
                        </div>
                        <div class="staff-stat-item">
                            <span>إجمالي الخصومات والسلف:</span>
                            <strong class="text-red">${deductions} ج.م</strong>
                        </div>
                        <div class="staff-stat-item" style="border-top: 1px dashed var(--border-color); padding-top: 6px;">
                            <span>الصافي القابل للسحب:</span>
                            <strong class="text-green" style="font-size: 1.1rem;">${net.toFixed(1)} ج.م</strong>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-warning btn-block" onclick="wegoApp.openDeductionForStaff('${member.id}')">
                            <i class="fa-solid fa-hand-holding-dollar"></i> إضافة خصم
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="wegoApp.deleteStaff('${member.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }

    renderDeductionsSection() {
        const tbody = document.getElementById('deductions-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (this.data.deductions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">لا يوجد أي خصومات مسجلة حتى الآن.</td></tr>`;
            return;
        }

        [...this.data.deductions].reverse().forEach(ded => {
            const staff = this.data.staff.find(s => s.id === ded.staffId);
            const staffName = staff ? staff.name : 'غير معروف';
            const roleTitle = staff ? (staff.role === 'craftsman' ? 'صنايعي' : staff.role === 'assistant' ? 'مرافق' : 'كاشير') : '-';

            tbody.innerHTML += `
                <tr>
                    <td><span class="badge badge-gold">${ded.time || 'اليوم'}</span></td>
                    <td><strong>${staffName}</strong></td>
                    <td><span class="badge badge-blue">${roleTitle}</span></td>
                    <td><strong class="text-red">${ded.amount} ج.م</strong></td>
                    <td>${ded.reason}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="wegoApp.deleteDeduction('${ded.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    renderExpensesSection() {
        const tbody = document.getElementById('expenses-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (this.data.expenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">لا يوجد مصاريف مسجلة حتى الآن.</td></tr>`;
            return;
        }

        [...this.data.expenses].reverse().forEach(exp => {
            tbody.innerHTML += `
                <tr>
                    <td><span class="badge badge-gold">${exp.time || 'اليوم'}</span></td>
                    <td><span class="badge badge-purple">${exp.category}</span></td>
                    <td><strong>${exp.title}</strong></td>
                    <td><strong class="text-red">${exp.amount} ج.م</strong></td>
                    <td>${exp.paymentMethod || 'كاش'}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="wegoApp.deleteExpense('${exp.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    renderSettlementSection() {
        const tbody = document.getElementById('settlement-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        this.data.staff.forEach(member => {
            const earned = this.getStaffTotalEarned(member.id);
            const deductions = this.getStaffTotalDeductions(member.id);
            const net = earned - deductions;
            const roleTitle = member.role === 'craftsman' ? 'صنايعي' : member.role === 'assistant' ? 'مرافق' : 'كاشير';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${member.name}</strong></td>
                    <td><span class="badge ${member.role === 'craftsman' ? 'badge-gold' : member.role === 'assistant' ? 'badge-blue' : 'badge-purple'}">${roleTitle}</span></td>
                    <td>${earned.toFixed(1)} ج.م</td>
                    <td>${member.rate}%</td>
                    <td><span class="text-red">${deductions} ج.م</span></td>
                    <td><strong class="text-green" style="font-size: 1.1rem;">${net.toFixed(1)} ج.م</strong></td>
                    <td>
                        <span class="badge ${member.settledToday ? 'badge-green' : 'badge-gold'}">
                            ${member.settledToday ? 'تمت التصفية' : 'قيد الصرف'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="wegoApp.printSettlementReceipt('${member.id}')">
                            <i class="fa-solid fa-print"></i> صرف وإيصال
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    // FORM CREATION & DELETION HANDLERS
    handleCreateService(e) {
        e.preventDefault();
        const customer = document.getElementById('service-customer').value.trim();
        const serviceName = document.getElementById('service-name-select').value;
        const amount = parseFloat(document.getElementById('service-amount').value);
        const craftsmanId = document.getElementById('service-craftsman-select').value;
        const assistantId = document.getElementById('service-assistant-select').value;
        const cashierId = document.getElementById('service-cashier-select').value;

        if (!amount || !craftsmanId || !cashierId) {
            alert("يرجى التأكد من إدخال المبلغ وتحديد الصنايعي والكاشير.");
            return;
        }

        const craftsman = this.data.staff.find(s => s.id === craftsmanId);
        const assistant = this.data.staff.find(s => s.id === assistantId);
        const cashier = this.data.staff.find(s => s.id === cashierId);

        const craftsmanRate = craftsman ? craftsman.rate : 50;
        const cashierRate = cashier ? cashier.rate : 5;
        const assistantRate = assistant ? assistant.rate : 0;

        const craftsmanShare = (amount * craftsmanRate) / 100;
        const cashierShare = (amount * cashierRate) / 100;
        const assistantShare = assistant ? (amount * assistantRate) / 100 : 0;
        const shopShare = amount - craftsmanShare - cashierShare - assistantShare;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const newService = {
            id: 'srv-' + Date.now().toString().slice(-4),
            time: timeStr,
            customer: customer || 'زبون عام',
            serviceName: serviceName === 'custom' ? 'خدمة مخصصة' : serviceName,
            amount,
            craftsmanId,
            assistantId,
            cashierId,
            craftsmanShare,
            assistantShare,
            cashierShare,
            shopShare
        };

        this.data.services.push(newService);
        this.saveData();

        document.getElementById('service-customer').value = '';
        alert(`تم تسجيل الخدمة بنجاح! حصة ${craftsman.name} = ${craftsmanShare} ج.م`);
    }

    handleCreateServiceModal(e) {
        e.preventDefault();
        const serviceName = document.getElementById('modal-service-name').value;
        const amount = parseFloat(document.getElementById('modal-service-amount').value);
        const craftsmanId = document.getElementById('modal-service-craftsman').value;
        const assistantId = document.getElementById('modal-service-assistant').value;
        const cashierId = document.getElementById('modal-service-cashier').value;

        const craftsman = this.data.staff.find(s => s.id === craftsmanId);
        const assistant = this.data.staff.find(s => s.id === assistantId);
        const cashier = this.data.staff.find(s => s.id === cashierId);

        const craftsmanRate = craftsman ? craftsman.rate : 50;
        const cashierRate = cashier ? cashier.rate : 5;
        const assistantRate = assistant ? assistant.rate : 0;

        const craftsmanShare = (amount * craftsmanRate) / 100;
        const cashierShare = (amount * cashierRate) / 100;
        const assistantShare = assistant ? (amount * assistantRate) / 100 : 0;
        const shopShare = amount - craftsmanShare - cashierShare - assistantShare;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const newService = {
            id: 'srv-' + Date.now().toString().slice(-4),
            time: timeStr,
            customer: 'زبون عام',
            serviceName,
            amount,
            craftsmanId,
            assistantId,
            cashierId,
            craftsmanShare,
            assistantShare,
            cashierShare,
            shopShare
        };

        this.data.services.push(newService);
        this.saveData();
        this.closeModal('serviceModal');
    }

    handleCreateStaff(e) {
        e.preventDefault();
        const name = document.getElementById('staff-name-input').value.trim();
        const role = document.getElementById('staff-role-input').value;
        const rate = parseFloat(document.getElementById('staff-rate-input').value) || 50;
        const phone = document.getElementById('staff-phone-input').value.trim();

        if (!name) return;

        const newStaff = {
            id: 'stf-' + Date.now().toString().slice(-4),
            name,
            role,
            rate,
            phone,
            settledToday: false
        };

        this.data.staff.push(newStaff);
        this.saveData();
        this.closeModal('staffModal');
        document.getElementById('staff-name-input').value = '';
    }

    adjustDefaultCommission(select) {
        const rateInput = document.getElementById('staff-rate-input');
        if (select.value === 'craftsman') rateInput.value = 50;
        if (select.value === 'assistant') rateInput.value = 5;
        if (select.value === 'cashier') rateInput.value = 5;
    }

    handleCreateDeduction(e) {
        e.preventDefault();
        const staffId = document.getElementById('deduction-staff-select').value;
        const amount = parseFloat(document.getElementById('deduction-amount-input').value);
        const reason = document.getElementById('deduction-reason-input').value.trim();

        if (!staffId || !amount || !reason) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const newDeduction = {
            id: 'ded-' + Date.now().toString().slice(-4),
            time: timeStr,
            staffId,
            amount,
            reason
        };

        this.data.deductions.push(newDeduction);
        this.saveData();
        this.closeModal('deductionModal');
        document.getElementById('deduction-amount-input').value = '';
        document.getElementById('deduction-reason-input').value = '';
    }

    handleCreateExpense(e) {
        e.preventDefault();
        const category = document.getElementById('expense-category-select').value;
        const title = document.getElementById('expense-title-input').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount-input').value);

        if (!title || !amount) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const newExpense = {
            id: 'exp-' + Date.now().toString().slice(-4),
            time: timeStr,
            category,
            title,
            amount,
            paymentMethod: 'كاش'
        };

        this.data.expenses.push(newExpense);
        this.saveData();
        this.closeModal('expenseModal');
        document.getElementById('expense-title-input').value = '';
        document.getElementById('expense-amount-input').value = '';
    }

    openDeductionForStaff(staffId) {
        const select = document.getElementById('deduction-staff-select');
        if (select) select.value = staffId;
        this.openModal('deductionModal');
    }

    // INDIVIDUAL DELETE ACTIONS
    deleteService(id) {
        if (confirm("هل أنت تأكد من حذف هذه الخدمة؟")) {
            this.data.services = this.data.services.filter(s => s.id !== id);
            this.saveData();
        }
    }

    deleteStaff(id) {
        if (confirm("هل أنت تأكد من حذف هذا الموظف؟")) {
            this.data.staff = this.data.staff.filter(s => s.id !== id);
            this.saveData();
        }
    }

    deleteDeduction(id) {
        if (confirm("هل أنت تأكد من إلغاء هذا الخصم؟")) {
            this.data.deductions = this.data.deductions.filter(d => d.id !== id);
            this.saveData();
        }
    }

    deleteExpense(id) {
        if (confirm("هل أنت تأكد من حذف هذا المصروف؟")) {
            this.data.expenses = this.data.expenses.filter(e => e.id !== id);
            this.saveData();
        }
    }

    // PURGE & QUOTA SAVER DELETE ACTIONS
    purgeTodayLog() {
        if (confirm("⚠️ هل أنت تأكد من مسح وحذف سجل اليومية بالكامل (الخدمات والمصاريف والخصومات) لتوفير قواعد البيانات والمساحة؟")) {
            this.data.services = [];
            this.data.expenses = [];
            this.data.deductions = [];
            this.data.staff.forEach(s => s.settledToday = false);
            this.saveData();
            alert("🧹 تم حذف وتفريغ سجل اليومية وتوفير مساحة قواعد البيانات بنجاح!");
        }
    }

    purgeAllServices() {
        if (confirm("هل أنت تأكد من تفريغ سجل خدمات اليومية فقط؟")) {
            this.data.services = [];
            this.saveData();
        }
    }

    purgeAllDeductions() {
        if (confirm("هل أنت تأكد من مسح سجل جميع الخصومات؟")) {
            this.data.deductions = [];
            this.saveData();
        }
    }

    purgeAllExpenses() {
        if (confirm("هل أنت تأكد من تفريغ سجل جميع المصاريف؟")) {
            this.data.expenses = [];
            this.saveData();
        }
    }

    printSettlementReceipt(staffId) {
        const member = this.data.staff.find(s => s.id === staffId);
        if (!member) return;

        const earned = this.getStaffTotalEarned(member.id);
        const deductions = this.getStaffTotalDeductions(member.id);
        const net = earned - deductions;

        member.settledToday = true;
        this.saveData();

        const printDate = document.getElementById('print-date');
        if (printDate) printDate.innerText = `التاريخ: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}`;

        const printContent = document.getElementById('print-content');
        if (printContent) {
            printContent.innerHTML = `
                <div style="font-size: 14px; line-height: 1.8; font-family: Arial, sans-serif;">
                    <h3 style="text-align: center; margin-bottom: 10px;">إيصال صفاية مستحقات يومية</h3>
                    <p><strong>اسم الموظف/الصنايعي:</strong> ${member.name}</p>
                    <p><strong>الوظيفة:</strong> ${member.role === 'craftsman' ? 'صنايعي حلاقة' : member.role === 'assistant' ? 'مرافق' : 'كاشير'}</p>
                    <p><strong>النسبة المقررة:</strong> ${member.rate}%</p>
                    <hr>
                    <p><strong>إجمالي مستحقات الخدمات:</strong> ${earned.toFixed(1)} ج.م</p>
                    <p><strong>إجمالي الخصومات والسلف:</strong> ${deductions} ج.م</p>
                    <h3 style="background: #eee; padding: 8px; text-align: center; border: 1px solid #ccc; margin-top: 10px;">
                        صافي المبلغ المستلم: ${net.toFixed(1)} ج.م
                    </h3>
                    <br>
                    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                        <p>توقيع المستلم: ....................</p>
                        <p>توقيع الإدارة: ....................</p>
                    </div>
                </div>
            `;
        }

        window.print();
    }

    filterServicesTable() {
        const query = document.getElementById('service-search-input').value.toLowerCase();
        const rows = document.querySelectorAll('#all-services-tbody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }

    openModal(modalId) {
        document.getElementById(modalId)?.classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.wegoApp = new WegoBarberApp();
});
