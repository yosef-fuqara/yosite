"""Retimes the existing FLY action and glTF clip by exactly 2x.

Pose samples, model geometry, skin, pivots, materials and other clips are kept
unchanged. Run with Blender 5.2 and the existing animated .blend open.
"""
import bpy
import json
import struct
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
GLB = HERE.parents[1] / "public" / "models" / "butterfly-animated.glb"
FACTOR = 2.0

# Retiming an existing FLY action: scale frame coordinates and Bezier handle
# coordinates together; leave all pose values and IDLE/GLIDE untouched.
action = bpy.data.actions.get("FLY")
assert action and abs(action.get("duration_seconds", 0) - 1.0) < 1e-8
before = []
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                before.extend((curve.data_path, curve.array_index, tuple(p.co),
                               tuple(p.handle_left), tuple(p.handle_right))
                              for p in curve.keyframe_points)
                for point in curve.keyframe_points:
                    point.co.x *= FACTOR
                    point.handle_left.x *= FACTOR
                    point.handle_right.x *= FACTOR
                curve.update()
assert before
action["duration_seconds"] = 2.0
action["retimed_from_seconds"] = 1.0
action["retime_factor"] = FACTOR

# The editable source keeps IDLE selected and the same scene timeline range.
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "butterfly-animated.blend"))

# Apply the equivalent time-domain transform to the existing GLB. Cubic spline
# value rows remain bit-identical; derivative rows scale by 1/FACTOR.
raw = GLB.read_bytes()
assert raw[:4] == b"glTF" and struct.unpack_from("<I", raw, 4)[0] == 2
json_len = struct.unpack_from("<I", raw, 12)[0]
doc = json.loads(raw[20:20 + json_len])
bin_header = 20 + json_len
assert raw[bin_header + 4:bin_header + 8] == b"BIN\0"
bin_len = struct.unpack_from("<I", raw, bin_header)[0]
binary = bytearray(raw[bin_header + 8:bin_header + 8 + bin_len])

def accessor_view(index):
    acc = doc["accessors"][index]
    view = doc["bufferViews"][acc["bufferView"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[acc["type"]]
    stride = view.get("byteStride", width * 4)
    assert acc["componentType"] == 5126 and stride == width * 4
    return acc, start, count, width

fly = next(animation for animation in doc["animations"] if animation["name"] == "FLY")
time_accessors = set()
output_accessors = set()
for sampler in fly["samplers"]:
    time_accessors.add(sampler["input"])
    output_accessors.add(sampler["output"])
assert time_accessors and output_accessors

for index in time_accessors:
    acc, start, count, _ = accessor_view(index)
    times = np.frombuffer(binary, dtype="<f4", count=count, offset=start).copy()
    assert abs(float(times[0])) < 1e-7 and abs(float(times[-1]) - 1.0) < 1e-5
    times *= FACTOR
    binary[start:start + count * 4] = times.astype("<f4").tobytes()
    acc["min"] = [float(times.min())]
    acc["max"] = [float(times.max())]

for index in output_accessors:
    _, start, count, width = accessor_view(index)
    values = np.frombuffer(binary, dtype="<f4", count=count * width, offset=start).copy().reshape(count, width)
    assert count % 3 == 0, "Expected glTF CUBICSPLINE in/value/out rows"
    values[0::3] /= FACTOR
    values[2::3] /= FACTOR
    binary[start:start + count * width * 4] = values.astype("<f4").tobytes()

encoded = json.dumps(doc, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
encoded += b" " * ((-len(encoded)) % 4)
binary += b"\0" * ((-len(binary)) % 4)
total = 12 + 8 + len(encoded) + 8 + len(binary)
GLB.write_bytes(struct.pack("<4sII", b"glTF", 2, total)
                 + struct.pack("<I4s", len(encoded), b"JSON") + encoded
                 + struct.pack("<I4s", len(binary), b"BIN\0") + binary)
print(json.dumps({"source": str(HERE / "butterfly-animated.blend"),
                  "glb": str(GLB), "fly_duration_seconds": 2.0,
                  "retime_factor": FACTOR,
                  "time_accessors": len(time_accessors),
                  "cubic_output_accessors": len(output_accessors)}, indent=2))
