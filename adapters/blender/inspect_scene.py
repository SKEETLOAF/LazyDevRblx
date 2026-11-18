"""Read-only LAZY DevKit Blender scene inspection.

Run only through the explicit local CLI. No .blend file is saved. Previews are
optional, low-resolution temporary workbench renders into a new output folder.
Blender owns this process and embedded .blend files remain untrusted.
"""
import bpy
from datetime import datetime, timezone
import json
from mathutils import Vector
from pathlib import Path
import sys


def argument(name):
    if "--" not in sys.argv:
        raise ValueError("Missing explicit script arguments")
    argv = sys.argv[sys.argv.index("--") + 1:]
    if name not in argv or argv.index(name) + 1 >= len(argv):
        raise ValueError("Missing " + name)
    return argv[argv.index(name) + 1]


def clipped(text, limit=120):
    return str(text)[:limit]


def report_object(obj):
    mesh = obj.data if obj.type == "MESH" else None
    rig = obj.data if obj.type == "ARMATURE" else None
    animation = getattr(obj, "animation_data", None)
    action = getattr(animation, "action", None) if animation else None
    return {
        "name": clipped(obj.name),
        "type": clipped(obj.type, 40),
        "parent": clipped(obj.parent.name) if obj.parent else None,
        "collections": [clipped(c.name) for c in list(obj.users_collection)[:20]],
        "vertexCount": len(mesh.vertices) if mesh else 0,
        "faceCount": len(mesh.polygons) if mesh else 0,
        "uvLayers": len(mesh.uv_layers) if mesh else 0,
        "materialSlots": len(obj.material_slots),
        "modifierTypes": [clipped(m.type, 40) for m in list(obj.modifiers)[:64]],
        "armatureBones": len(rig.bones) if rig else 0,
        "actionName": clipped(action.name) if action else None,
    }


def render_previews(folder, warnings):
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == "MESH" and not o.hide_render]
    if not meshes:
        warnings.append("No visible scene meshes available for workbench preview rendering.")
        return
    coords = []
    for obj in meshes[:1000]:
        try:
            coords.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
        except (ValueError, TypeError, AttributeError):
            continue
    if not coords:
        warnings.append("No valid mesh bounding boxes to frame previews.")
        return
    minimum = Vector([min(v[i] for v in coords) for i in range(3)])
    maximum = Vector([max(v[i] for v in coords) for i in range(3)])
    center = (maximum + minimum) / 2
    extent = maximum - minimum
    diameter = max(extent.length, 0.1)
    camera_data = bpy.data.cameras.new("LAZY_Temporary_Camera")
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = diameter * 1.6
    camera = bpy.data.objects.new("LAZY_Temporary_Camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    views = [
        ("front", Vector((0, -2.5, 0.4))),
        ("side", Vector((2.5, 0, 0.4))),
        ("three-quarter", Vector((2.0, -2.0, 1.3))),
    ]
    for name, direction in views:
        try:
            camera.location = center + direction.normalized() * diameter * 2.5
            camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
            scene.render.filepath = str(folder / (name + ".png"))
            bpy.ops.render.render(write_still=True)
        except Exception:
            warnings.append("Workbench preview failed for " + name + "; inspect renderer compatibility.")
    # Temporary changes are not saved. The original blend remains untouched.


def main():
    output = Path(argument("--output"))
    if not output.exists() or not output.is_dir():
        raise ValueError("Explicit output directory must exist")
    if not bpy.data.filepath:
        raise ValueError("No opened .blend scene")
    label = Path(bpy.data.filepath).name
    if len(label.encode('utf-8')) > 120:
        raise ValueError("Scene filename is too long for a bounded audit")
    objects = list(bpy.data.objects)
    count = len(objects)
    warnings = []
    if count > 128:
        warnings.append("Object details truncated to 128. Aggregate counts cover the entire file.")
    if bpy.context.scene is None:
        warnings.append("No active scene; previews cannot be rendered.")
    if "--previews" in sys.argv[sys.argv.index("--") + 1:] and bpy.context.scene:
        render_previews(output, warnings)
    warnings = warnings[:12]
    report = {
        "schema": "lazydev.creative_audit.v1",
        "kind": "blender",
        "sourceLabel": label,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "tool": "lazydev.blender-inspector.v1",
        "facts": {
            "blenderVersion": clipped(bpy.app.version_string, 60),
            "objectCount": count,
            "meshCount": sum(o.type == "MESH" for o in objects),
            "vertexCount": sum(len(o.data.vertices) for o in objects if o.type == "MESH"),
            "faceCount": sum(len(o.data.polygons) for o in objects if o.type == "MESH"),
            "armatureCount": sum(o.type == "ARMATURE" for o in objects),
            "actionCount": len(bpy.data.actions),
            "objects": [report_object(o) for o in objects[:128]],
            "truncated": count > 128,
        },
        "warnings": warnings,
    }
    path = output / "audit.json"
    if path.exists():
        raise ValueError("Refusing to overwrite an existing audit.json")
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding='utf-8')
    print("LAZY_DEVKIT_AUDIT_WRITTEN")


if __name__ == "__main__":
    main()
