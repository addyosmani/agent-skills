#!/usr/bin/env python3
"""
rock1 ALSA PCM player (v2) using ctypes -> libasound.so.2.
No external deps (no python-alsa, no aplay). Plays raw S16_LE mono or stereo PCM.
The Analog hw:1,0 device only accepts stereo, so mono input is auto-expanded to
stereo by duplicating each sample (L=R).
Usage: python3 play.py <pcm_file> [--device hw:1,0] [--rate 22050] [--in-channels 1]
"""
import sys, os, ctypes, struct, time

# --- ALSA bindings (subset we need) -----------------------------------------
lib = ctypes.CDLL("libasound.so.2")

lib.snd_pcm_open.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_char_p, ctypes.c_int, ctypes.c_int]
lib.snd_pcm_open.restype = ctypes.c_int

SND_PCM_FORMAT_S16_LE = 2
SND_PCM_ACCESS_RW_INTERLEAVED = 3
lib.snd_pcm_set_params.argtypes = [
    ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_uint, ctypes.c_uint,
    ctypes.c_int, ctypes.c_uint,
]
lib.snd_pcm_set_params.restype = ctypes.c_int

lib.snd_pcm_writei.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_long]
lib.snd_pcm_writei.restype = ctypes.c_long

lib.snd_pcm_drain.argtypes = [ctypes.c_void_p]
lib.snd_pcm_drain.restype = ctypes.c_int

lib.snd_pcm_close.argtypes = [ctypes.c_void_p]
lib.snd_pcm_close.restype = ctypes.c_int

lib.snd_strerror.argtypes = [ctypes.c_int]
lib.snd_strerror.restype = ctypes.c_char_p

SND_PCM_STREAM_PLAYBACK = 0

def alsa_err(rc):
    return f"ALSA err {rc}: {lib.snd_strerror(rc).decode()}"

def main():
    if len(sys.argv) < 2:
        print("usage: play.py <pcm_file> [--device hw:1,0] [--rate 22050] [--in-channels 1]", file=sys.stderr)
        sys.exit(2)
    pcm_path = sys.argv[1]
    device = b"hw:1,0"
    rate = 22050
    in_channels = 1
    out_channels = 2  # hw:1,0 (Analog) only accepts stereo
    args = sys.argv[2:]
    while args:
        if args[0] == "--device" and len(args) > 1: device = args[1].encode(); args = args[2:]
        elif args[0] == "--rate" and len(args) > 1: rate = int(args[1]); args = args[2:]
        elif args[0] == "--in-channels" and len(args) > 1: in_channels = int(args[1]); out_channels = max(2, in_channels); args = args[2:]
        else: args = args[1:]

    file_size = os.path.getsize(pcm_path)
    bytes_per_input_frame = 2 * in_channels
    bytes_per_output_frame = 2 * out_channels
    input_frames_total = file_size // bytes_per_input_frame
    duration_s = input_frames_total / rate
    print(f"=== rock1 ALSA player (v2 stereo-aware) ===")
    print(f"file:           {pcm_path}")
    print(f"file size:      {file_size} bytes")
    print(f"in channels:    {in_channels}")
    print(f"out channels:   {out_channels}")
    print(f"sample rate:    {rate} Hz")
    print(f"format:         S16_LE")
    print(f"duration:       {duration_s:.3f} s ({input_frames_total} frames)")
    print(f"device:         {device.decode()}")

    handle = ctypes.c_void_p()
    rc = lib.snd_pcm_open(ctypes.byref(handle), device, SND_PCM_STREAM_PLAYBACK, 0)
    if rc < 0:
        print(f"snd_pcm_open({device.decode()}) failed: {alsa_err(rc)}", file=sys.stderr)
        sys.exit(1)
    print(f"snd_pcm_open:   OK (handle={handle.value:#x})")

    rc = lib.snd_pcm_set_params(
        handle,
        SND_PCM_FORMAT_S16_LE,
        SND_PCM_ACCESS_RW_INTERLEAVED,
        ctypes.c_uint(out_channels),
        ctypes.c_uint(rate),
        1,           # soft_resample
        50000,       # latency in us (50 ms)
    )
    if rc < 0:
        print(f"snd_pcm_set_params failed: {alsa_err(rc)}", file=sys.stderr)
        lib.snd_pcm_close(handle)
        sys.exit(1)
    print(f"snd_pcm_set_params: OK ({out_channels}ch @ {rate}Hz S16_LE, 50ms latency)")

    CHUNK_FRAMES = 4096
    in_chunk_bytes = CHUNK_FRAMES * bytes_per_input_frame

    mono_to_stereo = (in_channels == 1 and out_channels == 2)

    with open(pcm_path, "rb") as f:
        bytes_written = 0
        frames_written = 0
        t0 = time.monotonic()
        chunk_id = 0
        while True:
            data = f.read(in_chunk_bytes)
            if not data:
                break
            chunk_id += 1
            if mono_to_stereo:
                # unpack mono samples, double each to L=R stereo
                n_samp = len(data) // 2
                samples = struct.unpack(f"<{n_samp}h", data)
                # build stereo: (s0,s0,s1,s1,...)
                stereo = struct.pack(f"<{n_samp * 2}h", *(s for s in samples for _ in (0, 1)))
                out_buf = stereo
            elif in_channels == out_channels:
                out_buf = data
            else:
                # generic: pad/truncate; for now, only 1->2 supported
                out_buf = data
            n = lib.snd_pcm_writei(handle, out_buf, len(out_buf) // bytes_per_output_frame)
            if n < 0:
                print(f"writei chunk #{chunk_id} failed: {alsa_err(n)}", file=sys.stderr)
                lib.snd_pcm_close(handle)
                sys.exit(1)
            bytes_written += n * bytes_per_output_frame
            frames_written += n

    rc = lib.snd_pcm_drain(handle)
    if rc < 0:
        print(f"snd_pcm_drain failed: {alsa_err(rc)}", file=sys.stderr)
        lib.snd_pcm_close(handle)
        sys.exit(1)
    elapsed = time.monotonic() - t0
    lib.snd_pcm_close(handle)
    print(f"drain:          OK")
    print(f"close:          OK")
    print(f"frames written: {frames_written} ({bytes_written} bytes)")
    print(f"wall time:      {elapsed:.3f} s (rate: {frames_written/elapsed:.0f} frames/s)")
    print(f"=== playback complete ===")

if __name__ == "__main__":
    main()
