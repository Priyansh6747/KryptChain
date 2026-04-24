# KryptChain: Adversarial Blockchain Simulator

KryptChain is an interactive, high-fidelity distributed systems simulator built to model and visualize adversarial blockchain networks. 

Unlike traditional deterministic simulators that assume perfect network conditions, KryptChain is built on an event-driven **Network Queue** architecture that introduces real-world chaos: latency, jitter, probabilistic message drops, and absolute network partitions. It is designed to be an educational testbed for consensus breakdowns, fork resolutions, and classic blockchain attacks.

## Core Features

*   **Scenario Engine:** Deterministically replay iconic distributed systems failures via heavily curated scripts:
    *   **51% Attacks:** Watch a majority hash-power node rewrite history and trigger massive network-wide reorganizations.
    *   **Selfish Mining:** Observe miners intentionally withholding blocks to waste honest network hash power.
    *   **Network Partitions (Split-Brain):** Simulate a routing failure that splits the network in half. Watch both sides mine independently, then witness the chaotic reorg when the partition heals.
    *   **Double Spend Attacks:** See the probabilistic nature of confirmations fail against an attacker with private chains.
    *   **High Latency & Byzantine Floods:** Test finality and resilience under extreme network degradation and malicious block spam.
*   **Real-Time Visual DAG Projection:** A custom Canvas/SVG renderer that plots the live blockchain state, dynamically rendering canonical chains, forks, and orphan blocks, and flagging malicious actors with UI markers.
*   **Fully Modeled Ledger:** Every node tracks real balances. Transactions are validated (no self-transfers, no negative amounts), miners receive block rewards (50 KRYPT), and the ledger safely rebuilds itself from genesis during deep chain reorganizations to guarantee state integrity.
*   **Comprehensive Telemetry:** Track Transactions Per Second (TPS), network congestion (pending messages), rolling average propagation latency, and the **Consensus Ratio** (the fraction of the network agreeing on the same chain tip).
*   **Interactive Simulation Control:** Pause, step tick-by-tick, inject custom transactions, or alter simulation speeds (1x to 10x) on the fly.

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm

### Installation

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser to launch the dashboard.

## Architecture

KryptChain strictly separates the backend simulation engine from the frontend UI projection.

*   **`lib/engine/`**: The pure JavaScript state machine. Contains the `Simulation` core, `Node` logic, `Ledger` tracking, `NetworkQueue` messaging layer, and `ConsensusEngine` implementations (PoW, PoS). **The engine relies entirely on a deterministic PRNG—no `Math.random()` is used—guaranteeing perfect reproducibility of complex attacks.**
*   **`app/api/`**: The Next.js API layer exposing the simulation state to the frontend. Endpoints handle simulation control, state polling, ledger lookups, network configuration, and scenario loading.
*   **`components/` & `app/page.js`**: The React frontend that passively consumes the API state and normalizes it for rendering the dynamic Blockchain Graph, Metrics Dashboard, and Node Activity panels. 

## License

This project is open-source and available for educational use.
