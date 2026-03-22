const prefixSeed = () => Math.random().toString(36).slice(2, 8);

export const createId = (prefix) => `${prefix}_${Date.now().toString(36)}_${prefixSeed()}`;

