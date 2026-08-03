#!/usr/bin/env python3
"""
rock1 ALSA inspector v2 — enumerate audio devices via /sys + /proc (always works),
probe mixer state via ctypes with defensive try/except per card.

Avoids snd_device_name_hint and snd_card_get_longname (which crashed in v1).
Uses /sys/class/sound for cards, /proc/asound/pcm for PCM streams, and a tight
ctypes loop for mixer elements (playback volume, capture volume, mute switch).
"""
import os, sys, ctypes

def section(title):
    print()
    print(f"=== {title} ===")

# --- 1. CARDS via /sys/class/sound (no alsa lib needed) ---
section("CARDS (from /sys/class/sound)")
cards = []
for entry in sorted(os.listdir("/sys/class/sound")):
    if entry.startswith("card") and entry[len("card"):].isdigit():
        cid = int(entry[len("card"):])
        # card id (short name)
        try:
            with open(f"/sys/class/sound/{entry}/id") as f:
                short = f.read().strip()
        except Exception:
            short = "?"
        cards.append((cid, short))
        print(f"  card {cid}: shortname={short!r}  (/sys/class/sound/{entry})")
print(f"  total: {len(cards)} cards")

# --- 2. PCM streams via /proc/asound/pcm (already populated by kernel) ---
section("PCM STREAMS (from /proc/asound/pcm)")
with open("/proc/asound/pcm") as f:
    for line in f:
        line = line.rstrip()
        if line.strip():
            print(f"  {line}")

# --- 3. ALSA library version (sanity check) ---
section("ALSA LIBRARY")
try:
    lib = ctypes.CDLL("libasound.so.2")
    # don't set argtypes/restype on symbols we won't use (causes load-time failure)
    print(f"  libasound.so.2 loaded: {lib._name}")
    print(f"  /proc/asound/version:  ", end="")
    with open("/proc/asound/version") as f:
        print(f.read().strip())
except Exception as e:
    print(f"  load failed: {e!r}")
    lib = None

if lib is None:
    sys.exit(0)

# --- 4. Mixer state per card via ctypes, defensive ---
section("MIXER CONTROLS (via libasound, per-card)")

# Bindings — only set argtypes on symbols we'll CALL
SND_PCM_STREAM_PLAYBACK = 0
lib.snd_strerror.argtypes = [ctypes.c_int]
lib.snd_strerror.restype = ctypes.c_char_p

lib.snd_mixer_open.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_int]
lib.snd_mixer_open.restype = ctypes.c_int

lib.snd_mixer_attach.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
lib.snd_mixer_attach.restype = ctypes.c_int

# snd_mixer_selem_register(mixer, regopt, callback)
lib.snd_mixer_selem_register.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p]
lib.snd_mixer_selem_register.restype = ctypes.c_int

lib.snd_mixer_load.argtypes = [ctypes.c_void_p]
lib.snd_mixer_load.restype = ctypes.c_int

lib.snd_mixer_close.argtypes = [ctypes.c_void_p]
lib.snd_mixer_close.restype = ctypes.c_int

lib.snd_mixer_first_elem.argtypes = [ctypes.c_void_p]
lib.snd_mixer_first_elem.restype = ctypes.c_void_p

lib.snd_mixer_elem_next.argtypes = [ctypes.c_void_p]
lib.snd_mixer_elem_next.restype = ctypes.c_void_p

lib.snd_mixer_selem_get_index.argtypes = [ctypes.c_void_p]
lib.snd_mixer_selem_get_index.restype = ctypes.c_uint

# snd_mixer_selem_get_name returns const char* directly (no buffer, no rc)
lib.snd_mixer_selem_get_name.argtypes = [ctypes.c_void_p]
lib.snd_mixer_selem_get_name.restype = ctypes.c_char_p

lib.snd_mixer_selem_has_playback_volume.argtypes = [ctypes.c_void_p]
lib.snd_mixer_selem_has_playback_volume.restype = ctypes.c_int

lib.snd_mixer_selem_has_capture_volume.argtypes = [ctypes.c_void_p]
lib.snd_mixer_selem_has_capture_volume.restype = ctypes.c_int

lib.snd_mixer_selem_get_playback_volume_range.argtypes = [
    ctypes.c_void_p, ctypes.POINTER(ctypes.c_long), ctypes.POINTER(ctypes.c_long)
]
lib.snd_mixer_selem_get_playback_volume_range.restype = ctypes.c_int

lib.snd_mixer_selem_get_capture_volume_range.argtypes = [
    ctypes.c_void_p, ctypes.POINTER(ctypes.c_long), ctypes.POINTER(ctypes.c_long)
]
lib.snd_mixer_selem_get_capture_volume_range.restype = ctypes.c_int

