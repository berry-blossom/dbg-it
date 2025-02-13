export function strictReverseKeys<T extends string[]>(...strings: T): Record<T[number], number> {
	const result: Record<string, number> = {};
	strings.forEach((v, k) => {
		result[v as string] = k;
	});
	return result as never;
}

export type someEnum = {
	[name: symbol]: number;
	[idx: number]: string;
};

export function getEnumKeys<T extends someEnum>(enumeration: T): (keyof T)[] {
	const enumKeys: (keyof T)[] = [];
	// eslint-disable-next-line roblox-ts/no-array-pairs
	for (const [k, _] of pairs(enumeration)) {
		if (rawget(enumeration, k) === undefined) continue;
		enumKeys.push(k as never as keyof T);
	}
	return enumKeys;
}
