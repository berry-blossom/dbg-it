import { t } from "@rbxts/t";
import { Kind, tKind } from "../../kind";
import { KindCommandContext } from "./context";
import { ReadOnlyTokenStream, TokenStream } from "../../token";
import { KindErrors } from "../../messages";

// Kind which represents any string value. Example: "Hello World!"
export class StringKind extends tKind<string> {
	public constructor() {
		super("[string]", t.string);
	}
	public transform(data: string): string {
		return tostring(data);
	}
	public suggestions(): string[] {
		return [];
	}
}

// Kind wich represents any floating point number. Example: 3.1415
export class NumberKind extends tKind<number> {
	public constructor() {
		super("[number]", t.number);
	}
	public transform(data: string) {
		return tonumber(data);
	}
	public suggestions(): string[] {
		return [];
	}
}

// Kind which represents an integer. Example: 255
export class IntegerKind extends tKind<number> {
	public constructor() {
		super("[int]", t.integer);
	}
	public transform(data: string) {
		return tonumber(data)?.idiv(1);
	}
	public suggestions(): string[] {
		return [];
	}
}

// Kind which represents a boolean value. Example: true or off
export class BooleanKind extends tKind<boolean> {
	public constructor() {
		super("[boolean]", t.boolean);
	}
	public transform(data: string) {
		return data === "1" || data === "on" || data === "true"
			? true
			: data === "0" || data === "off" || data === "false"
				? false
				: undefined;
	}
	public suggestions(): string[] {
		return ["1", "on", "true", "0", "off", "false"];
	}
}

// Kind with one possible literal string value. Example: cmds
export class LiteralKind<T extends string> extends tKind<T> {
	public constructor(public readonly literal: T) {
		super(`${literal}`, t.literal(literal));
	}
	public transform(data: string): T | undefined {
		if (this.check(data)) return data;
		return undefined;
	}
	public suggestions(): string[] {
		return [this.literal];
	}
}

// Kind with multiple possible literal string values. Example: True or False
export class LiteralUnionKind<T extends string[]> extends Kind<T[number]> {
	public readonly literal: T;
	public constructor(label: string, ...literal: T) {
		super(label);
		this.literal = literal;
	}
	public transform(data: string): T[number] | undefined {
		return this.verify(data) ? data : undefined;
	}
	public verify(data: unknown): data is T[number] {
		return this.literal.indexOf(tostring(data)) >= 0;
	}
	public suggestions(): string[] {
		return [...this.literal];
	}
}

/**
 * Kind with multiple values split by commas or tokens. Example: "1 2 3" or 1,2,3
 *
 * Value's names are made lowercase automatically.
 *
 * Includes the ability to define macro values.
 * If a value's name is already a macro, it will log a warning and
 * replace the original value's name with that of one with an underscore prefixing it.
 */
export abstract class CSVKind<T extends defined> extends tKind<T[]> {
	public constructor(
		label: string,
		check: t.check<T>,
		public readonly macros: Record<string, (ctx: KindCommandContext) => T[]> = {},
	) {
		super(label, t.array(check));
	}
	public transform<LL extends string[] = string[]>(data: string, ctx: KindCommandContext<LL>): T[] | undefined {
		const tokens = TokenStream.create(data);
		let csvValues: string[] = [];
		const ret: T[] = new Array<T>() as T[];

		while (tokens.inRange()) {
			csvValues.push(tokens.get().lower());
			tokens.next();
		}

		// Reduce down all comma seperated values and space seperated values
		// Allows for behavior such as "1 2 3" and 1,2,3
		csvValues = string.split(csvValues.join(","), ",");

		const values = this.values(ctx, csvValues, tokens);
		const valuesAsNames: Record<string, T> = {};
		const valuesSet = new Set<T>();

		values.forEach((v) => {
			if (valuesSet.has(v.value)) return;
			valuesAsNames[v.name.lower()] = v.value;
			valuesSet.add(v.value);
		});

		for (const [macroName, _] of pairs(this.macros)) {
			if (valuesAsNames[macroName] === undefined) continue;
			ctx.logger.append(
				ctx.warnLevel,
				KindErrors.CSV_KIND_MACRO_COLLISION.format(this.label, macroName, macroName),
			);
			const value = valuesAsNames[macroName];
			delete valuesAsNames[macroName];
			valuesAsNames[`_${macroName}`] = value;
		}

		csvValues.forEach((v) => {
			const value = valuesAsNames[v.lower()];
			if (value !== undefined) {
				if (!ret.includes(value)) ret.push(value);
			}
			const macro = this.macros[v.lower()];
			if (macro === undefined) return;
			macro(ctx as never).forEach((mV) => {
				if (ret.includes(mV)) return;
				ret.push(mV);
			});
		});

		return ret;
	}
	// Value names are made lowercase automatically. You should account for this behavior.
	public abstract values<LL extends string[] = string[]>(
		ctx: KindCommandContext<LL>,
		values: ReadonlyArray<string>,
		token: ReadOnlyTokenStream,
	): { name: string; value: T }[];

