# MyBeats method organization

This refactor introduces **grouped method namespaces** without renaming or removing
the original methods. The source of truth remains the original implementation.

## Examples

```js
// Both forms invoke precisely the same implementation on the same instance.
uiManager.player.controls.openQueue();
uiManager.player.openQueue();

uiManager.navigation.navigate("library");
uiManager.navigate("library");

uiManager.homePage.events.bindWhenReady();
uiManager.homePage.bindWhenReady();

uiManager.homePage.sync.syncNowPlaying();
uiManager.homePage.syncNowPlaying();

uiManager.search.events.bindKeyboard();
uiManager.search.bindKeyboard();

uiManager.navigator.routes.pathFor("home");
uiManager.navigator.pathFor("home");
```

Home and other route-specific classes are loaded **on demand** by
`source/loader.js`. Do not add another `<script>` tag for each route module.
Shared UI, audio, and player components remain loaded once.

## How grouping works

`window.MethodNamespaces.install(Class, { group: ["methodName"] })` registers
read-only accessors on a class prototype. Each accessor lazily creates a frozen
collection of methods bound to the instance via a `WeakMap`. This means:

- **No existing method name or behavior is replaced.**
- `this` and method arguments are preserved.
- Each instance gets its own group facade; repeated access returns the same facade.
- Existing calls are still supported, so migration can happen gradually.
- Namespace access does not load extra page modules; load routes first.

`PlayerManager` and `UIManager` additionally have their existing method
implementations arranged into small, named classes within the same file. Their
prototype descriptors are installed before application startup. This preserves
the existing global bindings, initialization sequence, and behavior.

For classes that already have a `render()` method, use the `views` namespace
rather than `render`, to avoid shadowing the legacy method.

## Rules for further refactors

1. Keep each original method until **all** external callers have been updated.
2. Distinguish *namespace organization* from *renaming methods*. Introducing
   a new alias should not change the implementation.
3. Never replace player/audio singletons when navigating between routes.
4. Route cleanup concerns listeners, observers, timers and DOM resources.
   Imported JavaScript modules normally stay cached.
5. Test Home live updates, Library filters, Playlists, Favorites, player
   controls, deep links and browser navigation before merging.
6. Do not rename HTML selectors, data attributes, CSS classes, route URLs,
   or event names as part of this behavior-preserving change.

## Review and deployment notes

This is a **stacked change** built on `refactor/home-method-modules` (PR #4).
Merge and validate the lazy-route-loader changes before merging this branch.
No browser-based visual regression tests have been run in ChatGPT.
