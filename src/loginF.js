import { useState } from 'react';

export default function LoginF({ setToast }) {
  const [text1, setText1] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResults, setParsedResults] = useState([]);
  const [error, setError] = useState('');

  const copy = async (value) => {
    try { await navigator.clipboard.writeText(value); } catch {
      const area = document.createElement('textarea'); area.value = value; document.body.appendChild(area); area.select(); document.execCommand('copy'); document.body.removeChild(area);
    }
    setToast('Đã sao chép!');
  };

  const parseUsers = () => text1.split('\n').filter(Boolean).reduce((items, line) => {
    const [identity, password, rawSpc] = line.split('|').map(value => value?.trim());
    if (!identity || !password || !rawSpc) return items;
    const normalized = identity.replace(/\s/g, '');
    const type = identity.includes('@') ? 'email' : /^[+]?\d{9,15}$/.test(normalized) ? 'phone' : 'username';
    items.push({ username: '', phone: '', email: '', password, SPC_F: rawSpc.replace(/^SPC_F=/i, ''), [type]: type === 'phone' ? normalized : identity });
    return items;
  }, []);

  const changeText = (event) => { setText1(event.target.value.split('\n').slice(0, 500).join('\n')); setError(''); };
  const lineCount = text1.split('\n').filter(line => line.trim()).length;
  const successCount = parsedResults.filter(item => item.success).length;

  const submit = async () => {
    const listUser = parseUsers();
    if (!listUser.length) { setError('Chưa có dữ liệu hợp lệ. Mỗi dòng cần theo định dạng: tài_khoản|mật_khẩu|SPC_F=value'); return; }
    setLoading(true); setError(''); setParsedResults([]);
    try {
      const addDB = new URLSearchParams(window.location.search).get('addDB');
      const response = await fetch(`https://api6-production.up.railway.app/batch-login${addDB === 'false' ? '?addDB=false' : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listUser }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Lỗi HTTP ${response.status}`);
      setParsedResults((data.results || []).map(item => ({ id: item.username || item.phone || item.email || 'unknown', value: item.spcSt || '', description: item.des || '', success: item.error === 0 && Boolean(item.spcSt) })));
    } catch (err) { setError(err.message || 'Có lỗi xảy ra khi gọi API'); } finally { setLoading(false); }
  };

  const copyAll = () => { const values = parsedResults.filter(item => item.success).map(item => `SPC_ST=${item.value}`).join('\n'); values ? copy(values) : setToast('Không có SPC_ST để sao chép!'); };

  return <div className="spc-form login-form">
    <div className="login-header">
      <div className="login-title-wrap"><div className="login-title-icon">🔄</div><div><h2>Làm mới SPC_ST</h2><p>Tạo cookie SPC_ST mới cho danh sách tài khoản của bạn</p></div></div>
      <div className="login-count-badge"><strong>{lineCount}</strong><span>/ 500 tài khoản</span></div>
    </div>
    <div className="login-guide"><div className="login-guide-icon">💡</div><div><strong>Định dạng mỗi dòng</strong><code>tài_khoản | mật_khẩu | SPC_F=value</code><span>Hỗ trợ tên đăng nhập, số điện thoại hoặc email.</span></div></div>
    <div className="login-panels">
      <section className="login-panel"><div className="login-panel-header"><div className="login-panel-title"><span className="login-panel-icon input">👤</span><div><h3>Danh sách tài khoản</h3><p>Dán dữ liệu cần làm mới</p></div></div><span className={`line-counter ${lineCount >= 500 ? 'limit' : ''}`}>{lineCount}/500</span></div><textarea className="no-wrap login-textarea" wrap="off" value={text1} onChange={changeText} placeholder={'username|password|SPC_F=value\n0909123456|password|SPC_F=value\nemail@example.com|password|SPC_F=value'} rows="12" /><div className="login-panel-footer"><span>{lineCount ? `${lineCount} dòng sẵn sàng xử lý` : 'Chưa có dữ liệu'}</span><span>Tối đa 500 dòng</span></div></section>
      <section className="login-panel"><div className="login-panel-header"><div className="login-panel-title"><span className="login-panel-icon output">✓</span><div><h3>Kết quả SPC_ST</h3><p>{parsedResults.length ? `${successCount} tài khoản thành công` : 'Kết quả sẽ hiển thị tại đây'}</p></div></div>{parsedResults.length > 0 && <button className="copy-all-btn" onClick={copyAll}>📋 Sao chép tất cả</button>}</div>{parsedResults.length > 0 ? <div className="login-result-list">{parsedResults.map((item, index) => <button key={index} type="button" className={`login-result-item ${item.success ? 'success' : 'fail'}`} onClick={() => item.success && copy(`SPC_ST=${item.value}`)} disabled={!item.success} title={item.success ? 'Nhấn để sao chép SPC_ST' : item.description}><div className="login-result-top"><span className="login-result-id">{item.id}</span><span className="login-result-status">{item.success ? 'Đã làm mới' : 'Không thành công'}</span></div><span className="login-result-message">{item.description || (item.success ? 'SPC_ST đã được cập nhật' : 'Không thể làm mới SPC_ST')}</span>{item.success && <code>SPC_ST={item.value}</code>}</button>)}</div> : <div className="login-empty-result"><span>📋</span><strong>Chưa có kết quả</strong><p>Nhập danh sách tài khoản, sau đó nhấn làm mới SPC_ST.</p></div>}</section>
    </div>
    {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}
    <button className="submit-btn login-submit-btn" onClick={submit} disabled={loading}>{loading ? <><span className="loading-spinner" />Đang làm mới...</> : <><span>🔄</span>Làm mới SPC_ST</>}</button>
    <p className="login-submit-hint">🔒 Dữ liệu được xử lý tự động và bảo mật</p>
  </div>;
}
