"""Print stable action-curve signatures for old/new source retime comparison."""
import bpy
import json
import sys
from pathlib import Path

report = {}
for name in ("IDLE", "FLY", "GLIDE"):
    action = bpy.data.actions.get(name)
    assert action
    curves = {}
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    curves[f"{curve.data_path}:{curve.array_index}"] = [
                        {"co": list(point.co), "left": list(point.handle_left),
                         "right": list(point.handle_right), "interpolation": point.interpolation}
                        for point in curve.keyframe_points
                    ]
    report[name] = {"duration_seconds": action.get("duration_seconds"), "curves": curves}
payload = json.dumps(report, separators=(",", ":"))
if "--" in sys.argv:
    Path(sys.argv[sys.argv.index("--") + 1]).write_text(payload, encoding="utf-8")
else:
    print(payload)
