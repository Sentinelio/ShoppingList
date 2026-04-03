import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { joinList } from "../../hooks/useList";
import { t, type Lang } from "../../data/i18n";

interface JoinListModalProps {
  open: boolean;
  onClose: () => void;
  onJoined: () => void;
}

export default function JoinListModal({ open, onClose, onJoined }: JoinListModalProps) {
  const { user } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCode("");
    setLoading(false);
    setError("");
    setSuccess(false);
  };

  const handleClose = () => {
    if (success) {
      onJoined();
    }
    reset();
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !user) return;

    setLoading(true);
    setError("");

    try {
      await joinList(code, user.id);
      setSuccess(true);
    } catch {
      setError(t(lang, "common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t(lang, "lists.join")}>
      {success ? (
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">&#10003;</div>
            <p className="text-text font-medium">{t(lang, "lists.pending")}</p>
            <p className="text-text-soft text-sm mt-1">
              {t(lang, "lists.join")}
            </p>
          </div>
          <Button variant="primary" className="w-full" onClick={handleClose}>
            {t(lang, "common.close")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="join-code" className="block text-sm text-text-soft mb-1.5">
              {t(lang, "lists.joinCode")}
            </label>
            <input
              id="join-code"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="ABC123"
              autoFocus
              maxLength={6}
              className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-text text-center font-mono text-2xl tracking-[0.3em] uppercase placeholder:text-text-muted placeholder:tracking-[0.3em] outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={handleClose}>
              {t(lang, "common.cancel")}
            </Button>
            <Button variant="primary" className="flex-1" type="submit" disabled={code.length !== 6 || loading}>
              {loading ? t(lang, "common.loading") : t(lang, "lists.join")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
