import { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('check-don');
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');

  const handleText1Change = (e) => {
    const value = e.target.value;
    const lines = value.split('\n');
    if (lines.length <= 50) {
      setText1(value);
    } else {
      // Cắt về đúng 50 dòng nếu paste quá
      setText1(lines.slice(0, 50).join('\n'));
    }
  };

  const lineCount1 = text1.split('\n').length;

  const handleSubmit = () => {
    alert('Đã gửi yêu cầu làm mới SPC_ST!');
  };

  return (
    <div className="App">
      <nav className="toolbar">
        <button
          className={activeTab === 'check-don' ? 'active' : ''}
          onClick={() => setActiveTab('check-don')}
        >
          Check đơn
        </button>
        <button
          className={activeTab === 'lam-moi-spc' ? 'active' : ''}
          onClick={() => setActiveTab('lam-moi-spc')}
        >
          Làm mới SPC_ST
        </button>
        <button
          className={activeTab === 'ma-giam-gia' ? 'active' : ''}
          onClick={() => setActiveTab('ma-giam-gia')}
        >
          Add mã giảm giá
        </button>
      </nav>

      <main className="content">
        {activeTab === 'check-don' && (
          <div className="placeholder">
            <h2>Check đơn</h2>
            <p>Giao diện kiểm tra đơn hàng sẽ hiển thị ở đây.</p>
          </div>
        )}

        {activeTab === 'lam-moi-spc' && (
          <div className="spc-form">
            <h2>Làm mới SPC_ST</h2>
            <div className="textarea-row">
              <div className="textarea-group">
                <div className="label-row">
                  <label>Danh sách SPC cũ</label>
                  <span className={`line-counter ${lineCount1 >= 50 ? 'limit' : ''}`}>
                    {lineCount1}/50 dòng
                  </span>
                </div>
                <textarea
                  value={text1}
                  onChange={handleText1Change}
                  placeholder="Dán danh sách SPC cũ vào đây..."
                  rows="10"
                />
              </div>
              <div className="textarea-group">
                <label>Danh sách SPC mới</label>
                <textarea
                  value={text2}
                  onChange={(e) => setText2(e.target.value)}
                  placeholder="Dán danh sách SPC mới vào đây..."
                  rows="10"
                />
              </div>
            </div>
            <button className="submit-btn" onClick={handleSubmit}>
              Gửi
            </button>
          </div>
        )}

        {activeTab === 'ma-giam-gia' && (
          <div className="placeholder">
            <h2>Add mã giảm giá</h2>
            <p>Giao diện thêm mã giảm giá sẽ hiển thị ở đây.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;