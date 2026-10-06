# Building reference sheets

Six original concept sheets for compact architecture in the mystical New York setting. Each PNG shows one asset from the front, right side, rear, above, and an isometric angle. These are **visual references**, not measured orthographic drawings or finished meshes. Generated with OpenAI ImageGen on 2026-10-05 and 2026-10-06.

| Sheet | Role in the game | Model the silhouette first |
| --- | --- | --- |
| [Brooklyn brownstone](brooklyn-brownstone-sheet.png) | Residential street / first district | Narrow brick block, stoop, strong cornice, simple roof tank, warm windows and one turquoise basement grate. |
| [Chinatown shophouse](chinatown-shophouse-sheet.png) | Shop and apartment block / second district | Red awning, corner lanterns, modular brick upper floors, side fire escape, restrained magical seal at the door. |
| [Gothic tenement](gothic-tenement-sheet.png) | Foggy district / catacomb approach | Solid masonry body, four heavy corner piers, two dormers, pointed portal and sparse violet glazing. |
| [Urban overpass](urban-overpass-sheet.png) | Route landmark / sheltered passage for the convoy | One broad stone arch, flat road deck, four lantern piers, thin turquoise light under the span. |
| [Neighborhood bank](neighborhood-bank-sheet.png) | Civic district / beacon power relay | Squat two-story stone block, short columned entrance, roof skylight, a single turquoise ward panel. |
| [Gothic museum](gothic-museum-sheet.png) | Final fog district / treaty archive | Broad gabled masonry hall, four corner buttresses, central stair, narrow pointed windows and one violet relic aperture. |

## Modeling guidance

- Keep the same footprint and facade rhythm in all five views. The generated views are conceptually consistent but may disagree on exact window placement, story count or roof details; pick the isometric view as the source of truth and correct the orthographic views while modeling.
- Build only the large architectural forms in geometry. Make window frames, brick joints, carved cornices and lantern details as texture or a few reusable modules. Avoid loose geometry that disappears from the game's isometric camera.
- Use an opaque base body; make glass/emissive windows separate simple quads. Add fog and magical light in the game engine rather than baking voluminous effects into the mesh.
- Initial target for a repeatable background building: about **1,000–3,000 triangles**, with a cheaper distant variant. The bridge, bank, and museum may need **2,000–5,000 triangles** each as one-off landmarks if their silhouettes remain visible from the game's camera. These are targets to validate in the running game, not automatic guarantees from an image-to-3D service.
- Use small shared materials, reusable windows/stoops/awnings, and texture atlases. Retopologize and inspect generated meshes before integration. Check UVs, normals, hidden backfaces, triangle count, draw calls, and license terms of the 3D service.
- For single-image generation, use the isolated isometric view or generate a clean single-building image. Do not upload the entire five-view sheet as one image: the service may reconstruct five separate buildings. If multi-view input is available, supply individual views after verifying their details agree.

## ImageGen prompt set

All six prompts used the `stylized-concept` use case and specified an original low-poly architectural asset, five consistent views (front, right side, rear, roof, isometric), readable studio lighting, neutral background, simple modular silhouette, and no people, vehicles, text, logos or copied game-map architecture. The individual briefs were:

1. **Brooklyn:** A narrow brownstone with stoop and iron rails, warm russet brick, pale stone lintels, amber windows, a modest rooftop water tank or chimney, and a subtle teal glow from a basement grate.
2. **Chinatown:** A believable New York mixed-use shophouse with brick and painted stucco, side fire escape, unlettered deep-red awning, simple geometric lanterns, teal/magenta windows, and a restrained glowing doorway seal; avoid a pagoda silhouette.
3. **Gothic:** A masonry tenement with pointed catacomb portal, oversized simple corner piers, steep roof and two chunky dormers, violet windows, and faint aqua mist near the base.
4. **Overpass:** A short NYC-inspired road bridge over a playable lane, with one arch, sturdy blockwork, four amber lanterns and one thin turquoise light strip; no suspension cables or iconic landmark silhouette.
5. **Bank:** An original neighborhood civic bank with a restrained columned portico, simple stone masses, rooftop skylight, warm windows and one small turquoise mystical ward; no stock-exchange inscriptions or recognizable landmark copy.
6. **Museum:** A compact urban-Gothic museum/archive with chunky corner buttresses, steep gable, central stair, warm windows and a single violet relic aperture; no cathedral-scale ornament or copied facade.

The official *City Never Sleeps* update informed the district mood; no building from Deadlock was traced or reproduced: <https://www.playdeadlock.com/cityneversleeps>.
