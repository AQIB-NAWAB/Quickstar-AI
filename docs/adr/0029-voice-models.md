# ADR 0029: Voice, STT, TTS, and speech-to-speech model defaults

- **Status:** Accepted
- **Date:** 2026-10-24
- **Feature:** Voice model quality and provider choice

## Context

The voice pipeline was wired for older defaults (`nova-2`, `whisper-1`, `tts-1`) and one
speech-to-speech path was exposed at a time. The market moved to:

- **STT:** Deepgram Nova-3 / Flux, OpenAI `gpt-4o-transcribe`, ElevenLabs Scribe v2,
  AssemblyAI Universal-3.5.
- **TTS:** Cartesia Sonic 3.6, ElevenLabs v4 / v4 Turbo / Flash v2.5, Fish Audio S2,
  OpenAI `gpt-4o-mini-tts`, Gemini TTS, Deepgram Aura-2.
- **S2S:** OpenAI `gpt-realtime-2.1` and `gpt-live-1`, Gemini 3.8 Live, and ElevenLabs
  Realtime v1 Mini/Max (OpenAI-compatible Realtime API).

## Decision

### Defaults

| Layer | Default | Why |
| --- | --- | --- |
| STT | Deepgram `nova-3` | Best real-time accuracy and the existing streaming integration already supports it |
| TTS | Cartesia `sonic-3.6` | Top independent TTS arena quality with low streaming latency |
| OpenAI STT fallback | `gpt-4o-transcribe` | Replaces `whisper-1` when the OpenAI speech profile is used |
| OpenAI TTS fallback | `gpt-4o-mini-tts` | Replaces `tts-1` |
| S2S (Gemini) | `gemini-3.8-live` | Google's recommended low-latency voice model |
| S2S (OpenAI) | `gpt-realtime-2.1` | Current Realtime path; `gpt-live-1` is selectable for full-duplex |
| S2S (ElevenLabs) | `eleven_realtime_v1_mini` | Low-latency OpenAI-compatible realtime model; `_max` for multi-step tasks |

### ElevenLabs

- Add `ElevenLabsTextToSpeech` with the `/v1/text-to-speech/{voice_id}/stream` endpoint.
  `ELEVENLABS_MODEL` defaults to `eleven_flash_v2_5` for realtime latency; set `eleven_v4`
  for the highest quality or `eleven_v4_turbo` for expressive realtime.
- Add the `elevenlabs:reference` catalog voice. `ELEVENLABS_VOICE_ID` supplies the native id.
- ElevenLabs Realtime is exposed through the same OpenAI-compatible WebSocket client with
  `xi-api-key` auth and the `eleven_realtime_v1_mini` / `_max` model ids.

### Provider selection

`VOICE_S2S_PROVIDER`:

- `auto` (default): cascade when Deepgram + a TTS provider are configured; otherwise
  Gemini → OpenAI → ElevenLabs.
- `gemini`, `openai`, `elevenlabs`: force that S2S model.
- `none`: force cascade.

The cascade remains the default for tool- and RAG-heavy agents because Gemini/OpenAI/ElevenLabs
S2S profiles do not use the runtime tool loop in v1. Use S2S for low-latency, conversational agents
without tools.

## Consequences

- Existing deployments keep working; model names are overridable through env.
- One workspace can mix voices per agent (`tts_voice_id`), including Urdu Uplift, Cartesia,
  Fish, and ElevenLabs.
- ElevenLabs Realtime is opt-in and must be validated against their current OpenAI-compatibility
  layer before production rollout.
- ElevenLabs Scribe v2 Realtime and AssemblyAI are not wired into the streaming STT path yet;
  they remain possible future providers.
- `gpt-live-1` support depends on the current Realtime/Live API event contract; if a deployment
  hits a schema mismatch, set `OPENAI_REALTIME_MODEL=gpt-realtime-2.1`.