	public static suggestMacros<T extends defined>(kind: CSVKind<T>) {
		const macroKeys: string[] = [];
		for (const [k, _] of pairs(kind.macros)) macroKeys.push(k);
		return macroKeys;
	}
}

/**
 * A CSVKind that is a list of literal strings.
 */
export class EnumsKind<T extends string[]> extends CSVKind<T[number]> {
	public constructor(
		label: string,
		public keys: T,
		macros?: Record<string, (ctx: KindCommandContext) => T[number][]>,
	) {
		super(label, t.union(...keys.map((v) => t.literal(v))), macros);
	}
	values<LL extends string[] = string[]>(
		ctx: KindCommandContext<LL>,
		values: ReadonlyArray<string>,
		token: ReadOnlyTokenStream,
	): { name: string; value: T[number] }[] {
		return this.keys.map((v) => ({ name: v, value: v }));
	}
	suggestions(): string[] {
		const macroKeys: string[] = [];
		const enumKeys: string[] = [];
		for (const [k, _] of pairs(this.macros)) macroKeys.push(k);
		this.keys.forEach((p) => {
			// See comment in transform method of CSVKind for why this is done
			if (this.macros[p] !== undefined) {
				enumKeys.push(`_${p}`);
				return;
			}
			enumKeys.push(p);
		});
		return [...macroKeys, ...enumKeys];
	}
}

export class FixedVectorKind<T extends defined> extends tKind<T[]> {
	public macros: Record<string, (ctx: KindCommandContext) => T[]> = {};
	public constructor(
		label: string,
		public readonly size: number,
		public readonly mapper: (data: string) => T,
		check: t.check<T>,
	) {
		super(label, t.array(check));
	}
	public transform<LL extends string[] = string[]>(data: string, ctx: KindCommandContext<LL>): T[] | undefined {
		if (this.macros[data] !== undefined) {
			return this.macros[data](ctx as never);
		}
		const tokens = TokenStream.create(data);
		let csvValues: string[] = [];

		for (const _ of $range(1, math.max(this.size, 1))) {
			if (tokens.inRange() === false) break;
			csvValues.push(tokens.get().lower());
			tokens.next();
		}

		// Reduce down all comma seperated values and space seperated values
		// Allows for behavior such as "1 2 3" and 1,2,3
		csvValues = string.split(csvValues.join(","), ",");

		return csvValues.mapFiltered((v) => this.mapper(v));
	}
	public suggestions(): string[] {
		const macroLabels = identity<string[]>([]);
		for (const [k, _] of pairs(this.macros)) macroLabels.push(k);
		return macroLabels;
	}
}

export class FixedVectorTransformKind<T extends defined> extends tKind<T> {
	public macros: Record<string, (ctx: KindCommandContext) => T> = {};
	public constructor(
		label: string,
		public readonly size: number,
		public readonly mapper: (data: string[]) => T,
		check: t.check<T>,
	) {
		super(label, check);
	}
	public transform<LL extends string[] = string[]>(data: string, ctx: KindCommandContext<LL>): T | undefined {
		if (this.macros[data] !== undefined) {
			return this.macros[data](ctx as never);
		}
		const tokens = TokenStream.create(data);
		let csvValues: string[] = [];

		for (const _ of $range(1, math.max(this.size, 1))) {
			if (tokens.inRange() === false) break;
			csvValues.push(tokens.get().lower());
			tokens.next();
		}

		// Reduce down all comma seperated values and space seperated values
		// Allows for behavior such as "1 2 3" and 1,2,3
		csvValues = string.split(csvValues.join(","), ",");

		return this.mapper(csvValues);
	}
	public suggestions(): string[] {
		const macroLabels = identity<string[]>([]);
		for (const [k, _] of pairs(this.macros)) macroLabels.push(k);
		return macroLabels;
	}
}
