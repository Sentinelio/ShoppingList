/// <reference path="../pb_data/types.d.ts" />

// dictionary.regional_checked — {"en": "2026-11-13", ...}: languages whose
// regional words were already checked for this entry. Entries where every
// country uses the same word store no regional word, so without this the
// admin's "Regional" button kept offering them again. Additive, empty by
// default; written by /api/babelcart/regional-variants.

migrate((app) => {
  const dict = app.findCollectionByNameOrId("dictionary");
  dict.fields.add(new JSONField({ name: "regional_checked" }));
  app.save(dict);
}, (app) => {
  const dict = app.findCollectionByNameOrId("dictionary");
  dict.fields.removeByName("regional_checked");
  app.save(dict);
});
