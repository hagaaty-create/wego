/**
 * WEGO Barber Shop System - Firebase Integration & Quota Optimization Engine
 * Uses Firebase Modular v10 Web SDK via ES Modules / Global Sync Engine
 */

window.WegoFirebase = {
    initialized: false,
    db: null,

    // Default or Saved Configuration
    getConfig() {
        const saved = localStorage.getItem('wego_firebase_config');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return {
            apiKey: "",
            authDomain: "",
            projectId: "",
            storageBucket: "",
            messagingSenderId: "",
            appId: ""
        };
    },

    saveConfig(cfg) {
        localStorage.setItem('wego_firebase_config', JSON.stringify(cfg));
        alert("تم حفظ إعدادات Firebase بنجاح! يرجى إعادة تحميل الصفحة لتفعيل الاتصال السحابي.");
        window.location.reload();
    },

    async init() {
        const config = this.getConfig();
        if (!config.apiKey || !config.projectId) {
            console.log("Firebase config missing. Running in Offline-First Local Storage mode.");
            return false;
        }

        try {
            // Dynamically import Firebase App and Firestore modules from Firebase v10 CDN
            const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
            const { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

            this.app = initializeApp(config);
            this.db = getFirestore(this.app);
            this.firestoreOps = { doc, setDoc, getDoc, deleteDoc, collection, getDocs, writeBatch };
            this.initialized = true;

            console.log("🔥 Firebase initialized successfully!");
            this.updateSyncUIStatus(true);
            return true;
        } catch (error) {
            console.error("Firebase Initialization Error:", error);
            this.updateSyncUIStatus(false, error.message);
            return false;
        }
    },

    updateSyncUIStatus(isConnected, errMsg = '') {
        const statusEl = document.getElementById('firebase-sync-status');
        if (statusEl) {
            if (isConnected) {
                statusEl.innerHTML = `<span class="status-indicator" style="background:#10b981; box-shadow:0 0 8px #10b981;"></span> ومتصل بالسحابة 🔥`;
            } else {
                statusEl.innerHTML = `<span class="status-indicator" style="background:#f59e0b; box-shadow:0 0 8px #f59e0b;"></span> محلي فقط (غير متصل) ${errMsg ? `<small>(${errMsg})</small>` : ''}`;
            }
        }
    },

    /**
     * QUOTA SAVER SYNC: Batched Single Document Sync per day!
     * Instead of writing 100 separate Firestore documents (which eats up 100 writes/day),
     * we batch the entire daily shop status into 1 lightweight Firestore document per date!
     * Writes = 1 per sync click instead of 100s!
     */
    async syncAllToCloud(data) {
        if (!this.initialized || !this.db) {
            alert("تنبيه: Firebase غير مفعل أو المفاتيح غير مكتملة. التطبيق يعمل محلياً بأمان تام.");
            return false;
        }

        try {
            const { doc, setDoc } = this.firestoreOps;
            const todayStr = new Date().toISOString().split('T')[0];
            const docRef = doc(this.db, "wego_daily_logs", todayStr);

            // Payload bundle
            const payload = {
                date: todayStr,
                lastSyncedAt: new Date().toISOString(),
                staff: data.staff,
                servicesCount: data.services.length,
                expensesCount: data.expenses.length,
                deductionsCount: data.deductions.length,
                totalRevenue: data.services.reduce((acc, s) => acc + s.amount, 0),
                netProfit: data.services.reduce((acc, s) => acc + s.shopShare, 0) - data.expenses.reduce((acc, e) => acc + e.amount, 0),
                fullData: JSON.stringify(data)
            };

            await setDoc(docRef, payload, { merge: true });
            alert("✅ تم رفع ومزامنة بيانات اليوم على Firebase بنجاح! تم استهلاك عملية كتابة واحدة فقط للحفاظ على الكوتة المجانية 🔥");
            return true;
        } catch (e) {
            console.error("Firestore Sync Error:", e);
            alert("حدث خطأ أثناء المزامنة: " + e.message);
            return false;
        }
    },

    /**
     * Pull Sync from Cloud
     */
    async pullFromCloud() {
        if (!this.initialized || !this.db) {
            alert("تنبيه: الفيربيز غير متصل.");
            return null;
        }

        try {
            const { doc, getDoc } = this.firestoreOps;
            const todayStr = new Date().toISOString().split('T')[0];
            const docRef = doc(this.db, "wego_daily_logs", todayStr);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                if (cloudData.fullData) {
                    return JSON.parse(cloudData.fullData);
                }
            } else {
                alert("لم يتم العثور على سجل مسبق لليوم على السحابة.");
            }
        } catch (e) {
            console.error("Firestore Pull Error:", e);
            alert("خطأ أثناء جلب البيانات: " + e.message);
        }
        return null;
    },

    /**
     * Clear Cloud Data (Quota Saver)
     */
    async clearCloudData() {
        if (!this.initialized || !this.db) {
            return false;
        }
        try {
            const { doc, deleteDoc } = this.firestoreOps;
            const todayStr = new Date().toISOString().split('T')[0];
            const docRef = doc(this.db, "wego_daily_logs", todayStr);
            await deleteDoc(docRef);
            return true;
        } catch (e) {
            console.error("Firestore Delete Error:", e);
            return false;
        }
    }
};

// Auto init on page load
document.addEventListener('DOMContentLoaded', () => {
    window.WegoFirebase.init();
});
