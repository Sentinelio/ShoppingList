-- ============================================================
-- 005_store_phrases_table.sql
-- Store-mode phrases that the shopper can tap to show to the
-- shopkeeper ("Do you have this?", "Where is it?", …).
-- Translated to every enabled language, managed from the Admin.
-- ============================================================

CREATE TABLE IF NOT EXISTS store_phrases (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key          text UNIQUE NOT NULL,
    emoji        text NOT NULL DEFAULT '💬',
    translations jsonb NOT NULL DEFAULT '{}'::jsonb,
    sort_order   int  NOT NULL DEFAULT 0,
    usage_count  int  NOT NULL DEFAULT 0,
    last_used_at timestamptz,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_phrases_order
    ON store_phrases (sort_order);
CREATE INDEX IF NOT EXISTS idx_store_phrases_usage
    ON store_phrases (usage_count DESC);

-- RPC helper: increment the usage count atomically. Called from StoreMode
-- every time a shopper taps a phrase. Keeps the client code to one line.
CREATE OR REPLACE FUNCTION increment_store_phrase_usage(p_key text)
RETURNS void AS $$
BEGIN
    UPDATE store_phrases
    SET usage_count = usage_count + 1,
        last_used_at = now()
    WHERE key = p_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous users to call the RPC (shoppers don't have real auth yet).
GRANT EXECUTE ON FUNCTION increment_store_phrase_usage(text) TO anon, authenticated;

ALTER TABLE store_phrases ENABLE ROW LEVEL SECURITY;

-- Public read — all shoppers see the phrases.
CREATE POLICY "store_phrases_select_public" ON store_phrases
    FOR SELECT USING (true);

-- Writes are admin only; the anon client cannot mutate. Admins use the
-- service role via the seed-dictionary-style Edge Function path or the
-- Admin panel with service-role keys configured server-side.
-- (For now, anon key is also allowed to insert/update so the Admin can
-- edit phrases. Tighten later once we introduce real auth.)
CREATE POLICY "store_phrases_write_anon" ON store_phrases
    FOR ALL USING (true) WITH CHECK (true);

-- Seed the initial six phrases that previously lived in
-- src/data/storePhrases.ts so existing shoppers keep the same experience.
INSERT INTO store_phrases (key, emoji, sort_order, translations) VALUES
('looking', '🔍', 10, '{"en":"I''m looking for this","es":"Estoy buscando esto","pl":"Szukam tego","zh":"我在找这个","hi":"मैं यह ढूंढ रहा हूँ","ar":"أبحث عن هذا","bn":"আমি এটা খুঁজছি","ja":"これを探しています","de":"Ich suche das","fr":"Je cherche ceci","it":"Sto cercando questo","pt":"Estou procurando isto"}'::jsonb),
('have',    '❓', 20, '{"en":"Do you have this?","es":"¿Tienen esto?","pl":"Czy macie to?","zh":"你们有这个吗？","hi":"क्या यह आपके पास है?","ar":"هل لديكم هذا؟","bn":"এটা কি আছে?","ja":"これはありますか？","de":"Haben Sie das?","fr":"Avez-vous ceci?","it":"Avete questo?","pt":"Vocês têm isto?"}'::jsonb),
('where',   '📍', 30, '{"en":"Where can I find this?","es":"¿Dónde puedo encontrar esto?","pl":"Gdzie mogę to znaleźć?","zh":"这个在哪里？","hi":"यह कहाँ मिलेगा?","ar":"أين أجد هذا؟","bn":"এটা কোথায় পাব?","ja":"これはどこにありますか？","de":"Wo finde ich das?","fr":"Où puis-je trouver ceci?","it":"Dove posso trovare questo?","pt":"Onde posso encontrar isto?"}'::jsonb),
('alt',     '🔄', 40, '{"en":"Is there an alternative?","es":"¿Hay alguna alternativa?","pl":"Czy jest alternatywa?","zh":"有替代品吗？","hi":"क्या कोई विकल्प है?","ar":"هل يوجد بديل؟","bn":"বিকল্প কিছু আছে?","ja":"代わりのものはありますか？","de":"Gibt es eine Alternative?","fr":"Y a-t-il une alternative?","it":"C''è un''alternativa?","pt":"Existe alternativa?"}'::jsonb),
('price',   '💰', 50, '{"en":"How much does it cost?","es":"¿Cuánto cuesta?","pl":"Ile to kosztuje?","zh":"这个多少钱？","hi":"इसकी कीमत कितनी है?","ar":"كم سعر هذا؟","bn":"এটার দাম কত?","ja":"いくらですか？","de":"Wie viel kostet das?","fr":"Combien ça coûte?","it":"Quanto costa?","pt":"Quanto custa?"}'::jsonb),
('thanks',  '🙏', 60, '{"en":"Thank you!","es":"¡Gracias!","pl":"Dziękuję!","zh":"谢谢！","hi":"धन्यवाद!","ar":"شكراً!","bn":"ধন্যবাদ!","ja":"ありがとうございます！","de":"Danke!","fr":"Merci!","it":"Grazie!","pt":"Obrigado!"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
