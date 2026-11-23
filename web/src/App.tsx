import { useEffect, useId, useState } from "react";
import { initApp } from "@freeappstore/sdk";
import { ConfirmDialog, Modal, type NavItem, PageHeader, SearchInput, Shell, Tabs, useToast, } from "@freeappstore/sdk/ui";

// "rewired" is replaced by the CLI scaffold or deployment flow with this app's id.
export const fas = initApp({ appId: "rewired" });

// The app's screens. Shell renders them as the navbar: a <nav> in its topbar
// with the current screen highlighted, collapsing to a menu on phones.
// Add one entry per primary screen; `title` becomes the browser tab title.
const NAV: NavItem[] = [
  { label: "Home", href: "/", title: "rewired" },
  { label: "About", href: "/about", title: "About — rewired" },
];

interface ActivityItem {
  id: string;
  name: string;
  icon: string;
  hint: string;
  duration: number;
  isCustom?: boolean;
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  { id: "box-breathing", name: "5-Min Box Breathing", icon: "🫁", hint: "Breathe in deeply for 4s... Hold for 4s... Breathe out for 4s...", duration: 300 },
  { id: "focus-reset", name: "5-Min Focus Reset", icon: "🧘", hint: "Close your eyes. Focus strictly on your present physical touchpoints.", duration: 300 },
  { id: "push-ups", name: "30 Fast Push-Ups", icon: "💪", hint: "Drop down right now and crank out reps until the clock strikes zero!", duration: 300 },
  { id: "plank", name: "60-Second Plank", icon: "⏳", hint: "Lock your core tight, keep a flat spine, and hold your ground!", duration: 60 },
  { id: "cold-water", name: "Chug a Cold Glass of Water", icon: "💧", hint: "Walk to the kitchen, pour an ice-cold glass, and drink the whole thing slowly.", duration: 120 },
  { id: "gratitude", name: "Write 3 Gratitude Points", icon: "📝", hint: "Name 3 things you are grateful for right now to shift your mindset.", duration: 300 },
]; 

interface VictoryLog {
  type: string;
  icon: string;
  timestamp: string;
  notes: string;
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  // Keep the screen in step with the browser's back and forward buttons.
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // Nav clicks switch screens without a page load. Shell scrolls to the top
  // and moves focus to the new screen's PageHeader.
  const navigate = (href: string) => {
    window.history.pushState(null, "", href);
    setPath(window.location.pathname);
  };

  return (
    <Shell app={fas} appName={"ReWired"} nav={NAV} onNavigate={navigate}>
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        {path === "/about" ? <About /> : <Home />}
      </div>      
    </Shell>
  );
}

