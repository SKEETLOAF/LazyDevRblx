---
name: modeling
description: Practical stylized and realistic 3D modeling, topology, rig-ready construction and Roblox mesh import review.
---

# Modeling

First identify subject, camera distance, silhouette references, moving/deforming surfaces, and style profile. Block out primary anatomy/form without assuming rounded clay primitives or subdividing every detail into disconnected parts. Use appropriate custom meshes, Parts, texture detail or hybrids.

Choose topology that supports the intended form and deformation: purposeful edge density, normals and shading, clean intersections, valid pivots, UV and material boundaries, exportable scale. For a creature, preserve the transition across neck/shoulders/hips and check details conform to curved anatomy. For a mechanical object, decide which independently animated panels, hinges and accessories need separate objects.

In Blender, plan individual objects and collections by **editing responsibility**; join only when topology or export warrants it. In Studio, confirm MeshPart grouping, collisions, rig/attachment positions and visual appearance at target camera distance. Avoid inventing direct Blender control when no tool is connected.

**Quality evidence:** user-approved side/front/three-quarter views, structure snapshot, and rig pose/movement evidence when applicable. Assess silhouette, visual style, detail integration, normals, seam placement and maintainability independently. A successful FBX or glTF import is not proof that the model looks good.

**References:** Roblox custom assets and importer documentation from `lazydev_plan_competency_task`; use approved modeling reference images before guessing hidden geometry.
