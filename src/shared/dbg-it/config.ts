// These options *must* be defined as readonly to preserve the tuple typings when used as a generic.
export interface DbgItConfig<T extends readonly string[] = string[]> {
	readonly logLevels: T;
	readonly executionPowerNames: readonly string[];
	readonly defaultExecutionPower: number;
	readonly warnLevel: T[number];
}

export const DefaultMainConfig: DbgItConfig<["DBG", "INFO", "WARN", "ERR", "FATAL"]> = {
	logLevels: ["DBG", "INFO", "WARN", "ERR", "FATAL"] as const,
	executionPowerNames: ["USER", "ADMIN", "OWNER"] as const,
	defaultExecutionPower: 0,
	warnLevel: "WARN" as ["DBG", "INFO", "WARN", "ERR", "FATAL"][number],
} satisfies DbgItConfig<["DBG", "INFO", "WARN", "ERR", "FATAL"]>;
