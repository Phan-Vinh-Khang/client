import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('lam-moi-spc');
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [parsedResults, setParsedResults] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Auto hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const detectType = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return { type: 'username', value: '' };
    if (trimmed.includes('@')) return { type: 'email', value: trimmed };
    const phoneRegex = /^[+]?\d{9,15}$/;
    if (phoneRegex.test(trimmed.replace(/\s/g, ''))) {
      return { type: 'phone', value: trimmed.replace(/\s/g, '') };
    }
    return { type: 'username', value: trimmed };
  };

  const parseLines = () => {
    const lines = text1.split('\n').filter(line => line.trim() !== '');
    const listUser = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|');
      if (parts.length < 3) continue;
      const rawFirst = parts[0].trim();
      const password = parts[1].trim();
      let rawThird = parts[2].trim();
      if (!rawThird.toUpperCase().startsWith('SPC_F=')) {
        rawThird = 'SPC_F=' + rawThird;
      }
      const spcValue = rawThird.substring(6);
      const detected = detectType(rawFirst);
      const userObj = { username: '', phone: '', email: '', SPC_F: spcValue, password: password };
      userObj[detected.type] = detected.value;
      listUser.push(userObj);
    }
    return listUser;
  };

  const parseApiResults = (data) => {
    if (!data?.results || !Array.isArray(data.results)) return [];
    return data.results.map(item => {
      const id = item.username || item.phone || item.email || 'unknown';
      return {
        id,
        spcSt: item.spcSt || '',
        error: item.error,
        des: item.des || '',
        success: item.error === 0 && !!item.spcSt,
      };
    });
  };

  const handleText1Change = (e) => {
    const value = e.target.value;
    const lines = value.split('\n');
    if (lines.length <= 50) {
      setText1(value);
      setError('');
    } else {
      setText1(lines.slice(0, 50).join('\n'));
    }
  };

  const lineCount1 = text1.split('\n').filter(l => l.trim() !== '').length;

  const handleSubmit = async () => {
    const listUser = parseLines();
    if (listUser.length === 0) {
      setError('Không có dữ liệu hợp lệ. Mỗi dòng: username|password|SPC_F=value');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setParsedResults([]);
    setText2('');

    try {
      const response = await fetch('https://api6-ufcx.onrender.com/batch-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listUser }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Lỗi HTTP ${response.status}`);
      setResult(data);
      const parsed = parseApiResults(data);
      setParsedResults(parsed);
      setText2(parsed.map(r => r.success ? `${r.id}: ${r.des} ✅\nSPC_ST=${r.spcSt}` : `${r.id}: ${r.des} ❌`).join('\n\n'));
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi gọi API');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Đã copy!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setToast('Đã copy!');
    }
  };

  const handleCopyOne = (spcSt) => {
    if (spcSt) copyToClipboard(spcSt);
  };

  const handleCopyAll = () => {
    const allSpc = parsedResults.filter(r => r.success).map(r => r.spcSt).join('\n');
    if (allSpc) copyToClipboard(allSpc);
    else setToast('Không có SPC_ST nào!');
  };

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

        {activeTab === 'lam-moi-spc' && (
          <div className="spc-form">
            <h2>Làm mới SPC_ST</h2>

            <div className="hint-box">
              <strong>Định dạng mỗi dòng (không xuống dòng):</strong><br />
              <code>username|password|SPC_F=value</code><br />
              <code>phone|password|SPC_F=value</code><br />
              <code>email|password|SPC_F=value</code><br />
              <small>(Thiếu <code>SPC_F=</code> ở vị trí 3 thì tự động thêm)</small>
            </div>

            <div className="textarea-row">
              <div className="textarea-group">
                <div className="label-row">
                  <label>Danh sách tài khoản gửi đi</label>
                  <span className={`line-counter ${lineCount1 >= 50 ? 'limit' : ''}`}>{lineCount1}/50 dòng</span>
                </div>
                <textarea
                  className="no-wrap"
                  wrap="off"
                  value={text1}
                  onChange={handleText1Change}
                  placeholder="user1|pass123|abc&#10;0909123456|pass456|xyz&#10;email@test.com|pass789|SPC_F=data"
                  rows="12"
                />
              </div>

              <div className="textarea-group">
                <div className="label-row">
                  <label>{result ? 'Kết quả SPC_ST trả về' : 'Danh sách SPC mới (tùy chọn)'}</label>
                  {parsedResults.length > 0 && (
                    <button className="copy-all-btn" onClick={handleCopyAll}>📋 Copy tất cả SPC_ST</button>
                  )}
                </div>
                
                {parsedResults.length > 0 ? (
                  <div className="result-list">
                    {parsedResults.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`result-item ${item.success ? 'success' : 'fail'}`}
                        onClick={() => item.success && handleCopyOne(item.spcSt)}
                        title={item.success ? 'Click để copy SPC_ST' : ''}
                      >
                        <div className="result-header">
                          <span className="result-id">{item.id}</span>
                          <span className="result-des">{item.des}</span>
                          <span className="result-icon">{item.success ? '✅' : '❌'}</span>
                        </div>
                        {item.success && (
                          <div className="result-spc">
                            <span className="spc-label">SPC_ST=</span>
                            <span className="spc-value">{item.spcSt}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="no-wrap"
                    wrap="off"
                    value={text2}
                    onChange={(e) => setText2(e.target.value)}
                    placeholder="Sau khi gửi, kết quả SPC_ST sẽ hiển thị ở đây..."
                    rows="12"
                  />
                )}
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi'}
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;