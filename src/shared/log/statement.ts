export interface LogStructure<T extends [...string[]]> {
	level: T[number];
	msg: string;
	time: DateTime;
	prefix?: string;
}

export type LogFactory<T extends string[]> = ReturnType<typeof logStructureFactory<T>>;

export function logStructureFactory<T extends [...string[]]>(...levels: T) {
	return function (level: T[number] = levels[0], msg: string, prefix?: string): LogStructure<T> {
		return {
			level: level,
			msg: msg,
			time: DateTime.now(),
			prefix: prefix,
		};
	};
}
