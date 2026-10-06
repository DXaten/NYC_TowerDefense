# Building reference sheets

Six original concept sheets for architecture in the mystical New York setting. Each PNG shows one asset from the front, right side, rear, above, and an isometric angle. These are **visual references**, not measured orthographic drawings or finished meshes. Generated with OpenAI ImageGen on 2026-10-05 and 2026-10-06. The three latest landmarks also have isolated [isometric inputs](inputs/) for single-image 3D generation.

| Sheet | Role in the game | Model the silhouette first |
| --- | --- | --- |
| [Brooklyn brownstone](brooklyn-brownstone-sheet.png) | Residential street / first district | Narrow brick block, stoop, strong cornice, simple roof tank, warm windows and one turquoise basement grate. |
| [Chinatown shophouse](chinatown-shophouse-sheet.png) | Shop and apartment block / second district | Red awning, corner lanterns, modular brick upper floors, side fire escape, restrained magical seal at the door. |
| [Gothic chapel](gothic-chapel-sheet.png) | Foggy district / first beacon clue | Small one-story nave, steep slate roof, one short bell turret and warm oculus. |
| [Suspension bridge](suspension-bridge-sheet.png) | Convoy crossing / dramatic route landmark | Rust-red steel, two tall open towers, sparse catenary cables, drivable deck and amber lamps. |
| [Neighborhood bank](neighborhood-bank-sheet.png) | Civic district / beacon power relay | Squat two-story stone block, short columned entrance, roof skylight, a single turquoise ward panel. |
| [Gothic church](gothic-church-sheet.png) | Final fog district / treaty archive | Long high nave, twin front bell towers, rose window, broad buttresses and a polygonal apse. |

## Modeling guidance

- Keep the same footprint and facade rhythm in all five views. The generated views are conceptually consistent but may disagree on exact window placement, story count or roof details; pick the isometric view as the source of truth and correct the orthographic views while modeling.
- Build only the large architectural forms in geometry. Make window frames, brick joints, carved cornices and lantern details as texture or a few reusable modules. Avoid loose geometry that disappears from the game's isometric camera.
- Use an opaque base body; make glass/emissive windows separate simple quads. Add fog and magical light in the game engine rather than baking voluminous effects into the mesh.
- Initial target for a repeatable background building: about **1,000–3,000 triangles**, with a cheaper distant variant. The chapel, bank, bridge, and church may need **2,000–5,000 triangles** each as one-off landmarks if their silhouettes remain visible from the game's camera. Keep bridge cables sparse, as simple curves or strips; use broad church masonry forms and texture detail rather than modeling every joint. These are targets to validate in the running game, not automatic guarantees from an image-to-3D service.
- Use small shared materials, reusable windows/stoops/awnings, and texture atlases. Retopologize and inspect generated meshes before integration. Check UVs, normals, hidden backfaces, triangle count, draw calls, and license terms of the 3D service.
- For single-image generation, use the isolated isometric view or generate a clean single-building image. Do not upload the entire five-view sheet as one image: the service may reconstruct five separate buildings. If multi-view input is available, supply individual views after verifying their details agree.

## Isolated 3D inputs

| Input | Model |
| --- | --- |
| [Suspension bridge](inputs/suspension-bridge-isometric.png) | One complete bridge on neutral background. In a game engine, the anchors, deck, towers and cables may be cheaper and cleaner as separate repeated parts rather than a single generated mesh. |
| [Gothic chapel](inputs/gothic-chapel-isometric.png) | One compact chapel; keep the roof, walls, turret and buttresses as broad forms. |
| [Gothic church](inputs/gothic-church-isometric.png) | One large twin-tower church; generated meshes will likely need substantial retopology and texture simplification. |

Each input was created from its corresponding sheet with a prompt for one isolated three-quarter isometric object, light neutral studio background, and simplified geometry. The inputs are concept art, not evidence of a target polygon count.

## ImageGen prompt set

All six prompts used the `stylized-concept` use case and specified an original low-poly architectural asset, five consistent views (front, right side, rear, roof, isometric), readable studio lighting, neutral background, simple modular silhouette, and no people, vehicles, text, logos or copied game-map architecture. The individual briefs were:

1. **Brooklyn:** A narrow brownstone with stoop and iron rails, warm russet brick, pale stone lintels, amber windows, a modest rooftop water tank or chimney, and a subtle teal glow from a basement grate.
2. **Chinatown:** A believable New York mixed-use shophouse with brick and painted stucco, side fire escape, unlettered deep-red awning, simple geometric lanterns, teal/magenta windows, and a restrained glowing doorway seal; avoid a pagoda silhouette.
3. **Chapel:** A compact single-story Gothic chapel with a steep slate roof, one short open bell turret, warm-lit oculus, pointed doorway, a few side windows, broad buttresses, and faint aqua mist near the base. Keep it visibly smaller than the church.
4. **Suspension bridge:** An original rust-red American suspension bridge inspired by the general Golden Gate archetype, with two tall steel towers, sparse catenary cables, a clear drivable deck, amber lamps, turquoise anchor wards, and blue-gray smog. Avoid exact landmark proportions, signage, and tourist branding.
5. **Bank:** An original neighborhood civic bank with a restrained columned portico, simple stone masses, rooftop skylight, warm windows and one small turquoise mystical ward; no stock-exchange inscriptions or recognizable landmark copy.
6. **Church:** A larger Gothic church with a long high nave, twin square front bell towers, rose window, pointed entry, broad stepped buttresses, apse, muted violet glazing, and sparse warm spotlighting. Keep the geometry broad and modular, distinct from the small chapel.

The official *City Never Sleeps* update informed the district mood; no building from Deadlock was traced or reproduced: <https://www.playdeadlock.com/cityneversleeps>.
