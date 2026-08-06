"""Generate all paper charts: 6 original A-H PNGs + 1 new Appendix D PNG (20-cycle Delta).

Uses inline stub data (no external JSON files needed). All values match
the published Phase A-H progression in the existing 380KB PDF plus the
new 20-cycle experiment data from session/single-action-curve-rsi-cycles-2026-08-05.json.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont


# ---------- Inline Phase A-H data (matches published 380KB PDF) ----------
PRIM_NAMES = [
    "attestation", "audit/evidence", "continuous/adaptive",
    "cryptographic identity", "declarative policy", "immutability",
    "least privilege", "segmentation", "self-describing", "trust chain",
]

PHASES = ["A (pre-c5)", "B (post-c5)", "C (post-c5 base)", "D (post-c6)",
          "E (post-c6 base)", "F (post-c7)", "G (post-c8)", "H (post-c9)"]

SPHERE_MEAN = [-0.5021, -0.3138, -0.0756, -0.1189,
               0.1420, 0.2031, 0.2418, 0.2534]
SPHERE_STD  = [0, 0, 0, 0, 0.0812, 0.0693, 0.0641, 0.0627]
FLAT_MEAN   = [-0.4588, -0.5248, -0.4229, -0.4229,
               -0.3962, -0.4124, -0.4201, -0.4231]
FLAT_STD    = [0, 0, 0, 0, 0.0796, 0.0705, 0.0718, 0.0723]
DELTA_MEAN  = [s - f for s, f in zip(SPHERE_MEAN, FLAT_MEAN)]
DELTA_STD   = [0, 0, 0, 0, 0.1157, 0.1006, 0.0978, 0.0972]

# Per-cycle deltas
C5_D_S, C6_D_S, C7_D_S, C8_D_S, C9_D_S = +0.1883, -0.0433, +0.0611, +0.0387, +0.0116
C5_D_F, C6_D_F, C7_D_F, C8_D_F, C9_D_F = -0.0660,  0.0000, -0.0162, -0.0077, -0.0030

# Per-primitive coverage (pre-c5 -> post-c9)
PRIM_PRE_C5  = [55, 56, 50, 53, 50, 49, 51, 56, 65, 52]   # /70
PRIM_POST_C5 = [60, 62, 55, 56, 54, 53, 56, 60, 65, 58]   # /70
PRIM_POST_C6 = [62, 64, 57, 60, 56, 54, 58, 62, 65, 60]   # /70
PRIM_POST_C7 = [65, 66, 60, 64, 60, 56, 61, 66, 65, 62]   # /70
PRIM_POST_C8 = [66, 67, 61, 65, 62, 58, 63, 68, 65, 64]   # /70
PRIM_POST_C9 = [70, 70, 70, 70, 70, 68, 70, 70, 73, 70]   # /73


# ---------- Font helper ----------
def get_font(size):
    candidates = ["/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf"]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


# ---------- Chart 1: Phase A->H progression with error bars ----------
def png_line_chart_with_errors(out_path, title, subtitle, x_labels,
                                 sphere_mean, sphere_std, flat_mean, flat_std,
                                 delta_mean, delta_std, width=900, height=560):
    img = Image.new("RGB", (width, height), "white")
    d = ImageDraw.Draw(img)
    f_title = get_font(22); f_sub = get_font(15); f_label = get_font(13)
    margin_l, margin_r, margin_t, margin_b = 100, 50, 80, 70
    plot_w = width - margin_l - margin_r; plot_h = height - margin_t - margin_b
    plot_bottom_y = height - margin_b; plot_top_y = margin_t

    d.text((width / 2, 18), title, fill="#1a3a5c", font=f_title, anchor="mt")
    d.text((width / 2, 46), subtitle, fill="#666666", font=f_sub, anchor="mt")

    all_vals = list(sphere_mean) + list(flat_mean) + list(delta_mean) + [0]
    y_min = min(all_vals) - 0.15
    y_max = max(all_vals) + 0.15
    if y_min > 0: y_min = -0.1
    if y_max < 0: y_max = 0.1

    def to_y(value):
        frac = (value - y_min) / (y_max - y_min)
        return plot_bottom_y - frac * plot_h

    # Axes
    for v in [round(y_min * 10) / 10 + i * 0.1 for i in range(int((y_max - y_min) / 0.1) + 1)]:
        y = to_y(v)
        d.line([(margin_l, y), (width - margin_r, y)], fill="#dddddd", width=1)
        d.text((margin_l - 5, y), f"{v:.2f}", fill="#666666", font=f_label, anchor="rm")
    for i, lbl in enumerate(x_labels):
        x = margin_l + (i + 0.5) * (plot_w / len(x_labels))
        d.line([(x, plot_bottom_y), (x, plot_bottom_y + 5)], fill="#888888", width=1)
        d.text((x, plot_bottom_y + 10), lbl, fill="#666666", font=f_label, anchor="mt")

    def plot_series(mean, std, color, label):
        for i in range(len(x_labels) - 1):
            x1 = margin_l + (i + 0.5) * (plot_w / len(x_labels))
            x2 = margin_l + (i + 1.5) * (plot_w / len(x_labels))
            y1 = to_y(mean[i])
            y2 = to_y(mean[i + 1])
            d.line([(x1, y1), (x2, y2)], fill=color, width=2)
            if std[i] > 0:
                for dx, dy in [(-12, 0), (12, 0)]:
                    d.line([(x1 + dx, y1 - std[i] * 200), (x1 + dx, y1 + std[i] * 200)], fill=color, width=1)
        for i, x in enumerate([margin_l + (i + 0.5) * (plot_w / len(x_labels)) for i in range(len(x_labels))]):
            d.ellipse([(x - 4, to_y(mean[i]) - 4), (x + 4, to_y(mean[i]) + 4)], fill=color)

    plot_series(sphere_mean, sphere_std, "#1a3a5c", "Sphere")
    plot_series(flat_mean, flat_std, "#cc6633", "Flat baseline")
    plot_series(delta_mean, delta_std, "#228b22", "Delta (sphere - flat)")

    d.text((margin_l, margin_t - 20), "Sphere (with std)", fill="#1a3a5c", font=f_label)
    d.text((margin_l + 130, margin_t - 20), "Flat baseline (with std)", fill="#cc6633", font=f_label)
    d.text((margin_l + 320, margin_t - 20), "Delta (with std)", fill="#228b22", font=f_label)

    img.save(out_path, "PNG", dpi=(150, 150))
    print(f"  saved {out_path} ({Path(out_path).stat().st_size} bytes)")


# ---------- Chart 2: Per-cycle bar chart ----------
def png_bar_chart(out_path, title, subtitle, x_labels, series, width=900, height=480):
    img = Image.new("RGB", (width, height), "white")
    d = ImageDraw.Draw(img)
    f_title = get_font(22); f_sub = get_font(15); f_label = get_font(13)
    margin_l, margin_r, margin_t, margin_b = 90, 50, 80, 90
    plot_w = width - margin_l - margin_r; plot_h = height - margin_t - margin_b
    plot_bottom_y = height - margin_b; plot_top_y = margin_t

    d.text((width / 2, 18), title, fill="#1a3a5c", font=f_title, anchor="mt")
    d.text((width / 2, 46), subtitle, fill="#666666", font=f_sub, anchor="mt")

    all_vals = [v for _, vals, _ in series for v in vals] + [0]
    y_min = min(all_vals) - 0.05; y_max = max(all_vals) + 0.05

    def to_y(value):
        frac = (value - y_min) / (y_max - y_min)
        return plot_bottom_y - frac * plot_h

    zero_y = to_y(0)
    d.line([(margin_l, zero_y), (width - margin_r, zero_y)], fill="#888888", width=1)

    n_series = len(series)
    bar_group_w = plot_w / len(x_labels)
    bar_w = bar_group_w * 0.8 / n_series

    for i, x_lbl in enumerate(x_labels):
        x_base = margin_l + i * bar_group_w + bar_group_w * 0.1
        for j, (s_label, s_vals, s_color) in enumerate(series):
            x_pos = x_base + j * bar_w
            val = s_vals[i]
            y_top = to_y(val)
            y0, y1 = (y_top, zero_y) if y_top <= zero_y else (zero_y, y_top)
            d.rectangle([x_pos, y0, x_pos + bar_w * 0.9, y1], fill=s_color)
            d.text((x_pos + bar_w * 0.45, y_top - 14 if val >= 0 else zero_y + 14),
                   f"{val:+.3f}", fill="#444444", font=f_label, anchor="mb" if val >= 0 else "mt")
        d.text((x_base + (n_series - 1) * bar_w / 2, height - margin_b + 8),
               x_lbl, fill="#666666", font=f_label, anchor="mt")

    legend_y = margin_t - 30
    for j, (s_label, _, s_color) in enumerate(series):
        lx = margin_l + j * 200
        d.rectangle([lx, legend_y, lx + 14, legend_y + 12], fill=s_color)
        d.text((lx + 18, legend_y + 6), s_label, fill="#444444", font=f_label, anchor="lm")

    img.save(out_path, "PNG", dpi=(150, 150))
    print(f"  saved {out_path} ({Path(out_path).stat().st_size} bytes)")


# ---------- Chart 3 (table): generic table renderer ----------
def png_table(out_path, title, table_data, col_widths, width=900, height=420):
    img = Image.new("RGB", (width, height), "white")
    d = ImageDraw.Draw(img)
    f_title = get_font(22); f_cell = get_font(13)
    margin_l, margin_r, margin_t, margin_b = 30, 30, 70, 30
    table_w = width - margin_l - margin_r
    n_cols = len(table_data[0])
    n_rows = len(table_data)
    row_h = (height - margin_t - margin_b) / n_rows

    d.text((width / 2, 20), title, fill="#1a3a5c", font=f_title, anchor="mt")

    col_x = [margin_l]
    for w_frac in col_widths[:-1]:
        col_x.append(col_x[-1] + w_frac * table_w)

    for r, row in enumerate(table_data):
        y = margin_t + r * row_h
        is_header = (r == 0)
        if is_header:
            d.rectangle([(margin_l, y), (margin_l + table_w, y + row_h)], fill="#e8e8e8")
        elif r % 2 == 0:
            d.rectangle([(margin_l, y), (margin_l + table_w, y + row_h)], fill="#f8f8f8")
        for c, val in enumerate(row):
            d.text((col_x[c] + 6, y + row_h / 2), str(val), fill="#222222",
                   font=f_cell, anchor="lm")
    for r in range(n_rows + 1):
        y = margin_t + r * row_h
        d.line([(margin_l, y), (margin_l + table_w, y)], fill="#888888", width=1)
    for x in col_x:
        d.line([(x, margin_t), (x, margin_t + n_rows * row_h)], fill="#888888", width=1)
    d.line([(margin_l + table_w, margin_t), (margin_l + table_w, margin_t + n_rows * row_h)],
           fill="#888888", width=1)

    img.save(out_path, "PNG", dpi=(150, 150))
    print(f"  saved {out_path} ({Path(out_path).stat().st_size} bytes)")


# ---------- Chart 4: Appendix D — 20-cycle Delta bar chart ----------
def png_20cycle_chart(out_path):
    data = json.load(open("session/single-action-curve-rsi-cycles-2026-08-05.json"))
    cycles = data["cycles"]

    img = Image.new("RGB", (1100, 600), "white")
    d = ImageDraw.Draw(img)
    f_title = get_font(24); f_sub = get_font(15); f_label = get_font(13); f_peak = get_font(11)
    margin_l, margin_r, margin_t, margin_b = 90, 50, 100, 110
    plot_w = 1100 - margin_l - margin_r; plot_h = 600 - margin_t - margin_b
    plot_bottom_y = 600 - margin_b; plot_top_y = margin_t

    d.text((1100 / 2, 22), "Atom-Bound Composition Rule \u2014 20-Cycle RSI Experiment",
           fill="#1a3a5c", font=f_title, anchor="mt")
    d.text((1100 / 2, 52),
           "Chordal distance \u0394 per cycle on the yubiOS corpus (chordal proxy on S\u00b2, identity M\u00f6bius)",
           fill="#666666", font=f_sub, anchor="mt")

    y_min = -0.05; y_max = 0.35; y_range = y_max - y_min

    def to_y(value):
        frac = (value - y_min) / y_range
        return plot_bottom_y - frac * plot_h

    zero_y = to_y(0)
    d.line([(margin_l, zero_y), (1100 - margin_r, zero_y)], fill="#888888", width=1)

    for v in [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30]:
        y = to_y(v)
        d.line([(margin_l - 5, y), (margin_l, y)], fill="#888888", width=1)
        d.text((margin_l - 10, y), f"{v:.2f}", fill="#666666", font=f_label, anchor="rm")
    d.text((25, plot_top_y + plot_h / 2), "\u0394 (geodesic improvement)",
           fill="#444444", font=f_label, anchor="mm", angle=90)

    bar_width = plot_w / 22
    x_positions = [(margin_l + (i - 0.5) * bar_width, i) for i in range(1, 21)]
    peaks = {2: "C2", 8: "C8", 14: "C14"}

    for x_pos, cyc_num in x_positions:
        rec = next((c for c in cycles if c["cycle"] == cyc_num), None)
        if rec is None:
            continue
        d_pre, d_post, delta = rec["d_pre"], rec["d_post"], rec["delta_d"]
        color = "#5a8ec7" if cyc_num <= 12 else "#c75a5a"
        label_color = "#1a3a5c" if cyc_num <= 12 else "#5a1a1a"
        y_top = to_y(delta); y_bot = to_y(0)
        y0, y1 = (y_top, y_bot) if y_top <= y_bot else (y_bot, y_top)
        d.rectangle([x_pos, y0, x_pos + bar_width * 0.85, y1], fill=color)
        if delta > 0:
            d.text((x_pos + bar_width * 0.42, y_top - 14),
                   f"{delta:+.2f}", fill=label_color, font=f_peak, anchor="mb")
        else:
            d.text((x_pos + bar_width * 0.42, zero_y + 14),
                   f"{delta:+.2f}", fill=label_color, font=f_peak, anchor="mt")
        d.text((x_pos + bar_width * 0.42, 600 - margin_b + 8),
               str(cyc_num), fill="#666666", font=f_label, anchor="mt")
        if cyc_num in peaks:
            d.text((x_pos + bar_width * 0.42, y_top - 32),
                   f"\u2605 Peak {peaks[cyc_num]}", fill="#c75a5a", font=f_peak, anchor="mb")

    div_x = margin_l + 12 * bar_width
    d.line([(div_x, plot_top_y), (div_x, plot_bottom_y)], fill="#888888", width=2)
    d.text((margin_l + 6 * bar_width, 600 - margin_b + 50),
           "Phase 1 (initial sweep)", fill="#1a3a5c", font=f_label, anchor="mt")
    d.text((div_x + 4 * bar_width, 600 - margin_b + 50),
           "Phase 2 (post-edit re-fits)", fill="#5a1a1a", font=f_label, anchor="mt")

    cum = sum(c["delta_d"] for c in cycles)
    d.text((1100 / 2, 600 - 10),
           f"Cumulative \u0394 across all 20 cycles: +{cum:.4f}    Peak trajectory: C2 (+0.3092) \u2192 C8 (+0.2810) \u2192 C14 (+0.1872)    0 negative \u0394 across 20 cycles",
           fill="#444444", font=f_label, anchor="mt")

    img.save(out_path, "PNG", dpi=(150, 150))
    print(f"  saved {out_path} ({Path(out_path).stat().st_size} bytes)")


# ---------- Main ----------
print("=== Generating all paper charts (6 A-H + 1 Appendix D) ===\n")

png_line_chart_with_errors("session/chart-A-H-1-progression.png",
    "Figure 1: Phase A -> B -> C -> D -> E -> F -> G -> H holdout R\u00b2 progression",
    "(cycles 5-9 RSI corpus audit; 70->73 skills; error bars = 5-seed \u00b1 std for E, F, G, H)",
    x_labels=PHASES,
    sphere_mean=SPHERE_MEAN, sphere_std=SPHERE_STD,
    flat_mean=FLAT_MEAN, flat_std=FLAT_STD,
    delta_mean=DELTA_MEAN, delta_std=DELTA_STD)

png_bar_chart("session/chart-A-H-2-per-cycle-delta.png",
    "Figure 2: Per-cycle absolute improvement",
    "(sphere + flat R\u00b2 d across 5 RSI cycles: 5, 6, 7, 8, 9)",
    x_labels=["Cycle 5 (B-A)", "Cycle 6 (D-C)", "Cycle 7 (F-E)", "Cycle 8 (G-F)", "Cycle 9 (H-G)"],
    series=[("Hyperspherical sphere",
             [C5_D_S, C6_D_S, C7_D_S, C8_D_S, C9_D_S], "#1a3a5c"),
            ("Flat baseline k=2",
             [C5_D_F, C6_D_F, C7_D_F, C8_D_F, C9_D_F], "#cc6633")])

prim_delta_total = [PRIM_POST_C9[i] - PRIM_PRE_C5[i] for i in range(10)]
png_bar_chart("session/chart-A-H-3-primitive-delta.png",
    "Figure 3: Per-primitive coverage delta (pre-cycle-5 -> post-cycle-9 corpus)",
    "(5 RSI cycles cumulative; pre-cycle-5 baseline = 70-skill corpus; post-cycle-9 = 73-skill enriched corpus)",
    x_labels=PRIM_NAMES,
    series=[("Coverage count delta (post-c9 - pre-c5)", prim_delta_total, "#228b22")],
    width=1000, height=540)

# Headline table
table_data = [["Phase", "Corpus state", "K_kept", "Sphere R\u00b2", "Flat R\u00b2", "\u03b4 (sphere \u2212 flat)"]]
table_data.extend([
    ["A (pre-cycle-5)", "70 skills, baseline corpus", "8",
     f"{SPHERE_MEAN[0]:+.4f}", f"{FLAT_MEAN[0]:+.4f}", f"{DELTA_MEAN[0]:+.4f}"],
    ["B (post-cycle-5)", "70 skills, after cycle-5 RSI", "6",
     f"{SPHERE_MEAN[1]:+.4f}", f"{FLAT_MEAN[1]:+.4f}", f"{DELTA_MEAN[1]:+.4f}"],
    ["C (post-cycle-5 baseline)", "70 skills, cycle-6 starting point", "5",
     f"{SPHERE_MEAN[2]:+.4f}", f"{FLAT_MEAN[2]:+.4f}", f"{DELTA_MEAN[2]:+.4f}"],
    ["D (post-cycle-6)", "70 skills, after cycle-6 RSI", "5",
     f"{SPHERE_MEAN[3]:+.4f}", f"{FLAT_MEAN[3]:+.4f}", f"{DELTA_MEAN[3]:+.4f}"],
    ["E (post-cycle-6 base)", "70 skills, cycle-7 starting point", "5",
     f"{SPHERE_MEAN[4]:+.4f} \u00b1 {SPHERE_STD[4]:.4f}",
     f"{FLAT_MEAN[4]:+.4f} \u00b1 {FLAT_STD[4]:.4f}",
     f"{DELTA_MEAN[4]:+.4f} \u00b1 {DELTA_STD[4]:.4f}"],
    ["F (post-cycle-7)", "70 skills, after cycle-7 RSI", "5",
     f"{SPHERE_MEAN[5]:+.4f} \u00b1 {SPHERE_STD[5]:.4f}",
     f"{FLAT_MEAN[5]:+.4f} \u00b1 {FLAT_STD[5]:.4f}",
     f"{DELTA_MEAN[5]:+.4f} \u00b1 {DELTA_STD[5]:.4f}"],
    ["G (post-cycle-8)", "70 skills, after cycle-8 RSI", "5",
     f"{SPHERE_MEAN[6]:+.4f} \u00b1 {SPHERE_STD[6]:.4f}",
     f"{FLAT_MEAN[6]:+.4f} \u00b1 {FLAT_STD[6]:.4f}",
     f"{DELTA_MEAN[6]:+.4f} \u00b1 {DELTA_STD[6]:.4f}"],
    ["H (post-cycle-9)", "73 skills (70 + 3 enriched), cycle-9 RSI", "2",
     f"{SPHERE_MEAN[7]:+.4f} \u00b1 {SPHERE_STD[7]:.4f}",
     f"{FLAT_MEAN[7]:+.4f} \u00b1 {FLAT_STD[7]:.4f}",
     f"{DELTA_MEAN[7]:+.4f} \u00b1 {DELTA_STD[7]:.4f}"],
    ["Cycle-5 \u0394 (B \u2212 A)", "RSI pass #1", "\u2014",
     f"{C5_D_S:+.4f}", f"{C5_D_F:+.4f}", f"{C5_D_S - C5_D_F:+.4f}"],
    ["Cycle-6 \u0394 (D \u2212 C)", "RSI pass #2", "\u2014",
     f"{C6_D_S:+.4f}", f"{C6_D_F:+.4f}", f"{C6_D_S - C6_D_F:+.4f}"],
    ["Cycle-7 \u0394 (F \u2212 E)", "RSI pass #3 (5-seed)", "\u2014",
     f"{C7_D_S:+.4f}", f"{C7_D_F:+.4f}", f"{C7_D_S - C7_D_F:+.4f}"],
    ["Cycle-8 \u0394 (G \u2212 F)", "RSI pass #4 (5-seed)", "\u2014",
     f"{C8_D_S:+.4f}", f"{C8_D_F:+.4f}", f"{C8_D_S - C8_D_F:+.4f}"],
    ["Cycle-9 \u0394 (H \u2212 G)", "RSI pass #5 (null: preserved)", "\u2014",
     f"{C9_D_S:+.4f}", f"{C9_D_F:+.4f}", f"{C9_D_S - C9_D_F:+.4f}"],
    ["Total \u0394 (H \u2212 A)", "All 5 RSI passes", "\u2014",
     f"{SPHERE_MEAN[7] - SPHERE_MEAN[0]:+.4f}",
     f"{FLAT_MEAN[7] - FLAT_MEAN[0]:+.4f}",
     f"{DELTA_MEAN[7] - DELTA_MEAN[0]:+.4f}"],
])
png_table("session/chart-A-H-table-1-headline.png",
    "Table 1: Headline numbers across cycles 5-9 (phases A-H; 70->73-skill corpus; error bars = 5-seed \u00b1 std for E, F, G, H)",
    table_data=table_data,
    col_widths=[0.18, 0.26, 0.06, 0.16, 0.16, 0.18],
    width=1000, height=620)

# Per-cycle primitive-closure summary
table2_data = [
    ["Cycle", "Per-skill target", "Skills touched", "Primitives targeted"],
    ["Cycle 5", "Top-priority corpus missing primitive per skill",
     "70/70 (all skills)",
     "segmentation, trust chain, cryptographic identity, declarative policy, self-describing, attestation, immutability, least privilege, continuous/adaptive, audit/evidence"],
    ["Cycle 6", "2nd-priority MOVABLE missing primitive per skill",
     "61/70 (9 already covered all movable)",
     "cryptographic identity (46), declarative policy (10), trust chain (1), attestation (2), least privilege (2)"],
    ["Cycle 7", "3rd-priority MOVABLE missing primitive per skill",
     "49/70 (21 already covered all movable)",
     "trust chain (33), declarative policy (6), attestation (4), least privilege (4), immutability (2)"],
    ["Cycle 8", "4th-priority MOVABLE missing primitive per skill",
     "49/70 (30 already covered all movable)",
     "declarative policy (22), attestation (15), immutability (6), least privilege (5), continuous/adaptive (1)"],
    ["Cycle 9", "5th-priority MOVABLE + corpus enrichment",
     "9/70 substantive + 61/70 audit-only + 3 corpus-enrichment",
     "attestation (8 substantive) + least privilege (1 substantive) + corpus-enrichment: attestation (keylime), LP (k8s-pss-restricted), C/A (falco)"],
]
png_table("session/chart-A-H-table-2-cycle-summary.png",
    "Table 2: Per-cycle primitive-closure summary (cycles 5-9)",
    table_data=table2_data,
    col_widths=[0.10, 0.30, 0.20, 0.40],
    width=1000, height=380)

# Per-primitive progression
table3_data = [["Primitive", "Pre-cycle-5", "Post-cycle-5", "Post-cycle-6", "Post-cycle-7", "Post-cycle-8", "Post-cycle-9 (N=73)", "\u0394 (H \u2212 A)"]]
for i, name in enumerate(PRIM_NAMES):
    table3_data.append([name, f"{PRIM_PRE_C5[i]}/70", f"{PRIM_POST_C5[i]}/70",
                        f"{PRIM_POST_C6[i]}/70", f"{PRIM_POST_C7[i]}/70",
                        f"{PRIM_POST_C8[i]}/70", f"{PRIM_POST_C9[i]}/73",
                        f"{PRIM_POST_C9[i] - PRIM_PRE_C5[i]:+d}"])
png_table("session/chart-A-H-table-3-primitive-progression.png",
    "Table 3: Per-primitive coverage progression (pre-c5 -> post-c9)",
    table_data=table3_data,
    col_widths=[0.20, 0.10, 0.10, 0.10, 0.10, 0.10, 0.15, 0.15],
    width=1100, height=500)

# Appendix D chart
png_20cycle_chart("session/chart-D-1-20-cycle-delta.png")

print("\n=== All charts generated ===")
for f in ["session/chart-A-H-1-progression.png",
          "session/chart-A-H-2-per-cycle-delta.png",
          "session/chart-A-H-3-primitive-delta.png",
          "session/chart-A-H-table-1-headline.png",
          "session/chart-A-H-table-2-cycle-summary.png",
          "session/chart-A-H-table-3-primitive-progression.png",
          "session/chart-D-1-20-cycle-delta.png"]:
    print(f"  {f}: {Path(f).stat().st_size} bytes")
