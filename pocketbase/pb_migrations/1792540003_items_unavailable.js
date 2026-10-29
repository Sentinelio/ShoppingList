/// <reference path="../pb_data/types.d.ts" />

// "No hay" (out of stock) — additive, `checked` is untouched.
//   · items.unavailable      bool, false by default.
//   · items.unavailable_at   when it was marked (hook-maintained).
//   · lists.unavailable_policy  what happens to those items afterwards:
//       "" / "keep"  stay until moved by hand (default)
//       "next_trip"  back to "to buy" on the next shopping trip (the first
//                    check after more than 3 h without checks)
//       "next_day"   back to "to buy" the next day (hourly cron)
//   · lists.last_checked_at  last time an item of the list was checked
//     (hook-maintained), to tell shopping trips apart.
// See pb_hooks/babelcart_unavailable.pb.js.

migrate((app) => {
  const items = app.findCollectionByNameOrId("items");
  items.fields.add(new BoolField({ name: "unavailable" }));
  items.fields.add(new DateField({ name: "unavailable_at" }));
  app.save(items);

  const lists = app.findCollectionByNameOrId("lists");
  lists.fields.add(new SelectField({ name: "unavailable_policy", values: ["keep", "next_trip", "next_day"], maxSelect: 1 }));
  lists.fields.add(new DateField({ name: "last_checked_at" }));
  app.save(lists);
}, (app) => {
  const items = app.findCollectionByNameOrId("items");
  items.fields.removeByName("unavailable");
  items.fields.removeByName("unavailable_at");
  app.save(items);

  const lists = app.findCollectionByNameOrId("lists");
  lists.fields.removeByName("unavailable_policy");
  lists.fields.removeByName("last_checked_at");
  app.save(lists);
});
