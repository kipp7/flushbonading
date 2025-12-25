import type { MCU, PinConstraint, Sensor } from "../types";

type StoredCatalog<T> = {
  version: 1;
  savedAt: string;
  items: T[];
};

const loadStored = <T>(key: string): StoredCatalog<T> | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCatalog<T>>;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) return null;
    return { version: 1, savedAt: String(parsed.savedAt ?? ""), items: parsed.items };
  } catch {
    return null;
  }
};

const saveStored = <T>(key: string, items: T[]) => {
  try {
    const payload: StoredCatalog<T> = { version: 1, savedAt: new Date().toISOString(), items };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
};

const storageKeys = {
  customSensors: "pinforge_custom_sensors_v1",
  customMcus: "pinforge_custom_mcus_v1",
  constraints: "pinforge_constraints_v1",
} as const;

export const loadCustomSensors = (): Sensor[] => loadStored<Sensor>(storageKeys.customSensors)?.items ?? [];
export const saveCustomSensors = (items: Sensor[]) => saveStored(storageKeys.customSensors, items);

export const loadCustomMcus = (): MCU[] => loadStored<MCU>(storageKeys.customMcus)?.items ?? [];
export const saveCustomMcus = (items: MCU[]) => saveStored(storageKeys.customMcus, items);

export const loadConstraints = (): PinConstraint[] => loadStored<PinConstraint>(storageKeys.constraints)?.items ?? [];
export const saveConstraints = (items: PinConstraint[]) => saveStored(storageKeys.constraints, items);

export const resetCatalogStorage = () => {
  try {
    Object.values(storageKeys).forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage failures
  }
};

