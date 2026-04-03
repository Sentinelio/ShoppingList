import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { createList } from "../../hooks/useList";
import { t, type Lang } from "../../data/i18n";

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (listId: string) => void;
}

export default function CreateListModal({ open, onClose, onCreated }: CreateListModalProps) {
  const { user } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setName("");
    setLoading(false);
    setError("");
    setCreatedCode(null);
    setCreatedId(null);
    setCopied(false);
  };

  const handleClose = () => {
    if (createdId) {
      onCreated(createdId);
    }
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    setError("");

    try {
      const list = await createList(name.trim(), user.id);
      setCreatedCode(list.code);
      setCreatedId(list.id);
    } catch {
      setError(t(lang, "common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: ignore
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t(lang, "lists.create")}>
      {createdCode ? (
        <div className="space-y-4">
          <p className="text-text-soft text-sm">
            {t(lang, "lists.code")}
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl tracking-widest text-accent font-bold select-all">
              {createdCode}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-sm text-accent hover:underline cursor-pointer"
            >
              {copied ? t(lang, "lists.copied") : "Copy"}
            </button>
          </div>
          <Button variant="primary" className="w-full" onClick={handleClose}>
            {t(lang, "common.close")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="list-name" className="block text-sm text-text-soft mb-1.5">
              {t(lang, "lists.name")}
            </label>
            <input
              id="list-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(lang, "lists.name")}
              autoFocus
              className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-text placeholder:text-text-muted outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={handleClose}>
              {t(lang, "common.cancel")}
            </Button>
            <Button variant="primary" className="flex-1" type="submit" disabled={!name.trim() || loading}>
              {loading ? t(lang, "common.loading") : t(lang, "lists.create")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
