import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import InventoryTableView from './components/InventoryTableView';
import StockFlowView from './components/StockFlowView';
import AlertsView from './components/AlertsView';
import TransactionsView from './components/TransactionsView';
import ExcelView from './components/ExcelView';
import LoginView from './components/LoginView';
import StockInOutModal from './components/StockInOutModal';
import ItemModal from './components/ItemModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import ExcelModal from './components/ExcelModal';
import AdminSettingsModal from './components/AdminSettingsModal';
import BulkEditModal from './components/BulkEditModal';
import OrdersView from './components/OrdersView';
import GenerateOrderModal from './components/GenerateOrderModal';
import ReceiveOrderModal from './components/ReceiveOrderModal';
import Toast from './components/Toast';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState(() => api.getCurrentUser());
  const [authChecking, setAuthChecking] = useState(true);

  // Navigation & Filter State
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'inventory', 'stock-flow', 'alerts', 'orders', 'transactions', 'excel'
  const [selectedDepartment, setSelectedDepartment] = useState('All'); // 'All', 'Kitchen', 'Housekeeping', 'Bar'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data state
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [stockModal, setStockModal] = useState({ isOpen: false, type: 'IN', item: null });
  const [itemModal, setItemModal] = useState({ isOpen: false, itemToEdit: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null, items: null });
  const [bulkEditModal, setBulkEditModal] = useState({ isOpen: false, items: [] });
  const [generateOrderModal, setGenerateOrderModal] = useState({ isOpen: false, items: [] });
  const [receiveOrderModal, setReceiveOrderModal] = useState({ isOpen: false, order: null });
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState('import');
  const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = useCallback((t) => {
    setToast(t);
  }, []);

  // Check auth session on startup
  useEffect(() => {
    const token = localStorage.getItem('res_stock_token');
    if (token) {
      api.getMe()
        .then(res => {
          setCurrentUser(res.user);
        })
        .catch(() => {
          api.logout();
          setCurrentUser(null);
        })
        .finally(() => setAuthChecking(false));
    } else {
      setAuthChecking(false);
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [statsData, itemsData, txData, ordersData, deptsData] = await Promise.all([
        api.getDashboardStats(selectedDepartment),
        api.getItems({ department: selectedDepartment }),
        api.getTransactions({ department: selectedDepartment, limit: 100 }),
        api.getOrders({ department: selectedDepartment }),
        api.getDepartments()
      ]);
      setStats(statsData);
      setItems(itemsData);
      setTransactions(txData);
      setOrders(ordersData);
      if (deptsData) {
        setDepartmentsList(deptsData);
        if (selectedDepartment !== 'All' && !deptsData.some(d => d.name === selectedDepartment)) {
          setSelectedDepartment('All');
        }
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      showToast({ type: 'error', message: 'Failed to load inventory data: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedDepartment, showToast]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, selectedDepartment, fetchData]);

  // Handle Logout
  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    showToast({ type: 'info', message: 'Logged out successfully.' });
  };

  // Stock In / Stock Out Handlers
  const handleStockInSubmit = async (payload) => {
    setActionLoading(true);
    try {
      const res = await api.stockIn(payload);
      showToast({ type: 'success', message: res.message });
      setStockModal({ isOpen: false, type: 'IN', item: null });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Stock In failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStockOutSubmit = async (payload) => {
    setActionLoading(true);
    try {
      const res = await api.stockOut(payload);
      showToast({ type: 'success', message: res.message });
      setStockModal({ isOpen: false, type: 'OUT', item: null });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Stock Out failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick tally adjustment inline (+1 / -1)
  const handleQuickAdjust = async (itemId, delta, reason) => {
    try {
      const res = await api.quickAdjust(itemId, delta, reason);
      const sign = delta > 0 ? '+' : '';
      showToast({
        type: 'info',
        message: `${res.item.name}: Stock adjusted (${sign}${delta}). New stock: ${res.item.current_stock} ${res.item.unit}.`
      });
      // Optimistically update item in state
      setItems(prev => prev.map(i => i.id === itemId ? res.item : i));
      // Refresh stats
      api.getDashboardStats(selectedDepartment).then(s => setStats(s)).catch(() => {});
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Quick adjust failed' });
    }
  };

  // Item Create / Edit Submit
  const handleItemSubmit = async (payload) => {
    setActionLoading(true);
    try {
      if (itemModal.itemToEdit) {
        await api.updateItem(itemModal.itemToEdit.id, payload);
        showToast({ type: 'success', message: `Updated item "${payload.name}" successfully.` });
      } else {
        await api.createItem(payload);
        showToast({ type: 'success', message: `Item "${payload.name}" added to ${payload.department} inventory.` });
      }
      setItemModal({ isOpen: false, itemToEdit: null });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to save item' });
    } finally {
      setActionLoading(false);
    }
  };

  // Item Delete (single or bulk)
  const handleDeleteConfirm = async (target) => {
    setActionLoading(true);
    try {
      if (Array.isArray(target)) {
        const res = await api.bulkDeleteItems(target);
        showToast({ type: 'success', message: res.message });
      } else {
        const res = await api.deleteItem(target);
        showToast({ type: 'success', message: res.message });
      }
      setDeleteModal({ isOpen: false, item: null, items: null });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete item(s)' });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Edit Submit
  const handleBulkEditSubmit = async ({ item_ids, updates, stock_adjustment }) => {
    setActionLoading(true);
    try {
      const res = await api.bulkUpdateItems(item_ids, updates, stock_adjustment);
      showToast({ type: 'success', message: res.message });
      setBulkEditModal({ isOpen: false, items: [] });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to update items in bulk' });
    } finally {
      setActionLoading(false);
    }
  };

  // Generate Purchase Orders
  const handleGenerateOrders = async (payload) => {
    setActionLoading(true);
    try {
      const res = await api.generateOrders(payload);
      showToast({ type: 'success', message: res.message });
      setGenerateOrderModal({ isOpen: false, items: [] });
      fetchData();
      setCurrentView('orders');
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to generate orders' });
    } finally {
      setActionLoading(false);
    }
  };

  // Receive Order & Update Stock Immediately
  const handleReceiveOrderSubmit = async (orderId, payload) => {
    setActionLoading(true);
    try {
      const res = await api.receiveOrder(orderId, payload);
      showToast({ type: 'success', message: res.message });
      setReceiveOrderModal({ isOpen: false, order: null });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to process order receipt' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete / Cancel Order
  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to cancel purchase order ${order.order_number}?`)) return;
    setActionLoading(true);
    try {
      const res = await api.deleteOrder(order.id);
      showToast({ type: 'success', message: res.message });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete order' });
    } finally {
      setActionLoading(false);
    }
  };

  // Excel Modal Trigger (Import or Custom Export)
  const handleOpenExcelModal = (tab = 'import') => {
    setExcelModalTab(tab);
    setExcelModalOpen(true);
  };

  // Export to Excel handler opens the custom export tab
  const handleExportExcel = () => {
    handleOpenExcelModal('export');
  };

  // If initial auth check in progress
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Initializing ResStock Pro...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show Login Screen
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={(user) => setCurrentUser(user)} showToast={showToast} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col lg:flex-row font-sans antialiased text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
        departmentsList={departmentsList}
        stats={stats}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAdminSettings={() => setAdminSettingsOpen(true)}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Workspace Area (Independently scrollable) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header Navbar */}
        <Navbar
          currentView={currentView}
          selectedDepartment={selectedDepartment}
          stats={stats}
          onOpenStockIn={() => setStockModal({ isOpen: true, type: 'IN', item: null })}
          onOpenStockOut={() => setStockModal({ isOpen: true, type: 'OUT', item: null })}
          onOpenAddItem={() => setItemModal({ isOpen: true, itemToEdit: null })}
          onOpenExcelModal={() => handleOpenExcelModal('import')}
          onRefresh={fetchData}
          loading={loading}
          setMobileOpen={setMobileSidebarOpen}
          onNavigateToAlerts={() => setCurrentView('alerts')}
        />

        {/* View Router */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              selectedDepartment={selectedDepartment}
              setSelectedDepartment={setSelectedDepartment}
              departmentsList={departmentsList}
              setCurrentView={setCurrentView}
              onOpenStockIn={() => setStockModal({ isOpen: true, type: 'IN', item: null })}
              onOpenStockOut={() => setStockModal({ isOpen: true, type: 'OUT', item: null })}
              onOpenAddItem={() => setItemModal({ isOpen: true, itemToEdit: null })}
              onStockInItem={(item) => setStockModal({ isOpen: true, type: 'IN', item })}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryTableView
              items={items}
              selectedDepartment={selectedDepartment}
              setSelectedDepartment={setSelectedDepartment}
              departmentsList={departmentsList}
              onOpenAddItem={() => setItemModal({ isOpen: true, itemToEdit: null })}
              onOpenEditItem={(item) => setItemModal({ isOpen: true, itemToEdit: item })}
              onDeleteItem={(item) => setDeleteModal({ isOpen: true, item, items: null })}
              onStockInItem={(item) => setStockModal({ isOpen: true, type: 'IN', item })}
              onStockOutItem={(item) => setStockModal({ isOpen: true, type: 'OUT', item })}
              onQuickAdjust={handleQuickAdjust}
              onOpenExcelModal={() => handleOpenExcelModal('import')}
              onExportExcel={handleExportExcel}
              onOpenBulkEdit={(selectedItems) => setBulkEditModal({ isOpen: true, items: selectedItems })}
              onBulkDelete={(selectedItems) => setDeleteModal({ isOpen: true, item: null, items: selectedItems })}
              onOpenOrderItems={(itemsToOrder) => setGenerateOrderModal({ isOpen: true, items: itemsToOrder })}
            />
          )}

          {currentView === 'stock-flow' && (
            <StockFlowView
              items={items}
              selectedDepartment={selectedDepartment}
              onStockIn={handleStockInSubmit}
              onStockOut={handleStockOutSubmit}
              recentTransactions={transactions}
              loading={actionLoading}
            />
          )}

          {currentView === 'alerts' && (
            <AlertsView
              items={items}
              selectedDepartment={selectedDepartment}
              setSelectedDepartment={setSelectedDepartment}
              departmentsList={departmentsList}
              onStockInItem={(item) => setStockModal({ isOpen: true, type: 'IN', item })}
            />
          )}

          {currentView === 'orders' && (
            <OrdersView
              orders={orders}
              selectedDepartment={selectedDepartment}
              setSelectedDepartment={setSelectedDepartment}
              departmentsList={departmentsList}
              onOpenCreateOrder={() => setGenerateOrderModal({ isOpen: true, items: [] })}
              onOpenReceiveOrder={(order) => setReceiveOrderModal({ isOpen: true, order })}
              onDeleteOrder={handleDeleteOrder}
              loading={loading}
              onRefresh={fetchData}
              showToast={showToast}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              selectedDepartment={selectedDepartment}
              setSelectedDepartment={setSelectedDepartment}
              departmentsList={departmentsList}
              onRefresh={fetchData}
              loading={loading}
            />
          )}

          {currentView === 'excel' && (
            <ExcelView
              selectedDepartment={selectedDepartment}
              onImportComplete={() => {
                fetchData();
                showToast({ type: 'success', message: 'Inventory updated from spreadsheet.' });
              }}
              onExportExcel={handleExportExcel}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <StockInOutModal
        isOpen={stockModal.isOpen}
        onClose={() => setStockModal({ isOpen: false, type: 'IN', item: null })}
        type={stockModal.type}
        preselectedItem={stockModal.item}
        items={items}
        onSubmit={stockModal.type === 'IN' ? handleStockInSubmit : handleStockOutSubmit}
        loading={actionLoading}
      />

      <ItemModal
        isOpen={itemModal.isOpen}
        onClose={() => setItemModal({ isOpen: false, itemToEdit: null })}
        itemToEdit={itemModal.itemToEdit}
        defaultDepartment={selectedDepartment}
        departmentsList={departmentsList}
        onSubmit={handleItemSubmit}
        loading={actionLoading}
      />

      <BulkEditModal
        isOpen={bulkEditModal.isOpen}
        onClose={() => setBulkEditModal({ isOpen: false, items: [] })}
        selectedItems={bulkEditModal.items}
        departmentsList={departmentsList}
        onSubmit={handleBulkEditSubmit}
        loading={actionLoading}
      />

      <GenerateOrderModal
        isOpen={generateOrderModal.isOpen}
        onClose={() => setGenerateOrderModal({ isOpen: false, items: [] })}
        itemsToOrder={generateOrderModal.items}
        availableItems={items}
        defaultDepartment={selectedDepartment}
        onOrdersCreated={handleGenerateOrders}
        showToast={showToast}
      />

      <ReceiveOrderModal
        isOpen={receiveOrderModal.isOpen}
        onClose={() => setReceiveOrderModal({ isOpen: false, order: null })}
        order={receiveOrderModal.order}
        onSubmit={handleReceiveOrderSubmit}
        loading={actionLoading}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, items: null })}
        item={deleteModal.item}
        items={deleteModal.items}
        onConfirm={handleDeleteConfirm}
        loading={actionLoading}
      />

      <ExcelModal
        isOpen={excelModalOpen}
        initialTab={excelModalTab}
        onClose={() => setExcelModalOpen(false)}
        selectedDepartment={selectedDepartment}
        departmentsList={departmentsList}
        items={items}
        onImportComplete={() => {
          fetchData();
          showToast({ type: 'success', message: 'Excel import successfully processed.' });
        }}
        showToast={showToast}
      />

      <AdminSettingsModal
        isOpen={adminSettingsOpen}
        onClose={() => setAdminSettingsOpen(false)}
        departmentsList={departmentsList}
        onDepartmentsUpdated={fetchData}
        onDataCleared={fetchData}
        showToast={showToast}
      />

      {/* Global Toast Banner */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
