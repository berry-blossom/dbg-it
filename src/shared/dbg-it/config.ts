// These options *must* be defined as readonly to preserve the tuple typings when used as a generic.

import { Defaults, EnsureRequired } from "../util/type";

export const DefaultLogLevels: ["DBG", "INFO", "WARN", "ERR", "FATAL"] = [
	"DBG",
	"INFO",
	"WARN",
	"ERR",
	"FATAL",
] as const;
export type DbgItDefaultLogLevels = typeof DefaultLogLevels;

export enum DefaultExecutionPowers {
	USER,
	ADMIN,
	OWNER,
}
export const DefaultExecutionPowerNames: (keyof typeof DefaultExecutionPowers)[] = ["USER", "ADMIN", "OWNER"] as const;
export type DbgitDefaultExecutionPowers = typeof DefaultExecutionPowerNames;

export interface DbgItConfig<T extends readonly string[] = string[]> {
	readonly logLevels: T;
	readonly executionPowerNames: readonly string[];
	readonly defaultExecutionPower: number;
	readonly warnLevel: T[number];
	readonly logPrefix?: string;
}

export const DefaultMainConfig: DbgItConfig<["DBG", "INFO", "WARN", "ERR", "FATAL"]> = {
	logLevels: DefaultLogLevels,
	executionPowerNames: DefaultExecutionPowerNames,
	defaultExecutionPower: 0,
	warnLevel: "WARN" as ["DBG", "INFO", "WARN", "ERR", "FATAL"][number],
	logPrefix: undefined,
} satisfies DbgItConfig<["DBG", "INFO", "WARN", "ERR", "FATAL"]>;

export type SafePickFromConfig<
	K extends keyof DbgItConfig,
	T extends Partial<DbgItConfig> = typeof DefaultMainConfig,
> = Defaults<EnsureRequired<T>[K], (typeof DefaultMainConfig)[K]>;

export type LogLevelsFromConfig<T extends Partial<DbgItConfig> = typeof DefaultMainConfig> = SafePickFromConfig<
	"logLevels",
	T
>;
