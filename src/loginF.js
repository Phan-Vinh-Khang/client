import { useState } from 'react';

export default function LoginF({ setToast }) {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [parsedResults, setParsedResults] = useState([]);
  const [error, setError] = useState('');

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
    if (lines.length <= 500) {
      setText1(value);
      setError('');
    } else {
      setText1(lines.slice(0, 500).join('\n'));
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
      // --- Đọc query param addDB từ URL client ---
      const clientParams = new URLSearchParams(window.location.search);
      const addDB = clientParams.get('addDB');
      let apiUrl = 'https://api6-production.up.railway.app/batch-login';
      if (addDB === 'false') {
        apiUrl += '?addDB=false';
      }
      // --- END ---

      const response = await fetch(apiUrl, {
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

  return (
    <div className="spc-form">
      <h2>Làm mới SPC_ST</h2>
      <div className="hint-box">
        <strong>Định dạng mỗi dòng (không xuống dòng):</strong><br />
        <code>username|password|SPC_F=value</code><br />
        <code>phone|password|SPC_F=value</code><br />
        <code>email|password|SPC_F=value</code><br />
      </div>

      <div className="textarea-row">
        <div className="textarea-group">
          <div className="label-row">
            <label>Danh sách tài khoản gửi đi</label>
            <span className={`line-counter ${lineCount1 >= 500 ? 'limit' : ''}`}>{lineCount1}/500 dòng</span>
          </div>
          <textarea
            className="no-wrap"
            wrap="off"
            value={text1}
            onChange={handleText1Change}
            placeholder="user1|pass123|SPC_F=value&#10;0909123456|pass456|SPC_F=value&#10;email@test.com|pass789|SPC_F=data"
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
                  onClick={() => item.success && handleCopyOne(item.prefix, item.value)}
                  title={item.success ? 'Click để copy' : ''}
                >
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
  );
}