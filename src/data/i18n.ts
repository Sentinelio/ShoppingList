export type Lang = "en" | "es" | "pl";

export type TranslationKey =
  | "app.name"
  | "app.tagline"
  | "setup.welcome"
  | "setup.nameLabel"
  | "setup.namePlaceholder"
  | "setup.countryLabel"
  | "setup.countryDesc"
  | "setup.langLabel"
  | "setup.langDesc"
  | "setup.finish"
  | "setup.step1Title"
  | "setup.step2Title"
  | "setup.step3Title"
  | "lists.title"
  | "lists.create"
  | "lists.join"
  | "lists.joinCode"
  | "lists.empty"
  | "lists.delete"
  | "lists.leave"
  | "lists.members"
  | "lists.items"
  | "lists.pending"
  | "lists.name"
  | "lists.code"
  | "lists.copied"
  | "lists.settings"
  | "items.add"
  | "items.qty"
  | "items.unit"
  | "items.note"
  | "items.translating"
  | "items.delete"
  | "items.deleteConfirm"
  | "items.edit"
  | "items.checked"
  | "items.unchecked"
  | "items.duplicate"
  | "items.addAnyway"
  | "items.mergeQty"
  | "items.empty"
  | "store.title"
  | "store.show"
  | "store.back"
  | "settings.title"
  | "settings.name"
  | "settings.lang"
  | "settings.country"
  | "settings.save"
  | "settings.saved"
  | "settings.members"
  | "settings.pendingRequests"
  | "settings.approve"
  | "settings.reject"
  | "settings.inviteCode"
  | "common.cancel"
  | "common.confirm"
  | "common.close"
  | "common.loading"
  | "common.error"
  | "common.retry"
  | "common.yes"
  | "common.no"
  | "common.or"
  | "unit.x"
  | "unit.kg"
  | "unit.g"
  | "unit.L"
  | "unit.ml"
  | "unit.pack";

type Translations = Record<TranslationKey, string>;

