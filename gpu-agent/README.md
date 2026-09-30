# Ollama Admin GPU Agent

Lightweight sidecar that exposes GPU metrics via HTTP for Ollama Admin.

## Supported GPUs

- **NVIDIA** — via `nvidia-smi` (auto-detected)
- **NVIDIA Jetson** — via `tegrastats` (auto-detected when mounted)
- **AMD** — via `rocm-smi` (auto-detected)
- **Intel** — via `xpu-smi` (auto-detected)
- **Apple Silicon** — via `system_profiler` (auto-detected on macOS)

## Quick Start

### Docker (recommended)

```bash
docker compose up gpu-agent
```

Requires [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) installed on the host.

#### NVIDIA Jetson

Jetson devices expose integrated-GPU telemetry through `tegrastats` rather than the
desktop NVML fields used by `nvidia-smi`. Mount the host utility into the agent and
select the Jetson backend:

```yaml
services:
  gpu-agent:
    environment:
      GPU_BACKEND: jetson
      TEGRASTATS_PATH: /usr/local/bin/tegrastats
    volumes:
      - /usr/bin/tegrastats:/usr/local/bin/tegrastats:ro
```

The memory fields represent shared system memory on Jetson. `powerDraw` represents
the combined `VDD_CPU_GPU_CV` rail because Jetson does not expose GPU-only power.
The response includes `memoryType: "unified"` and `powerScope: "CPU_GPU_CV"` so
clients can label those metrics accurately.

### Standalone

```bash
cd gpu-agent
pip install -r requirements.txt
python main.py
```

The agent starts on port `11435` by default.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `11435` | HTTP server port |
| `GPU_BACKEND` | `auto` | Force backend: `jetson`, `nvidia`, `amd`, `intel`, `apple`, or `auto` |
| `TEGRASTATS_PATH` | `tegrastats` | Path to the Jetson `tegrastats` executable |
| `NVIDIA_VISIBLE_DEVICES` | — | Which GPUs to expose (Docker) |

## API

### `GET /gpu`

Returns a JSON array of GPU objects:

```json
[
  {
    "name": "NVIDIA RTX 4090",
    "memoryTotal": 25769803776,
    "memoryUsed": 8589934592,
    "memoryFree": 17179869184,
    "temperature": 65,
    "utilization": 45
  }
]
```

| Field | Type | Unit |
|---|---|---|
| `name` | string | — |
| `memoryTotal` | number | bytes |
| `memoryUsed` | number | bytes |
| `memoryFree` | number | bytes |
| `temperature` | number | °C |
| `utilization` | number | % (0-100) |

Returns `503` if no GPU backend is available.

### `GET /health`

```json
{"status": "ok", "backend": "nvidia"}
```

## Integration with Ollama Admin

1. Deploy the GPU agent on the same machine as your Ollama server
2. In Ollama Admin, edit the server and set **GPU Agent URL** to `http://<host>:11435`
3. The GPU monitoring page will start showing hardware metrics
