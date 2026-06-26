import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useCall } from '@/hooks/useCall';

type Screen = 'home' | 'name-create' | 'join-code' | 'name-join';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<'private' | 'not_found' | null>(null);

  const call = useCall();
  const inCall = call.status === 'in-call' || call.status === 'connecting';

  const reset = () => {
    setScreen('home');
    setNickname('');
    setJoinCode('');
    setShowCode(false);
  };

  const doCreate = async () => {
    setBusy(true);
    await call.create(nickname.trim());
    setBusy(false);
  };

  const doJoin = async () => {
    setJoinError(null);
    setBusy(true);
    const result = await call.join(joinCode, nickname.trim());
    setBusy(false);
    if (result === 'private') setJoinError('private');
    else if (result === 'error' || result === 'closed') setJoinError('not_found');
  };

  const handleLeave = () => {
    call.leave();
    reset();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans relative overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-lime-300/40 blur-3xl animate-blob" style={{ borderRadius: '42% 58% 63% 37%' }} />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] bg-emerald-200/40 blur-3xl animate-blob" style={{ animationDelay: '2s', borderRadius: '58% 42% 37% 63%' }} />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <button onClick={() => { if (!inCall) reset(); }} className="flex items-center gap-2.5">
          <span className="w-9 h-9 bg-lime-400 grid place-items-center text-slate-900 animate-blob" style={{ borderRadius: '42% 58% 63% 37%' }}>
            <Icon name="Phone" size={18} />
          </span>
          <span className="font-extrabold tracking-tight text-lg">introvert<span className="text-lime-500">slime</span></span>
        </button>
        <span className="text-xs font-medium text-slate-400 hidden sm:block">звонки по одноразовому коду</span>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-6 pb-20 pt-4">
        {(call.status === 'kicked' || call.status === 'closed' || call.status === 'error') && (
          <StatusCard status={call.status} onHome={handleLeave} />
        )}

        {inCall && (
          <CallView call={call} showCode={showCode} setShowCode={setShowCode} onLeave={handleLeave} busy={call.status === 'connecting'} />
        )}

        {!inCall && call.status === 'idle' && screen === 'home' && (
          <div className="w-full max-w-2xl text-center animate-fade-in mt-16">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-5">
              Звони <span className="text-lime-500">по-настоящему</span>.
              <br />Без регистрации.
            </h1>
            <p className="text-slate-500 text-lg max-w-md mx-auto mb-12">
              Создай звонок, получи код из 12 символов и поделись им. Голос и экран идут напрямую между браузерами.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setScreen('name-create')} className="flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-lg shadow-slate-900/10">
                <Icon name="Plus" size={22} />
                Создать звонок
              </button>
              <button onClick={() => setScreen('join-code')} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-900 text-slate-900 px-8 py-5 rounded-2xl font-bold text-lg hover:bg-lime-50 transition-all hover:-translate-y-0.5">
                <Icon name="LogIn" size={22} />
                Присоединиться
              </button>
            </div>
          </div>
        )}

        {!inCall && call.status === 'idle' && screen === 'name-create' && (
          <div className="w-full max-w-md mt-8">
            <NameForm title="Как вас называть?" subtitle="Ник действует только на этот звонок." value={nickname} onChange={setNickname} onBack={() => setScreen('home')} onSubmit={doCreate} busy={busy} />
          </div>
        )}

        {!inCall && call.status === 'idle' && screen === 'join-code' && (
          <div className="w-full max-w-md mt-8 animate-scale-in">
            <BackButton onClick={() => setScreen('home')} />
            <h2 className="text-3xl font-black tracking-tight mb-2">Введите код звонка</h2>
            <p className="text-slate-500 mb-8">12 символов, которые дал создатель звонка.</p>
            <input autoFocus value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="XXXXXXXXXXXX" className="w-full text-center font-mono text-2xl tracking-[0.3em] bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-5 outline-none focus:border-lime-400 transition mb-6" />
            <button disabled={joinCode.length !== 12} onClick={() => setScreen('name-join')} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed">
              Продолжить
            </button>
          </div>
        )}

        {!inCall && call.status === 'idle' && screen === 'name-join' && (
          <div className="w-full max-w-md mt-8">
            <NameForm
              title="Как вас называть?"
              subtitle="Ник действует только на этот звонок."
              value={nickname}
              onChange={(v) => { setNickname(v); setJoinError(null); }}
              onBack={() => { setScreen('join-code'); setJoinError(null); }}
              onSubmit={doJoin}
              busy={busy}
              error={joinError === 'private' ? 'Этот звонок приватный — хозяин закрыл вход для новых участников.' : joinError === 'not_found' ? 'Звонок не найден или уже завершён.' : null}
            />
          </div>
        )}
      </main>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Видео-элемент, который привязывает MediaStream к <video>
