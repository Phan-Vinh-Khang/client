import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('lam-moi-spc');

  // --- State: Làm mới SPC_ST ---
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [parsedResults, setParsedResults] = useState([]);
  const [error, setError] = useState('');

  // --- State: Add mã giảm giá ---
  const [voucher1, setVoucher1] = useState('');
  const [voucher2, setVoucher2] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherResult, setVoucherResult] = useState(null);
  const [voucherParsed, setVoucherParsed] = useState([]);
  const [voucherError, setVoucherError] = useState('');

  const [toast, setToast] = useState('');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // =================== UTILS ===================
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

  // =================== SPC_ST LOGIC ===================
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
        value: item.spcSt || '',
        error: item.error,
        des: item.des || '',
        success: item.error === 0 && !!item.spcSt,
        prefix: 'SPC_ST=',
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
      setText2(parsed.map(r => r.success ? `${r.id}: ${r.des} ✅\n${r.prefix}${r.value}` : `${r.id}: ${r.des} ❌`).join('\n\n'));
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi gọi API');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOne = (prefix, value) => {
    if (value) copyToClipboard(`${prefix}${value}`);
  };

  const handleCopyAll = () => {
    const all = parsedResults.filter(r => r.success).map(r => `${r.prefix}${r.value}`).join('\n');
    if (all) copyToClipboard(all);
    else setToast('Không có dữ liệu nào!');
  };

  // =================== VOUCHER LOGIC ===================
  const parseVoucherLines = () => {
    const lines = voucher1.split('\n').filter(line => line.trim() !== '');
    const listVoucher = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|');
      if (parts.length < 3) continue;
      listVoucher.push({
        code: parts[0].trim(),
        type: parts[1].trim(),
        value: parts[2].trim(),
      });
    }
    return listVoucher;
  };

  const parseVoucherApiResults = (data) => {
    if (!data?.results || !Array.isArray(data.results)) return [];
    return data.results.map(item => {
      const id = item.code || item.voucherCode || 'unknown';
      return {
        id,
        value: item.voucherId || item.newCode || item.resultCode || '',
        error: item.error || (item.status === 'success' ? 0 : 1),
        des: item.message || item.des || item.status || '',
        success: (item.error === 0 || item.status === 'success') && !!(item.voucherId || item.newCode || item.resultCode),
        prefix: 'VOUCHER=',
      };
    });
  };

  const handleVoucher1Change = (e) => {
    const value = e.target.value;
    const lines = value.split('\n');
    if (lines.length <= 50) {
      setVoucher1(value);
      setVoucherError('');
    } else {
      setVoucher1(lines.slice(0, 50).join('\n'));
    }
  };

  const voucherLineCount = voucher1.split('\n').filter(l => l.trim() !== '').length;

  const handleVoucherSubmit = async () => {
    const listVoucher = parseVoucherLines();
    if (listVoucher.length === 0) {
      setVoucherError('Không có dữ liệu hợp lệ. Mỗi dòng: code|loại|giá_trị');
      return;
    }
    setVoucherLoading(true);
    setVoucherError('');
    setVoucherResult(null);
    setVoucherParsed([]);
    setVoucher2('');

    try {
      // <-- Thay endpoint này bằng API thật của bạn
      const response = await fetch('https://api6-ufcx.onrender.com/add-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listVoucher }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Lỗi HTTP ${response.status}`);
      setVoucherResult(data);
      const parsed = parseVoucherApiResults(data);
      setVoucherParsed(parsed);
      setVoucher2(parsed.map(r => r.success ? `${r.id}: ${r.des} ✅\n${r.prefix}${r.value}` : `${r.id}: ${r.des} ❌`).join('\n\n'));
    } catch (err) {
      setVoucherError(err.message || 'Có lỗi xảy ra khi gọi API');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleVoucherCopyOne = (prefix, value) => {
    if (value) copyToClipboard(`${prefix}${value}`);
  };

  const handleVoucherCopyAll = () => {
    const all = voucherParsed.filter(r => r.success).map(r => `${r.prefix}${r.value}`).join('\n');
    if (all) copyToClipboard(all);
    else setToast('Không có dữ liệu nào!');
  };

  // =================== RENDER ===================
  return (
    <div className="App">
      <nav className="toolbar">
        <button className={activeTab === 'check-don' ? 'active' : ''} onClick={() => setActiveTab('check-don')}>Check đơn</button>
        <button className={activeTab === 'lam-moi-spc' ? 'active' : ''} onClick={() => setActiveTab('lam-moi-spc')}>Làm mới SPC_ST</button>
        <button className={activeTab === 'ma-giam-gia' ? 'active' : ''} onClick={() => setActiveTab('ma-giam-gia')}>Add mã giảm giá</button>
      </nav>

      <main className="content">
        {/* ===== Tab: Check đơn ===== */}
        {activeTab === 'check-don' && (
          <div className="placeholder">
            <h2>Check đơn</h2>
            <p>Giao diện kiểm tra đơn hàng sẽ hiển thị ở đây.</p>
          </div>
        )}

        {/* ===== Tab: Làm mới SPC_ST ===== */}
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
                <textarea className="no-wrap" wrap="off" value={text1} onChange={handleText1Change}
                  placeholder="user1|pass123|abc&#10;0909123456|pass456|xyz&#10;email@test.com|pass789|SPC_F=data" rows="12" />
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
                      <div key={idx} className={`result-item ${item.success ? 'success' : 'fail'}`}
                        onClick={() => item.success && handleCopyOne(item.prefix, item.value)}
                        title={item.success ? 'Click để copy' : ''}>
                        <div className="result-header">
                          <span className="result-id">{item.id}</span>
                          <span className="result-des">{item.des}</span>
                          <span className="result-icon">{item.success ? '✅' : '❌'}</span>
                        </div>
                        {item.success && (
                          <div className="result-spc">
                            <span className="spc-label">{item.prefix}</span>
                            <span className="spc-value">{item.value}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea className="no-wrap" wrap="off" value={text2} onChange={(e) => setText2(e.target.value)}
                    placeholder="Sau khi gửi, kết quả SPC_ST sẽ hiển thị ở đây..." rows="12" />
                )}
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi'}
            </button>
          </div>
        )}

        {/* ===== Tab: Add mã giảm giá ===== */}
        {activeTab === 'ma-giam-gia' && (
          <div className="spc-form">
            <h2>Add mã giảm giá</h2>
            <div className="hint-box">
              <strong>Định dạng mỗi dòng (không xuống dòng):</strong><br />
              <code>code|loại|giá_trị</code><br />
              <code>MAGIAM10|percent|10</code><br />
              <code>FREESHIP|fixed|15000</code><br />
              <small>(Mỗi dòng 1 mã, phân cách bằng dấu <code>|</code>)</small>
            </div>

            <div className="textarea-row">
              <div className="textarea-group">
                <div className="label-row">
                  <label>Danh sách mã giảm giá gửi đi</label>
                  <span className={`line-counter ${voucherLineCount >= 50 ? 'limit' : ''}`}>{voucherLineCount}/50 dòng</span>
                </div>
                <textarea className="no-wrap" wrap="off" value={voucher1} onChange={handleVoucher1Change}
                  placeholder="MAGIAM10|percent|10&#10;FREESHIP|fixed|15000&#10;SALE50|percent|50" rows="12" />
              </div>

              <div className="textarea-group">
                <div className="label-row">
                  <label>{voucherResult ? 'Kết quả mã giảm giá trả về' : 'Kết quả xử lý (tùy chọn)'}</label>
                  {voucherParsed.length > 0 && (
                    <button className="copy-all-btn" onClick={handleVoucherCopyAll}>📋 Copy tất cả VOUCHER</button>
                  )}
                </div>
                {voucherParsed.length > 0 ? (
                  <div className="result-list">
                    {voucherParsed.map((item, idx) => (
                      <div key={idx} className={`result-item ${item.success ? 'success' : 'fail'}`}
                        onClick={() => item.success && handleVoucherCopyOne(item.prefix, item.value)}
                        title={item.success ? 'Click để copy' : ''}>
                        <div className="result-header">
                          <span className="result-id">{item.id}</span>
                          <span className="result-des">{item.des}</span>
                          <span className="result-icon">{item.success ? '✅' : '❌'}</span>
                        </div>
                        {item.success && (
                          <div className="result-spc">
                            <span className="spc-label">{item.prefix}</span>
                            <span className="spc-value">{item.value}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea className="no-wrap" wrap="off" value={voucher2} onChange={(e) => setVoucher2(e.target.value)}
                    placeholder="Sau khi gửi, kết quả mã giảm giá sẽ hiển thị ở đây..." rows="12" />
                )}
              </div>
            </div>

            {voucherError && <div className="alert alert-error">{voucherError}</div>}
            <button className="submit-btn" onClick={handleVoucherSubmit} disabled={voucherLoading}>
              {voucherLoading ? 'Đang gửi...' : 'Gửi'}
            </button>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;