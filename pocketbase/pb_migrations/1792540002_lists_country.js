/// <reference path="../pb_data/types.d.ts" />

// lists.country — the country the list is used in. Its language is the
// primary (shelf) language of every name shown for the list. Additive: old
// lists keep an empty value and the app falls back to the viewer's country.
// New lists get the creator's country (babelcart_members.pb.js).

migrate((app) => {
  const lists = app.findCollectionByNameOrId("lists");
  lists.fields.add(new TextField({ name: "country", max: 8 }));
  app.save(lists);
}, (app) => {
  const lists = app.findCollectionByNameOrId("lists");
  lists.fields.removeByName("country");
  app.save(lists);
});