function Home() {
  const toast = useToast();

  // Target habit state (persisted in localStorage)
  const [targetHabit, setTargetHabit] = useState<string>(() => {
    return localStorage.getItem("rewired_target_habit") || "";
  });
  const [isEditingHabit, setIsEditingHabit] = useState(false);
  const [habitInputValue, setHabitInputValue] = useState(targetHabit);

  // Custom activities state (persisted in localStorage)
  const [customActivities, setCustomActivities] = useState<ActivityItem[]>(() => {
    try {
      const saved = localStorage.getItem("rewired_custom_activities");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Victory history state (persisted in localStorage)
  const [history, setHistory] = useState<VictoryLog[]>(() => {
    try {
      const saved = localStorage.getItem("rewired_victory_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Left card tab state ("detour" | "pool")
  const [leftTab, setLeftTab] = useState("detour");
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Right card search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Active detour state
  const [activeActivity, setActiveActivity] = useState<ActivityItem | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [timerRunning, setTimerRunning] = useState(false);

  // ConfirmDialog states
  const [confirmForfeitOpen, setConfirmForfeitOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const allActivities = [...DEFAULT_ACTIVITIES, ...customActivities];

  // Sync target habit to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("rewired_target_habit", targetHabit);
  }, [targetHabit]);

  useEffect(() => {
    localStorage.setItem("rewired_custom_activities", JSON.stringify(customActivities));
  }, [customActivities]);

  // Sync victory history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("rewired_victory_history", JSON.stringify(history));
  }, [history]);

  // Timer countdown logic
  useEffect(() => {
    if (!timerRunning || !activeActivity || confirmForfeitOpen) return;

    if (secondsLeft > 0) {
      const interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }

    // Timer reached 0: log victory and raise celebration toast
    setTimerRunning(false);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setHistory((prev) => [
      {
        type: activeActivity.name,
        icon: activeActivity.icon,
        timestamp: `Today, ${now}`,
        notes: customNote.trim() || `Conquered a craving using ${activeActivity.name}!`
      },
      ...prev
    ]);
    toast.show(`Urge defeated! +1 Win (${activeActivity.name})`, { variant: "success" });
    setActiveActivity(null);
    setCustomNote("");
  }, [timerRunning, secondsLeft, activeActivity, customNote, confirmForfeitOpen, toast]);

  const handleTriggerPanic = () => {
    setIsSpinning(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * allActivities.length);
      const selected = allActivities[randomIndex];

      setActiveActivity(selected);
      setSecondsLeft(selected.duration);
      setIsSpinning(false);
      setTimerRunning(true);
    }, 800);
  };

  const handleSaveHabit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    const cleaned = habitInputValue.trim();
    setTargetHabit(cleaned);
    setIsEditingHabit(false);
    toast.show(cleaned ? "Target habit updated!" : "Target habit cleared.", { variant: "success" });
  };

  const handleAddCustomActivity = (newItem: ActivityItem) => {
    setCustomActivities((prev) => [...prev, newItem]);
    setAddModalOpen(false);
    toast.show(`Added "${newItem.name}" to your detour pool!`, { variant: "success" });
  };

  const handleDeleteCustomActivity = (id: string) => {
    setCustomActivities((prev) => prev.filter((item) => item.id !== id));
    toast.show("Custom detour removed.", { variant: "info" });
  };

  const handleConfirmForfeit = () => {
    setConfirmForfeitOpen(false);
    setTimerRunning(false);
    setActiveActivity(null);
    setCustomNote("");
    toast.show("Challenge forfeited. Ready whenever you want to try again.", { variant: "info" });
  };

  const handleConfirmDelete = () => {
    if (deleteIndex === null) return;
    setHistory((prev) => prev.filter((_, index) => index !== deleteIndex));
    setDeleteIndex(null);
    toast.show("Victory log removed.", { variant: "info" });
  };

  // Filtered victory history for SearchInput
  const filteredHistory = history
    .map((log, originalIndex) => ({ log, originalIndex }))
    .filter(({ log }) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        log.type.toLowerCase().includes(q) ||
        log.notes.toLowerCase().includes(q)
      );
    });

  return (
    <>
      <PageHeader title="ReWired: Urge Control Hub" description="Interrupt compulsive habits with quick, randomized healthy detours." />

      {/* Target Habit Configuration Block */}
      <div className="p-5 border border-mint/30 rounded-lg bg-mint-soft/45 text-ink mb-6 mt-4 shadow-sm transition-colors">
        {isEditingHabit ? (
          <form onSubmit={handleSaveHabit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-mint-deep uppercase mb-1.5">
                What bad habit are you fighting?
              </label>
              <input
                type="text"
                value={habitInputValue}
                onChange={(e) => setHabitInputValue(e.target.value)}
                placeholder="e.g., Smoking, Drinking, Late-Night Scrolling..."
                className="w-full p-2.5 border border-mint/40 rounded-sm bg-paper text-ink text-sm placeholder-muted focus:outline-hidden focus:ring-2 focus:ring-mint"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2.5 bg-mint hover:bg-mint-deep text-paper font-bold rounded-sm text-sm cursor-pointer transition-colors"
              >
                Save Target
              </button>
              <button
                type="button"
                onClick={() => setIsEditingHabit(false)}
                className="px-3 py-2.5 border border-line bg-paper text-muted hover:text-ink font-semibold rounded-sm text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <span className="text-xs uppercase font-extrabold text-mint-deep bg-mint-soft px-2 py-0.5 rounded-sm border border-mint/20">
                Active Focus Goal
              </span>
              <h2 className="text-lg font-bold text-ink mt-1.5">
                Habit to break:{" "}
                {targetHabit ? (
                  <span className="italic font-normal">"{targetHabit}"</span>
                ) : (
                  <span className="text-muted font-normal italic text-base">Not set yet</span>
                )}
              </h2>
            </div>
            <button
              onClick={() => {
                setHabitInputValue(targetHabit);
                setIsEditingHabit(true);
              }}
              className="px-4 py-2 bg-mint hover:bg-mint-deep text-paper font-bold text-sm rounded-sm shadow-xs transition-colors cursor-pointer shrink-0 self-start sm:self-center"
            >
              {targetHabit ? "Modify Target" : "+ Set Target Habit"}
            </button>
          </div>
        )}
      </div>

      {/* Primary 2-Column Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Left Card: Detour Machine + Detour Pool Tabs */}
        <div className="p-6 border border-line rounded-lg bg-paper text-ink shadow-sm transition-colors flex flex-col justify-between lg:min-h-105">
          {!activeActivity && (
            <div className="mb-4">
              <Tabs
                active={leftTab}
                onChange={setLeftTab}
                tabs={[
                  { key: "detour", label: "Break Craving" },
                  { key: "pool", label: `Detour Pool (${allActivities.length})` },
                ]}
              />
            </div>
          )}

          {activeActivity ? (
            <div className="animate-sdk-slide-up py-2 flex flex-col justify-between h-full">
              <div className="text-center">
                <span className="text-xs uppercase font-extrabold px-3 py-1 bg-mint-soft text-mint-deep rounded-md border border-mint/25">
                  Active Challenge: {activeActivity.name}
                </span>

                <div className="my-6 mx-auto w-28 h-28 rounded-full border-4 border-mint flex items-center justify-center bg-mint-soft/40 scale-105 animate-pulse transition-transform duration-1000">
                  <span className="text-3xl font-bold font-display text-ink">
                    {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                  </span>
                </div>

                <div className="text-4xl mb-2">{activeActivity.icon}</div>
                <p className="text-sm font-medium mb-5 text-ink px-4 leading-relaxed">
                  {activeActivity.hint}
                </p>
              </div>

              <div className="text-left">
                <label
                  htmlFor="reflection-note"
                  className="block text-xs font-semibold text-muted mb-1"
                >
                  Quick Reflection (optional):
                </label>
                <textarea
                  id="reflection-note"
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="How are you standing ground right now?"
                  className="w-full p-2.5 mb-4 border border-line rounded-sm bg-panel text-ink text-sm placeholder-muted focus:outline-hidden focus:ring-2 focus:ring-mint resize-none"
                />

                <div className="text-center">
                  <button
                    onClick={() => setConfirmForfeitOpen(true)}
                    className="min-h-11 px-4 py-2 border border-line text-danger hover:bg-danger-soft text-xs font-bold rounded-sm transition-colors cursor-pointer"
                  >
                    Forfeit Challenge
                  </button>
                </div>
              </div>
            </div>
          ) : leftTab === "detour" ? (
            <div className="my-auto text-center py-6">
              <h2 className="text-2xl font-bold mb-2 tracking-tight">Feeling an Urge?</h2>
              <p className="text-sm text-muted mb-8 max-w-sm mx-auto">
                Do not let the habit win. Click below to roll a random exercise from your{" "}
                <strong>{allActivities.length} active detours</strong>.
              </p>

              <button
                onClick={handleTriggerPanic}
                disabled={isSpinning}
                className="min-h-12 w-full max-w-xs mx-auto py-4 bg-danger hover:bg-danger/90 text-white text-lg font-bold rounded-sm transition-colors shadow-sm tracking-wide cursor-pointer uppercase flex items-center justify-center gap-2"
              >
                {isSpinning ? <span>Selecting Detour... 🎲</span> : <>💥 Break Craving Now 🎲</>}
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-muted">
                  Activities rolled when you hit <strong>Break Craving Now</strong>:
                </p>
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="min-h-9 px-3 py-1.5 bg-mint hover:bg-mint-deep text-white text-xs font-bold rounded-sm transition-colors cursor-pointer shrink-0"
                >
                  + Add Custom
                </button>
              </div>

              <ul className="flex flex-col gap-2 p-0 m-0 list-none overflow-y-auto max-h-65">
                {allActivities.map((item) => (
                  <li
                    key={item.id}
                    className="p-2.5 border border-line rounded-sm bg-panel flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink truncate">{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-mint-soft text-mint-deep font-bold shrink-0">
                            {item.duration >= 60
                              ? `${Math.floor(item.duration / 60)}m${item.duration % 60 ? ` ${item.duration % 60}s` : ""}`
                              : `${item.duration}s`}
                          </span>
                        </div>
                        <p className="text-xs text-muted truncate">{item.hint}</p>
                      </div>
                    </div>

                    {item.isCustom && (
                      <button
                        onClick={() => handleDeleteCustomActivity(item.id)}
                        className="text-xs px-2 py-1 text-danger hover:bg-danger-soft rounded-sm font-semibold shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Card: Victory Feed Grid Log */}
        <div className="p-6 border border-mint/25 rounded-lg bg-mint-soft/25 text-ink shadow-sm transition-colors flex flex-col lg:min-h-95">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold tracking-tight">Your Victory Feed</h2>
            {history.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-mint-soft text-mint-deep border border-mint/20">
                {history.length} {history.length === 1 ? "Win" : "Wins"}
              </span>
            )}
          </div>
          <p className="text-sm text-muted mb-4">
            Every item logged here marks a moment you chose resistance over habit.
          </p>

          {history.length > 1 && (
            <div className="mb-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Filter wins by activity or note..."
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto max-h-75">
            {history.length === 0 ? (
              <div className="border border-dashed border-mint/40 bg-paper/70 rounded-md p-8 text-center my-4">
                <p className="text-muted italic text-sm">
                  Your victory log is empty. Hit <strong>Break Craving Now</strong> when an urge strikes to record your first win!
                </p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="border border-dashed border-line bg-paper/70 rounded-md p-6 text-center my-4">
                <p className="text-muted italic text-sm">No victories match "{searchQuery}".</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3 p-0 m-0 list-none">
                {filteredHistory.map(({ log, originalIndex }) => (
                  <li
                    key={originalIndex}
                    className="p-3 bg-paper border border-mint/25 rounded-sm flex items-center justify-between shadow-xs animate-sdk-slide-up"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{log.icon || "🛡️"}</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm md:text-base font-bold font-display text-ink truncate">
                            {log.type}
                          </span>
                          <span className="text-[10px] text-muted shrink-0">{log.timestamp}</span>
                        </div>
                        <span className="text-xs text-muted italic truncate">"{log.notes}"</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setDeleteIndex(originalIndex)}
                      className="min-h-9 text-xs px-2.5 py-1 text-danger hover:bg-danger-soft rounded-sm font-semibold shrink-0 ml-3 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Custom Detour Modal */}
      {addModalOpen && (
        <AddCustomDetourModal
          onAdd={handleAddCustomActivity}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {/* Accessible Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmForfeitOpen}
        title="Forfeit Active Challenge?"
        message="You're in the middle of beating this urge. Are you sure you want to stop the timer early?"
        confirmLabel="Yes, Forfeit"
        variant="danger"
        onConfirm={handleConfirmForfeit}
        onCancel={() => setConfirmForfeitOpen(false)}
      />

      <ConfirmDialog
        open={deleteIndex !== null}
        title="Delete Victory Log?"
        message="This will permanently remove this win from your Victory Feed."
        confirmLabel="Delete Win"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteIndex(null)}
      />
    </>
  );
}

function AddCustomDetourModal({
  onAdd,
  onClose,
}: {
  onAdd: (item: ActivityItem) => void;
  onClose: () => void;
}) {
  const nameId = useId();
  const hintId = useId();
  const durationId = useId();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("⚡");
  const [hint, setHint] = useState("");
  const [duration, setDuration] = useState("15");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedHint = hint.trim();
    const parsedDuration = Number(duration);

    if (!trimmedName) {
      setError("Please enter an activity name.");
      return;
    }
    if (!Number.isFinite(parsedDuration) || parsedDuration < 5 || parsedDuration > 300) {
      setError("Duration must be between 5 and 300 seconds.");
      return;
    }

    onAdd({
      id: `custom-${Date.now()}`,
      name: trimmedName,
      icon,
      hint: trimmedHint || `Complete "${trimmedName}" until the timer finishes!`,
      duration: Math.round(parsedDuration),
      isCustom: true,
    });
  };

  return (
    <Modal open title="Add Custom Detour Activity" onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-3">
        <div>
          <span className="block text-xs font-bold text-muted uppercase mb-1">Pick an Icon</span>
          <div className="flex flex-wrap gap-2">
            {["⚡", "🚶", "🍵", "🎧", "📖", "🧘"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`min-h-10 min-w-10 rounded-sm border text-lg cursor-pointer transition-colors ${
                  icon === emoji
                    ? "border-mint bg-mint-soft"
                    : "border-line bg-panel hover:bg-paper"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor={nameId} className="block text-sm font-semibold mb-1">
            Activity Name
          </label>
          <input
            id={nameId}
            data-autofocus
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g., Make Herbal Tea, 20 Jumping Jacks"
            className="min-h-11 w-full rounded-sm border border-line bg-paper p-2.5 text-ink text-sm"
          />
        </div>

        <div>
          <label htmlFor={hintId} className="block text-sm font-semibold mb-1">
            Quick Instructions (optional)
          </label>
          <input
            id={hintId}
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="e.g., Step away from your desk and stretch your shoulders."
            className="min-h-11 w-full rounded-sm border border-line bg-paper p-2.5 text-ink text-sm"
          />
        </div>

        <div>
          <label htmlFor={durationId} className="block text-sm font-semibold mb-1">
            Timer Duration (seconds)
          </label>
          <input
            id={durationId}
            type="number"
            min={5}
            max={300}
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              setError("");
            }}
            className="min-h-11 w-full rounded-sm border border-line bg-paper p-2.5 text-ink text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-sm border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-ink cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-sm bg-mint hover:bg-mint-deep px-4 py-2 text-sm font-bold text-white cursor-pointer"
          >
            Add to Pool
          </button>
        </div>
      </form>
    </Modal>
  );
}

function About() {
  return (
    <>
      <PageHeader
        title="About ReWired"
        description="A single-user habit detour companion built for FreeAppStore."
      />
      <p className="text-ink leading-relaxed text-base mt-4">
        ReWired helps you interrupt compulsive habits through quick, randomized micro-challenges—combining breathing resets, physical bursts, and hands-free reflection logging.
      </p>
    </>
  );
}