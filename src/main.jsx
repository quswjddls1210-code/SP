import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function Logo() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" aria-label="노래 탐색">
      <rect width="38" height="38" rx="10" fill="#244ACB" />
      <g fill="white">
        <rect x="7" y="14.5" width="3.5" height="9" rx="1.75" />
        <rect x="13" y="10" width="3.5" height="18" rx="1.75" />
        <rect x="19" y="6" width="3.5" height="26" rx="1.75" />
        <rect x="25" y="12.5" width="3.5" height="13" rx="1.75" />
      </g>
    </svg>
  );
}

function App() {
  const [page, setPage] = useState('login');
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const signup = page === 'signup';

  useEffect(() => {
    fetch('/api/me')
      .then(async (response) => {
        if (response.ok) setUser(await response.json());
        else if (response.status !== 401) setError({ message: '서버에 연결할 수 없습니다. 다시 시도해 주세요.' });
      })
      .catch(() => setError({ message: '서버에 연결할 수 없습니다. 다시 시도해 주세요.' }))
      .finally(() => setChecking(false));
  }, []);

  function changePage(nextPage) {
    setPage(nextPage);
    setPassword('');
    setConfirmPassword('');
    setNickname('');
    setError(null);
    setNotice('');
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    setNotice('');

    try {
      const response = await fetch(signup ? '/api/signup' : '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword, nickname }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data);
        const input = form.elements.namedItem(data.field);
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }

      if (signup) {
        changePage('login');
        setNotice('회원가입이 완료되었습니다. 로그인해 주세요.');
      } else {
        setUser(data);
        setPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError({ message: '서버에 연결할 수 없습니다. 다시 시도해 주세요.' });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      setUser(null);
      setEmail('');
      changePage('login');
    } catch {
      setError({ message: '로그아웃에 실패했습니다. 다시 시도해 주세요.' });
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'mt-2 h-[46px] w-full rounded-[10px] border border-[#d6d9dc] px-[15px] text-[15px] placeholder:text-[#586374] focus:border-[#244acb] focus:outline-2 focus:outline-[#244acb]';
  const buttonClass = 'h-12 w-full rounded-[9px] bg-[#244acb] text-sm font-bold text-white disabled:opacity-60';

  return (
    <>
      <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-end px-5 lg:px-16">
        <button type="button" disabled={busy || checking} onClick={user ? logout : () => changePage('login')} className="h-[42px] w-[136px] rounded-[9px] border border-[#d6d9dc] bg-white text-sm font-bold">
          {user ? '로그아웃' : '로그인'}
        </button>
      </div>

      <main className="px-4 pt-8 pb-12 sm:pt-16">
        <section className="mx-auto w-full max-w-[512px] rounded-2xl border border-[#d6d9dc] bg-white px-6 pt-10 pb-2 sm:px-10" aria-labelledby="page-title">
          <Logo />
          <h1 id="page-title" className="mt-6 text-4xl leading-[48px] font-bold">
            {checking ? '로그인 확인' : user ? '로그인 완료' : signup ? '회원가입' : '로그인'}
          </h1>
          <p className="mt-2 text-base leading-6 text-[#586374]">
            {user ? `${user.nickname}님, 반갑습니다.` : '부르고 싶은 곡과 내 평가를 보관하세요.'}
          </p>

          {checking ? (
            <p className="my-10 text-sm text-[#586374]">로그인 상태를 확인하고 있습니다.</p>
          ) : user ? (
            <div className="mt-10 pb-8">
              <p className="mb-8 text-sm text-[#586374]">{user.email}</p>
              <button type="button" onClick={logout} disabled={busy} className={buttonClass}>
                {busy ? '처리 중…' : '로그아웃'}
              </button>
              {error && <p role="alert" className="mt-3 text-xs text-red-600">{error.message}</p>}
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-[34px]">
              <label htmlFor="email" className="block text-sm leading-5 font-bold">이메일</label>
              <input id="email" name="email" type="text" inputMode="email" autoComplete="username" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={error?.field === 'email'} aria-describedby="email-message" className={inputClass} />
              <p id="email-message" role={error?.field === 'email' ? 'alert' : undefined} className={`mt-1 min-h-[15px] text-xs leading-4 ${error?.field === 'email' ? 'text-red-600' : 'text-[#586374]'}`}>{error?.field === 'email' ? error.message : signup ? '이메일 형식 · 중복 가입 불가' : ''}</p>

              <label htmlFor="password" className="block text-sm leading-5 font-bold">비밀번호</label>
              <input id="password" name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} placeholder="비밀번호 입력" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={error?.field === 'password'} aria-describedby="password-message" className={inputClass} />
              <p id="password-message" role={error?.field === 'password' ? 'alert' : undefined} className={`mt-1 min-h-[15px] text-xs leading-4 ${error?.field === 'password' ? 'text-red-600' : 'text-[#586374]'}`}>
                {error?.field === 'password' ? error.message : signup ? '영문·숫자 포함 8자 이상' : ''}
              </p>

              {signup && (
                <>
                  <label htmlFor="confirmPassword" className="block text-sm leading-5 font-bold">비밀번호 확인</label>
                  <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="비밀번호 재입력" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={error?.field === 'confirmPassword'} aria-describedby="confirmPassword-message" className={inputClass} />
                  <p id="confirmPassword-message" role={error?.field === 'confirmPassword' ? 'alert' : undefined} className="mt-1 min-h-[15px] text-xs leading-4 text-red-600">
                    {error?.field === 'confirmPassword' ? error.message : ''}
                  </p>

                  <label htmlFor="nickname" className="block text-sm leading-5 font-bold">닉네임</label>
                  <input id="nickname" name="nickname" type="text" autoComplete="nickname" placeholder="활동에 사용할 이름" value={nickname} onChange={(event) => setNickname(event.target.value)} aria-invalid={error?.field === 'nickname'} aria-describedby="nickname-message" className={inputClass} />
                  <p id="nickname-message" role={error?.field === 'nickname' ? 'alert' : undefined} className={`mt-1 min-h-[15px] text-xs leading-4 ${error?.field === 'nickname' ? 'text-red-600' : 'text-[#586374]'}`}>
                    {error?.field === 'nickname' ? error.message : '2~10자'}
                  </p>
                </>
              )}

              <div className="min-h-7 text-xs leading-4">
                {notice && <p role="status" className="pb-2 text-[#244acb]">{notice}</p>}
                {error && !error.field && <p role="alert" className="pb-2 text-red-600">{error.message}</p>}
              </div>
              <button type="submit" disabled={busy} className={buttonClass}>
                {busy ? '처리 중…' : signup ? '회원가입' : '로그인'}
              </button>
              <p className="mt-6 text-center text-[15px] leading-5 font-bold text-[#244acb]">
                {signup ? '이미 계정이 있으신가요?' : '처음 이용하시나요?'}{'   '}
                <button type="button" disabled={busy} onClick={() => changePage(signup ? 'login' : 'signup')} className="ml-2">
                  {signup ? '로그인' : '회원가입'}
                </button>
              </p>
            </form>
          )}
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
