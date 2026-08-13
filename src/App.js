import { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('lam-moi-spc');
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Detect loại của vị trí đầu tiên
  const detectType = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return { type: 'username', value: '' };

    // Email: chứa @
    if (trimmed.includes('@')) {
      return { type: 'email', value: trimmed };
    }

    // Phone: chỉ chứa số và dấu +, độ dài 9-15
    const phoneRegex = /^[+]?\d{9,15}$/;
    if (phoneRegex.test(trimmed.replace(/\s/g, ''))) {
      return { type: 'phone', value: trimmed.replace(/\s/g, '') };
    }

    // Còn lại là username
    return { type: 'username', value: trimmed };
  };

  // Parse từng dòng textbox 1
  const parseLines = () => {
    const lines = text1.split('\n').filter(line => line.trim() !== '');
    const listUser = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|');

      // Bỏ qua dòng không đủ 3 phần
      if (parts.length < 3) continue;

      const rawFirst = parts[0].trim();
      const password = parts[1].trim();
      let rawThird = parts[2].trim();

      // Xử lý SPC_F: nếu chưa có prefix thì thêm vào
      if (!rawThird.toUpperCase().startsWith('SPC_F=')) {
        rawThird = 'SPC_F=' + rawThird;
      }
      const spcValue = rawThird.substring(6); // lấy sau "SPC_F="

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
      setError('Không có dữ liệu hợp lệ để gửi. Mỗi dòng cần có định dạng: username|password|SPC_F=value');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

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
              <strong>Định dạng mỗi dòng:</strong><br />
              <code>username|password|SPC_F=value</code><br />
              <code>phone|password|SPC_F=value</code><br />
              <code>email|password|SPC_F=value</code><br />
              <small>(Nếu thiếu <code>SPC_F=</code> ở vị trí 3, hệ thống tự động thêm)</small>
            </div>

            <div className="textarea-row">
              <div className="textarea-group">
                <div className="label-row">
                  <label>Danh sách tài khoản</label>
                  <span className={`line-counter ${lineCount1 >= 50 ? 'limit' : ''}`}>
                    {lineCount1}/50 dòng
                  </span>
                </div>
                <textarea
                  value={text1}
                  onChange={handleText1Change}
                  placeholder="user1|pass123|SPC_F=abc&#10;0909123456|pass456|xyz&#10;email@test.com|pass789|SPC_F=data"
                  rows="12"
                />
              </div>

              <div className="textarea-group">
                <label>Danh sách SPC mới (tùy chọn)</label>
                <textarea
                  value={text2}
                  onChange={(e) => setText2(e.target.value)}
                  placeholder="Dán danh sách SPC mới vào đây..."
                  rows="12"
                />
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {result && (
              <div className="alert alert-success">
                <strong>Gửi thành công!</strong>
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