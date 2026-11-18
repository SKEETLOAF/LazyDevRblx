---
name: sfx
description: Sound effect design, layer construction, spatial routing, synchronization and audio accessibility.
---

# Sound effects and audio

Clarify function: gameplay cue, environment ambience, interface feedback, action transient, movement, or music transition. Construct attack/body/decay layers when useful and preserve separate raw sources and final mixes. For actions, align transients to meaningful gameplay and animation markers.

Distinguish nonspatial UI/audio from localized 3D sources. Review pitch, dynamics, attenuation, looping, frequency masking, repeated-trigger behavior and user volume settings. Roblox's modular audio objects provide current routing capabilities; do not default blindly to deprecated APIs. Audacity and FFmpeg are available to the user, but DevKit does not yet remotely operate them.

**Quality evidence:** actual authorized audio playback listened to at realistic loudness, timed playtest evidence, spatial behavior checks and appropriate visual/accessible fallback. DevKit V1.7 can inspect amplitude peaks, RMS, DC offset and possible clipping on manually selected uncompressed WAV. It cannot listen or judge mixing, timbre, spatial impressions or gameplay synchronization; listening/perceptual quality gates remain instrumentation unavailable.

**References:** Roblox audio objects, Sound and animation docs in the plan.
