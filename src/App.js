import { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('lam-moi-spc');
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const detectType = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return { type: 'username', value: '' };

    if (trimmed.includes('@')) {
      return { type: 'email', value: trimmed };
    }

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

      const userObj = {
        username: '',
        phone: '',
        email: '',
        SPC_F: spcValue,
        password: password,
      };

      userObj[detected.type] = detected.value;
      listUser.push(userObj);
    }

    return listUser;
  };

  const extractSpcResults = (data, originalList) => {
    let arr = null;
    if (Array.isArray(data)) arr = data;
    else if (data?.listUser && Array.isArray(data.listUser)) arr = data.listUser;
    else if (data?.results && Array.isArray(data.results)) arr = data.results;
    else if (data?.data && Array.isArray(data.data)) arr = data.data;

    if (!arr || arr.length === 0) return [];

    return arr.map((item, idx) => {
      const id = item.username || item.phone || item.email || originalList[idx]?.username || `Row${idx + 1}`;
      const spc = item.SPC_ST || item.spc_st || item.SPC_F || item.newSpc || item.spc || '';
      return { id, spc };
    });
  };

  const handleText1Change = (e) => {
    const value = e.target.value;
    const lines = value.split('\n');
    if (lines.length <= 50) {
      setText1(value);
      setError('');
      setResult(null);
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
    setText2('');

    try {
      const response = await fetch('https://api6-ufcx.onrender.com/batch-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listUser }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Lỗi HTTP ${response.status}`);
      }

      setResult(data);

      // Điền SPC_ST trả về vào textbox 2
      const spcResults = extractSpcResults(data, listUser);
      if (spcResults.length > 0) {
        const output = spcResults.map(r => `${r.id}|SPC_ST=${r.spc}`).join('\n');
        setText2(output);
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi gọi API');
    } finally {
      setLoading(false);
    }
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
                  <span className={`line-counter ${lineCount1 >= 50 ? 'limit' : ''}`}>
                    {lineCount1}/50 dòng
                  </span>
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
                <label>
                  {result ? 'Kết quả SPC_ST trả về' : 'Danh sách SPC mới (tùy chọn)'}
                </label>
                <textarea
                  className="no-wrap"
                  wrap="off"
                  value={text2}
                  onChange={(e) => setText2(e.target.value)}
                  placeholder="Sau khi gửi, kết quả SPC_ST sẽ hiển thị ở đây..."
                  rows="12"
                  readOnly={!!result}
                />
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {result && (
              <div className="alert alert-success">
                <strong>Đã gửi thành công {lineCount1} tài khoản!</strong>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}

            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
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
    </div>
  );
}

export default App;