export const strings: Record<Lang, Translations> = {
  en: {
    "app.name": "Polyglot Cart",
    "app.tagline": "Your multilingual shopping list",

    "setup.welcome": "Get started",
    "setup.nameLabel": "Your name",
    "setup.namePlaceholder": "Enter your name",
    "setup.countryLabel": "Your country",
    "setup.countryDesc": "This determines the shelf language used in stores",
    "setup.langLabel": "Your language",
    "setup.langDesc": "The language you see the app in",
    "setup.finish": "Finish setup",
    "setup.step1Title": "Welcome",
    "setup.step2Title": "Your profile",
    "setup.step3Title": "Preferences",

    "lists.title": "My Lists",
    "lists.create": "Create list",
    "lists.join": "Join list",
    "lists.joinCode": "Enter 6-digit code",
    "lists.empty": "No lists yet",
    "lists.delete": "Delete list",
    "lists.leave": "Leave list",
    "lists.members": "members",
    "lists.items": "items",
    "lists.pending": "Pending approval",
    "lists.name": "List name",
    "lists.code": "Invite code",
    "lists.copied": "Copied!",
    "lists.settings": "List settings",

    "items.add": "Add product...",
    "items.qty": "Qty",
    "items.unit": "Unit",
    "items.note": "Note",
    "items.translating": "Translating...",
    "items.delete": "Delete",
    "items.deleteConfirm": "Delete this item?",
    "items.edit": "Edit",
    "items.checked": "Purchased",
    "items.unchecked": "To buy",
    "items.duplicate": "This product already exists. Add quantity?",
    "items.addAnyway": "Add anyway",
    "items.mergeQty": "Merge quantities",
    "items.empty": "List is empty. Add your first product!",

    "store.title": "Store Mode",
    "store.show": "Show in store",
    "store.back": "Back to list",

    "settings.title": "Settings",
    "settings.name": "Your name",
    "settings.lang": "Your language",
    "settings.country": "Your country",
    "settings.save": "Save",
    "settings.saved": "Saved!",
    "settings.members": "Members",
    "settings.pendingRequests": "Pending requests",
    "settings.approve": "Approve",
    "settings.reject": "Reject",
    "settings.inviteCode": "Invite code",

    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.retry": "Retry",
    "common.yes": "Yes",
    "common.no": "No",
    "common.or": "or",

    "unit.x": "pcs",
    "unit.kg": "kg",
    "unit.g": "g",
    "unit.L": "L",
    "unit.ml": "ml",
    "unit.pack": "pack",
  },

  es: {
    "app.name": "Polyglot Cart",
    "app.tagline": "Tu lista de compras multilingüe",

    "setup.welcome": "Comenzar",
    "setup.nameLabel": "Tu nombre",
    "setup.namePlaceholder": "Ingresa tu nombre",
    "setup.countryLabel": "Tu país",
    "setup.countryDesc": "Esto determina el idioma de estantería usado en tiendas",
    "setup.langLabel": "Tu idioma",
    "setup.langDesc": "El idioma en que ves la aplicación",
    "setup.finish": "Finalizar configuración",
    "setup.step1Title": "Bienvenido",
    "setup.step2Title": "Tu perfil",
    "setup.step3Title": "Preferencias",

    "lists.title": "Mis Listas",
    "lists.create": "Crear lista",
    "lists.join": "Unirse a lista",
    "lists.joinCode": "Ingresa código de 6 dígitos",
    "lists.empty": "Aún no hay listas",
    "lists.delete": "Eliminar lista",
    "lists.leave": "Abandonar lista",
    "lists.members": "miembros",
    "lists.items": "artículos",
    "lists.pending": "Aprobación pendiente",
    "lists.name": "Nombre de la lista",
    "lists.code": "Código de invitación",
    "lists.copied": "¡Copiado!",
    "lists.settings": "Ajustes de lista",

    "items.add": "Agregar producto...",
    "items.qty": "Cant.",
    "items.unit": "Unidad",
    "items.note": "Nota",
    "items.translating": "Traduciendo...",
    "items.delete": "Eliminar",
    "items.deleteConfirm": "¿Eliminar este artículo?",
    "items.edit": "Editar",
    "items.checked": "Comprado",
    "items.unchecked": "Por comprar",
    "items.duplicate": "Este producto ya existe. ¿Agregar cantidad?",
    "items.addAnyway": "Agregar de todos modos",
    "items.mergeQty": "Combinar cantidades",
    "items.empty": "La lista está vacía. ¡Agrega tu primer producto!",

    "store.title": "Modo Tienda",
    "store.show": "Mostrar en tienda",
    "store.back": "Volver a la lista",

    "settings.title": "Ajustes",
    "settings.name": "Tu nombre",
    "settings.lang": "Tu idioma",
    "settings.country": "Tu país",
    "settings.save": "Guardar",
    "settings.saved": "¡Guardado!",
    "settings.members": "Miembros",
    "settings.pendingRequests": "Solicitudes pendientes",
    "settings.approve": "Aprobar",
    "settings.reject": "Rechazar",
    "settings.inviteCode": "Código de invitación",

    "common.cancel": "Cancelar",
    "common.confirm": "Confirmar",
    "common.close": "Cerrar",
    "common.loading": "Cargando...",
    "common.error": "Algo salió mal",
    "common.retry": "Reintentar",
    "common.yes": "Sí",
    "common.no": "No",
    "common.or": "o",

    "unit.x": "uds",
    "unit.kg": "kg",
    "unit.g": "g",
    "unit.L": "L",
    "unit.ml": "ml",
    "unit.pack": "paq.",
  },

  pl: {
    "app.name": "Polyglot Cart",
    "app.tagline": "Twoja wielojęzyczna lista zakupów",

    "setup.welcome": "Rozpocznij",
    "setup.nameLabel": "Twoje imię",
    "setup.namePlaceholder": "Wpisz swoje imię",
    "setup.countryLabel": "Twój kraj",
    "setup.countryDesc": "To określa język półkowy używany w sklepach",
    "setup.langLabel": "Twój język",
    "setup.langDesc": "Język, w którym widzisz aplikację",
    "setup.finish": "Zakończ konfigurację",
    "setup.step1Title": "Witaj",
    "setup.step2Title": "Twój profil",
    "setup.step3Title": "Preferencje",

    "lists.title": "Moje Listy",
    "lists.create": "Utwórz listę",
    "lists.join": "Dołącz do listy",
    "lists.joinCode": "Wpisz 6-cyfrowy kod",
    "lists.empty": "Brak list",
    "lists.delete": "Usuń listę",
    "lists.leave": "Opuść listę",
    "lists.members": "członków",
    "lists.items": "produktów",
    "lists.pending": "Oczekuje na zatwierdzenie",
    "lists.name": "Nazwa listy",
    "lists.code": "Kod zaproszenia",
    "lists.copied": "Skopiowano!",
    "lists.settings": "Ustawienia listy",

    "items.add": "Dodaj produkt...",
    "items.qty": "Ilość",
    "items.unit": "Jedn.",
    "items.note": "Notatka",
    "items.translating": "Tłumaczenie...",
    "items.delete": "Usuń",
    "items.deleteConfirm": "Usunąć ten produkt?",
    "items.edit": "Edytuj",
    "items.checked": "Kupione",
    "items.unchecked": "Do kupienia",
    "items.duplicate": "Ten produkt już istnieje. Dodać ilość?",
    "items.addAnyway": "Dodaj mimo to",
    "items.mergeQty": "Połącz ilości",
    "items.empty": "Lista jest pusta. Dodaj swój pierwszy produkt!",

    "store.title": "Tryb Sklepowy",
    "store.show": "Pokaż w sklepie",
    "store.back": "Wróć do listy",

    "settings.title": "Ustawienia",
    "settings.name": "Twoje imię",
    "settings.lang": "Twój język",
    "settings.country": "Twój kraj",
    "settings.save": "Zapisz",
    "settings.saved": "Zapisano!",
    "settings.members": "Członkowie",
    "settings.pendingRequests": "Oczekujące prośby",
    "settings.approve": "Zatwierdź",
    "settings.reject": "Odrzuć",
    "settings.inviteCode": "Kod zaproszenia",

    "common.cancel": "Anuluj",
    "common.confirm": "Potwierdź",
    "common.close": "Zamknij",
    "common.loading": "Ładowanie...",
    "common.error": "Coś poszło nie tak",
    "common.retry": "Ponów",
    "common.yes": "Tak",
    "common.no": "Nie",
    "common.or": "lub",

    "unit.x": "szt.",
    "unit.kg": "kg",
    "unit.g": "g",
    "unit.L": "L",
    "unit.ml": "ml",
    "unit.pack": "opak.",
  },
};

/**
 * Translate a key for the given language.
 * Falls back to English if the key is missing in the requested language.
 */
export function t(lang: Lang, key: TranslationKey): string {
  return strings[lang]?.[key] ?? strings.en[key] ?? key;
}
