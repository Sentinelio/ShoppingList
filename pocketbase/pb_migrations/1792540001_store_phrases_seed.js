/// <reference path="../pb_data/types.d.ts" />

// Initial store-mode phrases (data from supabase/migrations/005).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("store_phrases");
  const rows = [
    {"key":"looking","emoji":"🔍","sort_order":10,"translations":{"en":"I'm looking for this","es":"Estoy buscando esto","pl":"Szukam tego","zh":"我在找这个","hi":"मैं यह ढूंढ रहा हूँ","ar":"أبحث عن هذا","bn":"আমি এটা খুঁজছি","ja":"これを探しています","de":"Ich suche das","fr":"Je cherche ceci","it":"Sto cercando questo","pt":"Estou procurando isto"}},
    {"key":"have","emoji":"❓","sort_order":20,"translations":{"en":"Do you have this?","es":"¿Tienen esto?","pl":"Czy macie to?","zh":"你们有这个吗？","hi":"क्या यह आपके पास है?","ar":"هل لديكم هذا؟","bn":"এটা কি আছে?","ja":"これはありますか？","de":"Haben Sie das?","fr":"Avez-vous ceci?","it":"Avete questo?","pt":"Vocês têm isto?"}},
    {"key":"where","emoji":"📍","sort_order":30,"translations":{"en":"Where can I find this?","es":"¿Dónde puedo encontrar esto?","pl":"Gdzie mogę to znaleźć?","zh":"这个在哪里？","hi":"यह कहाँ मिलेगा?","ar":"أين أجد هذا؟","bn":"এটা কোথায় পাব?","ja":"これはどこにありますか？","de":"Wo finde ich das?","fr":"Où puis-je trouver ceci?","it":"Dove posso trovare questo?","pt":"Onde posso encontrar isto?"}},
    {"key":"alt","emoji":"🔄","sort_order":40,"translations":{"en":"Is there an alternative?","es":"¿Hay alguna alternativa?","pl":"Czy jest alternatywa?","zh":"有替代品吗？","hi":"क्या कोई विकल्प है?","ar":"هل يوجد بديل؟","bn":"বিকল্প কিছু আছে?","ja":"代わりのものはありますか？","de":"Gibt es eine Alternative?","fr":"Y a-t-il une alternative?","it":"C'è un'alternativa?","pt":"Existe alternativa?"}},
    {"key":"price","emoji":"💰","sort_order":50,"translations":{"en":"How much does it cost?","es":"¿Cuánto cuesta?","pl":"Ile to kosztuje?","zh":"这个多少钱？","hi":"इसकी कीमत कितनी है?","ar":"كم سعر هذا؟","bn":"এটার দাম কত?","ja":"いくらですか？","de":"Wie viel kostet das?","fr":"Combien ça coûte?","it":"Quanto costa?","pt":"Quanto custa?"}},
    {"key":"thanks","emoji":"🙏","sort_order":60,"translations":{"en":"Thank you!","es":"¡Gracias!","pl":"Dziękuję!","zh":"谢谢！","hi":"धन्यवाद!","ar":"شكراً!","bn":"ধন্যবাদ!","ja":"ありがとうございます！","de":"Danke!","fr":"Merci!","it":"Grazie!","pt":"Obrigado!"}},
  ];
  for (const row of rows) {
    try {
      app.findFirstRecordByData("store_phrases", "key", row.key);
      continue; // already there
    } catch (_) { /* not found → insert */ }
    const record = new Record(collection);
    record.set("key", row.key);
    record.set("emoji", row.emoji);
    record.set("sort_order", row.sort_order);
    record.set("usage_count", 0);
    record.set("translations", row.translations);
    app.save(record);
  }
}, (app) => {
  for (const key of ["looking", "have", "where", "alt", "price", "thanks"]) {
    try { app.delete(app.findFirstRecordByData("store_phrases", "key", key)); } catch (_) { /* gone */ }
  }
});
