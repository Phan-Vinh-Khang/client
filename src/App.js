import { useState, useEffect } from 'react';
import './App.css';
import LoginF from './loginF';
import AddMGG from './addmgg';

function App() {
  const [activeTab, setActiveTab] = useState('lam-moi-spc');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="App">
      <nav className="toolbar">
        <button className={activeTab === 'check-don' ? 'active' : ''} onClick={() => setActiveTab('check-don')}>Check đơn</button>
        <button className={activeTab === 'lam-moi-spc' ? 'active' : ''} onClick={() => setActiveTab('lam-moi-spc')}>Làm mới SPC_ST</button>
        <button className={activeTab === 'ma-giam-gia' ? 'active' : ''} onClick={() => setActiveTab('ma-giam-gia')}>Add mã giảm giá</button>
      </nav>

      <main className="content">
        {activeTab === 'check-don' && (
          <div className="placeholder">
            <h2>Check đơn</h2>
            <p>Giao diện kiểm tra đơn hàng sẽ hiển thị ở đây.</p>
          </div>
        )}

        {activeTab === 'lam-moi-spc' && <LoginF setToast={setToast} />}

        {activeTab === 'ma-giam-gia' && <AddMGG setToast={setToast} />}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;