import { useState } from "react";
import Modal from "../ui/Modal";
import { useAuth } from "../../hooks/useAuth";
import { joinList } from "../../hooks/useList";
import { t } from "../../data/i18n";
import type { Lang } from "../../data/i18n";

type JoinState = "default" | "request_sent" | "not_found" | "already_pending";

interface JoinListModalProps {
  open: boolean;
  onClose: () => void;
  onJoined: () => void;
}

export default function JoinListModal({
  open,
  onClose,
  onJoined,
}: JoinListModalProps) {
  const { user } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<JoinState>("default");

  const reset = () => {
    setCode("");
    setLoading(false);
    setState("default");
  };

  const handleClose = () => {
    if (state === "request_sent") {
      onJoined();
    }
    reset();
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    setCode(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !user) return;

    setLoading(true);

    try {
      await joinList(code, user.id);
      setState("request_sent");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : String(err ?? "");
      if (msg.toLowerCase().includes("duplicate") || msg.includes("23505")) {
        setState("already_pending");
      } else {
        setState("not_found");
      }
    } finally {
      setLoading(false);
    }
  };

  if (state === "request_sent") {
    return (
      <Modal open={open} onClose={handleClose}>
        <div className="flex flex-col items-center text-center py-4">
          <div className="text-[44px] mb-3">✅</div>
          <h2 className="text-text font-bold text-lg mb-1">
            {t(lang, "reqSent")}
          </h2>
          <p className="text-text-muted text-sm max-w-[260px]">
            {t(lang, "ownerApprove")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-full min-h-12 rounded-xl bg-accent text-white font-semibold text-base mt-4 active:brightness-90 transition-colors cursor-pointer"
        >
          {t(lang, "ok")}
        </button>
      </Modal>
    );
  }

  if (state === "not_found") {
    return (
      <Modal open={open} onClose={handleClose}>
        <div className="flex flex-col items-center text-center py-4">
          <div className="text-[44px] mb-3">❌</div>
          <h2 className="text-red-400 font-bold text-lg mb-1">
            {t(lang, "notFound")}
          </h2>
          <p className="text-text-muted text-sm max-w-[260px]">
            {t(lang, "checkCode")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setState("default")}
          className="w-full min-h-12 rounded-xl bg-card border border-border-light text-text font-semibold text-base mt-4 active:brightness-90 transition-colors cursor-pointer"
        >
          {t(lang, "tryAgain")}
        </button>
      </Modal>
    );
  }

  if (state === "already_pending") {
    return (
      <Modal open={open} onClose={handleClose}>
        <div className="flex flex-col items-center text-center py-4">
          <div className="text-[44px] mb-3">⏳</div>
          <h2 className="text-text font-bold text-lg mb-1">
            {t(lang, "alreadyPending")}
          </h2>
          <p className="text-text-muted text-sm max-w-[260px]">
            {t(lang, "waitingOwner")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-full min-h-12 rounded-xl bg-accent text-white font-semibold text-base mt-4 active:brightness-90 transition-colors cursor-pointer"
        >
          {t(lang, "ok")}
        </button>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <h2 className="text-text font-bold text-lg mb-1">
        {t(lang, "joinList")}
      </h2>
      <p className="text-text-muted text-sm mb-5">{t(lang, "enterCode")}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="ABC123"
          autoFocus
          maxLength={6}
          className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-text text-center font-mono text-[22px] tracking-[0.3em] uppercase placeholder:text-text-muted placeholder:tracking-[0.3em] outline-none focus:border-accent transition-colors"
        />

        <button
          type="submit"
          disabled={code.length !== 6 || loading}
          className="w-full min-h-12 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          {t(lang, "requestJoin")} →
        </button>
      </form>
    </Modal>
  );
}
