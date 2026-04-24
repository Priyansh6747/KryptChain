import { Simulation } from './simulation.js';

const globalForSim = global;

export const getSimulation = () => {
  if (!globalForSim.simulation) {
    globalForSim.simulation = new Simulation();
  }
  return globalForSim.simulation;
};

export const setSimulation = (config) => {
  if (globalForSim.simulation) {
    globalForSim.simulation.stop();
  }
  globalForSim.simulation = new Simulation(config);
  return globalForSim.simulation;
};
