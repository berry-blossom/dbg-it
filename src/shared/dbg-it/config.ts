// These options *must* be defined as readonly to preserve the tuple typings when used as a generic.

export const DefaultLogLevels: ["DBG", "INFO", "WARN", "ERR", "FATAL"] = [
	"DBG",
	"INFO",
	"WARN",
	"ERR",
	"FATAL",
] as const;
export const DefaultExecutionPowerNames: ["USER", "ADMIN", "OWNER"] = ["USER", "ADMIN", "OWNER"] as const;

export interface DbgItConfig<T extends readonly string[] = string[]> {
	readonly logLevels: T;
	readonly executionPowerNames: readonly string[];
	readonly defaultExecutionPower: number;
	readonly warnLevel: T[number];
}

export const DefaultMainConfig: DbgItConfig<["DBG", "INFO", "WARN", "ERR", "FATAL"]> = {
	logLevels: DefaultLogLevels,
	executionPowerNames: DefaultExecutionPowerNames,
	defaultExecutionPower: 0,
	warnLevel: "WARN" as ["DBG", "INFO", "WARN", "ERR", "FATAL"][number],
} satisfies DbgItConfig<["DBG", "INFO", "WARN", "ERR", "FATAL"]>;