lib.snd_mixer_selem_get_playback_volume.argtypes = [
    ctypes.c_void_p, ctypes.c_int, ctypes.POINTER(ctypes.c_long)
]
lib.snd_mixer_selem_get_playback_volume.restype = ctypes.c_int

lib.snd_mixer_selem_get_capture_volume.argtypes = [
    ctypes.c_void_p, ctypes.c_int, ctypes.POINTER(ctypes.c_long)
]
lib.snd_mixer_selem_get_capture_volume.restype = ctypes.c_int

lib.snd_mixer_selem_has_playback_switch.argtypes = [ctypes.c_void_p]
lib.snd_mixer_selem_has_playback_switch.restype = ctypes.c_int

lib.snd_mixer_selem_get_playback_switch.argtypes = [
    ctypes.c_void_p, ctypes.c_int, ctypes.POINTER(ctypes.c_int)
]
lib.snd_mixer_selem_get_playback_switch.restype = ctypes.c_int

def err(rc):
    return f"err {rc}: {lib.snd_strerror(rc).decode(errors='replace')}" if rc < 0 else None

for cid, shortname in cards:
    print(f"  card {cid} ({shortname}):")
    mixer = ctypes.c_void_p()
    try:
        rc = lib.snd_mixer_open(ctypes.byref(mixer), 0)
        if rc < 0:
            print(f"    snd_mixer_open: {err(rc)}")
            continue
        rc = lib.snd_mixer_attach(mixer, f"hw:{cid}".encode())
        if rc < 0:
            print(f"    snd_mixer_attach(hw:{cid}): {err(rc)}")
            lib.snd_mixer_close(mixer)
            continue
        rc = lib.snd_mixer_selem_register(mixer, None, None)
        if rc < 0:
            print(f"    snd_mixer_selem_register: {err(rc)}")
            lib.snd_mixer_close(mixer)
            continue
        rc = lib.snd_mixer_load(mixer)
        if rc < 0:
            print(f"    snd_mixer_load: {err(rc)}")
            lib.snd_mixer_close(mixer)
            continue
        elem = lib.snd_mixer_first_elem(mixer)
        if not elem:
            print("    (no mixer elements)")
            lib.snd_mixer_close(mixer)
            continue
        n = 0
        while elem:
            n += 1
            idx = lib.snd_mixer_selem_get_index(elem)
            name_ptr = lib.snd_mixer_selem_get_name(elem)
            name = name_ptr.decode(errors="replace") if name_ptr else "?"
            pb_str = ""
            if lib.snd_mixer_selem_has_playback_volume(elem):
                try:
                    lo = ctypes.c_long(); hi = ctypes.c_long()
                    lib.snd_mixer_selem_get_playback_volume_range(elem, ctypes.byref(lo), ctypes.byref(hi))
                    span = max(1, hi.value - lo.value)
                    chans = []
                    ch = 0
                    while ch < 8:  # safety cap
                        v = ctypes.c_long()
                        rc = lib.snd_mixer_selem_get_playback_volume(elem, ch, ctypes.byref(v))
                        if rc < 0:
                            break
                        pct = round(100 * (v.value - lo.value) / span)
                        chans.append(f"ch{ch}={pct}%")
                        ch += 1
                    pb_str = "  pb[" + ",".join(chans) + "]"
                except Exception as e:
                    pb_str = f"  pb_read_err={e!r}"
            sw_str = ""
            if lib.snd_mixer_selem_has_playback_switch(elem):
                try:
                    v0 = ctypes.c_int()
                    lib.snd_mixer_selem_get_playback_switch(elem, 0, ctypes.byref(v0))
                    sw_str = f"  mute={'OFF' if v0.value else 'ON'}"
                except Exception:
                    pass
            ca_str = ""
            if lib.snd_mixer_selem_has_capture_volume(elem):
                try:
                    lo = ctypes.c_long(); hi = ctypes.c_long()
                    lib.snd_mixer_selem_get_capture_volume_range(elem, ctypes.byref(lo), ctypes.byref(hi))
                    v = ctypes.c_long()
                    lib.snd_mixer_selem_get_capture_volume(elem, 0, ctypes.byref(v))
                    pct = round(100 * (v.value - lo.value) / max(1, hi.value - lo.value))
                    ca_str = f"  cap={pct}%"
                except Exception:
                    pass
            print(f"    idx={idx:3d} {name!r:28s}{pb_str}{sw_str}{ca_str}")
            try:
                elem = lib.snd_mixer_elem_next(elem)
            except Exception:
                break
        print(f"    ({n} mixer element{'s' if n != 1 else ''})")
        lib.snd_mixer_close(mixer)
    except Exception as e:
        print(f"    EXCEPTION: {e!r}")
        try:
            if mixer.value:
                lib.snd_mixer_close(mixer)
        except Exception:
            pass

print()
print("=== DONE ===")
