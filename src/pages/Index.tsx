import { useState } from 'react';
import Icon from '@/components/ui/icon';

type Screen = 'home' | 'name-create' | 'join-code' | 'name-join' | 'call';

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  muted: boolean;
}

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [callCode, setCallCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const reset = () => {
    setScreen('home');
    setNickname('');
    setJoinCode('');
    setIsHost(false);
    setCallCode('');
    setShowCode(false);
    setMicOn(true);
    setParticipants([]);
  };

  const startCall = (host: boolean) => {
    const me: Participant = { id: 'me', name: nickname.trim(), isHost: host, muted: false };
    const others: Participant[] = host
      ? []
      : [{ id: 'h1', name: 'Хозяин звонка', isHost: true, muted: false }];
    setParticipants(host ? [me] : [...others, me]);
    setIsHost(host);
    setMicOn(true);
    setShowCode(false);
    setScreen('call');
  };

  const kick = (id: string) => {
    setParticipants((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans relative overflow-hidden flex flex-col">
      {/* decorative slime blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-lime-300/40 blur-3xl animate-blob" style={{ borderRadius: '42% 58% 63% 37%' }} />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] bg-emerald-200/40 blur-3xl animate-blob" style={{ animationDelay: '2s', borderRadius: '58% 42% 37% 63%' }} />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <button onClick={reset} className="flex items-center gap-2.5 group">
          <span className="w-9 h-9 bg-lime-400 grid place-items-center text-slate-900 animate-blob" style={{ borderRadius: '42% 58% 63% 37%' }}>
            <Icon name="Phone" size={18} />
          </span>
          <span className="font-extrabold tracking-tight text-lg">introvert<span className="text-lime-500">slime</span></span>
        </button>
        <span className="text-xs font-medium text-slate-400 hidden sm:block">звонки по одноразовому коду</span>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-20">
        {/* HOME */}
        {screen === 'home' && (
          <div className="w-full max-w-2xl text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-5">
              Звони <span className="text-lime-500">по-настоящему</span>.
              <br />Без регистрации.
            </h1>
            <p className="text-slate-500 text-lg max-w-md mx-auto mb-12">
              Создай звонок, получи код из 12 символов и поделись им. Никаких аккаунтов — только голос.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setScreen('name-create')}
                className="group flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-lg shadow-slate-900/10"
              >
                <Icon name="Plus" size={22} />
                Создать звонок
              </button>
              <button
                onClick={() => setScreen('join-code')}
                className="flex items-center justify-center gap-3 bg-white border-2 border-slate-900 text-slate-900 px-8 py-5 rounded-2xl font-bold text-lg hover:bg-lime-50 transition-all hover:-translate-y-0.5"
              >
                <Icon name="LogIn" size={22} />
                Присоединиться
              </button>
            </div>
          </div>
        )}

        {/* NAME for create */}
        {screen === 'name-create' && (
          <NameForm
            title="Как вас называть?"
            subtitle="Ник действует только на этот звонок."
            value={nickname}
            onChange={setNickname}
            onBack={() => setScreen('home')}
            onSubmit={() => startCall(true)}
          />
        )}

        {/* JOIN code */}
        {screen === 'join-code' && (
          <div className="w-full max-w-md animate-scale-in">
            <BackButton onClick={() => setScreen('home')} />
            <h2 className="text-3xl font-black tracking-tight mb-2">Введите код звонка</h2>
            <p className="text-slate-500 mb-8">12 символов, которые дал создатель звонка.</p>
            <input
              autoFocus
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 12))}
              placeholder="XXXXXXXXXXXX"
              className="w-full text-center font-mono text-2xl tracking-[0.3em] bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-5 outline-none focus:border-lime-400 transition mb-6"
            />
            <button
              disabled={joinCode.length !== 12}
              onClick={() => { setCallCode(joinCode); setScreen('name-join'); }}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Продолжить
            </button>
          </div>
        )}

        {/* NAME for join */}
        {screen === 'name-join' && (
          <NameForm
            title="Как вас называть?"
            subtitle="Ник действует только на этот звонок."
            value={nickname}
            onChange={setNickname}
            onBack={() => setScreen('join-code')}
            onSubmit={() => startCall(false)}
          />
        )}

        {/* CALL */}
        {screen === 'call' && (
          <div className="w-full max-w-xl animate-scale-in">
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-lime-400 animate-pulse-ring" />
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-lime-500" />
              </span>
              <span className="text-sm font-medium text-slate-500">Звонок идёт</span>
            </div>

            {/* controls */}
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <button
                onClick={() => {
                  setMicOn((m) => !m);
                  setParticipants((p) => p.map((x) => x.id === 'me' ? { ...x, muted: micOn } : x));
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition ${
                  micOn ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                <Icon name={micOn ? 'Mic' : 'MicOff'} size={18} />
                {micOn ? 'Выключить микрофон' : 'Включить микрофон'}
              </button>

              {isHost && (
                <button
                  onClick={() => { if (!callCode) setCallCode(generateCode()); setShowCode(true); }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-lime-400 text-slate-900 hover:bg-lime-300 transition"
                >
                  <Icon name="KeyRound" size={18} />
                  Получить код
                </button>
              )}

              <button
                onClick={reset}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition"
              >
                <Icon name="PhoneOff" size={18} />
                Выйти
              </button>
            </div>

            {/* code reveal */}
            {isHost && showCode && callCode && (
              <div className="bg-slate-900 rounded-2xl p-6 mb-8 text-center animate-fade-in">
                <p className="text-slate-400 text-sm mb-2">Код этого звонка — поделитесь им</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl md:text-3xl tracking-[0.25em] text-lime-400 font-bold">{callCode}</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(callCode)}
                    className="text-slate-400 hover:text-white transition"
                    title="Скопировать"
                  >
                    <Icon name="Copy" size={20} />
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-3">После выхода создателя код перестанет работать.</p>
              </div>
            )}

            {/* participants */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-400 px-1">Участники · {participants.length}</p>
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                  <span className="w-10 h-10 grid place-items-center bg-lime-400 text-slate-900 font-bold rounded-full">
                    {p.name.charAt(0).toUpperCase() || '?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{p.name} {p.id === 'me' && <span className="text-slate-400 font-normal">(вы)</span>}</p>
                    {p.isHost && <p className="text-xs text-lime-600 font-medium">Создатель звонка</p>}
                  </div>
                  <Icon name={p.muted ? 'MicOff' : 'Mic'} size={18} className={p.muted ? 'text-amber-500' : 'text-slate-400'} />
                  {isHost && p.id !== 'me' && (
                    <button
                      onClick={() => kick(p.id)}
                      className="ml-1 flex items-center gap-1 text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition"
                    >
                      <Icon name="UserX" size={15} />
                      Кикнуть
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-900 transition mb-6 font-medium text-sm">
    <Icon name="ArrowLeft" size={16} />
    Назад
  </button>
);

const NameForm = ({ title, subtitle, value, onChange, onBack, onSubmit }: {
  title: string; subtitle: string; value: string;
  onChange: (v: string) => void; onBack: () => void; onSubmit: () => void;
}) => (
  <div className="w-full max-w-md animate-scale-in">
    <BackButton onClick={onBack} />
    <h2 className="text-3xl font-black tracking-tight mb-2">{title}</h2>
    <p className="text-slate-500 mb-8">{subtitle}</p>
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, 20))}
      onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSubmit(); }}
      placeholder="Например, Тихий слайм"
      className="w-full text-lg bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-5 outline-none focus:border-lime-400 transition mb-6"
    />
    <button
      disabled={!value.trim()}
      onClick={onSubmit}
      className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
    >
      Продолжить
    </button>
  </div>
);

export default Index;
