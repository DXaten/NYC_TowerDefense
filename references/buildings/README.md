# Architecture references

Curated five-view concept sheets for an industrial, mystical New York in the late 1990s. The Brooklyn brownstone, Chinatown shophouse and neighborhood bank establish the style: warm brick and stone, amber interiors, metal infrastructure, a little steam, and rare turquoise magical details. The newer sheets use those three images as direct style references. Each sheet shows front, side, rear, top and isometric views. They are concept art, not measured orthographic plans or finished low-poly meshes.

| Sheet | Place in the game | Main silhouette |
| --- | --- | --- |
| [Brooklyn brownstone](brooklyn-brownstone-sheet.png) | Residential street | Narrow brick block, stoop, cornice, rooftop tank. |
| [Chinatown shophouse](chinatown-shophouse-sheet.png) | Mixed-use street | Three-story brick shop, red awning, lanterns, fire escape. |
| [Neighborhood bank](neighborhood-bank-sheet.png) | Civic square and beacon relay | Squat stone mass, restrained portico, rooftop skylight. |
| [Brick powerhouse](brick-powerhouse-sheet.png) | Industrial district and beacon power supply | Two-story brick utility block, broad factory windows, roof ventilation and steam stack. |
| [Elevated subway station](elevated-subway-sheet.png) | Route landmark | Short riveted-steel platform, brick stair tower, clear passage beneath the track. |
| [Industrial skyscraper](industrial-skyscraper-sheet.png) | Skyline landmark and distant backdrop | Slender brick-and-limestone tower, repeated floors, rooftop tank and service equipment. |
| [Green-crown tower](green-crown-tower-sheet.png) | District skyline landmark | Broad office shaft, oxidized-copper green roof and a single narrow spire. |

## Shared visual direction

- Keep the warm brown-gray studio palette, small amber light pools and sparse turquoise symbols seen in the first three approved sheets. Put smog and street fog in the game scene; keep the model itself readable without baked volumetric effects.
- Use believable late-1990s city hardware: fire escapes, water tanks, vents, transformers, riveted beams, steel doors and simple street lamps. Keep windows and facade rhythm consistent across all sides.
- Treat the isometric view as the primary silhouette guide. The generated views can disagree on floor count or small details; reconcile them before modeling.
- Build brick joints, window mullions and roof seams with textures or reusable modules. Do not model every joint. Use one or two small shared material atlases where practical.
- Prototype repeatable buildings around **1,000–3,000 triangles**. Landmarks can start around **3,000–5,000 triangles** if they remain on screen in the isometric camera. Create cheaper distant variants; form the skyscraper from repeated floor modules and a low-detail skyline proxy. Validate these targets on a phone with the actual number of visible assets.
- Keep the station modular: track, platform, canopy, columns and stair block can be reused separately. Check that the caravan path clears the support columns and stair footprint.
- To generate a single 3D model in Tripo or Hunyuan3D, make one isolated isometric image per asset. Do not upload the entire five-view sheet as one image. Inspect the generated mesh, UVs, normals, hidden faces, texture size, triangle count and service license before integrating it.

These designs are original interpretations of the selected urban mood; they do not reproduce a specific real building or game-map asset.
