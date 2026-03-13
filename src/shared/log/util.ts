import { LogStructure } from ".";

/**
 * @returns Pretty printed log structure, to be passed, for example, to the Roblox output.
 */
export function PrettyFormatLogStructure(log: LogStructure<(string & {})[] | never[]>) {
	return `${
		log.prefix !== undefined
			? `[${log.prefix!}-${log.level} @ ${log.time.FormatLocalTime("HH:mm:ss", "en-us")}]: `
			: `[${log.level} @ ${log.time.FormatLocalTime("HH:mm:ss", "en-us")}]: `
	}${log.msg}`;
}