// ────────────────────────────────────────────────────────────────
const ScreenVideo = ({ stream, label }: { stream: MediaStream; label: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    v.play().catch(() => {});
  }, [stream]);

  return (
    <div className="w-full mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-indigo-400 animate-pulse-ring" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-indigo-500" />
        </span>
        <span className="text-xs font-semibold text-slate-500">{label} демонстрирует экран</span>
      </div>
      <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-xl shadow-slate-900/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-h-[60vh] object-contain"
        />
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Превью собственного экрана (только для того, кто шарит)
// ────────────────────────────────────────────────────────────────
const LocalScreenPreview = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    v.play().catch(() => {});
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="w-full mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-lime-400 animate-pulse-ring" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-lime-500" />
        </span>
        <span className="text-xs font-semibold text-slate-500">Вы демонстрируете экран — другие вас видят</span>
      </div>
      <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-xl shadow-slate-900/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-h-[60vh] object-contain opacity-80"
        />
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Основной экран звонка
// ────────────────────────────────────────────────────────────────
const CallView = ({ call, showCode, setShowCode, onLeave, busy }: {
  call: ReturnType<typeof useCall>;
  showCode: boolean;
  setShowCode: (v: boolean) => void;
  onLeave: () => void;
  busy: boolean;
}) => {
  return (
    <div className="w-full max-w-2xl animate-scale-in">
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-lime-400 animate-pulse-ring" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-lime-500" />
        </span>
        <span className="text-sm font-medium text-slate-500">{busy ? 'Подключение…' : 'Звонок идёт'}</span>
      </div>

      {/* кнопки управления */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        <button
          onClick={call.toggleMic}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition ${call.micOn ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
        >
          <Icon name={call.micOn ? 'Mic' : 'MicOff'} size={18} />
          {call.micOn ? 'Выкл. микрофон' : 'Вкл. микрофон'}
        </button>

        <button
          onClick={call.sharingScreen ? call.stopScreenShare : call.startScreenShare}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition ${call.sharingScreen ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          <Icon name={call.sharingScreen ? 'MonitorX' : 'Monitor'} size={18} />
          {call.sharingScreen ? 'Стоп демонстрация' : 'Демонстрация экрана'}
        </button>

        {call.isHost && (
          <button onClick={() => setShowCode(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-lime-400 text-slate-900 hover:bg-lime-300 transition">
            <Icon name="KeyRound" size={18} />
            Получить код
          </button>
        )}

        {call.isHost && showCode && (
          <button
            onClick={call.togglePrivate}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition ${call.isPrivate ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Icon name={call.isPrivate ? 'LockOpen' : 'Lock'} size={18} />
            {call.isPrivate ? 'Снять приватность' : 'Сделать приватным'}
          </button>
        )}

        <button onClick={onLeave} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition">
          <Icon name="PhoneOff" size={18} />
          Выйти
        </button>
      </div>

      {/* код звонка */}
      {call.isHost && showCode && call.code && (
        <div className="bg-slate-900 rounded-2xl p-6 mb-6 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-slate-400 text-sm">Код этого звонка — поделитесь им</p>
            {call.isPrivate && (
              <span className="flex items-center gap-1 bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">
                <Icon name="Lock" size={11} />
                приватный
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-2xl md:text-3xl tracking-[0.25em] text-lime-400 font-bold">{call.code}</span>
            <button onClick={() => navigator.clipboard?.writeText(call.code)} className="text-slate-400 hover:text-white transition" title="Скопировать">
              <Icon name="Copy" size={20} />
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            {call.isPrivate
              ? 'Новые участники не смогут войти, пока приватность включена.'
              : 'После выхода создателя код перестанет работать.'}
          </p>
        </div>
      )}

      {/* своё превью экрана */}
      {call.sharingScreen && <LocalScreenSharePreview stream={call.localScreenStream} />}

      {/* чужой экран */}
      {!call.sharingScreen && call.remoteScreenStream && (
        <ScreenVideo stream={call.remoteScreenStream} label={call.remoteScreenName} />
      )}

      {/* участники */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-400 px-1">Участники · {call.peers.length}</p>
        {call.peers.map((p) => (
          <div key={p.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
            <span className="w-10 h-10 grid place-items-center bg-lime-400 text-slate-900 font-bold rounded-full shrink-0">
              {p.name.charAt(0).toUpperCase() || '?'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{p.name} {p.id === call.myId && <span className="text-slate-400 font-normal">(вы)</span>}</p>
              {p.isHost && <p className="text-xs text-lime-600 font-medium">Создатель звонка</p>}
            </div>
            <Icon name={p.muted ? 'MicOff' : 'Mic'} size={18} className={p.muted ? 'text-amber-500' : 'text-slate-400'} />
            {call.isHost && p.id !== call.myId && (
              <button onClick={() => call.kick(p.id)} className="ml-1 flex items-center gap-1 text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition">
                <Icon name="UserX" size={15} />
                Кикнуть
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const LocalScreenSharePreview = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    v.play().catch(() => {});
  }, [stream]);

  return (
    <div className="w-full mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-indigo-400 animate-pulse-ring" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-indigo-500" />
        </span>
        <span className="text-xs font-semibold text-slate-500">Вы демонстрируете экран — участники вас видят</span>
      </div>
      <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-xl shadow-slate-900/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-h-[60vh] object-contain"
        />
      </div>
    </div>
  );
};

const StatusCard = ({ status, onHome }: { status: string; onHome: () => void }) => {
  const map: Record<string, { icon: string; title: string; text: string }> = {
    kicked: { icon: 'UserX', title: 'Вас исключили', text: 'Создатель звонка удалил вас из звонка.' },
    closed: { icon: 'PhoneOff', title: 'Звонок завершён', text: 'Создатель вышел — звонок закрыт, код больше не работает.' },
    error: { icon: 'TriangleAlert', title: 'Не удалось подключиться', text: 'Проверьте доступ к микрофону и попробуйте снова.' },
  };
  const m = map[status] || map.error;
  return (
    <div className="w-full max-w-md text-center animate-scale-in mt-20">
      <span className="w-16 h-16 mx-auto mb-6 grid place-items-center bg-slate-100 rounded-full text-slate-700">
        <Icon name={m.icon} size={28} />
      </span>
      <h2 className="text-2xl font-black tracking-tight mb-2">{m.title}</h2>
      <p className="text-slate-500 mb-8">{m.text}</p>
      <button onClick={onHome} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition">
        На главную
      </button>
    </div>
  );
};

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-900 transition mb-6 font-medium text-sm">
    <Icon name="ArrowLeft" size={16} />
    Назад
  </button>
);

const NameForm = ({ title, subtitle, value, onChange, onBack, onSubmit, busy, error }: {
  title: string; subtitle: string; value: string;
  onChange: (v: string) => void; onBack: () => void; onSubmit: () => void; busy: boolean;
  error?: string | null;
}) => (
  <div className="animate-scale-in">
    <BackButton onClick={onBack} />
    <h2 className="text-3xl font-black tracking-tight mb-2">{title}</h2>
    <p className="text-slate-500 mb-8">{subtitle}</p>
    {error && (
      <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-2xl px-4 py-4 mb-6 animate-fade-in">
        <Icon name="Lock" size={18} className="shrink-0 mt-0.5" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    )}
    <input autoFocus value={value} onChange={(e) => onChange(e.target.value.slice(0, 20))} onKeyDown={(e) => { if (e.key === 'Enter' && value.trim() && !error) onSubmit(); }} placeholder="Например, Тихий слайм" className="w-full text-lg bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-5 outline-none focus:border-lime-400 transition mb-6" />
    <button disabled={!value.trim() || busy || !!error} onClick={onSubmit} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed">
      {busy ? 'Подключение…' : 'Продолжить'}
    </button>
  </div>
);

export default Index;