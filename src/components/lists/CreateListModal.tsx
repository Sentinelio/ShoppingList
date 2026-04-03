import { useState } from "react";
import Modal from "../ui/Modal";
import { useAuth } from "../../hooks/useAuth";
import { createList } from "../../hooks/useList";
import { t } from "../../data/i18n";
import type { Lang } from "../../data/i18n";

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (listId: string) => void;
}

export default function CreateListModal({
  open,
  onClose,
  onCreated,
}: CreateListModalProps) {
  const { user } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);

    try {
      const list = await createList(name.trim(), user.id);
      reset();
      onClose();
      onCreated(list.id);
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <h2 className="text-text font-bold text-lg mb-4">{t(lang, "newList")}</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(lang, "listName")}
          autoFocus
          className="w-full rounded-xl bg-bg border border-border px-4 py-3.5 text-text text-lg placeholder:text-text-muted outline-none focus:border-accent transition-colors"
        />

        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="w-full min-h-12 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          {t(lang, "create")}
        </button>
      </form>
    </Modal>
  );
}
